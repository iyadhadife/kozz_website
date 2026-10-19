"""Espace admin : réservé aux adresses de ADMIN_EMAILS (compte connecté, e-mail vérifié à l'inscription). Contrôle toujours fait côté serveur."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from . import features
from . import security as sec
from .db import engine

log = logging.getLogger("kozz.admin")
router = APIRouter(prefix="/api/admin")


def require_admin(cust=Depends(sec.require_customer)):
    if not features.is_admin(cust):
        raise HTTPException(403, "Accès réservé à l'administrateur.")
    return cust


def _state():
    row = None
    with engine.connect() as c:
        row = c.execute(text("SELECT value, updated_by, updated_at FROM site_settings WHERE `key` = :k"), {"k": features.PURCHASES_KEY}).mappings().first()
    return {
        "purchases_enabled": features.purchases_enabled(),
        "env_default": features.env_purchases(),
        "overridden": row is not None,
        "updated_by": row["updated_by"] if row else None,
        "updated_at": row["updated_at"].isoformat() if row and row["updated_at"] else None,
    }


@router.get("/settings")
def get_settings(admin=Depends(require_admin)):
    return _state()


class SettingsIn(BaseModel):
    purchases_enabled: bool


@router.put("/settings")
def put_settings(body: SettingsIn, admin=Depends(require_admin)):
    with engine.begin() as c:
        c.execute(
            text("INSERT INTO site_settings (`key`, value, updated_by) VALUES (:k, :v, :u) ON DUPLICATE KEY UPDATE value = :v, updated_by = :u"),
            {"k": features.PURCHASES_KEY, "v": "true" if body.purchases_enabled else "false", "u": admin["email"]},
        )
    log.warning("ADMIN %s : achats %s", admin["email"], "OUVERTS" if body.purchases_enabled else "FERMÉS")
    return _state()


@router.delete("/settings")
def reset_settings(admin=Depends(require_admin)):
    """Supprime le choix de l'admin : le réglage PURCHASES_ENABLED du .env s'applique de nouveau."""
    with engine.begin() as c:
        c.execute(text("DELETE FROM site_settings WHERE `key` = :k"), {"k": features.PURCHASES_KEY})
    log.warning("ADMIN %s : réglage des achats remis sur le .env", admin["email"])
    return _state()
