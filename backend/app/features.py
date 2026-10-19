"""Interrupteurs fonctionnels.

PURCHASES_ENABLED : achats ouverts ou fermés (« Bientôt disponible » sur le site). Le serveur refuse aussi toute commande et l'enregistrement de carte
quand ils sont fermés, même si quelqu'un appelle l'API directement. Ordre de priorité : valeur choisie dans l'espace admin (table site_settings),
sinon PURCHASES_ENABLED du .env, sinon ouvert.
ADMIN_EMAILS : adresses (séparées par des virgules) autorisées à ouvrir l'espace admin. Vide = personne."""
import os

from fastapi import HTTPException
from sqlalchemy import text

from .db import engine

PURCHASES_KEY = "purchases_enabled"


def _truthy(v: str) -> bool:
    return v.strip().lower() not in ("false", "0", "no", "off")


def env_purchases() -> bool:
    return _truthy(os.getenv("PURCHASES_ENABLED", "true"))


def get_setting(key: str):
    try:
        with engine.connect() as c:
            return c.execute(text("SELECT value FROM site_settings WHERE `key` = :k"), {"k": key}).scalar()
    except Exception:  # table absente : on retombe sur le .env
        return None


def purchases_enabled() -> bool:
    v = get_setting(PURCHASES_KEY)
    return env_purchases() if v is None else _truthy(v)


def require_purchases() -> None:
    if not purchases_enabled():
        raise HTTPException(503, "La vente d'eSIM ouvre très bientôt.")


def admin_emails() -> set:
    return {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def is_admin(customer) -> bool:
    return bool(customer) and customer.get("email", "").strip().lower() in admin_emails()
