import secrets
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from . import security as sec
from .db import engine
from .fulfillment import esims_for_order, fulfilment_state
from .invoicing import get_pdf

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


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class ProfileIn(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)


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
        "status": {
            "key": key,
            "label": label,
            "cashback": cashback,
            "spend": round(spend, 2),
            "next": {"label": nxt[1], "threshold": nxt[2], "remaining": round(nxt[2] - spend, 2)} if nxt else None,
        },
    }


@router.post("/auth/register", status_code=201)
def register(body: RegisterIn, request: Request, response: Response):
    email = body.email.strip().lower()
    sec.validate_password(body.password, email)
    pw_hash = sec.hash_password(body.password)

    with engine.begin() as c:
        for _ in range(5):  # code de parrainage unique
            code = "".join(secrets.choice(_REF_ALPHABET) for _ in range(8))
            try:
                cid = c.execute(
                    text("INSERT INTO customers (email, password_hash, first_name, referral_code) VALUES (:e, :p, :f, :r)"),
                    {"e": email, "p": pw_hash, "f": _clean(body.first_name), "r": code},
                ).lastrowid
                break
            except IntegrityError as e:
                if "email" in str(e.orig).lower():
                    raise HTTPException(409, "Un compte existe déjà avec cet e-mail.")
        else:
            raise HTTPException(500, "Création du compte impossible, réessaie.")
        sec.start_session(c, cid, request, response)
        cust = c.execute(text("SELECT * FROM customers WHERE id = :i"), {"i": cid}).mappings().first()
        return _profile(c, cust)


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
    with engine.begin() as c:
        c.execute(
            text("UPDATE customers SET first_name = :f, last_name = :l WHERE id = :i"),
            {"f": _clean(body.first_name), "l": _clean(body.last_name), "i": cust["id"]},
        )
        fresh = c.execute(text("SELECT * FROM customers WHERE id = :i"), {"i": cust["id"]}).mappings().first()
        return _profile(c, fresh)


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
