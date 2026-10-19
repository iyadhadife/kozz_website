from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from . import security as sec
from .auth import router as auth_router
from .legal import router as legal_router
from .phone_verify import router as phone_router
from .og import router as og_router
from .password_reset import router as reset_router
from .share import router as share_router
from .seo import router as seo_router
from .admin import router as admin_router
from .db import engine
from . import features, fx, payments
from .orders import OrderIn, create_order
from .pricing import MARGIN_RATE

app = FastAPI(title="Kozz API", root_path="")
app.include_router(auth_router)
app.include_router(payments.router)
app.include_router(legal_router)
app.include_router(phone_router)
app.include_router(og_router)
app.include_router(reset_router)
app.include_router(share_router)
app.include_router(seo_router)
app.include_router(admin_router)


@app.on_event("startup")
def _start_fx() -> None:
    fx.start_scheduler()  # taux de change : mise à jour au démarrage si besoin, puis toutes les 24 h


@app.get("/api/fx")
def fx_rates():
    """Taux du jour pour afficher les prix : 1 EUR = rates[devise] (marge éventuelle incluse), plus les décimales et le pas d'arrondi."""
    rates, updated = fx.current()
    return {
        "base": "EUR",
        "updated_at": updated,
        "rates": {k: float(v) for k, v in rates.items()},
        "currencies": {k: {"decimals": fx.CURRENCIES[k][0], "step": fx.CURRENCIES[k][1]} for k in rates},
        "sources": "BCE, Exchange Rate API",
        "margin_pct": float(fx.margin_pct()),  # frais de conversion inclus dans les taux ci-dessus
    }


@app.get("/api/config")
def public_config():
    """Réglages publics lus par le site (ex. achats ouverts ou « bientôt disponible »)."""
    return {"purchases_enabled": features.purchases_enabled()}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/health/db")
def health_db():
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(503, "Base de données indisponible")
    return {"status": "ok"}


@app.get("/api/hello")
def hello():
    return {"message": "Hello depuis le backend Python 🐍"}


@app.get("/api/connect")
def connect():
    return {"message": "Connecté au backend Python 🐍"}


_impact_cache: dict = {"at": 0.0, "data": None}


@app.get("/api/impact/global")
def global_impact():
    """Dons générés par l'ensemble des commandes payées (hors remboursées). Agrégats uniquement. Mis en cache 60 s.
    IMPACT_COUNT_FROM=AAAA-MM-JJ (facultatif) ignore les commandes plus anciennes (par ex. les essais avant l'ouverture)."""
    import os
    import time

    if _impact_cache["data"] and time.time() - _impact_cache["at"] < 60:
        return _impact_cache["data"]
    since = os.getenv("IMPACT_COUNT_FROM", "").strip() or "1970-01-01"
    # Comptes de démo (@demo.invalid, voir scripts/seed_demo.py) : exclus des chiffres publics sauf IMPACT_INCLUDE_DEMO=true (jamais en production)
    nodemo = "" if os.getenv("IMPACT_INCLUDE_DEMO", "false").lower() == "true" else         " AND (o.customer_id IS NULL OR o.customer_id NOT IN (SELECT id FROM customers WHERE email LIKE '%@demo.invalid'))"
    try:
        with engine.connect() as c:
            rows = c.execute(
                text(
                    "SELECT ca.id, ca.name, ca.emoji, ca.unit, ca.cost_per_unit, SUM(o.donation_amount) AS don, COUNT(*) AS n "
                    "FROM orders o JOIN causes ca ON ca.id = o.cause_id "
                    "WHERE o.status IN ('paid','provisioned') AND o.created_at >= :s" + nodemo + " GROUP BY ca.id, ca.name, ca.emoji, ca.unit, ca.cost_per_unit"
                ),
                {"s": since},
            ).mappings().all()
    except SQLAlchemyError:
        raise HTTPException(503, "Indisponible")
    causes = sorted(
        (
            {"id": r["id"], "name": r["name"], "emoji": r["emoji"], "unit": r["unit"], "donation": round(float(r["don"]), 2),
             "units": float(r["don"]) / float(r["cost_per_unit"]), "orders": r["n"]}
            for r in rows
        ),
        key=lambda x: -x["donation"],
    )
    total = round(sum(x["donation"] for x in causes), 2)
    orders = sum(x["orders"] for x in causes)
    ok = "o.status IN ('paid','provisioned') AND o.created_at >= :s" + nodemo
    try:
        with engine.connect() as c:
            one = c.execute(
                text(f"SELECT COUNT(DISTINCT COALESCE(CAST(o.customer_id AS CHAR), o.guest_email)) AS donors, COALESCE(SUM(o.total_ttc),0) AS rev, "
                     f"MIN(o.created_at) AS first, COUNT(DISTINCT o.billing_country) AS ccount FROM orders o WHERE {ok}"), {"s": since}).mappings().first()
            months = c.execute(
                text(f"SELECT DATE_FORMAT(o.created_at,'%Y-%m') AS m, COUNT(*) AS n, SUM(o.donation_amount) AS don FROM orders o WHERE {ok} GROUP BY m ORDER BY m"),
                {"s": since}).mappings().all()
            tops = c.execute(
                text(f"SELECT d.id, d.name, SUM(i.qty) AS n, SUM(i.donation) AS don FROM order_items i JOIN orders o ON o.id=i.order_id "
                     f"JOIN destinations d ON d.id=i.destination_id WHERE {ok} AND i.kind='esim' GROUP BY d.id, d.name ORDER BY n DESC, d.name LIMIT 6"),
                {"s": since}).mappings().all()
            esims = c.execute(text(f"SELECT COALESCE(SUM(i.qty),0) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE {ok} AND i.kind='esim'"), {"s": since}).scalar()
            dcount = c.execute(text(f"SELECT COUNT(DISTINCT i.destination_id) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE {ok} AND i.destination_id IS NOT NULL"), {"s": since}).scalar()
            godparents = c.execute(text("SELECT COUNT(*) FROM customers WHERE referred_by IS NOT NULL")).scalar()
    except SQLAlchemyError:
        raise HTTPException(503, "Indisponible")
    for x in causes:
        x["share"] = round(x["donation"] / total, 4) if total else 0
    data = {
        "total": total, "orders": orders, "causes": causes,
        "donors": int(one["donors"] or 0), "esims": int(esims or 0),
        "destinations": int(dcount or 0), "referrals": int(godparents or 0),
        "avg_donation": round(total / orders, 2) if orders else 0,
        "units_total": round(sum(x["units"] for x in causes), 1),
        "since": one["first"].strftime("%Y-%m-%d") if one["first"] else None,
        "months": [{"month": r["m"], "orders": int(r["n"]), "donation": round(float(r["don"]), 2)} for r in months][-12:],
        "top_destinations": [{"id": r["id"], "name": r["name"], "esims": int(r["n"]), "donation": round(float(r["don"]), 2)} for r in tops],
    }
    _impact_cache.update(at=time.time(), data=data)
    return data


@app.get("/api/catalog")
def catalog():
    """Tout le catalogue en un appel : usages, destinations (+ prix par usage), causes, corridors, Kozz Monde."""
    try:
        with engine.connect() as c:
            tiers = c.execute(text("SELECT `key`, name, gb, days, icon, blurb FROM tiers ORDER BY position")).mappings().all()
            dests = c.execute(text("SELECT id, name, zone FROM destinations ORDER BY position")).mappings().all()
            plans = c.execute(text("SELECT destination_id, tier_key, price_ttc, price_confirmed FROM plans")).mappings().all()
            causes = c.execute(text("SELECT id, category, name, unit, cost_per_unit, emoji, signature FROM causes ORDER BY position")).mappings().all()
            corridors = c.execute(text("SELECT id, country, operators, soon FROM corridors ORDER BY position")).mappings().all()
            monde = c.execute(text("SELECT id, name, data_label, price_monthly, popular FROM subscription_plans ORDER BY price_monthly")).mappings().all()
    except SQLAlchemyError:
        raise HTTPException(503, "Catalogue indisponible")

    price = {(p["destination_id"], p["tier_key"]): p for p in plans}
    import json

    return {
        "tiers": [{**t} for t in tiers],
        # prix dans l'ordre des usages, comme attendu par le front
        "destinations": [
            {
                **d,
                "prices": [float(price[(d["id"], t["key"])]["price_ttc"]) for t in tiers],
                "confirmed": [bool(price[(d["id"], t["key"])]["price_confirmed"]) for t in tiers],
            }
            for d in dests
        ],
        "causes": [
            {"id": x["id"], "cat": x["category"], "name": x["name"], "unit": x["unit"], "cost": float(x["cost_per_unit"]), "emoji": x["emoji"], "signature": bool(x["signature"])}
            for x in causes
        ],
        "corridors": [
            {"id": k["id"], "country": k["country"], "operators": json.loads(k["operators"]) if isinstance(k["operators"], str) else k["operators"], "soon": bool(k["soon"])}
            for k in corridors
        ],
        "monde": [
            {"id": m["id"], "name": m["name"], "data": m["data_label"], "price": float(m["price_monthly"]), "popular": bool(m["popular"])}
            for m in monde
        ],
        "margin_rates": MARGIN_RATE,
    }


@app.post("/api/orders", status_code=201, dependencies=[Depends(features.require_purchases)])
def post_order(order: OrderIn, customer=Depends(sec.optional_customer)):
    """Enregistre la commande (statut 'created' = en attente) puis ouvre une session Stripe Checkout.
    Le statut passe à 'paid' uniquement quand Stripe le confirme (webhook)."""
    created = create_order(order, customer)
    email = customer["email"] if customer else order.email.lower()
    return payments.start_checkout(created, email, customer)
