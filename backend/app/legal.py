"""Identité légale du vendeur, lue dans l'environnement.

On n'invente jamais ces informations : tant qu'elles manquent, aucune facture n'est émise
(une facture sans identité complète du vendeur serait irrégulière).
"""
import os
from decimal import Decimal

from fastapi import APIRouter

router = APIRouter(prefix="/api")


def _e(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def vat_franchise() -> bool:
    return _e("VAT_FRANCHISE", "false").lower() == "true"


def vat_rate() -> Decimal:
    return Decimal("0") if vat_franchise() else Decimal(_e("VAT_RATE", "20"))


def terms_version() -> str:
    return _e("TERMS_VERSION", "2026-10")


def seller() -> dict:
    return {
        "name": _e("SELLER_NAME"),
        "legal_form": _e("SELLER_LEGAL_FORM"),
        "capital": _e("SELLER_CAPITAL"),
        "address": _e("SELLER_ADDRESS"),
        "siren": _e("SELLER_SIREN"),
        "rcs": _e("SELLER_RCS"),
        "vat_number": _e("SELLER_VAT_NUMBER"),
        "vat_franchise": vat_franchise(),
        "email": _e("SELLER_EMAIL"),
        "phone": _e("SELLER_PHONE"),
        "publisher": _e("SELLER_PUBLISHER"),
        "mediator": _e("SELLER_MEDIATOR"),
        "host_name": _e("HOST_NAME"),
        "host_address": _e("HOST_ADDRESS"),
    }


def missing_for_invoice() -> list[str]:
    s = seller()
    need = ["name", "legal_form", "address", "siren"]
    missing = [k for k in need if not s[k]]
    if not s["vat_number"] and not s["vat_franchise"]:
        missing.append("vat_number")
    return missing


@router.get("/legal")
def legal_info():
    """Informations publiques obligatoires (mentions légales) : rien de secret ici."""
    return {"seller": seller(), "terms_version": terms_version(), "complete": not missing_for_invoice()}
