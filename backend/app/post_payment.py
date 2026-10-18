"""Chaîne exécutée après un paiement confirmé : livraison de l'eSIM, facture, puis messages au client.

Chaque étape est idempotente et indépendante : si l'une échoue (fournisseur en panne, SMTP non configuré…),
les autres s'exécutent quand même et on peut relancer plus tard :
  python -m app.post_payment 912        # une commande
  python -m app.post_payment --pending  # toutes celles qui ont des étapes manquantes
"""
import logging
import sys
import threading

from sqlalchemy import text

from .db import engine
from .fulfillment import fulfill_order
from .invoicing import issue_invoice
from .notify import notify_order

log = logging.getLogger("kozz.post_payment")


def process_paid_order(order_id: int) -> dict:
    out = {}
    for name, step in (("fulfilment", fulfill_order), ("invoice", issue_invoice), ("notify", notify_order)):
        try:
            out[name] = step(order_id)
        except Exception:  # noqa: BLE001 : une étape en échec ne doit pas empêcher les suivantes
            log.exception("Étape %s en erreur pour la commande %s", name, order_id)
            out[name] = "error"
    return out


def process_in_background(order_id: int) -> None:
    """Appelé juste après la confirmation du paiement : ne bloque pas la réponse au webhook Stripe."""
    threading.Thread(target=process_paid_order, args=(order_id,), daemon=True, name=f"post-payment-{order_id}").start()


def pending_orders() -> list[int]:
    with engine.connect() as c:
        rows = c.execute(
            text(
                "SELECT o.id FROM orders o LEFT JOIN invoices i ON i.order_id=o.id "
                "WHERE o.status IN ('paid','provisioned') AND (i.id IS NULL "
                "  OR NOT EXISTS (SELECT 1 FROM notifications n WHERE n.order_id=o.id AND n.channel='email' AND n.status='sent')) "
                "ORDER BY o.id"
            )
        )
        return [r[0] for r in rows]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ids = pending_orders() if "--pending" in sys.argv else [int(a) for a in sys.argv[1:]]
    for oid in ids:
        print(oid, process_paid_order(oid))
    if not ids:
        print("rien à faire")
