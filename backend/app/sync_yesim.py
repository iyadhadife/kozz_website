"""Associe chaque forfait KozzGo (destination x usage) à un forfait Yesim et contrôle la marge.

  python -m app.sync_yesim            # rapport seul (rien n'est modifié)
  python -m app.sync_yesim --apply    # enregistre provider_plan_id et wholesale_cost

Règle de marge (document « hypothèses tarifaires ») :
  prix HT = TTC / 1,20 ; marge brute = HT - coût ; don = 10 % ; marge nette = 90 % de la marge brute
  garde-fou : marge nette >= 15 % du coût de gros HT, sinon le prix doit être relevé.
Hypothèse À CONFIRMER avec Yesim : le champ `price` de /plans est notre coût partenaire HT en `currency`.
"""
import sys
from decimal import Decimal

from sqlalchemy import text

from .db import engine
from .providers.yesim import YesimError, get_client

VAT, DON, FLOOR = Decimal("1.20"), Decimal("0.10"), Decimal("0.15")


def _listify(v) -> list[str]:
    if v is None:
        return []
    return [str(x).upper() for x in (v if isinstance(v, (list, tuple)) else [v])]


def _gb(plan: dict) -> Decimal | None:
    try:
        n = Decimal(str(plan.get("data")))
    except Exception:  # noqa: BLE001
        return None
    unit = str(plan.get("data_unit") or "GB").upper()
    return n / 1024 if unit.startswith("M") else n if unit.startswith("G") else None


def _is_unlimited(plan: dict) -> bool:
    blob = f"{plan.get('plan_type', '')} {plan.get('name', '')}".lower()
    return "unlim" in blob


def candidates(yplans: list[dict], dest: str, tier: dict) -> list[dict]:
    """Forfaits Yesim mono-pays correspondant exactement à l'usage (Go et jours ; illimité par le nom/type)."""
    out = []
    for p in yplans:
        iso = _listify(p.get("countryIso2"))
        if iso != [dest.upper()] or int(p.get("days") or 0) != tier["days"]:
            continue
        if tier["gb"] is None:
            if _is_unlimited(p):
                out.append(p)
        elif not _is_unlimited(p) and _gb(p) == Decimal(tier["gb"]):
            out.append(p)
    return sorted(out, key=lambda p: Decimal(str(p.get("price") or 0)))


def margin(price_ttc: Decimal, cost: Decimal) -> tuple[Decimal, bool, Decimal]:
    """(marge nette, garde-fou respecté ?, prix TTC minimum pour respecter le garde-fou)"""
    gross = price_ttc / VAT - cost
    net = gross * (1 - DON)
    min_gross = cost * FLOOR / (1 - DON)
    return net, net >= cost * FLOOR, (cost + min_gross) * VAT


def main(apply: bool) -> int:
    client = get_client()
    if client is None:
        print("YESIM_API_TOKEN absent : impossible d'interroger Yesim.")
        return 1
    try:
        yplans = client.plans()
    except YesimError as e:
        print(f"Erreur Yesim : {e}")
        return 1
    print(f"{len(yplans)} forfaits reçus de Yesim\n")

    with engine.begin() as c:
        tiers = [dict(r) for r in c.execute(text("SELECT `key`, name, gb, days FROM tiers ORDER BY position")).mappings()]
        plans = c.execute(text("SELECT p.destination_id d, p.tier_key t, p.price_ttc, d.name FROM plans p JOIN destinations d ON d.id=p.destination_id ORDER BY d.position")).mappings().all()
        missing = 0
        for pl in plans:
            tier = next(t for t in tiers if t["key"] == pl["t"])
            found = candidates(yplans, pl["d"], tier)
            label = f"{pl['name']:<18} {tier['name']:<11}"
            if not found:
                missing += 1
                print(f"✗ {label} aucun forfait Yesim équivalent")
                continue
            best = found[0]
            cost = Decimal(str(best["price"]))
            net, ok, min_ttc = margin(Decimal(pl["price_ttc"]), cost)
            flag = "OK " if ok else "⚠ PRIX À RELEVER (min %.2f € TTC)" % min_ttc
            extra = f" ({len(found)} choix, le moins cher retenu)" if len(found) > 1 else ""
            print(f"✓ {label} plan {best['id']:<10} coût {cost:>6} {best.get('currency', '')}  vente {pl['price_ttc']:>6} € TTC  marge nette {net:>6.2f}  {flag}{extra}")
            if apply:
                c.execute(
                    text("UPDATE plans SET provider_plan_id=:p, wholesale_cost=:w WHERE destination_id=:d AND tier_key=:t"),
                    {"p": str(best["id"]), "w": cost, "d": pl["d"], "t": pl["t"]},
                )
    print(f"\n{len(plans) - missing}/{len(plans)} forfaits associés" + (" et enregistrés." if apply else " (rapport seul : relancer avec --apply)."))
    print("Rappel : confirmer avec Yesim que `price` est bien le coût partenaire HT, et dans quelle devise.")
    return 0


if __name__ == "__main__":
    sys.exit(main("--apply" in sys.argv))
