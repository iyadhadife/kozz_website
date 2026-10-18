"""Émission et conservation des factures.

- Numérotation chronologique continue, sans trou, par année : FA-2026-000001 (compteur verrouillé dans la même transaction).
- Le vendeur et le client sont FIGÉS dans la facture au moment de l'émission ; le PDF est stocké avec son empreinte SHA-256.
- Une facture n'est jamais modifiée ni supprimée (conservation 10 ans). Une erreur se corrige par un avoir, pas par une modification.
- Rien n'est émis tant que l'identité légale du vendeur est incomplète (voir legal.py).
"""
import hashlib
import io
import json
import logging
import os
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import text

from . import legal, texts
from .db import engine

log = logging.getLogger("kozz.invoicing")
CENT = Decimal("0.01")

_FONT_DIR = "/usr/share/fonts/truetype/dejavu"


def _q(x: Decimal) -> Decimal:
    return x.quantize(CENT, rounding=ROUND_HALF_UP)


def _next_number(c, year: int) -> str:
    """Numéro suivant. Le verrou FOR UPDATE tient jusqu'à la fin de la transaction : si l'insertion échoue, le numéro est rendu."""
    c.execute(text("INSERT INTO invoice_counters (year, last_number) VALUES (:y, 0) ON DUPLICATE KEY UPDATE year = year"), {"y": year})
    n = c.execute(text("SELECT last_number FROM invoice_counters WHERE year = :y FOR UPDATE"), {"y": year}).scalar() + 1
    c.execute(text("UPDATE invoice_counters SET last_number = :n WHERE year = :y"), {"n": n, "y": year})
    return f"FA-{year}-{n:06d}"


def compute_lines(items: list[dict], rate: Decimal) -> tuple[list[dict], Decimal, Decimal, Decimal]:
    """Prix TTC -> HT. La TVA totale est TTC - HT : les chiffres de la facture sont toujours cohérents entre eux."""
    divisor = 1 + rate / 100
    lines, total_ttc, total_ht = [], Decimal(0), Decimal(0)
    for it in items:
        ttc = Decimal(it["unit_price"]) * it["qty"]
        ht = _q(ttc / divisor)
        lines.append(
            {
                "label": it["label"],
                "qty": it["qty"],
                "unit_ht": str(_q(ht / it["qty"])),
                "vat_rate": str(rate),
                "total_ht": str(ht),
                "total_ttc": str(_q(ttc)),
            }
        )
        total_ttc += _q(ttc)
        total_ht += ht
    return lines, total_ht, total_ttc - total_ht, total_ttc


def _customer_snapshot(order: dict, account: dict | None, lang: str = "fr") -> dict:
    addr = json.loads(order["billing_address"]) if isinstance(order["billing_address"], str) else (order["billing_address"] or {})
    name = order["billing_name"] or (" ".join(filter(None, [account and account.get("first_name"), account and account.get("last_name")])) or None)
    return {
        "name": name or texts.T(lang, "inv_default_client"),
        "email": (account or {}).get("email") or order["guest_email"],
        "address": addr,
        "country": order["billing_country"] or addr.get("country"),
    }


def _address_lines(a: dict) -> list[str]:
    line1 = " ".join(filter(None, [a.get("line1")]))
    line2 = a.get("line2") or ""
    city = " ".join(filter(None, [a.get("postal_code"), a.get("city")]))
    return [x for x in [line1, line2, city, a.get("country")] if x]


def render_pdf(number: str, issued_at: datetime, seller: dict, customer: dict, lines: list[dict],
               rate: Decimal, total_ht: Decimal, total_vat: Decimal, total_ttc: Decimal, paid_label: str, lang: str = "fr") -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape

    font, bold = "Helvetica", "Helvetica-Bold"
    if os.path.exists(f"{_FONT_DIR}/DejaVuSans.ttf"):  # police Unicode : accents, cyrillique, €
        pdfmetrics.registerFont(TTFont("DejaVu", f"{_FONT_DIR}/DejaVuSans.ttf"))
        pdfmetrics.registerFont(TTFont("DejaVu-Bold", f"{_FONT_DIR}/DejaVuSans-Bold.ttf"))
        font, bold = "DejaVu", "DejaVu-Bold"

    base = ParagraphStyle("b", fontName=font, fontSize=9, leading=12)
    small = ParagraphStyle("s", parent=base, fontSize=7.5, leading=10, textColor=colors.HexColor("#555555"))
    h1 = ParagraphStyle("h1", parent=base, fontName=bold, fontSize=20, leading=24)
    right = ParagraphStyle("r", parent=base, alignment=TA_RIGHT)
    p = lambda t, st=base: Paragraph(escape(str(t)).replace("\n", "<br/>"), st)  # noqa: E731
    eur = lambda v: texts.money(lang, v)  # noqa: E731
    L = lambda k, **kw: texts.T(lang, k, **kw)  # noqa: E731

    seller_lines = [seller["name"], L("inv_capital", form=seller["legal_form"], cap=seller["capital"]) if seller["capital"] else seller["legal_form"], seller["address"]]
    seller_lines += [L("inv_siren", s=seller["siren"]) + (f" · {seller['rcs']}" if seller["rcs"] else "")]
    seller_lines += [L("inv_vat_no", v=seller["vat_number"])] if seller["vat_number"] else []
    seller_lines += [x for x in [seller["email"], seller["phone"]] if x]
    cust_lines = [customer["name"]] + _address_lines(customer.get("address") or {}) + ([customer["email"]] if customer.get("email") else [])

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                            title=L("inv_doc", no=number), author=seller["name"])
    head = Table([[p(L("inv_title"), h1), p(L("inv_no", no=number) + "\n" + L("inv_issue", d=f"{issued_at:%d/%m/%Y}") + "\n" + L("inv_service", d=f"{issued_at:%d/%m/%Y}"), right)]], colWidths=[90 * mm, 84 * mm])
    parties = Table([[p(L("inv_seller") + "\n" + "\n".join(seller_lines)), p(L("inv_client") + "\n" + "\n".join(cust_lines))]], colWidths=[87 * mm, 87 * mm])
    parties.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))

    rows = [[p(L("inv_col_desc"), base), p(L("inv_col_qty"), right), p(L("inv_col_unit"), right), p(L("inv_col_vat"), right), p(L("inv_col_ht"), right), p(L("inv_col_ttc"), right)]]
    for l in lines:
        rows.append([p(l["label"]), p(l["qty"], right), p(eur(l["unit_ht"]), right), p(f"{Decimal(l['vat_rate']):g} %", right), p(eur(l["total_ht"]), right), p(eur(l["total_ttc"]), right)])
    table = Table(rows, colWidths=[68 * mm, 12 * mm, 22 * mm, 14 * mm, 28 * mm, 30 * mm], repeatRows=1)
    table.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.black), ("LINEBELOW", (0, 1), (-1, -1), 0.25, colors.HexColor("#cccccc")),
                               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    totals = Table([[p(L("inv_tot_ht"), right), p(eur(total_ht), right)], [p(L("inv_tot_vat", r=f"{Decimal(rate):g}"), right), p(eur(total_vat), right)],
                    [p(L("inv_tot_ttc"), ParagraphStyle("t", parent=right, fontName=bold)), p(eur(total_ttc), ParagraphStyle("t2", parent=right, fontName=bold))]],
                   colWidths=[144 * mm, 30 * mm])

    mentions = [paid_label, L("inv_currency")]
    if seller["vat_franchise"]:
        mentions.append(L("inv_franchise"))
    if seller["mediator"]:
        mentions.append(L("inv_mediator", m=seller["mediator"]))
    mentions.append(L("inv_keep"))

    doc.build([head, Spacer(1, 8 * mm), parties, Spacer(1, 8 * mm), table, Spacer(1, 4 * mm), totals, Spacer(1, 8 * mm),
               p("\n".join(mentions), small)])
    return buf.getvalue()


def _paid_label(order) -> str:
    """Facture établie en euros. Si le client a payé dans une autre devise, on indique le montant débité, le taux et les frais de conversion."""
    lang, cur = order["lang"], order["currency"]
    if cur == "EUR" or order["charge_amount_minor"] is None:
        return texts.T(lang, "inv_paid")
    from . import fx

    amount = fx.from_minor(order["charge_amount_minor"], cur)
    return texts.T(lang, "inv_paid_fx", amount=f"{amount:,.{fx.CURRENCIES[cur][0]}f}", cur=cur, rate=f"{Decimal(order['fx_rate']):.4f}")


def issue_invoice(order_id: int) -> str | None:
    """Émet la facture d'une commande payée. Idempotent. Renvoie le numéro, ou None si impossible (identité légale incomplète)."""
    miss = legal.missing_for_invoice()
    if miss:
        log.error("Facture NON émise pour la commande %s : identité du vendeur incomplète (%s)", order_id, ", ".join(miss))
        return None
    with engine.begin() as c:
        done = c.execute(text("SELECT number FROM invoices WHERE order_id=:o"), {"o": order_id}).scalar()
        if done:
            return done
        order = c.execute(text("SELECT * FROM orders WHERE id=:o FOR UPDATE"), {"o": order_id}).mappings().first()
        if not order or order["status"] not in ("paid", "provisioned"):
            return None
        account = None
        if order["customer_id"]:
            account = c.execute(text("SELECT email, first_name, last_name FROM customers WHERE id=:i"), {"i": order["customer_id"]}).mappings().first()
        lang = order["lang"]
        items = texts.item_labels(c, order_id, lang)
        if Decimal(order["discount_amount"] or 0) > 0:
            items.append({"label": texts.T(lang, "inv_discount"), "qty": 1, "unit_price": -Decimal(order["discount_amount"])})
        rate = legal.vat_rate()
        lines, total_ht, total_vat, total_ttc = compute_lines(items, rate)
        if total_ttc != Decimal(order["total_ttc"]):
            log.error("Facture %s : total %s ≠ commande %s, émission annulée", order_id, total_ttc, order["total_ttc"])
            return None
        now = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
        seller, customer = legal.seller(), _customer_snapshot(dict(order), dict(account) if account else None, lang)
        number = _next_number(c, now.year)
        pdf = render_pdf(number, now, seller, customer, lines, rate, total_ht, total_vat, total_ttc, _paid_label(order), lang)
        c.execute(
            text(
                "INSERT INTO invoices (number, order_id, issued_at, seller, customer, line_items, vat_rate, total_ht, total_vat, total_ttc, pdf, pdf_sha256) "
                "VALUES (:n,:o,:t,:s,:c,:l,:r,:h,:v,:ttc,:p,:sha)"
            ),
            {"n": number, "o": order_id, "t": now, "s": json.dumps(seller), "c": json.dumps(customer), "l": json.dumps(lines),
             "r": rate, "h": total_ht, "v": total_vat, "ttc": total_ttc, "p": pdf, "sha": hashlib.sha256(pdf).hexdigest()},
        )
    log.info("Facture %s émise pour la commande %s", number, order_id)
    return number


def get_pdf(c, number: str) -> bytes | None:
    row = c.execute(text("SELECT pdf, pdf_sha256 FROM invoices WHERE number=:n"), {"n": number}).mappings().first()
    if not row:
        return None
    pdf = bytes(row["pdf"])
    if hashlib.sha256(pdf).hexdigest() != row["pdf_sha256"]:
        log.critical("Facture %s : empreinte différente, le PDF stocké a été altéré", number)
        return None
    return pdf
