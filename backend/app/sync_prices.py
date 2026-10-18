"""Cost engine provisoire : prix de vente = moyenne des prix des concurrents − 5 %, jamais sous un plancher de rentabilité.

  python -m app.sync_prices            # simulation
  python -m app.sync_prices --apply    # écrit en base
  python -m app.sync_prices --loop     # applique puis recommence toutes les PRICE_SYNC_HOURS (24 par défaut)

Source des prix concurrents : fichier CSV (--csv prix.csv) aux colonnes  pays,go,jours,prix_ttc[,source]  (pays = code ISO, ex. jp).
--web : lit les pages pays d'Airalo (robots.txt les autorise ; prix en euros dans les données de la page), 1 s entre deux pages,
avec un User-Agent qui nous identifie. Au premier 403/429 on s'arrête (Saily, lui, bloque les robots : non utilisé).
Correspondance des usages (volume au moins égal au nôtre et durée >= 40 % de la nôtre ; plus petit volume, puis moins cher) :
  city 1 Go/7 j, week 3 Go/10 j, trip 10 Go/30 j. « Illimité » n'est pas touché (non livrable par Firsty).
Plancher (PRICE_FLOOR=true pour l'activer, désactivé par défaut) : tant que le coût de gros n'est connu que pour les forfaits « global » de Firsty (FIRSTY_COSTS_HT),
prix_ttc >= coût × 1,2 (TVA) / 0,9 (don de 10 % du prix HT). Un prix plancher est marqué « à confirmer ».
"""
import logging
import os
import re
import sys
import time
import unicodedata
from decimal import Decimal

import httpx
from babel import Locale
from sqlalchemy import text

from .db import engine
from .pricing import DONATION_SHARE, VAT

log = logging.getLogger("kozz.prices")
EN = Locale("en").territories
UNDERCUT = Decimal("0.95")  # −5 %
SOURCE = "airalo"
# Coût de gros HT des forfaits Firsty (fourni par Firsty, sandbox) ; pas de prix dans leur API.
FIRSTY_COSTS_HT = {"CL1DBCXC5VDGLN": 3.50, "CG3M75T0HXDGLN": 7.00, "CIJLPKWS2RDGLN": 11.00, "CQ4O1E3WS1DGLN": 19.00, "C306BID7SGDGLN": 32.00}
UA = os.getenv("PRICE_BOT_UA", "KozzGoPriceCheck/1.0")
ALIASES = {  # nom anglais Babel -> fragment d'URL Airalo
    "czechia": "czech-republic", "turkiye": "turkey", "bosnia": "bosnia-and-herzegovina", "myanmar-burma": "myanmar",
    "hong-kong-sar-china": "hong-kong", "macao-sar-china": "macau", "congo-kinshasa": "dr-congo", "congo-brazzaville": "congo",
    "cote-d-ivoire": "ivory-coast", "eswatini": "swaziland", "north-macedonia": "macedonia",
}
NEED = {"city": (1, 7), "week": (3, 10), "trip": (10, 30)}  # (Go, jours) de nos usages


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s.replace("&", "and")).strip("-")
    return ALIASES.get(s, s)


class Blocked(Exception):
    """Le site refuse les robots (403/429) : on s'arrête, on ne contourne pas."""


def _resolve(arr: list, i: int, depth: int = 0):
    """Dé-référence le format de données de Nuxt (tableau où les objets pointent vers des indices)."""
    v = arr[i]
    if depth > 5:
        return None
    if isinstance(v, dict):
        return {k: _resolve(arr, x, depth + 1) if isinstance(x, int) and not isinstance(x, bool) else x for k, x in v.items()}
    if isinstance(v, list):
        if v and isinstance(v[0], str) and v[0] in ("Reactive", "ShallowReactive", "Ref"):
            return _resolve(arr, v[1], depth + 1)
        return [_resolve(arr, x, depth + 1) if isinstance(x, int) and not isinstance(x, bool) else x for x in v]
    return v


def parse_airalo(html: str) -> list[tuple[float, int, Decimal]]:
    import json

    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return []
    arr = json.loads(m.group(1))
    plans = []
    for i, v in enumerate(arr):
        if isinstance(v, dict) and {"slug", "price", "day", "amount", "type"} <= v.keys():
            d = _resolve(arr, i)
            pr = d.get("price") or {}
            if d.get("type") == "sim" and not d.get("is_unlimited") and (pr.get("currency") or {}).get("code") == "EUR" and d.get("amount"):
                plans.append((round(d["amount"] / 1024, 2), int(d["day"]), Decimal(str(pr["amount"]))))
    return plans


def fetch_plans(http: httpx.Client, code: str) -> list[tuple[float, int, Decimal]]:
    """[(Go, jours, prix TTC €)] du pays chez Airalo ; [] si la page n'existe pas."""
    name = EN.get(code.upper(), "")
    for cand in dict.fromkeys([slug(name), slug(name.split(",")[0]), slug(re.sub(r"\s*\(.*?\)", "", name))]):
        r = http.get(f"https://www.airalo.com/{cand}-esim")
        if r.status_code in (403, 429):
            raise Blocked(f"Airalo répond {r.status_code}")
        if r.status_code == 200:
            plans = parse_airalo(r.text)
            if plans:
                return plans
        time.sleep(0.5)
    return []


def pick(plans, gb: float, days: int = 0) -> tuple[float, int, Decimal] | None:
    """Forfait comparable : au moins `gb` Go ET `days` jours ; on prend le plus petit volume, puis le moins cher."""
    ok = [p for p in plans if p[0] >= gb and p[1] >= days]
    if not ok:
        return None
    size = min(p[0] for p in ok)
    return min((p for p in ok if p[0] == size), key=lambda p: (p[2], p[1]))


def round_up(x: Decimal, step: Decimal = Decimal("0.1")) -> Decimal:
    return (x / step).to_integral_value(rounding="ROUND_CEILING") * step


def load_csv(path: str, exclude: set[str]) -> dict[str, dict[str, list]]:
    """{source: {pays: [(Go, jours, prix)]}} ; les sources de `exclude` sont ignorées."""
    import csv

    out: dict[str, dict[str, list]] = {}
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            src = (r.get("source") or "csv").strip().lower()
            if src in exclude:
                continue
            out.setdefault(src, {}).setdefault(r["pays"].strip().lower(), []).append(
                (float(r["go"]), int(r["jours"]), Decimal(r["prix_ttc"].replace(",", ".")))
            )
    return out


def run(apply: bool, tables: dict[str, dict], web: bool) -> dict:
    """Plusieurs sources : pour chaque usage, moyenne des prix des concurrents, puis −5 %."""
    with engine.connect() as c:
        dests = [r[0] for r in c.execute(text("SELECT id FROM destinations ORDER BY position"))]
        links = {(r[0], r[1]): r[2] for r in c.execute(text("SELECT destination_id, tier_key, provider_plan_id FROM plans"))}
    stats = {"pays": len(dests), "sans_page": [], "prix": 0, "plancher": 0, "ecartes": 0}
    out, refs = [], []
    with httpx.Client(headers={"User-Agent": UA, "Accept-Language": "en"}, timeout=20, follow_redirects=True) as http:
        for did in dests:
            per_source = {src: t.get(did, []) for src, t in tables.items()}
            if web:
                try:
                    per_source["airalo"] = fetch_plans(http, did)
                except httpx.HTTPError as e:
                    log.warning("Airalo %s : %s", did, type(e).__name__)
                time.sleep(1.0)  # on ne martèle pas leur site
            if not any(per_source.values()):
                stats["sans_page"].append(did)
                continue
            for tier, (gb, days) in NEED.items():
                cands = []
                for src, plans in per_source.items():
                    p = pick(plans, gb, -(-days * 2 // 5))  # durée concurrent >= 40 % de la nôtre
                    if p:
                        cands.append((p[2], src, p))
                if len(cands) >= 3:  # garde-fou : un prix très inférieur aux autres sources est écarté (donnée douteuse)
                    mid = sorted(c[0] for c in cands)[len(cands) // 2]
                    kept = [c for c in cands if c[0] >= mid * Decimal("0.6")]
                    stats["ecartes"] += len(cands) - len(kept)
                    cands = kept
                if not cands:
                    continue
                ref = (sum(c[0] for c in cands) / len(cands)).quantize(Decimal("0.01"))  # moyenne des concurrents
                src = "moyenne " + "+".join(sorted(c[1] for c in cands))
                target = round_up(ref * UNDERCUT)
                cost = FIRSTY_COSTS_HT.get(links.get((did, tier)) or "")
                floor = None if os.getenv("PRICE_FLOOR", "false").lower() != "true" else round_up(Decimal(str(cost)) * VAT / (1 - DONATION_SHARE)) if cost else None
                final, at_floor = (floor, True) if floor and floor > target else (target, False)
                stats["prix"] += 1
                stats["plancher"] += at_floor
                out.append((did, tier, ref, src, final, at_floor, cost))
                refs += [(did, tier, c[1], c[0], f"{c[2][0]:g} GB / {c[2][1]} days") for c in cands]
    if apply and out:
        with engine.begin() as c:
            c.execute(text("DELETE FROM competitor_prices"))
            for did, tier, src, price, label in refs:
                c.execute(text("INSERT INTO competitor_prices (destination_id, tier_key, source, price_ttc, plan_label) VALUES (:d,:t,:s,:p,:l)"),
                          {"d": did, "t": tier, "s": src, "p": price, "l": label})
            for did, tier, ref, label, final, at_floor, cost in out:
                c.execute(text("UPDATE plans SET price_ttc=:p, price_confirmed=:ok, wholesale_cost=:w WHERE destination_id=:d AND tier_key=:t"),
                          {"p": final, "ok": not at_floor, "w": cost, "d": did, "t": tier})
    stats["lignes"] = out
    return stats


def main() -> None:
    logging.basicConfig(level=logging.WARNING)
    apply = "--apply" in sys.argv or "--loop" in sys.argv
    web = "--web" in sys.argv
    csv_path = sys.argv[sys.argv.index("--csv") + 1] if "--csv" in sys.argv else None
    exclude = set(sys.argv[sys.argv.index("--exclude") + 1].split(",")) if "--exclude" in sys.argv else set()
    if not csv_path and not web:
        sys.exit("Indique --csv prix.csv et/ou --web (lecture d'Airalo). --exclude airalo,... ignore des sources du CSV.")
    while True:
        s = run(apply, load_csv(csv_path, exclude) if csv_path else {}, web)
        print(f"{s['pays']} pays · {s['prix']} prix · {s['plancher']} au plancher · {s['ecartes']} relevés écartés · {len(s['sans_page'])} pays sans donnée")
        for did, tier, ref, label, final, at_floor, cost in s["lignes"][:12]:
            print(f"  {did} {tier:5} référence ({label}) {ref} € → {final} €{'  (plancher, coût ' + str(cost) + ')' if at_floor else ''}")
        if "--loop" not in sys.argv:
            return
        time.sleep(float(os.getenv("PRICE_SYNC_HOURS", "24")) * 3600)


if __name__ == "__main__":
    main()
