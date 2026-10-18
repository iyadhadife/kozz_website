import json
import re
from decimal import Decimal
from typing import Literal, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from . import legal, referral
from .db import engine
from .pricing import donation

TOPUP_AMOUNTS = {5, 10, 20, 50}


class ItemIn(BaseModel):
    kind: Literal["esim", "subscription", "topup"]
    qty: int = Field(1, ge=1, le=10)
    # esim
    destination_id: Optional[str] = None
    tier_key: Optional[str] = None
    # subscription (Kozz Monde)
    subscription_id: Optional[str] = None
    # topup
    corridor_id: Optional[str] = None
    operator: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=30)
    amount: Optional[int] = None


class OrderIn(BaseModel):
    # requis seulement pour un invité ; un client connecté est identifié par sa session
    email: Optional[str] = Field(None, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    cause_id: str = Field(max_length=20)
    items: list[ItemIn] = Field(min_length=1, max_length=20)
    # Consentements exprès, exigés avant tout paiement (conservés avec la date et la version des CGV)
    accept_terms: bool = False
    waive_withdrawal: bool = False


def _price_item(c, it: ItemIn):
    """Retrouve le prix et le libellé EN BASE : on ne fait jamais confiance au prix envoyé par le navigateur."""
    if it.kind == "esim":
        row = c.execute(
            text(
                "SELECT d.name AS dest, t.name AS tier, t.gb, t.days, p.price_ttc FROM plans p "
                "JOIN destinations d ON d.id = p.destination_id JOIN tiers t ON t.`key` = p.tier_key "
                "WHERE p.destination_id = :d AND p.tier_key = :t"
            ),
            {"d": it.destination_id, "t": it.tier_key},
        ).mappings().first()
        if not row:
            raise HTTPException(422, "Forfait inconnu")
        data = "Illimité" if row["gb"] is None else f"{row['gb']} Go"
        return Decimal(row["price_ttc"]), f"eSIM {row['dest']} · {data} / {row['days']} j"

    if it.kind == "subscription":
        row = c.execute(text("SELECT name, price_monthly FROM subscription_plans WHERE id = :i"), {"i": it.subscription_id}).mappings().first()
        if not row:
            raise HTTPException(422, "Abonnement inconnu")
        return Decimal(row["price_monthly"]), f"Kozz Monde · {row['name']} (mensuel)"

    row = c.execute(text("SELECT country, operators, soon FROM corridors WHERE id = :i"), {"i": it.corridor_id}).mappings().first()
    if not row or row["soon"]:
        raise HTTPException(422, "Corridor indisponible")
    operators = json.loads(row["operators"]) if isinstance(row["operators"], str) else row["operators"]
    if it.operator not in operators:
        raise HTTPException(422, "Opérateur inconnu")
    if it.amount not in TOPUP_AMOUNTS:
        raise HTTPException(422, "Montant invalide")
    if not it.phone or len(re.sub(r"\D", "", it.phone)) < 8:
        raise HTTPException(422, "Numéro invalide")
    return Decimal(it.amount), f"Recharge {row['country']} · {it.operator}"


def create_order(order: OrderIn, customer: Optional[dict] = None):
    if not customer and not order.email:
        raise HTTPException(422, "E-mail requis")
    if any(it.kind == "topup" for it in order.items):
        raise HTTPException(422, "Les recharges pour un proche ne sont plus proposées.")
    if not (order.accept_terms and order.waive_withdrawal):
        raise HTTPException(422, "Tu dois accepter les conditions générales et demander l'exécution immédiate pour continuer.")
    with engine.begin() as c:  # une seule transaction : tout ou rien
        cause = c.execute(text("SELECT id, name, unit, cost_per_unit FROM causes WHERE id = :i"), {"i": order.cause_id}).mappings().first()
        if not cause:
            raise HTTPException(422, "Cause inconnue")

        lines, total, don_total = [], Decimal(0), Decimal(0)
        for it in order.items:
            unit_price, label = _price_item(c, it)
            line_total = unit_price * it.qty
            don = donation(line_total, it.kind)
            lines.append((it, label, unit_price, don))
            total += line_total
            don_total += don

        # Crédit de parrainage (clients connectés seulement) : calculé ici, jamais envoyé par le navigateur.
        gross = total
        discount, credit_ids = referral.reserve(c, customer["id"], gross) if customer else (Decimal(0), [])
        total = gross - discount
        if discount:  # le don suit le montant réellement encaissé
            ratio = total / gross
            don_total = don_total * ratio
            lines = [(it, label, unit_price, don * ratio) for it, label, unit_price, don in lines]

        # Connecté : commande rattachée au compte. Invité : on garde seulement l'e-mail, jamais de compte implicite.
        order_id = c.execute(
            text("INSERT INTO orders (customer_id, guest_email, cause_id, total_ttc, discount_amount, donation_amount, terms_accepted_at, terms_version, withdrawal_waiver_at) "
                 "VALUES (:c, :g, :k, :t, :disc, :d, UTC_TIMESTAMP(), :tv, UTC_TIMESTAMP())"),
            {
                "c": customer["id"] if customer else None,
                "g": None if customer else order.email.lower(),
                "k": cause["id"], "t": total, "disc": discount, "d": don_total.quantize(Decimal("0.0001")), "tv": legal.terms_version(),
            },
        ).lastrowid
        referral.attach(c, credit_ids, order_id)

        for it, label, unit_price, don in lines:
            c.execute(
                text(
                    "INSERT INTO order_items (order_id, kind, label, destination_id, tier_key, subscription_id, corridor_id, operator, phone, qty, unit_price, donation) "
                    "VALUES (:o, :k, :l, :d, :t, :s, :c, :op, :ph, :q, :u, :dn)"
                ),
                {
                    "o": order_id, "k": it.kind, "l": label, "d": it.destination_id, "t": it.tier_key,
                    "s": it.subscription_id, "c": it.corridor_id, "op": it.operator, "ph": it.phone,
                    "q": it.qty, "u": unit_price, "dn": don.quantize(Decimal("0.0001")),
                },
            )

    return {
        "order_id": order_id,
        "total": float(total),
        "discount": float(discount),
        "donation": float(don_total),
        "cause": {"id": cause["id"], "name": cause["name"], "unit": cause["unit"]},
        "impact_units": float(don_total / Decimal(cause["cost_per_unit"])),
        # lignes à facturer (prix issus de la base) : consommées par payments.py, jamais renvoyées au navigateur
        "_lines": [{"kind": it.kind, "label": label, "unit_price": unit_price, "qty": it.qty} for it, label, unit_price, _ in lines],
        "_discount": discount,
    }
