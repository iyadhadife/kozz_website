from decimal import Decimal

# Hypothèse de marge brute HT (part du prix HT) tant que le Cost Engine n'est pas branché.
MARGIN_RATE = {"esim": 0.45, "subscription": 0.30, "topup": 0.07}
DONATION_SHARE = Decimal("0.10")  # 10 % de la marge brute HT
VAT = Decimal("1.20")


def donation(price_ttc: Decimal, kind: str) -> Decimal:
    return (price_ttc / VAT) * Decimal(str(MARGIN_RATE[kind])) * DONATION_SHARE
