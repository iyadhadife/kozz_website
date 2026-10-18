from decimal import Decimal

# Assiette du don (part du prix HT), tant qu'on ne connaît pas le coût wholesale réel.
# eSIM : 1.0 = le don est 10 % du prix HT (décision produit). Abonnement et recharge : hypothèses de marge, à remplacer.
MARGIN_RATE = {"esim": 1.0, "subscription": 0.30, "topup": 0.07}
DONATION_SHARE = Decimal("0.10")  # 10 % de l'assiette ci-dessus
VAT = Decimal("1.20")


def donation(price_ttc: Decimal, kind: str) -> Decimal:
    return (price_ttc / VAT) * Decimal(str(MARGIN_RATE[kind])) * DONATION_SHARE
