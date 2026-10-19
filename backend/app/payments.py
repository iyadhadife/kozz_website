import json
import logging
import os
import re
from decimal import Decimal

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import text

from . import fx, referral
from . import security as sec
from .db import engine
from .fulfillment import esims_for_order, fulfilment_state
from .invoicing import get_pdf
from .post_payment import process_in_background

log = logging.getLogger("kozz.payments")
router = APIRouter(prefix="/api")

from .site import SITE_URL
from .features import require_purchases
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
# Libellé de ce tunnel dans le Dashboard Stripe (API >= 2026-03-25 : suffixe de 8 lettres aléatoires)
INTEGRATION_ID = "kozzgo-checkout-qhvtbmxe"

# Un client par processus (le motif global stripe.api_key est déprécié). Clé restreinte (rk_) recommandée.
_api_key = os.getenv("STRIPE_SECRET_KEY", "")
if _api_key.startswith("pk_"):
    # Erreur fréquente : la clé PUBLIABLE (pk_, faite pour le navigateur) ne peut pas créer de paiement côté serveur
    log.error("STRIPE_SECRET_KEY contient une clé publique (pk_...). Il faut une clé secrète (sk_) ou restreinte (rk_).")
    _api_key = ""
client = stripe.StripeClient(_api_key) if _api_key else None


def _cents(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1")))


STRIPE_LOCALES = {"ar", "de", "en", "es", "fr", "hi", "it", "ja", "ko", "nl", "pt", "ru", "tr", "zh"}  # langues du site que Checkout sait afficher


def stripe_customer_id(customer: dict, create: bool = True) -> str | None:
    """Identifiant du « Customer » Stripe du compte (créé au besoin). C'est la seule donnée de paiement gardée chez nous :
    les cartes elles-mêmes restent chez Stripe et sont relues à chaque fois."""
    if client is None:
        return None
    with engine.connect() as c:
        sid = c.execute(text("SELECT stripe_customer_id FROM customers WHERE id=:i"), {"i": customer["id"]}).scalar()
    if sid or not create:
        return sid
    cu = client.v1.customers.create(
        params={"email": customer["email"], "metadata": {"kozz_customer_id": str(customer["id"])}},
        options={"idempotency_key": f"kozz-customer-{customer['id']}"},
    )
    with engine.begin() as c:
        c.execute(text("UPDATE customers SET stripe_customer_id=:s WHERE id=:i AND stripe_customer_id IS NULL"), {"s": cu.id, "i": customer["id"]})
        return c.execute(text("SELECT stripe_customer_id FROM customers WHERE id=:i"), {"i": customer["id"]}).scalar()


def start_checkout(order: dict, email: str, customer: dict | None = None) -> dict:
    """Crée la session Stripe Checkout d'une commande déjà enregistrée (statut 'created').
    Les montants viennent de la base (jamais du navigateur). Stripe héberge la saisie de la carte."""
    order_id = order["order_id"]
    if client is None:
        _set_status(order_id, "failed")
        raise HTTPException(503, "Le paiement n'est pas encore configuré.")

    has_subscription = any(l["kind"] == "subscription" for l in order["_lines"])
    line_items = []
    for l in order["_lines"]:
        price_data = {
            "currency": order["_currency"].lower(),
            "unit_amount": l["unit_minor"],  # prix TTC dans la devise choisie (conversion faite par le serveur)
            "product_data": {"name": l["label"]},
        }
        if l["kind"] == "subscription":
            price_data["recurring"] = {"interval": "month"}
        line_items.append({"price_data": price_data, "quantity": l["qty"]})

    discounts = []
    discount = order.get("_discount_minor") or 0
    # Client connecté : Checkout affiche ses cartes déjà enregistrées chez Stripe et propose d'en enregistrer une nouvelle
    # (Stripe les garde, pas nous). Invité : simple e-mail, rien n'est enregistré.
    customer_params = {"customer_email": email}
    if customer:
        try:
            sid = stripe_customer_id(customer)
        except stripe.StripeError as e:
            log.error("Stripe: création du client impossible: %s", e)
            sid = None
        if sid:
            customer_params = {
                "customer": sid,
                "customer_update": {"name": "auto", "address": "auto"},
                "saved_payment_method_options": {"payment_method_save": "enabled"},
            }
            if has_subscription:  # le mode abonnement enregistre déjà le moyen de paiement
                customer_params.pop("saved_payment_method_options")
    site_lang = (order.get("_site_lang") or "fr").lower()[:2]
    if site_lang in STRIPE_LOCALES:
        customer_params["locale"] = site_lang
    try:
        if discount > 0:  # remise parrainage : coupon à usage unique, créé pour cette commande
            coupon = client.v1.coupons.create(
                params={"amount_off": discount, "currency": order["_currency"].lower(), "duration": "once", "name": "Remise parrainage", "max_redemptions": 1},
                options={"idempotency_key": f"kozz-coupon-{order_id}"},
            )
            discounts = [{"coupon": coupon.id}]
        # Pas de payment_method_types : les moyens de paiement (carte, Apple/Google Pay…) se règlent dans le Dashboard
        session = client.v1.checkout.sessions.create(
            params={
                "mode": "subscription" if has_subscription else "payment",
                "line_items": line_items,
                **({"discounts": discounts} if discounts else {}),
                **customer_params,
                "client_reference_id": str(order_id),
                "metadata": {"order_id": str(order_id)},
                "success_url": f"{SITE_URL}/commande/succes?session_id={{CHECKOUT_SESSION_ID}}",
                "cancel_url": f"{SITE_URL}/commande/annulee",
                "locale": customer_params.pop("locale", "fr"),  # langue du site (Stripe la prend en charge), français par défaut
                # Coordonnées obligatoires sur la facture et pour le SMS : saisies et vérifiées par Stripe
                "billing_address_collection": "required",
                "phone_number_collection": {"enabled": True},
                "integration_identifier": INTEGRATION_ID,
                # KozzGo reste le vendeur (prix TTC fixés par nous). Managed Payments (Stripe vendeur officiel) ne couvre
                # que les produits numériques et exigerait un code fiscal par produit : eSIM et recharges n'en font pas partie.
                "managed_payments": {"enabled": False},
            },
            options={"idempotency_key": f"kozz-order-{order_id}"},
        )
    except stripe.StripeError as e:
        log.error("Stripe: création de session échouée pour la commande %s: %s", order_id, e)
        _set_status(order_id, "failed")
        raise HTTPException(502, "Le service de paiement est indisponible, réessaie dans un instant.")

    with engine.begin() as c:
        c.execute(text("UPDATE orders SET stripe_session_id = :s WHERE id = :i"), {"s": session.id, "i": order_id})
    return {"order_id": order_id, "checkout_url": session.url}


def _set_status(order_id: int, status: str) -> None:
    with engine.begin() as c:
        changed = c.execute(text("UPDATE orders SET status = :s WHERE id = :i AND status = 'created'"), {"s": status, "i": order_id}).rowcount
        if changed and status == "failed":
            referral.release(c, order_id)  # le crédit de parrainage redevient utilisable


def mark_paid(session: dict) -> bool:
    """Passe la commande à 'paid'. Idempotent : Stripe peut renvoyer le même événement plusieurs fois."""
    order_id = int((session.get("metadata") or {}).get("order_id") or session.get("client_reference_id") or 0)
    with engine.begin() as c:
        order = c.execute(
            text("SELECT id, total_ttc, status, stripe_session_id, currency, charge_amount_minor FROM orders WHERE id = :i FOR UPDATE"), {"i": order_id}
        ).mappings().first()
        if not order or order["stripe_session_id"] != session["id"]:
            log.error("Webhook: commande/session incohérente (%s / %s)", order_id, session["id"])
            return False
        if order["status"] != "created":
            return True  # déjà traitée
        expected = order["charge_amount_minor"] if order["charge_amount_minor"] is not None else _cents(Decimal(order["total_ttc"]))
        if session["amount_total"] != expected or (session.get("currency") or "eur").upper() != order["currency"]:
            log.error("Webhook: montant payé %s %s ≠ attendu %s %s pour la commande %s", session["amount_total"], session.get("currency"),
                      expected, order["currency"], order_id)
            return False
        details = session.get("customer_details") or {}
        addr = details.get("address") or {}
        c.execute(
            text(
                "UPDATE orders SET status='paid', stripe_payment_intent=:p, billing_name=:n, billing_address=:a, "
                "billing_country=:co, customer_phone=:ph WHERE id=:i"
            ),
            {"p": session.get("payment_intent"), "n": (details.get("name") or None), "a": json.dumps(addr) if addr else None,
             "co": addr.get("country"), "ph": details.get("phone"), "i": order_id},
        )
        referral.on_paid(c, order_id)  # crédits consommés ; crédit du parrain si 1re commande du filleul
    process_in_background(order_id)  # eSIM, facture, e-mail et SMS : hors de la requête Stripe
    return True


def _order_by_payment_intent(c, payment_intent: str | None):
    if not payment_intent:
        return None
    return c.execute(
        text("SELECT id, status FROM orders WHERE stripe_payment_intent = :p"), {"p": payment_intent}
    ).mappings().first()


@router.post("/stripe/webhook")
async def webhook(request: Request):
    """Source de vérité du paiement : appelé par Stripe, signature vérifiée avec STRIPE_WEBHOOK_SECRET."""
    if not WEBHOOK_SECRET or client is None:
        raise HTTPException(503, "Webhook non configuré")
    payload = await request.body()
    try:
        event = client.construct_event(payload, request.headers.get("stripe-signature", ""), WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(400, "Signature invalide")

    kind = event["type"]
    obj = event["data"]["object"].to_dict()  # les objets Stripe ne sont plus des dict depuis le SDK v14+

    # Livraison : sur "completed" ET "async_payment_succeeded", seulement si la session n'est pas "unpaid"
    if kind in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if obj.get("payment_status") in ("paid", "no_payment_required"):
            if not mark_paid(obj):
                raise HTTPException(409, "Commande incohérente")  # Stripe réessaiera
    elif kind in ("checkout.session.expired", "checkout.session.async_payment_failed"):
        order_id = (obj.get("metadata") or {}).get("order_id")
        if order_id:
            _set_status(int(order_id), "failed")

    # Événements de risque : on retrouve la commande via le PaymentIntent, pas via les metadata
    elif kind == "charge.refunded":
        with engine.begin() as c:
            row = _order_by_payment_intent(c, obj.get("payment_intent"))
            if row and obj.get("refunded") and row["status"] in ("paid", "provisioned"):  # remboursement total
                c.execute(text("UPDATE orders SET status = 'refunded' WHERE id = :i"), {"i": row["id"]})
    elif kind in ("charge.dispute.created", "radar.early_fraud_warning.created"):
        with engine.connect() as c:
            row = _order_by_payment_intent(c, obj.get("payment_intent"))
        # À traiter à la main dans le Dashboard Stripe (preuves de litige à fournir sous quelques jours)
        log.error("RISQUE Stripe %s : commande %s, payment_intent %s", kind, row["id"] if row else "inconnue", obj.get("payment_intent"))
    return {"received": True}


@router.get("/checkout/{session_id}")
def checkout_status(session_id: str):
    """Utilisé par la page de retour. Si le webhook n'est pas encore arrivé, on interroge Stripe directement."""
    if not re.fullmatch(r"cs_[A-Za-z0-9_]{10,200}", session_id):
        raise HTTPException(404, "Session inconnue")

    def load():
        with engine.connect() as c:
            return c.execute(
                text(
                    "SELECT o.id, o.status, o.total_ttc, o.currency, o.charge_amount_minor, o.donation_amount, ca.id AS cause_id, ca.name, ca.unit, ca.emoji, ca.cost_per_unit "
                    "FROM orders o JOIN causes ca ON ca.id = o.cause_id WHERE o.stripe_session_id = :s"
                ),
                {"s": session_id},
            ).mappings().first()

    row = load()
    if not row:
        raise HTTPException(404, "Commande introuvable")
    if row["status"] == "created" and client is not None:
        try:
            s = client.v1.checkout.sessions.retrieve(session_id).to_dict()
            if s.get("payment_status") in ("paid", "no_payment_required") and mark_paid(s):
                row = load()
        except stripe.StripeError as e:
            log.warning("Stripe retrieve a échoué: %s", e)

    paid = row["status"] in ("paid", "provisioned")
    esims, state, invoice = [], "none", None
    if paid:
        with engine.connect() as c:
            esims, state = esims_for_order(c, row["id"]), fulfilment_state(c, row["id"])
            invoice = c.execute(text("SELECT number FROM invoices WHERE order_id=:o"), {"o": row["id"]}).scalar()
    return {
        "status": "paid" if paid else row["status"],
        "order_id": row["id"],
        "total": float(row["total_ttc"]),
        "currency": row["currency"],
        "charged": float(fx.from_minor(row["charge_amount_minor"], row["currency"])) if row["charge_amount_minor"] is not None else float(row["total_ttc"]),
        "donation": float(row["donation_amount"]),
        "cause": {"id": row["cause_id"], "name": row["name"], "unit": row["unit"], "emoji": row["emoji"]},
        "impact_units": float(row["donation_amount"] / row["cost_per_unit"]),
        "invoice": invoice,  # numéro, ou None tant que la facture n'est pas émise
        "fulfilment": state,  # none | pending | ready | failed
        "esims": esims if state in ("ready", "failed") else [],
    }


@router.get("/checkout/{session_id}/invoice")
def checkout_invoice(session_id: str):
    """Facture d'une commande invitée (l'identifiant de session Stripe, long et aléatoire, tient lieu de lien secret)."""
    if not re.fullmatch(r"cs_[A-Za-z0-9_]{10,200}", session_id):
        raise HTTPException(404, "Introuvable")
    with engine.connect() as c:
        number = c.execute(
            text("SELECT i.number FROM invoices i JOIN orders o ON o.id=i.order_id WHERE o.stripe_session_id=:s"), {"s": session_id}
        ).scalar()
        pdf = get_pdf(c, number) if number else None
    if not pdf:
        raise HTTPException(404, "Facture indisponible")
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{number}.pdf"'})


# ---------- Cartes enregistrées : tout reste chez Stripe ----------
# Chez nous : uniquement customers.stripe_customer_id. Marque, 4 derniers chiffres et date d'expiration sont relus chez Stripe
# à chaque affichage ; le numéro complet n'est jamais accessible (ni à Stripe API, ni à nous).
@router.get("/me/cards")
def my_cards(cust=Depends(sec.require_customer)):
    if client is None:
        return {"available": False, "cards": []}
    sid = stripe_customer_id(cust, create=False)
    if not sid:
        return {"available": True, "cards": []}
    try:
        pms = client.v1.payment_methods.list(params={"customer": sid, "type": "card", "limit": 20})
    except stripe.StripeError as e:
        log.error("Stripe: lecture des cartes impossible: %s", e)
        raise HTTPException(502, "Le service de paiement est indisponible, réessaie dans un instant.")
    return {
        "available": True,
        "cards": [{"id": pm.id, "brand": pm.card.brand, "last4": pm.card.last4, "exp_month": pm.card.exp_month, "exp_year": pm.card.exp_year} for pm in pms.data],
    }


@router.delete("/me/cards/{pm_id}", status_code=204)
def delete_card(pm_id: str, cust=Depends(sec.require_customer)):
    if not re.fullmatch(r"pm_[A-Za-z0-9]{10,80}", pm_id) or client is None:
        raise HTTPException(404, "Introuvable")
    sid = stripe_customer_id(cust, create=False)
    try:
        pm = client.v1.payment_methods.retrieve(pm_id)
        if not sid or pm.customer != sid:  # on ne détache que SES cartes
            raise HTTPException(404, "Introuvable")
        client.v1.payment_methods.detach(pm_id)
    except stripe.StripeError as e:
        log.error("Stripe: suppression de carte impossible: %s", e)
        raise HTTPException(502, "Le service de paiement est indisponible, réessaie dans un instant.")


@router.post("/me/cards/setup")
def add_card(lang: str = "fr", cust=Depends(sec.require_customer)):
    """Ouvre une page Stripe pour enregistrer une carte (sans paiement). Le numéro est saisi chez Stripe, pas chez nous."""
    require_purchases()
    if client is None:
        raise HTTPException(503, "Le paiement n'est pas encore configuré.")
    try:
        params = {
            "mode": "setup", "customer": stripe_customer_id(cust), "currency": "eur",
            "success_url": f"{SITE_URL}/profil?carte=ajoutee", "cancel_url": f"{SITE_URL}/profil",
            "integration_identifier": INTEGRATION_ID, "managed_payments": {"enabled": False},
        }
        if lang[:2].lower() in STRIPE_LOCALES:
            params["locale"] = lang[:2].lower()
        session = client.v1.checkout.sessions.create(params=params)
    except stripe.StripeError as e:
        log.error("Stripe: session d'ajout de carte échouée: %s", e)
        raise HTTPException(502, "Le service de paiement est indisponible, réessaie dans un instant.")
    return {"url": session.url}


def delete_stripe_customer(customer_id: int) -> None:
    """Suppression de compte (RGPD) : on efface aussi le client Stripe et donc ses cartes enregistrées. Sans effet bloquant."""
    if client is None:
        return
    try:
        with engine.connect() as c:
            sid = c.execute(text("SELECT stripe_customer_id FROM customers WHERE id=:i"), {"i": customer_id}).scalar()
        if sid:
            client.v1.customers.delete(sid)
    except stripe.StripeError as e:
        log.error("Stripe: suppression du client impossible: %s", e)
