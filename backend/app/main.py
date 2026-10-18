from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from . import security as sec
from .auth import router as auth_router
from .legal import router as legal_router
from .db import engine
from . import payments
from .orders import OrderIn, create_order
from .pricing import MARGIN_RATE

app = FastAPI(title="Kozz API", root_path="")
app.include_router(auth_router)
app.include_router(payments.router)
app.include_router(legal_router)


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


@app.post("/api/orders", status_code=201)
def post_order(order: OrderIn, customer=Depends(sec.optional_customer)):
    """Enregistre la commande (statut 'created' = en attente) puis ouvre une session Stripe Checkout.
    Le statut passe à 'paid' uniquement quand Stripe le confirme (webhook)."""
    created = create_order(order, customer)
    email = customer["email"] if customer else order.email.lower()
    return payments.start_checkout(created, email)
