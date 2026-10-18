"""Parrainage : 1,50 € de réduction pour le filleul (dès son inscription) et pour le parrain (quand le filleul paie sa 1re commande).

Pourquoi le parrain n'est crédité qu'à la 1re commande payée du filleul : sinon on gagnerait 1,50 € en créant de faux comptes.
Un crédit est une ligne `referral_credits` : disponible -> réservé (commande créée) -> utilisé (commande payée),
ou de nouveau disponible si le paiement échoue / expire. Un crédit n'est jamais fractionné.
"""
import logging
import secrets
from decimal import Decimal

from sqlalchemy import text

log = logging.getLogger("kozz.referral")
REWARD = Decimal("1.50")
MIN_PAY = Decimal("0.50")  # Stripe refuse un paiement inférieur à 0,50 €


def referrer_by_code(c, code: str | None) -> int | None:
    code = (code or "").strip().upper()
    if not code or len(code) > 12:
        return None
    return c.execute(text("SELECT id FROM customers WHERE referral_code=:c"), {"c": code}).scalar()


def link_referrer(c, new_id: int, code: str | None) -> bool:
    """À l'inscription : rattache le filleul à son parrain et lui offre son crédit. Un code invalide est ignoré sans erreur."""
    ref = referrer_by_code(c, code)
    if not ref or ref == new_id:
        return False
    c.execute(text("UPDATE customers SET referred_by=:r WHERE id=:i AND referred_by IS NULL"), {"r": ref, "i": new_id})
    c.execute(
        text("INSERT IGNORE INTO referral_credits (customer_id, amount, kind, source_customer_id) VALUES (:c,:a,'referee',:s)"),
        {"c": new_id, "a": REWARD, "s": ref},
    )
    return True


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
    """Commande payée : les crédits réservés sont consommés ; si c'est la 1re commande payée d'un filleul, son parrain gagne son crédit."""
    c.execute(text("UPDATE referral_credits SET status='used', used_at=UTC_TIMESTAMP() WHERE order_id=:o AND status='reserved'"), {"o": order_id})
    row = c.execute(text("SELECT o.customer_id, c.referred_by FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=:o"), {"o": order_id}).first()
    if not row or not row[1]:
        return
    first = c.execute(
        text("SELECT COUNT(*) FROM orders WHERE customer_id=:c AND status IN ('paid','provisioned','refunded') AND id<>:o"), {"c": row[0], "o": order_id}
    ).scalar()
    if first == 0:  # la clé unique empêche de payer deux fois le même parrainage
        c.execute(
            text("INSERT IGNORE INTO referral_credits (customer_id, amount, kind, source_customer_id) VALUES (:p,:a,'referrer',:f)"),
            {"p": row[1], "a": REWARD, "f": row[0]},
        )
        log.info("Parrain %s crédité de %s € (1re commande du filleul %s)", row[1], REWARD, row[0])
