import hashlib
import re
import hmac
import logging
import os
import secrets
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from . import emailkit, notify, referral, texts
from . import security as sec
from .db import engine
from .fulfillment import esims_for_order, fulfilment_state
from .invoicing import get_pdf

log = logging.getLogger("kozz.auth")
router = APIRouter(prefix="/api")

EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
# Statuts Kozz selon les achats des 12 derniers mois : (clé, libellé, seuil €, cashback %)
STATUSES = [
    ("decouverte", "Kozz Découverte", 0, 3),
    ("argent", "Kozz Argent", 100, 5),
    ("or", "Kozz Or", 250, 7),
    ("legende", "Kozz Légende", 500, 10),
]
_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sans caractères ambigus (0/O, 1/I)


class RegisterIn(BaseModel):
    email: str = Field(max_length=255, pattern=EMAIL)
    password: str = Field(max_length=200)
    first_name: Optional[str] = Field(None, max_length=100)
    ref: Optional[str] = Field(None, max_length=12)  # code de parrainage (lien ?ref=CODE)
    lang: Optional[str] = Field(None, max_length=8)  # langue du site : l'e-mail du code est en français ou en anglais


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class ProfileIn(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    cause_id: Optional[str] = Field(None, max_length=20)
    notif_sms: Optional[bool] = None
    marketing_optin: Optional[bool] = None


class RelativeIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)


def _phone(v: Optional[str]) -> Optional[str]:
    """Numéro international (+33 6 12 34 56 78 -> +33612345678) ; vide = effacé."""
    v = (v or "").strip()
    if not v:
        return None
    digits = re.sub(r"[ .\-()]", "", v)
    if not re.fullmatch(r"\+[1-9]\d{7,14}", digits):
        raise HTTPException(422, "Numéro invalide : utilise le format international, par exemple +33612345678.")
    return digits


class PasswordIn(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(max_length=200)


class DeleteIn(BaseModel):
    password: str = Field(max_length=200)


def _clean(s: Optional[str]) -> Optional[str]:
    s = (s or "").strip()
    return s or None


def _profile(c, cust) -> dict:
    spend = c.execute(
        text(
            "SELECT COALESCE(SUM(total_ttc), 0) FROM orders WHERE customer_id = :c "
            "AND status IN ('paid','provisioned') AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 365 DAY)"
        ),
        {"c": cust["id"]},
    ).scalar()
    spend = float(spend or Decimal(0))
    idx = max(i for i, s in enumerate(STATUSES) if spend >= s[2])
    key, label, _, cashback = STATUSES[idx]
    nxt = STATUSES[idx + 1] if idx + 1 < len(STATUSES) else None
    return {
        "id": cust["id"],
        "email": cust["email"],
        "first_name": cust["first_name"],
        "last_name": cust["last_name"],
        "created_at": cust["created_at"].isoformat() if cust["created_at"] else None,
        "kozz_money": float(cust["kozz_money"]),
        "referral_code": cust["referral_code"],
        "phone": cust["phone"],
        "cause_id": cust["cause_id"],
        "cause_name": c.execute(text("SELECT name FROM causes WHERE id=:i"), {"i": cust["cause_id"]}).scalar() if cust["cause_id"] else None,
        "notif_sms": bool(cust["notif_sms"]),
        "sms_notifications": notify.sms_notifications_enabled(),
        "phone_verification": {
            "enabled": referral.phone_required(),
            "verified": cust["phone_verified_at"] is not None,
            # cadeau de parrainage encore bloqué : le filleul doit vérifier son numéro
            "pending_gift": bool(referral.phone_required() and cust["referred_by"] and cust["phone_verified_at"] is None),
        },
        "marketing_optin": bool(cust["marketing_optin"]),
        "relatives_count": c.execute(text("SELECT COUNT(*) FROM relatives WHERE customer_id=:i"), {"i": cust["id"]}).scalar(),
        "orders_count": c.execute(text("SELECT COUNT(*) FROM orders WHERE customer_id=:i AND status IN ('paid','provisioned','refunded')"), {"i": cust["id"]}).scalar(),
        "credit": float(referral.balance(c, cust["id"])),
        "referred": bool(cust["referred_by"]),
        # filleul dont le cadeau n'est pas encore débloqué (achat du filleul et du parrain, numéro vérifié si A2F)
        "referral_pending": bool(cust["referred_by"]) and not c.execute(
            text("SELECT 1 FROM referral_credits WHERE customer_id=:i AND kind='referee' LIMIT 1"), {"i": cust["id"]}).first(),
        "referral_count": c.execute(text("SELECT COUNT(*) FROM customers WHERE referred_by=:i"), {"i": cust["id"]}).scalar(),
        "status": {
            "key": key,
            "label": label,
            "cashback": cashback,
            "spend": round(spend, 2),
            "next": {"label": nxt[1], "threshold": nxt[2], "remaining": round(nxt[2] - spend, 2)} if nxt else None,
        },
    }


CODE_TTL_MIN, CODE_MAX_ATTEMPTS, RESEND_AFTER_S, MAX_SENDS = 15, 5, 60, 5


class VerifyIn(BaseModel):
    email: str = Field(max_length=255, pattern=EMAIL)
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendIn(BaseModel):
    email: str = Field(max_length=255, pattern=EMAIL)
    lang: Optional[str] = Field(None, max_length=8)


def _code_hash(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}".encode()).hexdigest()


def _send_code(email: str, code: str, lang: str | None = None) -> None:
    """Envoie le code par e-mail (français ou anglais). Le code n'est jamais écrit dans les logs."""
    lg = texts.lang_for(lang)
    subject = texts.T(lg, "code_subject", code=code)
    text_body = texts.T(lg, "code_text", code=code, min=CODE_TTL_MIN)
    html_body = emailkit.layout(
        texts.T(lg, "code_html1").rstrip(" :"),
        emailkit.code_box(code) + emailkit.p(texts.T(lg, "code_html2", min=CODE_TTL_MIN), muted=True) + emailkit.p(texts.T(lg, "code_html3"), muted=True),
        preheader=subject, lang=lg)
    try:
        notify.send_email(email, subject, text_body, html_body, inline=[("logo", emailkit.logo_png())])
    except notify.NotConfigured:
        raise HTTPException(503, "L'envoi d'e-mails n'est pas encore configuré : impossible de vérifier ton adresse.")
    except Exception as e:  # noqa: BLE001
        log.error("Envoi du code de vérification échoué: %s", type(e).__name__)
        raise HTTPException(502, "Impossible d'envoyer l'e-mail de vérification, réessaie dans un instant.")


def verification_enabled() -> bool:
    """EMAIL_VERIFICATION_ENABLED=false dans .env : l'inscription crée le compte directement, sans code."""
    return os.getenv("EMAIL_VERIFICATION_ENABLED", "true").strip().lower() not in ("false", "0", "no", "off")


def _create_account(c, email: str, pw_hash: str, first_name, ref, request: Request, response: Response, verified: bool) -> dict:
    for _ in range(5):  # code de parrainage unique
        ref_code = "".join(secrets.choice(_REF_ALPHABET) for _ in range(8))
        try:
            cid = c.execute(
                text("INSERT INTO customers (email, password_hash, first_name, referral_code, email_verified_at) "
                     "VALUES (:e, :p, :f, :r, " + ("UTC_TIMESTAMP()" if verified else "NULL") + ")"),
                {"e": email, "p": pw_hash, "f": first_name, "r": ref_code},
            ).lastrowid
            break
        except IntegrityError as e:
            if "email" in str(e.orig).lower():
                raise HTTPException(409, "Un compte existe déjà avec cet e-mail.")
    else:
        raise HTTPException(500, "Création du compte impossible, réessaie.")
    referral.link_referrer(c, cid, ref)
    sec.start_session(c, cid, request, response)
    cust = c.execute(text("SELECT * FROM customers WHERE id = :i"), {"i": cid}).mappings().first()
    return _profile(c, cust)


def _new_code() -> str:
    return f"{secrets.randbelow(10 ** 6):06d}"


@router.post("/auth/register", status_code=202)
def register(body: RegisterIn, request: Request, response: Response):
    """Étape 1 : on vérifie l'e-mail et le mot de passe, on envoie un code. Le compte n'est PAS encore créé.
    Si EMAIL_VERIFICATION_ENABLED=false : le compte est créé tout de suite (statut 201, e-mail non vérifié)."""
    email = body.email.strip().lower()
    ip_key = f"reg:{sec.client_ip(request)}"
    sec.rate_limit(ip_key, limit=10, window=900)
    sec.record_failure(ip_key)
    sec.validate_password(body.password, email)
    pw_hash = sec.hash_password(body.password)
    if not verification_enabled():
        with engine.begin() as c:
            if c.execute(text("SELECT 1 FROM customers WHERE email=:e"), {"e": email}).first():
                raise HTTPException(409, "Un compte existe déjà avec cet e-mail.")
            response.status_code = 201
            return _create_account(c, email, pw_hash, _clean(body.first_name), (body.ref or "").strip().upper()[:12] or None, request, response, verified=False)
    code = _new_code()
    with engine.begin() as c:
        if c.execute(text("SELECT 1 FROM customers WHERE email=:e"), {"e": email}).first():
            raise HTTPException(409, "Un compte existe déjà avec cet e-mail.")
        old = c.execute(text("SELECT TIMESTAMPDIFF(SECOND, last_sent_at, UTC_TIMESTAMP()) AS ago FROM pending_registrations WHERE email=:e"), {"e": email}).first()
        if old is not None and old[0] < RESEND_AFTER_S:
            raise HTTPException(429, f"Un code vient d'être envoyé. Réessaie dans {RESEND_AFTER_S - old[0]} secondes.")
        c.execute(
            text(
                "REPLACE INTO pending_registrations (email, password_hash, first_name, ref, code_hash, expires_at, last_sent_at) "
                "VALUES (:e, :p, :f, :r, :h, DATE_ADD(UTC_TIMESTAMP(), INTERVAL :m MINUTE), UTC_TIMESTAMP())"
            ),
            {"e": email, "p": pw_hash, "f": _clean(body.first_name), "r": (body.ref or "").strip().upper()[:12] or None,
             "h": _code_hash(email, code), "m": CODE_TTL_MIN},
        )
    _send_code(email, code, body.lang)
    return {"pending": True, "email": email, "expires_in_minutes": CODE_TTL_MIN, "resend_in": RESEND_AFTER_S}


@router.post("/auth/register/resend", status_code=202)
def register_resend(body: ResendIn, request: Request):
    email = body.email.strip().lower()
    ip_key = f"reg:{sec.client_ip(request)}"
    sec.rate_limit(ip_key, limit=10, window=900)
    sec.record_failure(ip_key)
    code = _new_code()
    with engine.begin() as c:
        row = c.execute(
            text("SELECT sends, TIMESTAMPDIFF(SECOND, last_sent_at, UTC_TIMESTAMP()) AS ago FROM pending_registrations WHERE email=:e FOR UPDATE"), {"e": email}
        ).first()
        if row is None:
            raise HTTPException(404, "Aucune inscription en attente pour cet e-mail. Recommence l'inscription.")
        if row[1] < RESEND_AFTER_S:
            raise HTTPException(429, f"Réessaie dans {RESEND_AFTER_S - row[1]} secondes.")
        if row[0] >= MAX_SENDS:
            raise HTTPException(429, "Trop de codes envoyés. Recommence l'inscription dans un moment.")
        c.execute(
            text("UPDATE pending_registrations SET code_hash=:h, attempts=0, sends=sends+1, expires_at=DATE_ADD(UTC_TIMESTAMP(), INTERVAL :m MINUTE), last_sent_at=UTC_TIMESTAMP() WHERE email=:e"),
            {"h": _code_hash(email, code), "m": CODE_TTL_MIN, "e": email},
        )
    _send_code(email, code, body.lang)
    return {"pending": True, "resend_in": RESEND_AFTER_S}


def _fail_attempt(email: str, attempts: int) -> int:
    """Compte un essai raté dans sa propre transaction (la transaction principale est annulée par l'exception HTTP)."""
    with engine.begin() as c:
        if attempts >= CODE_MAX_ATTEMPTS:  # trop d'essais : il faut redemander un code
            c.execute(text("DELETE FROM pending_registrations WHERE email=:e"), {"e": email})
        else:
            c.execute(text("UPDATE pending_registrations SET attempts=:a WHERE email=:e"), {"a": attempts, "e": email})
    return CODE_MAX_ATTEMPTS - attempts


@router.post("/auth/register/verify", status_code=201)
def register_verify(body: VerifyIn, request: Request, response: Response):
    """Étape 2 : le bon code crée le compte et ouvre la session."""
    email = body.email.strip().lower()
    ip_key = f"verify:{sec.client_ip(request)}"
    sec.rate_limit(ip_key, limit=20, window=900)
    bad = None
    with engine.begin() as c:
        p = c.execute(text("SELECT *, expires_at < UTC_TIMESTAMP() AS expired FROM pending_registrations WHERE email=:e FOR UPDATE"), {"e": email}).mappings().first()
        if p is None:
            raise HTTPException(410, "Code expiré ou inscription introuvable. Recommence l'inscription.")
        if p["expired"]:
            c.execute(text("DELETE FROM pending_registrations WHERE email=:e"), {"e": email})
            gone = True
        elif not hmac.compare_digest(p["code_hash"], _code_hash(email, body.code)):
            sec.record_failure(ip_key)
            bad = p["attempts"] + 1
            gone = False
        else:
            gone = False
            prof = _create_account(c, email, p["password_hash"], p["first_name"], p["ref"], request, response, verified=True)
            c.execute(text("DELETE FROM pending_registrations WHERE email=:e"), {"e": email})
            return prof
    if gone:
        raise HTTPException(410, "Code expiré. Recommence l'inscription.")
    left = _fail_attempt(email, bad)
    if left <= 0:
        raise HTTPException(410, "Trop d'essais. Recommence l'inscription.")
    raise HTTPException(400, f"Code incorrect. Il te reste {left} essai(s).")


@router.post("/auth/login")
def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    keys = (f"ip:{sec.client_ip(request)}", f"mail:{email}")
    for k in keys:
        sec.rate_limit(k)

    with engine.begin() as c:
        cust = c.execute(text("SELECT * FROM customers WHERE email = :e"), {"e": email}).mappings().first()
        ok = sec.verify_password(cust["password_hash"] if cust else None, body.password)
        if not ok:
            for k in keys:
                sec.record_failure(k)
            # même message que l'e-mail existe ou non
            raise HTTPException(401, "E-mail ou mot de passe incorrect.")
        for k in keys:
            sec.clear_failures(k)
        if sec.needs_rehash(cust["password_hash"]):  # paramètres Argon2 renforcés depuis la création
            c.execute(text("UPDATE customers SET password_hash = :p WHERE id = :i"), {"p": sec.hash_password(body.password), "i": cust["id"]})
        sec.start_session(c, cust["id"], request, response)
        return _profile(c, cust)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response):
    sec.end_session(request, response)


@router.get("/me")
def me(cust=Depends(sec.require_customer)):
    with engine.connect() as c:
        return _profile(c, cust)


@router.patch("/me")
def update_me(body: ProfileIn, cust=Depends(sec.require_customer)):
    sent = body.model_fields_set  # on ne modifie que ce que le navigateur a envoyé
    sets, params = [], {"i": cust["id"]}
    if "first_name" in sent:
        sets.append("first_name = :f")
        params["f"] = _clean(body.first_name)
    if "last_name" in sent:
        sets.append("last_name = :l")
        params["l"] = _clean(body.last_name)
    if "phone" in sent:
        sets.append("phone = :ph")
        params["ph"] = _phone(body.phone)
        if params["ph"] != cust["phone_verified_number"]:  # un autre numéro doit être vérifié à nouveau
            sets.append("phone_verified_at = NULL, phone_verified_number = NULL")
    if "notif_sms" in sent and body.notif_sms is not None:
        sets.append("notif_sms = :ns")
        params["ns"] = body.notif_sms
    if "marketing_optin" in sent and body.marketing_optin is not None:
        sets.append("marketing_optin = :mo, marketing_optin_at = " + ("UTC_TIMESTAMP()" if body.marketing_optin else "NULL"))
        params["mo"] = body.marketing_optin
    with engine.begin() as c:
        if "cause_id" in sent:
            if body.cause_id and not c.execute(text("SELECT 1 FROM causes WHERE id=:i"), {"i": body.cause_id}).first():
                raise HTTPException(422, "Cause inconnue")
            sets.append("cause_id = :ca")
            params["ca"] = body.cause_id or None
        if sets:
            c.execute(text("UPDATE customers SET " + ", ".join(sets) + " WHERE id = :i"), params)
        fresh = c.execute(text("SELECT * FROM customers WHERE id = :i"), {"i": cust["id"]}).mappings().first()
        return _profile(c, fresh)


@router.get("/me/relatives")
def list_relatives(cust=Depends(sec.require_customer)):
    with engine.connect() as c:
        rows = c.execute(text("SELECT id, name, phone FROM relatives WHERE customer_id=:c ORDER BY id"), {"c": cust["id"]}).mappings().all()
    return [{"id": r["id"], "name": r["name"], "phone": r["phone"]} for r in rows]


@router.post("/me/relatives", status_code=201)
def add_relative(body: RelativeIn, cust=Depends(sec.require_customer)):
    name, phone = _clean(body.name), _phone(body.phone)
    if not name:
        raise HTTPException(422, "Le prénom est requis.")
    with engine.begin() as c:
        if c.execute(text("SELECT COUNT(*) FROM relatives WHERE customer_id=:c"), {"c": cust["id"]}).scalar() >= 20:
            raise HTTPException(422, "20 proches maximum.")
        rid = c.execute(text("INSERT INTO relatives (customer_id, name, phone) VALUES (:c,:n,:p)"), {"c": cust["id"], "n": name, "p": phone}).lastrowid
    return {"id": rid, "name": name, "phone": phone}


@router.delete("/me/relatives/{rid}", status_code=204)
def delete_relative(rid: int, cust=Depends(sec.require_customer)):
    with engine.begin() as c:
        c.execute(text("DELETE FROM relatives WHERE id=:i AND customer_id=:c"), {"i": rid, "c": cust["id"]})




@router.post("/me/password", status_code=204)
def change_password(body: PasswordIn, request: Request, cust=Depends(sec.require_customer)):
    key = f"pwd:{cust['id']}"
    sec.rate_limit(key)
    if not sec.verify_password(cust["password_hash"], body.current_password):
        sec.record_failure(key)
        raise HTTPException(403, "Mot de passe actuel incorrect.")
    sec.validate_password(body.new_password, cust["email"])
    with engine.begin() as c:
        c.execute(text("UPDATE customers SET password_hash = :p WHERE id = :i"), {"p": sec.hash_password(body.new_password), "i": cust["id"]})
        sec.revoke_other_sessions(c, cust["id"], request)  # déconnecte les autres appareils


@router.delete("/me", status_code=204)
def delete_me(body: DeleteIn, request: Request, response: Response, cust=Depends(sec.require_customer)):
    """Suppression du compte (RGPD) : les commandes sont conservées anonymisées, les numéros de proches effacés."""
    key = f"del:{cust['id']}"
    sec.rate_limit(key)
    if not sec.verify_password(cust["password_hash"], body.password):
        sec.record_failure(key)
        raise HTTPException(403, "Mot de passe incorrect.")
    from . import payments  # import tardif : évite une dépendance circulaire

    payments.delete_stripe_customer(cust["id"])  # efface aussi les cartes enregistrées chez Stripe
    with engine.begin() as c:
        c.execute(
            text("UPDATE order_items SET phone = NULL WHERE order_id IN (SELECT id FROM orders WHERE customer_id = :i)"),
            {"i": cust["id"]},
        )
        c.execute(text("DELETE FROM customers WHERE id = :i"), {"i": cust["id"]})  # sessions supprimées en cascade
    response.delete_cookie(sec.COOKIE, path="/")


@router.get("/me/orders")
def my_orders(cust=Depends(sec.require_customer)):
    with engine.connect() as c:
        orders = c.execute(
            text("SELECT o.id, o.total_ttc, o.donation_amount, o.status, o.created_at, ca.name AS cause, ca.emoji, ca.unit, ca.cost_per_unit "
                 "FROM orders o JOIN causes ca ON ca.id = o.cause_id WHERE o.customer_id = :c AND o.status <> 'failed' ORDER BY o.created_at DESC LIMIT 50"),
            {"c": cust["id"]},
        ).mappings().all()
        out = []
        for o in orders:
            items = c.execute(
                text("SELECT kind, label, qty, unit_price, phone FROM order_items WHERE order_id = :o"), {"o": o["id"]}
            ).mappings().all()
            out.append(
                {
                    "id": o["id"],
                    "total": float(o["total_ttc"]),
                    "donation": float(o["donation_amount"]),
                    "status": o["status"],
                    "created_at": o["created_at"].isoformat(),
                    "cause": {"name": o["cause"], "emoji": o["emoji"], "unit": o["unit"]},
                    "impact_units": float(o["donation_amount"] / o["cost_per_unit"]),
                    "fulfilment": fulfilment_state(c, o["id"]) if o["status"] in ("paid", "provisioned") else "none",
                    "esims": esims_for_order(c, o["id"]) if o["status"] in ("paid", "provisioned") else [],
                    "items": [
                        {
                            "label": i["label"],
                            "qty": i["qty"],
                            "unit_price": float(i["unit_price"]),
                            # numéro d'un tiers : jamais renvoyé en entier
                            "phone": ("•••" + i["phone"][-3:]) if i["phone"] else None,
                        }
                        for i in items
                    ],
                }
            )
    return out


def _impact(cust_id: int) -> dict:
    with engine.connect() as c:
        rows = c.execute(
            text(
                "SELECT ca.id, ca.name, ca.emoji, ca.unit, ca.cost_per_unit, SUM(o.donation_amount) AS don, COUNT(*) AS n "
                "FROM orders o JOIN causes ca ON ca.id = o.cause_id WHERE o.customer_id = :c AND o.status IN ('paid','provisioned') "
                "GROUP BY ca.id, ca.name, ca.emoji, ca.unit, ca.cost_per_unit"
            ),
            {"c": cust_id},
        ).mappings().all()
    causes = sorted(
        ({"id": r["id"], "name": r["name"], "emoji": r["emoji"], "unit": r["unit"], "donation": round(float(r["don"]), 2),
          "units": float(r["don"]) / float(r["cost_per_unit"]), "orders": r["n"]} for r in rows),
        key=lambda x: -x["donation"],
    )
    return {"total": round(sum(x["donation"] for x in causes), 2), "orders": sum(x["orders"] for x in causes), "causes": causes}


@router.get("/me/impact")
def my_impact(cust=Depends(sec.require_customer)):
    """Passeport d'impact : dons générés par les commandes payées de ce client, par cause."""
    return _impact(cust["id"])


@router.get("/public/passport/{code}")
def public_passport(code: str):
    """Passeport partagé (lien WhatsApp / e-mail) : chiffres d'impact seulement, ni nom, ni e-mail. 404 tant qu'il n'y a aucune commande payée."""
    code = "".join(ch for ch in code.upper() if ch.isalnum())[:12]
    with engine.connect() as c:
        cid = c.execute(text("SELECT id FROM customers WHERE referral_code=:c"), {"c": code}).scalar()
    data = _impact(cid) if cid else None
    if not data or not data["orders"]:
        raise HTTPException(404, "Passeport introuvable")
    return {"code": code, **data}


@router.get("/me/invoices")
def my_invoices(cust=Depends(sec.require_customer)):
    with engine.connect() as c:
        rows = c.execute(
            text("SELECT i.number, i.issued_at, i.total_ttc, i.order_id FROM invoices i JOIN orders o ON o.id=i.order_id "
                 "WHERE o.customer_id=:c ORDER BY i.issued_at DESC"),
            {"c": cust["id"]},
        ).mappings().all()
    return [{"number": r["number"], "issued_at": r["issued_at"].isoformat(), "total": float(r["total_ttc"]), "order_id": r["order_id"]} for r in rows]


@router.get("/me/invoices/{number}/pdf")
def my_invoice_pdf(number: str, cust=Depends(sec.require_customer)):
    with engine.connect() as c:
        owned = c.execute(
            text("SELECT 1 FROM invoices i JOIN orders o ON o.id=i.order_id WHERE i.number=:n AND o.customer_id=:c"),
            {"n": number, "c": cust["id"]},
        ).first()
        pdf = get_pdf(c, number) if owned else None
    if not pdf:
        raise HTTPException(404, "Facture introuvable")
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{number}.pdf"'})
