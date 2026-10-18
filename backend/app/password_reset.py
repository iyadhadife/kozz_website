"""Mot de passe oublié : lien à usage unique envoyé par e-mail.

- POST /api/auth/password/forgot  {email, lang}     -> toujours 202 (ne révèle jamais si le compte existe ; l'envoi se fait en tâche de fond
  pour que le temps de réponse soit le même).
- POST /api/auth/password/reset   {token, password} -> 204. Jeton valable 30 min, à usage unique ; seule son empreinte SHA-256 est stockée.
Après un changement : tous les appareils sont déconnectés et un e-mail d'alerte est envoyé.
"""
import hashlib
import logging
import os
import secrets
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from . import notify, texts
from . import security as sec
from .db import engine

log = logging.getLogger("kozz.reset")
router = APIRouter(prefix="/api/auth/password")
SITE_URL = os.getenv("SITE_URL", "https://localhost").rstrip("/")
TTL_MIN = 30
MAX_PER_HOUR = 3  # demandes par compte


class ForgotIn(BaseModel):
    email: str = Field(max_length=255)
    lang: Optional[str] = Field(None, max_length=8)


class ResetIn(BaseModel):
    token: str = Field(min_length=20, max_length=100)
    password: str = Field(max_length=200)
    lang: Optional[str] = Field(None, max_length=8)


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _send_link(email: str, token: str, lang: str | None) -> None:
    lg = texts.lang_for(lang)
    link = f"{SITE_URL}/mot-de-passe/reinitialiser?token={token}"
    html = (f'<p>{texts.T(lg, "reset_html1")}</p>'
            f'<p><a href="{link}" style="display:inline-block;background:#ef7b63;color:#1a1010;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none">{texts.T(lg, "reset_btn")}</a></p>'
            f'<p style="color:#666">{texts.T(lg, "reset_html2", min=TTL_MIN)}</p><p style="color:#666">{texts.T(lg, "reset_html3")}</p>')
    try:
        notify.send_email(email, texts.T(lg, "reset_subject"), texts.T(lg, "reset_text", min=TTL_MIN, link=link), html)
    except notify.NotConfigured:
        log.error("Mot de passe oublié : SMTP non configuré, e-mail non envoyé")
    except Exception as e:  # noqa: BLE001 — jamais d'erreur visible : la réponse est identique que le compte existe ou non
        log.error("Envoi du lien de réinitialisation échoué: %s", type(e).__name__)


def _send_changed(email: str, lang: str | None) -> None:
    lg = texts.lang_for(lang)
    body = texts.T(lg, "changed_text")
    try:
        notify.send_email(email, texts.T(lg, "changed_subject"), body, "<p>" + body.replace("\n\n", "</p><p>").replace("\n", "<br>") + "</p>")
    except Exception as e:  # noqa: BLE001
        log.error("Envoi de l'alerte de changement échoué: %s", type(e).__name__)


@router.post("/forgot", status_code=202)
def forgot(body: ForgotIn, request: Request, tasks: BackgroundTasks):
    email = body.email.strip().lower()
    ip_key = f"forgot:{sec.client_ip(request)}"
    sec.rate_limit(ip_key, limit=8, window=3600)
    sec.record_failure(ip_key)
    if "@" in email:
        with engine.begin() as c:
            cust = c.execute(text("SELECT id, email FROM customers WHERE email = :e"), {"e": email}).mappings().first()
            if cust:
                recent = c.execute(text("SELECT COUNT(*) FROM password_resets WHERE customer_id = :i AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)"), {"i": cust["id"]}).scalar()
                if recent < MAX_PER_HOUR:
                    # un seul lien valide à la fois : les précédents sont invalidés (et restent comptés pour le plafond horaire)
                    c.execute(text("UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE customer_id = :i AND used_at IS NULL"), {"i": cust["id"]})
                    c.execute(text("DELETE FROM password_resets WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)"))  # ménage
                    token = secrets.token_urlsafe(32)
                    c.execute(text("INSERT INTO password_resets (token_hash, customer_id, expires_at) VALUES (:h, :i, DATE_ADD(UTC_TIMESTAMP(), INTERVAL :m MINUTE))"),
                              {"h": _digest(token), "i": cust["id"], "m": TTL_MIN})
                    tasks.add_task(_send_link, cust["email"], token, body.lang)
    return {"status": "sent_if_exists"}


@router.post("/reset", status_code=204)
def reset(body: ResetIn, request: Request, tasks: BackgroundTasks):
    ip_key = f"reset:{sec.client_ip(request)}"
    sec.rate_limit(ip_key, limit=10, window=900)
    with engine.begin() as c:
        row = c.execute(
            text("SELECT r.token_hash, cu.id, cu.email FROM password_resets r JOIN customers cu ON cu.id = r.customer_id "
                 "WHERE r.token_hash = :h AND r.used_at IS NULL AND r.expires_at > UTC_TIMESTAMP() FOR UPDATE"),
            {"h": _digest(body.token)},
        ).mappings().first()
        if not row:
            sec.record_failure(ip_key)
            raise HTTPException(410, "Ce lien est invalide ou a expiré. Demande un nouveau lien.")
        sec.validate_password(body.password, row["email"])
        c.execute(text("UPDATE customers SET password_hash = :p, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = :i"),
                  {"p": sec.hash_password(body.password), "i": row["id"]})
        c.execute(text("UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE customer_id = :i AND used_at IS NULL"), {"i": row["id"]})
        c.execute(text("DELETE FROM sessions WHERE customer_id = :i"), {"i": row["id"]})  # on déconnecte tous les appareils
    sec.clear_failures(ip_key)
    tasks.add_task(_send_changed, row["email"], body.lang)
