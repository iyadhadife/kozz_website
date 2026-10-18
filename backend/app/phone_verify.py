"""A2F par SMS : vérification du numéro de téléphone, exigée pour débloquer les crédits de parrainage.

Désactivée par défaut (PHONE_VERIFICATION_ENABLED=false) : les SMS d'un compte Twilio d'essai ne partent que vers des numéros
préalablement vérifiés chez Twilio. À activer une fois le compte Twilio payant, en une ligne dans le .env.
Un numéro vérifié ne peut appartenir qu'à un seul compte (clé unique en base).
"""
import hashlib
import hmac
import logging
import os
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from . import notify, referral, texts
from . import security as sec
from .db import engine

log = logging.getLogger("kozz.phone")
router = APIRouter(prefix="/api")
TTL_MIN, MAX_ATTEMPTS, RESEND_AFTER_S, MAX_SENDS_PER_DAY = 10, 5, 60, 5
E164 = r"^\+[1-9]\d{7,14}$"


def enabled() -> bool:
    return referral.phone_required()


class SendIn(BaseModel):
    phone: str = Field(max_length=30, pattern=E164)
    lang: Optional[str] = Field(None, max_length=8)


class CheckIn(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


def _hash(customer_id: int, phone: str, code: str) -> str:
    return hashlib.sha256(f"{customer_id}:{phone}:{code}".encode()).hexdigest()


def _need_enabled() -> None:
    if not enabled():
        raise HTTPException(404, "La vérification par SMS n'est pas activée.")


@router.post("/me/phone/send-code", status_code=202)
def send_code(body: SendIn, cust=Depends(sec.require_customer)):
    _need_enabled()
    cid, phone = cust["id"], body.phone
    sec.rate_limit(f"phs:{cid}", limit=8, window=3600)
    sec.record_failure(f"phs:{cid}")
    code = f"{secrets.randbelow(10 ** 6):06d}"
    with engine.begin() as c:
        taken = c.execute(text("SELECT id FROM customers WHERE phone_verified_number=:p AND id<>:i"), {"p": phone, "i": cid}).first()
        if taken:
            raise HTTPException(409, "Ce numéro est déjà utilisé par un autre compte.")
        row = c.execute(
            text("SELECT sends, TIMESTAMPDIFF(SECOND, last_sent_at, UTC_TIMESTAMP()) AS ago, TIMESTAMPDIFF(HOUR, first_sent_at, UTC_TIMESTAMP()) AS age "
                 "FROM phone_verifications WHERE customer_id=:i FOR UPDATE"), {"i": cid}).first()
        if row and row[1] < RESEND_AFTER_S:
            raise HTTPException(429, f"Un code vient d'être envoyé. Réessaie dans {RESEND_AFTER_S - row[1]} secondes.")
        sends = 1 if (not row or row[2] >= 24) else row[0] + 1
        if sends > MAX_SENDS_PER_DAY:
            raise HTTPException(429, "Trop de codes envoyés aujourd'hui. Réessaie demain.")
        c.execute(
            text("INSERT INTO phone_verifications (customer_id, phone, code_hash, attempts, sends, expires_at, first_sent_at, last_sent_at) "
                 "VALUES (:i, :p, :h, 0, :s, DATE_ADD(UTC_TIMESTAMP(), INTERVAL :m MINUTE), UTC_TIMESTAMP(), UTC_TIMESTAMP()) "
                 "ON DUPLICATE KEY UPDATE phone=VALUES(phone), code_hash=VALUES(code_hash), attempts=0, sends=VALUES(sends), "
                 "expires_at=VALUES(expires_at), last_sent_at=UTC_TIMESTAMP(), first_sent_at=IF(:s = 1, UTC_TIMESTAMP(), first_sent_at)"),
            {"i": cid, "p": phone, "h": _hash(cid, phone, code), "s": sends, "m": TTL_MIN},
        )
    lg = texts.lang_for(body.lang)
    try:
        notify.send_sms(phone, texts.T(lg, "sms_verify", code=code, min=TTL_MIN))
    except notify.NotConfigured:
        raise HTTPException(503, "L'envoi de SMS n'est pas configuré : impossible de vérifier ton numéro.")
    except Exception as e:  # noqa: BLE001 : le numéro et le code ne vont jamais dans les logs
        log.error("SMS de vérification échoué: %s", type(e).__name__)
        raise HTTPException(502, "Impossible d'envoyer le SMS, vérifie le numéro puis réessaie.")
    return {"sent": True, "expires_in_minutes": TTL_MIN, "resend_in": RESEND_AFTER_S}


@router.post("/me/phone/verify")
def verify_code(body: CheckIn, cust=Depends(sec.require_customer)):
    _need_enabled()
    cid = cust["id"]
    with engine.begin() as c:
        row = c.execute(
            text("SELECT phone, code_hash, attempts, expires_at < UTC_TIMESTAMP() AS expired FROM phone_verifications WHERE customer_id=:i FOR UPDATE"),
            {"i": cid}).first()
        if not row:
            raise HTTPException(404, "Aucun code en attente : demande un nouveau code.")
        if row[3] or row[2] >= MAX_ATTEMPTS:
            c.execute(text("DELETE FROM phone_verifications WHERE customer_id=:i"), {"i": cid})
            raise HTTPException(410, "Ce code a expiré ou a été trop essayé : demande un nouveau code.")
        if not hmac.compare_digest(row[1], _hash(cid, row[0], body.code)):
            c.execute(text("UPDATE phone_verifications SET attempts=attempts+1 WHERE customer_id=:i"), {"i": cid})
            raise HTTPException(400, f"Code incorrect. Il te reste {MAX_ATTEMPTS - row[2] - 1} essai(s).")
        phone = row[0]
        try:
            c.execute(text("UPDATE customers SET phone=:p, phone_verified_number=:p, phone_verified_at=UTC_TIMESTAMP() WHERE id=:i"), {"p": phone, "i": cid})
        except Exception:  # noqa: BLE001 : clé unique, un autre compte a validé ce numéro entre-temps
            raise HTTPException(409, "Ce numéro est déjà utilisé par un autre compte.")
        c.execute(text("DELETE FROM phone_verifications WHERE customer_id=:i"), {"i": cid})
        granted = referral.grant_pending(c, cid)
    return {"verified": True, "phone": phone, "referral_unlocked": granted}
