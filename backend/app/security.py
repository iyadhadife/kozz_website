import hashlib
import os
import secrets
import time
from collections import defaultdict

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException, Request, Response
from sqlalchemy import text

from .db import engine

# --- Mots de passe : Argon2id (sel aléatoire intégré au hash). Le mot de passe n'est jamais stocké ni loggé. ---
_ph = PasswordHasher()
_DUMMY_HASH = _ph.hash(secrets.token_urlsafe(16))  # pour répondre en même temps quand l'e-mail n'existe pas

PASSWORD_MIN, PASSWORD_MAX = 10, 128


def validate_password(password: str, email: str = "") -> None:
    if not PASSWORD_MIN <= len(password) <= PASSWORD_MAX:
        raise HTTPException(422, f"Le mot de passe doit contenir entre {PASSWORD_MIN} et {PASSWORD_MAX} caractères.")
    if email and password.lower() == email.lower():
        raise HTTPException(422, "Le mot de passe ne peut pas être ton e-mail.")


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(stored_hash: str | None, password: str) -> bool:
    """Toujours un calcul Argon2, même sans compte, pour ne pas révéler par le temps de réponse qu'un e-mail existe."""
    try:
        _ph.verify(stored_hash or _DUMMY_HASH, password)
        return stored_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    return _ph.check_needs_rehash(stored_hash)


# --- Limitation des essais (en mémoire : suffisant pour 1 worker ; passer à Redis si on scale) ---
_attempts: dict[str, list[float]] = defaultdict(list)


def rate_limit(key: str, limit: int = 5, window: int = 900) -> None:
    now = time.time()
    recent = [t for t in _attempts[key] if now - t < window]
    _attempts[key] = recent
    if len(recent) >= limit:
        raise HTTPException(429, "Trop de tentatives. Réessaie dans quelques minutes.")


def record_failure(key: str) -> None:
    _attempts[key].append(time.time())


def clear_failures(key: str) -> None:
    _attempts.pop(key, None)


def client_ip(request: Request) -> str:
    # Caddy renseigne X-Forwarded-For ; le backend n'est joignable que via le proxy
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")


# --- Sessions : jeton aléatoire dans un cookie HttpOnly ; seule son empreinte SHA-256 est en base ---
COOKIE = "kozz_session"
SESSION_DAYS = 30
SECURE_COOKIE = os.getenv("COOKIE_SECURE", "true").lower() == "true"


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def start_session(c, customer_id: int, request: Request, response: Response) -> None:
    c.execute(text("DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()"))  # ménage
    token = secrets.token_urlsafe(32)
    c.execute(
        text(
            "INSERT INTO sessions (customer_id, token_hash, user_agent, expires_at) "
            "VALUES (:c, :h, :ua, DATE_ADD(UTC_TIMESTAMP(), INTERVAL :d DAY))"
        ),
        {"c": customer_id, "h": _digest(token), "ua": (request.headers.get("user-agent") or "")[:255], "d": SESSION_DAYS},
    )
    response.set_cookie(
        COOKIE, token, max_age=SESSION_DAYS * 86400, httponly=True, secure=SECURE_COOKIE, samesite="lax", path="/"
    )


def end_session(request: Request, response: Response) -> None:
    token = request.cookies.get(COOKIE)
    if token:
        with engine.begin() as c:
            c.execute(text("DELETE FROM sessions WHERE token_hash = :h"), {"h": _digest(token)})
    response.delete_cookie(COOKIE, path="/")


def optional_customer(request: Request):
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    with engine.connect() as c:
        row = c.execute(
            text(
                "SELECT cu.* FROM sessions s JOIN customers cu ON cu.id = s.customer_id "
                "WHERE s.token_hash = :h AND s.expires_at > UTC_TIMESTAMP()"
            ),
            {"h": _digest(token)},
        ).mappings().first()
    return dict(row) if row else None


def require_customer(request: Request):
    customer = optional_customer(request)
    if not customer:
        raise HTTPException(401, "Connexion requise")
    return customer


def revoke_other_sessions(c, customer_id: int, request: Request) -> None:
    current = _digest(request.cookies.get(COOKIE, ""))
    c.execute(text("DELETE FROM sessions WHERE customer_id = :c AND token_hash <> :h"), {"c": customer_id, "h": current})
