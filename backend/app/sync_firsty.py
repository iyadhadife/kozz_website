"""Synchronise le catalogue du site avec Firsty.

  python -m app.sync_firsty           # simulation : montre ce qui serait ajouté / relié
  python -m app.sync_firsty --apply   # écrit en base

1. Destinations : tout pays proposé par Firsty (/catalog/regions) et absent du site est ajouté (nom français, zone).
   Ses 4 prix sont une ESTIMATION (médiane des prix déjà en base pour chaque usage), marquée « à confirmer » :
   Firsty ne publie aucun prix dans son API, ils sont à remplacer par la vraie grille tarifaire.
2. Liaison : chaque usage reçoit un forfait Firsty (provider_plan_id) : un forfait du pays s'il existe, sinon un forfait
   « global » assez gros (plus petit volume >= au besoin). L'usage « illimité » n'est PAS relié : Firsty ne vend que des
   volumes fixes, on ne peut pas livrer un forfait illimité avec un forfait de 20 Go.
Les drapeaux (SVG) doivent exister dans frontend/public/flags (voir scripts/copy_flags.py).
"""
import statistics
import sys
from pathlib import Path

from babel import Locale
from sqlalchemy import text

from .db import engine
from .providers.firsty import get_client

FR = Locale("fr").territories

# Zones du site (celles déjà utilisées + Afrique, Océanie). Le Maghreb et le Moyen-Orient sont des zones à part.
ZONES = {
    "Maghreb": "DZ LY MA MR TN",
    "Moyen-Orient": "AE BH CY EG IL IQ IR JO KW LB OM PS QA SA SY TR YE",
    "Europe": "AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK",
    "Asie": "AF AM AZ BD BN BT CN GE HK ID IN JP KG KH KR KZ LA LK MM MN MO MV MY NP PH PK SG TH TJ TL TM TW UZ VN",
    "Amériques": "AG AI AR AW BB BL BM BO BR BS BZ CA CL CO CR CU CW DM DO EC GD GF GP GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PR PY SR SV SX TC TT US UY VC VE VG VI",
    "Océanie": "AS AU CK FJ FM GU KI MH MP NC NR NU NZ PF PG PN PW SB TK TO TV VU WF WS",
}
ZONE_OF = {c: z for z, codes in ZONES.items() for c in codes.split()}


def zone_for(code: str) -> str:
    return ZONE_OF.get(code, "Afrique")  # tout le reste du catalogue Firsty est africain (AO, BF, BI, BJ, ...)


def paged(client, path: str) -> list[dict]:
    out, cursor = [], None
    for _ in range(100):
        r = client._http.get(path, headers={"Authorization": f"Bearer {client._auth()}"},
                             params={"limit": 100, **({"cursor": cursor} if cursor else {})})
        r.raise_for_status()
        j = r.json()
        out += j["data"]
        if not j["pagination"]["hasMore"]:
            break
        cursor = j["pagination"]["nextCursor"]
    return out


def choose_plan(plans: list[dict], country: str, gb: int | None) -> dict | None:
    """Forfait du pays si possible, sinon global ; le plus petit qui couvre `gb` Go. Illimité (gb=None) : pas de forfait."""
    if gb is None:
        return None
    usable = [p for p in plans if p["type"] == "data" and not p["recurring"] and p["capacityMb"]]
    for scope in (country, "global"):
        cand = sorted((p for p in usable if p["countryCode"].lower() == scope and p["capacityMb"] >= gb * 1024), key=lambda p: p["capacityMb"])
        if cand:
            return cand[0]
    return None


def main(apply: bool) -> None:
    client = get_client()
    if client is None:
        sys.exit("FIRSTY_CLIENT_ID / FIRSTY_CLIENT_SECRET absents.")
    regions = paged(client, "/catalog/regions")
    plans = paged(client, "/catalog/packages")
    flags = {p.stem for p in Path("/srv/flags").glob("*.svg")} if Path("/srv/flags").exists() else None

    with engine.connect() as c:
        have = {r[0] for r in c.execute(text("SELECT id FROM destinations"))}
        tiers = c.execute(text("SELECT `key`, gb FROM tiers ORDER BY position")).mappings().all()
        prices = {}
        for r in c.execute(text("SELECT tier_key, price_ttc FROM plans")):
            prices.setdefault(r[0], []).append(float(r[1]))
        maxpos = c.execute(text("SELECT COALESCE(MAX(position),0) FROM destinations")).scalar()
    median = {k: round(statistics.median(v), 1) for k, v in prices.items()}

    new = []
    for r in regions:
        code = (r["countryCode"] or "").upper()
        if len(code) != 2 or code in ("AN",) or code.lower() in have:  # AN (Antilles néerlandaises) n'existe plus
            continue
        if flags is not None and code.lower() not in flags:
            continue  # pas de drapeau : on n'affiche pas
        new.append((code.lower(), FR.get(code) or r["name"], zone_for(code)))
    new.sort(key=lambda x: x[1])

    countries = {r["countryCode"].upper() for r in regions}
    print(f"Firsty : {len(countries)} pays, {len(plans)} forfaits (dont pays dédiés : {sum(p['countryCode'].lower() != 'global' for p in plans)})")
    print(f"À ajouter au site : {len(new)} destinations" + (f" (ex. {', '.join(n[1] for n in new[:6])}…)" if new else ""))
    print("Prix estimés des nouvelles destinations (médiane de l'existant, « à confirmer ») :", median)

    links = []
    with engine.connect() as c:
        for did in sorted(have | {n[0] for n in new}):
            for t in tiers:
                p = choose_plan(plans, did, t["gb"])
                if p:
                    links.append((did, t["key"], p["planReference"]))
    print(f"Liaisons usage → forfait Firsty : {len(links)} (illimité non relié)")
    if not apply:
        print("Simulation seulement. Relancer avec --apply pour écrire.")
        return

    with engine.begin() as c:
        for i, (did, name, zone) in enumerate(new, 1):
            c.execute(text("INSERT INTO destinations (id, name, zone, position) VALUES (:i,:n,:z,:p)"), {"i": did, "n": name, "z": zone, "p": maxpos + i})
            for t in tiers:
                c.execute(text("INSERT INTO plans (destination_id, tier_key, price_ttc, price_confirmed) VALUES (:d,:t,:p,FALSE)"),
                          {"d": did, "t": t["key"], "p": median.get(t["key"], 9.9)})
        for did, tk, ref in links:
            c.execute(text("UPDATE plans SET provider_plan_id=:r WHERE destination_id=:d AND tier_key=:t"), {"r": ref, "d": did, "t": tk})
    print("Écrit en base.")


if __name__ == "__main__":
    main("--apply" in sys.argv)
