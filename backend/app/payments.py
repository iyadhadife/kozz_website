import logging
import os
import re
from decimal import Decimal

import stripe
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from .db import engine

log = logging.getLogger("kozz.payments")
router = APIRouter(prefix="/api")

SITE_URL = os.getenv("SITE_URL", "https://localhost").rstrip("/")
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


def start_checkout(order: dict, email: str) -> dict:
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
            "currency": "eur",
            "unit_amount": _cents(l["unit_price"]),  # prix TTC
            "product_data": {"name": l["label"]},
        }
        if l["kind"] == "subscription":
            price_data["recurring"] = {"interval": "month"}
        line_items.append({"price_data": price_data, "quantity": l["qty"]})

    try:
        # Pas de payment_method_types : les moyens de paiement (carte, Apple/Google Pay…) se règlent dans le Dashboard
        session = client.v1.checkout.sessions.create(
            params={
                "mode": "subscription" if has_subscription else "payment",
                "line_items": line_items,
                "customer_email": email,
                "client_reference_id": str(order_id),
                "metadata": {"order_id": str(order_id)},
                "success_url": f"{SITE_URL}/commande/succes?session_id={{CHECKOUT_SESSION_ID}}",
                "cancel_url": f"{SITE_URL}/commande/annulee",
                "locale": "fr",
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
        c.execute(text("UPDATE orders SET status = :s WHERE id = :i AND status = 'created'"), {"s": status, "i": order_id})


def mark_paid(session: dict) -> bool:
    """Passe la commande à 'paid'. Idempotent : Stripe peut renvoyer le même événement plusieurs fois."""
    order_id = int((session.get("metadata") or {}).get("order_id") or session.get("client_reference_id") or 0)
    with engine.begin() as c:
        order = c.execute(
            text("SELECT id, total_ttc, status, stripe_session_id FROM orders WHERE id = :i FOR UPDATE"), {"i": order_id}
        ).mappings().first()
        if not order or order["stripe_session_id"] != session["id"]:
            log.error("Webhook: commande/session incohérente (%s / %s)", order_id, session["id"])
            return False
        if order["status"] != "created":
            return True  # déjà traitée
        if session["amount_total"] != _cents(Decimal(order["total_ttc"])):
            log.error("Webhook: montant payé %s ≠ attendu %s pour la commande %s", session["amount_total"], order["total_ttc"], order_id)
            return False
        c.execute(
            text("UPDATE orders SET status = 'paid', stripe_payment_intent = :p WHERE id = :i"),
            {"p": session.get("payment_intent"), "i": order_id},
        )
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
                    "SELECT o.id, o.status, o.total_ttc, o.donation_amount, ca.id AS cause_id, ca.name, ca.unit, ca.emoji, ca.cost_per_unit "
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
    return {
        "status": "paid" if paid else row["status"],
        "order_id": row["id"],
        "total": float(row["total_ttc"]),
        "donation": float(row["donation_amount"]),
        "cause": {"id": row["cause_id"], "name": row["name"], "unit": row["unit"], "emoji": row["emoji"]},
        "impact_units": float(row["donation_amount"] / row["cost_per_unit"]),
    }
