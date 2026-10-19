"""Aperçus de liens et images de partage aux couleurs de KozzGo (logo, crème, corail, police Poppins).

Le front est une SPA : les robots d'aperçu (WhatsApp, iMessage, Slack, X, LinkedIn…) n'exécutent pas le JavaScript. Caddy les envoie
(selon leur User-Agent) vers ces routes ; les humains continuent d'être servis par le front.
  /api/og/passeport/{code}[.png]    page OG + image 1200x630 du passeport d'impact (avec le code de parrainage)
  /api/og/destinations/{id}[.png]   idem pour une fiche destination
  /api/og/home[.png]?ref=CODE       accueil ; avec un code de parrainage valide, l'aperçu montre le passeport du parrain
Les images sont générées à la demande (Pillow) puis mises en cache (LRU, indexé par le contenu : elles se renouvellent seules).
"""
import html
import io
import os
from collections import OrderedDict
from threading import Lock

from fastapi import APIRouter, HTTPException, Response
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from sqlalchemy import text

from .auth import _impact
from .db import engine

router = APIRouter(prefix="/api/og")
from .site import SITE_URL
HOST = SITE_URL.split("://", 1)[-1]

W, H = 1200, 630
ASSETS = os.path.join(os.path.dirname(__file__), "assets")
# Charte du site (index.css) : fond crème, encre, corail, dégradé de la jauge des dons
BG, INK, MUTED, CORAL, CORAL_INK = "#faf7f3", "#1d1b20", "#6b6570", "#ef7b63", "#d4553c"
BAR_COLORS = ["#EF7B63", "#F4A259", "#6FBF9B", "#5B8DEF", "#B07CE8", "#E8C14A"]

_fonts: dict = {}
_cache: "OrderedDict[tuple, bytes]" = OrderedDict()
_lock = Lock()
_CACHE_MAX = 256
_base: dict = {}


def _font(size: int, weight: str = "Bold"):
    k = (size, weight)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(os.path.join(ASSETS, f"Poppins-{weight}.ttf"), size)
    return _fonts[k]


def _cached(key: tuple, make):
    with _lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
    data = make()
    with _lock:
        _cache[key] = data
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
    return data


def _eur(v: float) -> str:
    return f"{v:,.2f}".replace(",", " ").replace(".", ",") + " €"


def _canvas():
    """Fond crème + halos corail/orange + points, puis logo. Le fond est calculé une seule fois (partie coûteuse)."""
    if "img" not in _base:
        img = Image.new("RGB", (W, H), BG)
        halo = Image.new("RGBA", (W, H), (242, 140, 95, 0))  # teinte corail même hors halo : le flou ne grise pas
        hd = ImageDraw.Draw(halo)
        hd.ellipse((W - 520, -300, W + 220, 400), fill=(239, 123, 99, 70))
        hd.ellipse((-260, H - 260, 380, H + 300), fill=(244, 162, 89, 55))
        halo = halo.filter(ImageFilter.GaussianBlur(90))
        img.paste(halo, (0, 0), halo)
        d = ImageDraw.Draw(img, "RGBA")
        for gx in range(8, W, 28):
            for gy in range(8, H, 28):
                if (gx * 7 + gy * 13) % 4 == 0:
                    d.ellipse((gx, gy, gx + 5, gy + 5), fill=(239, 123, 99, 38))
        logo = Image.open(os.path.join(ASSETS, "logo.png")).convert("RGBA")
        logo = logo.resize((int(logo.width * 70 / logo.height), 70), Image.LANCZOS)
        img.paste(logo, (64, 44), logo)
        _base["img"] = img
    img = _base["img"].copy()
    return img, ImageDraw.Draw(img, "RGBA")


def _fit(d, s: str, size: int, maxw: int, weight: str = "Bold") -> str:
    while d.textlength(s, font=_font(size, weight)) > maxw and len(s) > 4:
        s = s[:-2].rstrip() + "…"
    return s


def _pill(d, xy, label, size, fill, ink, weight="SemiBold"):
    x0, y0, x1, y1 = xy
    d.rounded_rectangle(xy, radius=(y1 - y0) // 2, fill=fill)
    d.text(((x0 + x1) / 2, (y0 + y1) / 2 + 1), label, font=_font(size, weight), fill=ink, anchor="mm")


def _png(img: Image.Image) -> bytes:
    out = io.BytesIO()
    img.save(out, "PNG", compress_level=6)
    return out.getvalue()


def _passport_png(data: dict, code: str) -> bytes:
    img, d = _canvas()
    _pill(d, (W - 340, 54, W - 64, 104), "PASSEPORT D'IMPACT", 20, (239, 123, 99, 40), CORAL_INK, "Bold")
    d.text((64, 150), "Dons générés par ses achats", font=_font(30, "Regular"), fill=MUTED)
    d.text((60, 186), _eur(data["total"]), font=_font(112), fill=INK)
    n = data["orders"]
    d.text((64, 322), f"{n} commande{'s' if n > 1 else ''} solidaire{'s' if n > 1 else ''}", font=_font(26, "Regular"), fill=MUTED)
    top = data["causes"][:3]
    mx = max((c["donation"] for c in top), default=1) or 1
    y = 378
    for i, c in enumerate(top):
        d.text((64, y), _fit(d, c["name"], 25, 350, "SemiBold"), font=_font(25, "SemiBold"), fill=INK)
        d.rounded_rectangle((440, y + 8, 960, y + 28), radius=10, fill=(29, 27, 32, 22))
        d.rounded_rectangle((440, y + 8, 440 + max(26, int(520 * c["donation"] / mx)), y + 28), radius=10, fill=BAR_COLORS[i])
        d.text((1136, y), _eur(c["donation"]), font=_font(25, "SemiBold"), fill=INK, anchor="ra")
        y += 46
    _pill(d, (64, H - 92, 700, H - 30), f"Crée ton compte avec mon code {code}", 26, CORAL, "#1a1010", "Bold")
    d.text((W - 64, H - 61), HOST, font=_font(24, "SemiBold"), fill=CORAL_INK, anchor="rm")
    return _png(img)


def _dest_png(name: str, price: float) -> bytes:
    img, d = _canvas()
    d.text((64, 170), "eSIM voyage", font=_font(36, "Regular"), fill=MUTED)
    d.text((60, 218), _fit(d, name, 124, W - 128), font=_font(124), fill=INK)
    d.text((64, 396), f"Dès {_eur(price)} · activation immédiate", font=_font(38, "SemiBold"), fill=INK)
    _pill(d, (64, H - 96, 700, H - 34), "10 % du prix HT reversé à une cause", 26, CORAL, "#1a1010", "Bold")
    d.text((W - 64, H - 65), HOST, font=_font(24, "SemiBold"), fill=CORAL_INK, anchor="rm")
    return _png(img)


def _home_png() -> bytes:
    img, d = _canvas()
    d.text((60, 180), "Reste connecté", font=_font(92), fill=INK)
    d.text((60, 300), "en voyage. Aide une cause.", font=_font(92), fill=CORAL)
    d.text((64, 450), "eSIM dans plus de 180 destinations · 10 % du prix HT reversé", font=_font(30, "Regular"), fill=MUTED)
    _pill(d, (64, H - 96, 460, H - 34), "Découvrir KozzGo", 28, CORAL, "#1a1010", "Bold")
    d.text((W - 64, H - 65), HOST, font=_font(24, "SemiBold"), fill=CORAL_INK, anchor="rm")
    return _png(img)


def _page(title: str, desc: str, path: str, image: str) -> Response:
    e = html.escape
    url = f"{SITE_URL}{path}"
    body = (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        f"<title>{e(title)}</title>"
        f'<meta name="description" content="{e(desc)}">'
        f'<link rel="canonical" href="{e(url)}">'
        '<meta property="og:type" content="website"><meta property="og:site_name" content="KozzGo">'
        f'<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">'
        f'<meta property="og:url" content="{e(url)}"><meta property="og:image" content="{e(image)}">'
        f'<meta property="og:image:width" content="{W}"><meta property="og:image:height" content="{H}"><meta property="og:locale" content="fr_FR">'
        f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}">'
        f'<meta name="twitter:description" content="{e(desc)}"><meta name="twitter:image" content="{e(image)}">'
        f'<meta http-equiv="refresh" content="0;url={e(url)}"></head><body><a href="{e(url)}">{e(title)}</a></body></html>'
    )
    return Response(body, media_type="text/html; charset=utf-8", headers={"Cache-Control": "public, max-age=300"})


def _resp(data: bytes) -> Response:
    return Response(data, media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})


def passport_png_for(code: str, data: dict) -> bytes:
    """Image du passeport (en cache) : aussi utilisée dans les e-mails de partage."""
    key = ("pp", code, data["total"], data["orders"], tuple((c["id"], c["donation"]) for c in data["causes"][:3]))
    return _cached(key, lambda: _passport_png(data, code))


def _passport_data(code: str):
    code = "".join(ch for ch in (code or "").upper() if ch.isalnum())[:12]
    with engine.connect() as c:
        cid = c.execute(text("SELECT id FROM customers WHERE referral_code=:c"), {"c": code}).scalar()
    d = _impact(cid) if cid else None
    if not d or not d["orders"]:
        raise HTTPException(404, "Passeport introuvable")
    return code, d


def _passport_meta(code: str, d: dict, path: str) -> Response:
    return _page(
        f"J'ai déjà financé {_eur(d['total'])} de dons avec KozzGo",
        f"Mon passeport d'impact : {d['orders']} commande(s) solidaire(s). Crée ton compte avec mon code de parrainage {code}.",
        path, f"{SITE_URL}/api/og/passeport/{code}.png",
    )


@router.get("/passeport/{code}.png")
def passport_image(code: str):
    code, d = _passport_data(code)
    return _resp(passport_png_for(code, d))


@router.get("/passeport/{code}")
def passport_page(code: str):
    code, d = _passport_data(code)
    return _passport_meta(code, d, f"/passeport/{code}")


def _dest(dest_id: str):
    dest_id = dest_id.lower()[:2]
    with engine.connect() as c:
        r = c.execute(text("SELECT d.id, d.name, MIN(p.price_ttc) AS price FROM destinations d JOIN plans p ON p.destination_id=d.id WHERE d.id=:i GROUP BY d.id, d.name"), {"i": dest_id}).mappings().first()
    if not r or r["price"] is None:
        raise HTTPException(404, "Destination introuvable")
    return r["id"], r["name"], float(r["price"])


@router.get("/destinations/{dest_id}.png")
def dest_image(dest_id: str):
    i, name, price = _dest(dest_id)
    return _resp(_cached(("d", i, name, price), lambda: _dest_png(name, price)))


@router.get("/destinations/{dest_id}")
def dest_page(dest_id: str):
    i, name, price = _dest(dest_id)
    return _page(
        f"eSIM {name} dès {_eur(price)} · KozzGo",
        f"Reste connecté en {name} dès l'atterrissage, sans frais de roaming. 10 % du prix HT finance une cause que tu choisis.",
        f"/destinations/{i}", f"{SITE_URL}/api/og/destinations/{i}.png",
    )


@router.get("/home.png")
def home_image():
    return _resp(_cached(("home",), _home_png))


@router.get("/home")
def home_page(ref: str = ""):
    """Accueil. Lien de parrainage /?ref=CODE : si le parrain a un passeport, l'aperçu montre son passeport (sinon l'aperçu de l'accueil)."""
    if ref:
        try:
            code, d = _passport_data(ref)
            return _passport_meta(code, d, f"/?ref={code}")
        except HTTPException:
            pass
    return _page("KozzGo : eSIM voyage solidaire", "eSIM pour partir connecté dans plus de 180 destinations. Chaque achat finance une cause que tu choisis.", "/", f"{SITE_URL}/api/og/home.png")
