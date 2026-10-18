"""Livraison des eSIM après paiement confirmé.

Garde-fous contre la double commande (chaque eSIM coûte de l'argent chez le fournisseur) :
  - une ligne `esims` par appareil, clé unique `provider_payment_id` (envoyée à Yesim comme payment_id) ;
  - avant tout nouvel appel pour une ligne déjà tentée, on cherche d'abord la commande chez Yesim (/orders) ;
  - un verrou par commande empêche le webhook et la page de retour de livrer en parallèle.
"""
import logging
import sys
import threading

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from .db import engine
import os

from .providers import firsty, yesim
from .providers.firsty import FirstyError
from .providers.yesim import YesimError

ProviderError = (YesimError, FirstyError)


def get_client():
    """ESIM_PROVIDER=firsty|yesim ; par défaut Firsty s'il est configuré, sinon Yesim."""
    choice = os.getenv("ESIM_PROVIDER", "").strip().lower()
    if choice == "yesim":
        return yesim.get_client()
    return firsty.get_client() or (None if choice == "firsty" else yesim.get_client())

log = logging.getLogger("kozz.fulfillment")
_locks_guard = threading.Lock()
_in_progress: set[int] = set()


def _png(img: str | None) -> str | None:
    if not img:
        return None
    return img.split(",", 1)[1] if img.startswith("data:") else img


def _store_success(c, row_id: int, esim: dict) -> None:
    c.execute(
        text(
            "UPDATE esims SET status='provisioned', iccid=:i, activation_code=:a, qr_png=:q, ios_tap_link=:l, error=NULL WHERE id=:id"
        ),
        {"i": esim.get("iccid"), "a": esim.get("qrcode"), "q": _png(esim.get("img")), "l": esim.get("ios_tap_link"), "id": row_id},
    )


def _provision_one(client, row: dict, plan_id: str) -> None:
    key = row["provider_payment_id"]
    already_tried = row["status"] != "pending" or row["error"] is not None or row["tried"]
    try:
        if already_tried:
            # Une tentative précédente a peut-être abouti sans que nous l'ayons enregistrée : on vérifie chez Yesim
            existing = client.find_order(key)
            if existing:
                with engine.begin() as c:
                    c.execute(
                        text("UPDATE esims SET status='provisioned', iccid=:i, error=:e WHERE id=:id"),
                        {"i": existing.get("iccid"), "e": "Retrouvée chez Yesim : QR code à récupérer dans leur panneau", "id": row["id"]},
                    )
                log.warning("eSIM %s déjà commandée chez Yesim (iccid %s) : QR à récupérer manuellement", key, existing.get("iccid"))
                return
        esim = client.new_esim(plan_id=plan_id, payment_id=key)
        with engine.begin() as c:
            _store_success(c, row["id"], esim)
    except ProviderError as e:
        log.error("Livraison eSIM %s échouée: %s", key, e)
        with engine.begin() as c:
            c.execute(text("UPDATE esims SET status='failed', error=:e WHERE id=:id"), {"e": str(e)[:250], "id": row["id"]})


def _sandbox_plan() -> str | None:
    """Test uniquement : sur le sandbox Firsty, un forfait non associé reçoit un forfait de test (3 Go Global).
    En production (autre URL), on ne devine jamais un forfait : la livraison s'arrête et on le voit dans les logs."""
    if "test." in os.getenv("FIRSTY_BASE_URL", "") and (os.getenv("ESIM_PROVIDER", "").lower() != "yesim"):
        return os.getenv("FIRSTY_SANDBOX_PLAN", "CG3M75T0HXDGLN")
    return None


def fulfill_order(order_id: int) -> str:
    """Livre les eSIM d'une commande payée. Renvoie 'provisioned', 'partial', 'failed' ou 'skipped'."""
    with _locks_guard:
        if order_id in _in_progress:
            return "skipped"
        _in_progress.add(order_id)
    try:
        client = get_client()
        with engine.connect() as c:
            order = c.execute(text("SELECT status FROM orders WHERE id=:i"), {"i": order_id}).mappings().first()
            items = c.execute(
                text(
                    "SELECT oi.id, oi.kind, oi.qty, oi.destination_id, oi.tier_key, p.provider_plan_id "
                    "FROM order_items oi LEFT JOIN plans p ON p.destination_id=oi.destination_id AND p.tier_key=oi.tier_key "
                    "WHERE oi.order_id=:i"
                ),
                {"i": order_id},
            ).mappings().all()
        if not order or order["status"] not in ("paid", "provisioned"):
            return "skipped"
        esim_items = [i for i in items if i["kind"] == "esim"]
        if not esim_items:
            return "skipped"
        if client is None:
            log.error("Commande %s payée mais aucun fournisseur d'eSIM configuré (FIRSTY_* ou YESIM_API_TOKEN) : eSIM non livrées", order_id)
            return "failed"

        for it in esim_items:
            plan_ref = it["provider_plan_id"] or _sandbox_plan()
            if not plan_ref:
                log.error("Commande %s : aucun forfait fournisseur associé à %s/%s", order_id, it["destination_id"], it["tier_key"])
                continue
            for seq in range(it["qty"]):
                key = f"kozz-{it['id']}-{seq}"
                with engine.begin() as c:
                    try:  # crée la ligne avant l'appel : si on plante entre-temps, on saura qu'une tentative a eu lieu
                        c.execute(
                            text("INSERT INTO esims (order_id, order_item_id, seq, provider_payment_id) VALUES (:o,:i,:s,:k)"),
                            {"o": order_id, "i": it["id"], "s": seq, "k": key},
                        )
                        fresh = True
                    except IntegrityError:
                        fresh = False
                    row = dict(c.execute(text("SELECT * FROM esims WHERE provider_payment_id=:k"), {"k": key}).mappings().first())
                if row["status"] == "provisioned":
                    continue
                row["tried"] = not fresh
                _provision_one(client, row, plan_ref)

        with engine.begin() as c:
            states = [r[0] for r in c.execute(text("SELECT status FROM esims WHERE order_id=:o"), {"o": order_id})]
            expected = sum(i["qty"] for i in esim_items)
            only_esims = len(esim_items) == len(items)
            if states.count("provisioned") == expected and only_esims:
                c.execute(text("UPDATE orders SET status='provisioned' WHERE id=:o AND status='paid'"), {"o": order_id})
                return "provisioned"
        return "partial" if "provisioned" in states else "failed"
    finally:
        with _locks_guard:
            _in_progress.discard(order_id)


def fulfill_in_background(order_id: int) -> None:
    """Appelé juste après la confirmation du paiement : ne bloque pas la réponse au webhook Stripe."""
    threading.Thread(target=_safe, args=(order_id,), daemon=True, name=f"fulfill-{order_id}").start()


def _safe(order_id: int) -> None:
    try:
        fulfill_order(order_id)
    except Exception:  # noqa: BLE001 : un thread ne doit jamais mourir en silence
        log.exception("Erreur inattendue pendant la livraison de la commande %s", order_id)


def esims_for_order(c, order_id: int) -> list[dict]:
    rows = c.execute(
        text(
            "SELECT e.status, e.iccid, e.activation_code, e.qr_png, e.ios_tap_link, e.error, oi.label "
            "FROM esims e JOIN order_items oi ON oi.id=e.order_item_id WHERE e.order_id=:o ORDER BY e.id"
        ),
        {"o": order_id},
    ).mappings().all()
    return [
        {
            "label": r["label"],
            "status": r["status"],
            "iccid": r["iccid"],
            "activation_code": r["activation_code"],
            "qr_png": r["qr_png"],
            "ios_tap_link": r["ios_tap_link"],
        }
        for r in rows
    ]


def fulfilment_state(c, order_id: int) -> str:
    """none = pas d'eSIM dans la commande, pending = en cours, ready = livrées, failed = à traiter par un humain."""
    expected = c.execute(text("SELECT COALESCE(SUM(qty),0) FROM order_items WHERE order_id=:o AND kind='esim'"), {"o": order_id}).scalar()
    if not expected:
        return "none"
    states = [r[0] for r in c.execute(text("SELECT status FROM esims WHERE order_id=:o"), {"o": order_id})]
    if states.count("provisioned") >= expected:
        return "ready"
    if "failed" in states:
        return "failed"
    return "pending"


if __name__ == "__main__":  # relance manuelle : python -m app.fulfillment 912
    logging.basicConfig(level=logging.INFO)
    print(fulfill_order(int(sys.argv[1])))
