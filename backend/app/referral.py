"""Parrainage : 1,50 € de crédit pour le filleul ET pour le parrain, à une condition : les DEUX ont déjà payé au moins une commande.

Le crédit n'existe donc qu'une fois le filleul passé à l'achat et le parrain lui-même client (anti faux comptes : créer un compte
ne rapporte rien). Si l'A2F par SMS est activée, le filleul doit aussi avoir vérifié son numéro.
Un crédit est une ligne `referral_credits` : disponible -> réservé (commande créée) -> utilisé (commande payée),
ou de nouveau disponible si le paiement échoue / expire. Un crédit n'est jamais fractionné.
"""
import logging
import os
import secrets
from decimal import Decimal

from sqlalchemy import text

log = logging.getLogger("kozz.referral")
REWARD = Decimal("1.50")
MIN_PAY = Decimal("0.50")  # Stripe refuse un paiement inférieur à 0,50 €


def phone_required() -> bool:
    """PHONE_VERIFICATION_ENABLED=true : les crédits de parrainage ne sont débloqués qu'après vérification du numéro du filleul par SMS (A2F)."""
    return os.getenv("PHONE_VERIFICATION_ENABLED", "false").strip().lower() in ("true", "1", "yes", "on")


def _verified(c, customer_id: int) -> bool:
    return bool(c.execute(text("SELECT phone_verified_at IS NOT NULL FROM customers WHERE id=:i"), {"i": customer_id}).scalar())


def referrer_by_code(c, code: str | None) -> int | None:
    code = (code or "").strip().upper()
    if not code or len(code) > 12:
        return None
    return c.execute(text("SELECT id FROM customers WHERE referral_code=:c"), {"c": code}).scalar()


def link_referrer(c, new_id: int, code: str | None) -> bool:
    """À l'inscription : rattache le filleul à son parrain. Aucun crédit à ce stade : voir settle(). Un code invalide est ignoré sans erreur."""
    ref = referrer_by_code(c, code)
    if not ref or ref == new_id:
        return False
    c.execute(text("UPDATE customers SET referred_by=:r WHERE id=:i AND referred_by IS NULL"), {"r": ref, "i": new_id})
    return True


def has_paid(c, customer_id: int) -> bool:
    """A déjà payé au moins une commande (remboursées exclues : acheter puis se faire rembourser ne compte pas)."""
    return bool(c.execute(text("SELECT 1 FROM orders WHERE customer_id=:c AND status IN ('paid','provisioned') LIMIT 1"), {"c": customer_id}).first())


def settle(c, referee_id: int) -> bool:
    """Crédite les deux personnes si toutes les conditions sont réunies (idempotent grâce à la clé unique) :
    le filleul a payé, le parrain a payé, et le numéro du filleul est vérifié quand l'A2F est activée."""
    ref = c.execute(text("SELECT referred_by FROM customers WHERE id=:i"), {"i": referee_id}).scalar()
    if not ref or not has_paid(c, referee_id) or not has_paid(c, ref):
        return False
    if phone_required() and not _verified(c, referee_id):
        return False
    n = c.execute(
        text("INSERT IGNORE INTO referral_credits (customer_id, amount, kind, source_customer_id) VALUES (:c,:a,'referee',:s)"),
        {"c": referee_id, "a": REWARD, "s": ref},
    ).rowcount
    n += c.execute(
        text("INSERT IGNORE INTO referral_credits (customer_id, amount, kind, source_customer_id) VALUES (:p,:a,'referrer',:f)"),
        {"p": ref, "a": REWARD, "f": referee_id},
    ).rowcount
    if n:
        log.info("Parrainage validé : filleul %s, parrain %s, %s € chacun", referee_id, ref, REWARD)
    return bool(n)


def grant_pending(c, customer_id: int) -> bool:
    """Numéro vérifié : si le parrainage remplit les autres conditions, il est validé maintenant."""
    return settle(c, customer_id)


def balance(c, customer_id: int) -> Decimal:
    return Decimal(c.execute(text("SELECT COALESCE(SUM(amount),0) FROM referral_credits WHERE customer_id=:c AND status='available'"), {"c": customer_id}).scalar())


def reserve(c, customer_id: int, gross: Decimal) -> tuple[Decimal, list[int]]:
    """Choisit les crédits à utiliser (entiers), sans descendre sous 0,50 € à payer. Renvoie (remise, ids). À réserver ensuite avec attach()."""
    rows = c.execute(
        text("SELECT id, amount FROM referral_credits WHERE customer_id=:c AND status='available' ORDER BY id FOR UPDATE"), {"c": customer_id}
    ).all()
    cap, total, ids = gross - MIN_PAY, Decimal(0), []
    for rid, amount in rows:
        if total + amount <= cap:
            total += Decimal(amount)
            ids.append(rid)
    return total, ids


def attach(c, ids: list[int], order_id: int) -> None:
    for rid in ids:
        c.execute(text("UPDATE referral_credits SET status='reserved', order_id=:o WHERE id=:i AND status='available'"), {"o": order_id, "i": rid})


def release(c, order_id: int) -> None:
    """Paiement échoué ou expiré : les crédits redeviennent utilisables."""
    c.execute(text("UPDATE referral_credits SET status='available', order_id=NULL WHERE order_id=:o AND status='reserved'"), {"o": order_id})


def on_paid(c, order_id: int) -> None:
    """Commande payée : les crédits réservés sont consommés, puis on regarde si un parrainage peut être validé :
    ce client est-il un filleul qui vient de payer ? ou un parrain dont un filleul avait déjà payé ?"""
    c.execute(text("UPDATE referral_credits SET status='used', used_at=UTC_TIMESTAMP() WHERE order_id=:o AND status='reserved'"), {"o": order_id})
    cid = c.execute(text("SELECT customer_id FROM orders WHERE id=:o"), {"o": order_id}).scalar()
    if not cid:
        return
    settle(c, cid)
    for (fid,) in c.execute(text("SELECT id FROM customers WHERE referred_by=:p"), {"p": cid}).all():
        settle(c, fid)
