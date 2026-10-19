"""E-mails HTML aux couleurs de KozzGo : gabarit commun (logo, crème, corail, bouton), compatible Gmail / Outlook / Apple Mail.

Mise en page en tableaux + styles en ligne (les clients mail ignorent presque tout le reste). Le logo est joint en image « inline » (cid:logo),
donc il s'affiche même quand le client bloque les images distantes. Fond blanc explicite : lisible aussi en mode sombre.
"""
import os
from html import escape

ASSETS = os.path.join(os.path.dirname(__file__), "assets")
from .site import SITE_URL
CORAL, CORAL_INK, INK, MUTED, CREAM = "#ef7b63", "#d4553c", "#1d1b20", "#6b6570", "#faf7f3"
FONT = "Poppins,'Segoe UI',Helvetica,Arial,sans-serif"

_logo: dict = {}


def logo_png() -> bytes:
    if "b" not in _logo:
        with open(os.path.join(ASSETS, "logo.png"), "rb") as f:
            _logo["b"] = f.read()
    return _logo["b"]


def button(label: str, url: str) -> str:
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:{CORAL};border-radius:999px">'
            f'<a href="{escape(url)}" style="display:inline-block;padding:14px 28px;font:700 16px {FONT};color:#1a1010;text-decoration:none">{escape(label)}</a>'
            f'</td></tr></table>')


def code_box(code: str) -> str:
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="background:{CREAM};border:2px dashed {CORAL};'
            f'border-radius:16px;padding:14px 26px;font:700 34px {FONT};letter-spacing:8px;color:{INK}">{escape(code)}</td></tr></table>')


def bars(rows: list[tuple[str, str, float, str]]) -> str:
    """Barres de dons par cause : (nom, montant formaté, part 0..1, couleur)."""
    out = ['<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">']
    for name, amount, share, color in rows:
        w = max(6, min(100, round(share * 100)))
        out.append(
            f'<tr><td style="padding:6px 0 2px;font:600 14px {FONT};color:{INK}">{escape(name)}</td><td align="right" style="padding:6px 0 2px;font:700 14px {FONT};color:{INK}">{escape(amount)}</td></tr>'
            f'<tr><td colspan="2" style="padding:0 0 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9e1;border-radius:6px"><tr>'
            f'<td width="{w}%" style="background:{color};border-radius:6px;height:9px;font-size:1px;line-height:9px">&nbsp;</td><td style="font-size:1px">&nbsp;</td></tr></table></td></tr>')
    out.append("</table>")
    return "".join(out)


def layout(title: str, body_html: str, *, preheader: str = "", footer_html: str = "", lang: str = "fr") -> str:
    """Enveloppe complète : en-tête avec logo, carte blanche, pied de page discret."""
    site = SITE_URL
    return f"""<!doctype html>
<html lang="{escape(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{escape(title)}</title>
<style>@media (max-width:620px){{.k-card{{padding:22px 18px !important}}.k-title{{font-size:22px !important}}}}</style></head>
<body style="margin:0;padding:0;background:{CREAM};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{CREAM}">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{CREAM}"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td style="padding:0 6px 18px"><a href="{site}" style="text-decoration:none"><img src="cid:logo" alt="KozzGo" width="150" style="display:block;border:0;height:auto"></a></td></tr>
    <tr><td class="k-card" style="background:#ffffff;border:1px solid #ece5dc;border-radius:22px;padding:32px 34px;font:400 16px/1.6 {FONT};color:{INK}">
      <h1 class="k-title" style="margin:0 0 14px;font:700 26px/1.25 {FONT};color:{INK}">{escape(title)}</h1>
      {body_html}
    </td></tr>
    <tr><td style="padding:18px 10px;font:400 12px/1.6 {FONT};color:{MUTED};text-align:center">
      {footer_html}<div style="margin-top:6px"><a href="{site}" style="color:{CORAL_INK};text-decoration:none;font-weight:600">KozzGo</a> · eSIM voyage solidaire</div>
    </td></tr>
  </table>
</td></tr></table></body></html>"""


def p(text: str, muted: bool = False) -> str:
    c = MUTED if muted else INK
    return f'<p style="margin:0 0 14px;font:400 {14 if muted else 16}px/1.6 {FONT};color:{c}">{text}</p>'
