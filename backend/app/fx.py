"""Taux de change et conversion des prix (l'euro TTC reste la référence).

Sources : BCE (taux de référence du jour, 29 devises) ; Exchange Rate API (open.er-api.com) pour les devises que la BCE ne publie pas
(AED, SAR, MAD, EGP, QAR, VND). Les taux sont rafraîchis toutes les FX_SYNC_HOURS heures (24 par défaut) et gardés en base.
Un taux de plus de FX_MAX_AGE_HOURS (72 h) n'est plus utilisé : la devise correspondante disparaît (repli sur l'euro).
FX_MARGIN_PCT (2 par défaut) majore le taux : couvre les frais de conversion de Stripe quand le client paie dans une autre devise que l'euro.

Règle de conversion UNIQUE, appliquée ligne par ligne par le serveur (le site affiche la même) :
    prix_en_devise = arrondi( prix_eur × taux × (1 + marge) ) au « pas » de la devise (ex. 10 ¥, 100 ₩), en unités mineures Stripe.
"""
import logging
import os
import threading
import time
import xml.etree.ElementTree as ET
from decimal import ROUND_HALF_UP, Decimal

import httpx
from sqlalchemy import text

from .db import engine

log = logging.getLogger("kozz.fx")

# devise -> (décimales Stripe, pas d'arrondi en unités majeures). Seules des devises acceptées par Stripe Checkout.
# (Exclues exprès : devises à 3 décimales, et ISK/HUF/TWD que Stripe traite à part.)
CURRENCIES: dict[str, tuple[int, int]] = {
    "EUR": (2, 0), "USD": (2, 0), "GBP": (2, 0), "CHF": (2, 0), "CAD": (2, 0), "AUD": (2, 0), "NZD": (2, 0),
    "JPY": (0, 10), "CNY": (2, 0), "HKD": (2, 0), "SGD": (2, 0), "KRW": (0, 100), "INR": (2, 0),
    "SEK": (2, 0), "NOK": (2, 0), "DKK": (2, 0), "PLN": (2, 0), "CZK": (2, 0), "RON": (2, 0),
    "TRY": (2, 0), "ILS": (2, 0), "BRL": (2, 0), "MXN": (2, 0), "ZAR": (2, 0), "THB": (2, 0),
    "MYR": (2, 0), "IDR": (2, 1000), "PHP": (2, 0),
    "AED": (2, 0), "SAR": (2, 0), "MAD": (2, 0), "EGP": (2, 0), "QAR": (2, 0), "VND": (0, 1000),
}
ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
ER_URL = "https://open.er-api.com/v6/latest/EUR"


def margin_pct() -> Decimal:
    """Frais de conversion de Stripe répercutés sur le client (environ 2 %). FX_MARGIN_PCT=0 pour ne rien ajouter."""
    return Decimal(os.getenv("FX_MARGIN_PCT", "2") or "0")


def _margin() -> Decimal:
    return margin_pct() / 100


def fetch_rates() -> dict[str, tuple[Decimal, str]]:
    """{devise: (taux pour 1 €, source)}."""
    out: dict[str, tuple[Decimal, str]] = {}
    try:
        r = httpx.get(ECB_URL, timeout=20)
        r.raise_for_status()
        for c in ET.fromstring(r.text).iter():
            if c.tag.endswith("Cube") and "currency" in c.attrib and "rate" in c.attrib:
                out[c.attrib["currency"]] = (Decimal(c.attrib["rate"]), "ecb")
    except Exception as e:  # noqa: BLE001
        log.warning("BCE indisponible: %s", type(e).__name__)
    missing = [k for k in CURRENCIES if k != "EUR" and k not in out]
    if missing:
        try:
            r = httpx.get(ER_URL, timeout=20)
            r.raise_for_status()
            rates = r.json().get("rates", {})
            for k in missing:
                if k in rates:
                    out[k] = (Decimal(str(rates[k])), "er-api")
        except Exception as e:  # noqa: BLE001
            log.warning("Exchange Rate API indisponible: %s", type(e).__name__)
    return {k: v for k, v in out.items() if k in CURRENCIES and v[0] > 0}


def refresh() -> int:
    rates = fetch_rates()
    if not rates:
        return 0
    with engine.begin() as c:
        for code, (rate, src) in rates.items():
            c.execute(text("REPLACE INTO fx_rates (currency, rate, source) VALUES (:c,:r,:s)"), {"c": code, "r": rate, "s": src})
    log.info("Taux de change mis à jour : %s devises", len(rates))
    return len(rates)


def current() -> tuple[dict[str, Decimal], str | None]:
    """Taux utilisables (marge incluse) et date de la dernière mise à jour. EUR toujours présent (taux 1)."""
    max_age = int(os.getenv("FX_MAX_AGE_HOURS", "72"))
    with engine.connect() as c:
        rows = c.execute(
            text("SELECT currency, rate, fetched_at FROM fx_rates WHERE fetched_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL :h HOUR)"), {"h": max_age}
        ).all()
    m = 1 + _margin()
    rates = {"EUR": Decimal(1)}
    for code, rate, _ in rows:
        if code in CURRENCIES and code != "EUR":
            rates[code] = Decimal(rate) * m
    updated = max((r[2] for r in rows), default=None)
    return rates, updated.isoformat() if updated else None


def to_minor(eur: Decimal, code: str, rates: dict[str, Decimal]) -> int:
    """Prix en euros -> unités mineures Stripe de la devise (cents, yens entiers…), avec le pas d'arrondi de la devise."""
    dec, step = CURRENCIES[code]
    major = Decimal(eur) * rates[code]
    if step:
        major = (major / step).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * step
        major = max(major, Decimal(step))
    minor = (major * (10 ** dec)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(minor)


def from_minor(minor: int, code: str) -> Decimal:
    return Decimal(minor) / (10 ** CURRENCIES[code][0])


def start_scheduler() -> None:
    """Au démarrage : met à jour si les taux ont plus de 20 h ; ensuite toutes les FX_SYNC_HOURS heures."""

    def loop() -> None:
        hours = float(os.getenv("FX_SYNC_HOURS", "24"))
        try:
            with engine.connect() as c:
                age = c.execute(text("SELECT TIMESTAMPDIFF(HOUR, MAX(fetched_at), UTC_TIMESTAMP()) FROM fx_rates")).scalar()
            if age is None or age >= 20:
                refresh()
        except Exception:  # noqa: BLE001
            log.exception("Mise à jour initiale des taux échouée")
        while True:
            time.sleep(hours * 3600)
            try:
                refresh()
            except Exception:  # noqa: BLE001
                log.exception("Mise à jour des taux échouée")

    threading.Thread(target=loop, daemon=True, name="fx-sync").start()
