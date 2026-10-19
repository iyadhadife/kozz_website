"""Messages au client après une commande payée : e-mail (facture + eSIM + mentions légales) et SMS (lien sécurisé).

- E-mail : SMTP standard (Brevo, Amazon SES, Postmark, OVH…). C'est le « support durable » exigé par le droit de la consommation.
- SMS : Twilio. Le SMS ne contient par défaut qu'un lien : un SMS peut être intercepté, un QR code d'eSIM est un identifiant sensible.
- Chaque envoi est journalisé (table notifications) : preuve d'envoi, et jamais deux fois le même message.
"""
import base64
import logging
import os
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from html import escape

import httpx
from sqlalchemy import text

from decimal import Decimal

from . import emailkit, legal, texts
from .db import engine
from .fulfillment import esims_for_order
from .invoicing import get_pdf

log = logging.getLogger("kozz.notify")
logging.getLogger("httpx").setLevel(logging.WARNING)
from .site import SITE_URL
E164 = re.compile(r"^\+[1-9]\d{6,14}$")


class NotConfigured(Exception):
    pass


def _env(k: str) -> str:
    return os.getenv(k, "").strip()


def mask_email(a: str) -> str:
    user, _, dom = a.partition("@")
    return f"{user[:1]}***@{dom}"


def mask_phone(p: str) -> str:
    return f"{p[:3]}•••••{p[-2:]}" if len(p) > 6 else "•••"


# ---------- transports ----------
def send_email(to: str, subject: str, text_body: str, html_body: str,
               attachments: list[tuple[str, bytes, str]] | None = None, inline: list[tuple[str, bytes]] | None = None) -> None:
    host, sender = _env("SMTP_HOST"), _env("SMTP_FROM")
    if not host or not sender:
        raise NotConfigured("SMTP non configuré")
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = sender, to, subject
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    html_part = msg.get_payload()[1]
    for cid, data in inline or []:
        html_part.add_related(data, "image", "png", cid=f"<{cid}>")
    for name, data, mime in attachments or []:
        maintype, _, subtype = mime.partition("/")
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=name)

    mode, port = _env("SMTP_SECURITY").lower() or "starttls", int(_env("SMTP_PORT") or 587)
    ctx = ssl.create_default_context()
    if mode == "ssl":
        server = smtplib.SMTP_SSL(host, port, timeout=20, context=ctx)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
    with server:
        if mode == "starttls":
            server.starttls(context=ctx)
        if _env("SMTP_USER"):
            server.login(_env("SMTP_USER"), _env("SMTP_PASSWORD"))
        server.send_message(msg)


def sms_notifications_enabled() -> bool:
    """SMS_NOTIFICATIONS_ENABLED=false (défaut) : les confirmations de commande partent uniquement par e-mail."""
    return _env("SMS_NOTIFICATIONS_ENABLED").lower() in ("true", "1", "yes", "on")


def send_sms(to: str, body: str) -> None:
    sid, token, sender = _env("TWILIO_ACCOUNT_SID"), _env("TWILIO_AUTH_TOKEN"), _env("TWILIO_FROM")
    if not (sid and token and sender):
        raise NotConfigured("Twilio non configuré")
    if not E164.match(to):
        raise ValueError("numéro invalide")
    base = _env("TWILIO_BASE_URL") or "https://api.twilio.com"
    # TWILIO_FROM peut être un numéro (+1…) ou l'identifiant d'un Messaging Service (MG…)
    who = {"MessagingServiceSid": sender} if sender.startswith("MG") else {"From": sender}
    if sender.startswith("whatsapp:"):  # même API, le numéro destinataire prend le préfixe whatsapp:
        to = f"whatsapp:{to}"
    try:
        r = httpx.post(f"{base}/2010-04-01/Accounts/{sid}/Messages.json", data={"To": to, "Body": body, **who},
                       auth=(sid, token), timeout=15)
    except httpx.HTTPError as e:
        raise RuntimeError(f"Twilio injoignable ({type(e).__name__})") from None
    if r.status_code >= 300:
        raise RuntimeError(f"Twilio {r.status_code}: {r.text[:120]}")


# ---------- contenu ----------
def _strip_accents(s: str) -> str:
    return s.translate(str.maketrans("àâäçéèêëîïôöùûüÿÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ", "aaaceeeeiioouuuyAAACEEEEIIOOUUUY"))


def build_email(o: dict, esims: list[dict], invoice_no: str | None) -> tuple[str, str, str, list]:
    lang = o.get("lang") or "fr"
    L = lambda k, **kw: texts.T(lang, k, **kw)  # noqa: E731
    money = lambda x: texts.money(lang, x)  # noqa: E731
    s = legal.seller()
    name = o["name"] or ""
    link = f"{SITE_URL}/commande/succes?session_id={o['session_id']}"
    waiver = o["withdrawal_waiver_at"].strftime("%d/%m/%Y") if o["withdrawal_waiver_at"] else None
    subject = L("subject_full" if esims else "subject_inv", id=o["id"])

    qty = lambda i: f"{i['qty']} × " if i["qty"] > 1 else ""  # noqa: E731
    recap = [f"- {qty(i)}{i['label']} : {money(i['qty'] * i['unit_price'])}" for i in o["items"]]
    charged = ""
    if o.get("currency") and o["currency"] != "EUR" and o.get("charge_amount_minor") is not None:
        from . import fx

        amount = fx.from_minor(o["charge_amount_minor"], o["currency"])
        charged = L("charged", amount=f"{amount:,.{fx.CURRENCIES[o['currency']][0]}f}", cur=o["currency"], rate=f"{Decimal(o['fx_rate']):.4f}")
    t = [L("hello", name=" " + name if name else ""), "", L("thanks", id=o["id"], total=money(o["total"])), "", *recap, ""]
    if charged:
        t += [charged, ""]
    rows = "".join(
        f'<tr><td style="padding:10px 0;border-bottom:1px solid #f0e9e0;font:600 15px Poppins,Arial,sans-serif;color:#1d1b20">{escape(qty(i))}{escape(i["label"])}</td>'
        f'<td align="right" style="padding:10px 0;border-bottom:1px solid #f0e9e0;font:600 15px Poppins,Arial,sans-serif;color:#1d1b20;white-space:nowrap">{escape(money(i["qty"] * i["unit_price"]))}</td></tr>'
        for i in o["items"])
    h = [emailkit.p(escape(L("hello", name=" " + name if name else ""))),
         emailkit.p(escape(L("thanks", id=o["id"], total=money(o["total"])))),
         f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;background:#faf7f3;border-radius:14px"><tr><td style="padding:6px 18px">'
         f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table></td></tr></table>']
    if charged:
        h.append(emailkit.p(escape(charged), muted=True))
    inline = []
    for n, e in enumerate(esims):
        if e["status"] == "failed" or (not e["qr_png"] and not e["activation_code"]):
            t += [L("esim_pending", label=e["label"]), ""]
            h.append(f"<p>{escape(L('esim_pending', label=e['label']))}</p>")
            continue
        t += [L("install_title", label=e["label"]), L("install_steps"),
              L("activation", code=e["activation_code"]) if e["activation_code"] else "", L("iphone", link=e["ios_tap_link"]) if e["ios_tap_link"] else "",
              L("find_qr", link=link), ""]
        h.append(f'<h3 style="margin:22px 0 6px;font:700 19px Poppins,Arial,sans-serif;color:#d4553c">{escape(e["label"])}</h3><ol style="margin:0 0 10px;padding-left:20px;line-height:1.7">{L("html_steps")}</ol>')
        if e["qr_png"]:
            cid = f"qr{n}"
            inline.append((cid, base64.b64decode(e["qr_png"])))
            h.append(f'<p style="text-align:center;margin:14px 0"><img src="cid:{cid}" alt="{escape(L("qr_alt"))}" width="200" height="200" style="background:#fff;padding:10px;border:2px dashed #ef7b63;border-radius:16px"></p>')
        if e["activation_code"]:
            h.append(emailkit.p(f"{escape(L('manual_code'))} <code style='background:#faf7f3;padding:3px 8px;border-radius:6px;font-weight:700'>{escape(e['activation_code'])}</code>"))
        if e["ios_tap_link"] and e["ios_tap_link"].startswith("https://"):
            h.append(emailkit.button(L("iphone_link"), e["ios_tap_link"]))
        h.append(emailkit.p(escape(L("qr_warn")), muted=True))
    if invoice_no:
        t += [L("inv_attached", no=invoice_no), ""]
        h.append(emailkit.p("📎 " + escape(L("inv_attached", no=invoice_no))))
    t += [L("impact", cause=o["cause"]), ""]
    h.append(f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0"><tr><td style="background:#fdeee9;border-radius:14px;padding:14px 18px;font:600 15px/1.5 Poppins,Arial,sans-serif;color:#d4553c">💚 {escape(L("impact", cause=o["cause"]))}</td></tr></table>')

    legal_t = [L("legal_title"),
               L("withdrawal_waived", date=waiver) if waiver else L("withdrawal_see"),
               L("warranty"),
               L("links", cgv=f"{SITE_URL}/cgv", ml=f"{SITE_URL}/mentions-legales", conf=f"{SITE_URL}/confidentialite"),
               L("mediator", m=s["mediator"]) if s["mediator"] else "",
               f"{s['name']} · {s['legal_form']} · SIREN {s['siren']} · {s['address']}" if s["name"] else "", L("contact", e=s["email"]) if s["email"] else ""]
    t += [l for l in legal_t if l]
    h.append('<div style="margin-top:22px;padding-top:14px;border-top:1px solid #f0e9e0;font:400 12px/1.6 Poppins,Arial,sans-serif;color:#6b6570">' + "<br>".join(escape(l) for l in legal_t if l) + "</div>")
    inline.append(("logo", emailkit.logo_png()))
    return subject, "\n".join(t), emailkit.layout(subject, "".join(h), preheader=L("thanks", id=o["id"], total=money(o["total"])), lang=lang), inline


def build_sms(o: dict, esims: list[dict]) -> str:
    lang = o.get("lang") or "fr"
    link = f"{SITE_URL}/commande/succes?session_id={o['session_id']}"
    body = texts.T(lang, "sms_confirmed", id=o["id"])
    if esims:
        body += texts.T(lang, "sms_install", link=link)
        if _env("SMS_INCLUDE_ACTIVATION_CODE").lower() == "true":
            code = next((e["activation_code"] for e in esims if e["activation_code"]), None)
            body += texts.T(lang, "sms_code", code=code) if code else ""
    body += texts.T(lang, "sms_invoice")
    return _strip_accents(body)


# ---------- orchestration ----------
def _log(order_id: int, channel: str, recipient: str, status: str, error: str | None = None) -> None:
    with engine.begin() as c:
        c.execute(
            text("INSERT INTO notifications (order_id, channel, kind, recipient, status, error) VALUES (:o,:c,'order',:r,:s,:e) "
                 "ON DUPLICATE KEY UPDATE status=:s, error=:e, recipient=:r"),
            {"o": order_id, "c": channel, "r": recipient, "s": status, "e": (error or "")[:250] or None},
        )


def _already_sent(order_id: int, channel: str) -> bool:
    with engine.connect() as c:
        return c.execute(text("SELECT 1 FROM notifications WHERE order_id=:o AND channel=:c AND kind='order' AND status='sent'"), {"o": order_id, "c": channel}).first() is not None


def _load(order_id: int) -> dict | None:
    with engine.connect() as c:
        o = c.execute(
            text("SELECT o.*, ca.name AS cause, cu.email AS account_email, cu.first_name AS first_name FROM orders o "
                 "JOIN causes ca ON ca.id=o.cause_id LEFT JOIN customers cu ON cu.id=o.customer_id WHERE o.id=:o"), {"o": order_id}
        ).mappings().first()
        if not o or o["status"] not in ("paid", "provisioned"):
            return None
        items = texts.item_labels(c, order_id, o["lang"])  # libellés dans la langue de la commande
        esims = esims_for_order(c, order_id)
        inv = c.execute(text("SELECT number FROM invoices WHERE order_id=:o"), {"o": order_id}).scalar()
        pdf = get_pdf(c, inv) if inv else None
    d = dict(o)
    d.update(id=order_id, items=items, total=float(o["total_ttc"]), session_id=o["stripe_session_id"],
             email=o["account_email"] or o["guest_email"], name=o["billing_name"] or o["first_name"] or "")
    return {"order": d, "esims": esims, "invoice_no": inv, "pdf": pdf}


def notify_order(order_id: int) -> dict:
    """Envoie l'e-mail puis le SMS (une seule fois chacun). Renvoie l'état par canal."""
    data = _load(order_id)
    if not data:
        return {}
    o, esims, inv, pdf = data["order"], data["esims"], data["invoice_no"], data["pdf"]
    result = {}

    if not _already_sent(order_id, "email"):
        if not o["email"]:
            result["email"] = "skipped"
        elif not pdf and _env("ALLOW_EMAIL_WITHOUT_INVOICE").lower() != "true":
            # Pas de facture (identité du vendeur incomplète) : on n'envoie pas, sinon l'e-mail serait marqué « envoyé » sans
            # facture et ne serait jamais renvoyé avec. Il partira au prochain `python -m app.post_payment --pending`.
            log.warning("Commande %s : e-mail retenu, aucune facture émise (compléter les SELLER_*)", order_id)
            result["email"] = "waiting_invoice"
        else:
            try:
                subject, text_body, html_body, inline = build_email(o, esims, inv)
                send_email(o["email"], subject, text_body, html_body,
                           attachments=[(f"{inv}.pdf", pdf, "application/pdf")] if pdf else None, inline=inline)
                _log(order_id, "email", mask_email(o["email"]), "sent")
                result["email"] = "sent"
            except NotConfigured as e:
                _log(order_id, "email", mask_email(o["email"]), "skipped", str(e))
                result["email"] = "skipped"
            except Exception as e:  # noqa: BLE001 : on journalise sans détailler (l'erreur peut contenir l'adresse)
                log.error("E-mail commande %s échoué: %s", order_id, type(e).__name__)
                _log(order_id, "email", mask_email(o["email"]), "failed", type(e).__name__)
                result["email"] = "failed"

    if not _already_sent(order_id, "sms"):
        phone = (o["customer_phone"] or "").replace(" ", "")
        with engine.connect() as cn:  # préférence du compte (invité : SMS autorisé)
            sms_ok = cn.execute(text("SELECT COALESCE(c.notif_sms, 1) FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=:o"), {"o": order_id}).scalar()
        if not sms_notifications_enabled():
            result["sms"] = "skipped"  # confirmations par e-mail uniquement (SMS_NOTIFICATIONS_ENABLED=false)
        elif not phone or not sms_ok:
            result["sms"] = "skipped"
        else:
            try:
                send_sms(phone, build_sms(o, esims))
                _log(order_id, "sms", mask_phone(phone), "sent")
                result["sms"] = "sent"
            except NotConfigured as e:
                _log(order_id, "sms", mask_phone(phone), "skipped", str(e))
                result["sms"] = "skipped"
            except Exception as e:  # noqa: BLE001
                log.error("SMS commande %s échoué: %s", order_id, type(e).__name__)
                _log(order_id, "sms", mask_phone(phone), "failed", type(e).__name__)
                result["sms"] = "failed"
    return result
