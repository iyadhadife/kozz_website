"""Open Graph côté serveur : aperçus riches (WhatsApp, iMessage, Slack, X, LinkedIn…) pour les liens du site.

Le front est une SPA : les robots d'aperçu n'exécutent pas le JavaScript et ne voient que le <head> statique.
Caddy envoie donc ces robots (selon leur User-Agent) vers ces routes ; les humains continuent d'être servis par le front.
  /api/og/passeport/{code}        -> page HTML minimale avec les balises og:* / twitter:*
  /api/og/passeport/{code}.png    -> image 1200x630 générée à la volée (Pillow), mise en cache
  /api/og/destinations/{id}[.png] -> idem pour une fiche destination
"""
import html
import io
import os
import time
from collections import OrderedDict
from threading import Lock

from fastapi import APIRouter, HTTPException, Response
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import text

from .auth import _impact
from .db import engine

router = APIRouter(prefix="/api/og")
SITE_URL = os.getenv("SITE_URL", "https://localhost").rstrip("/")

W, H = 1200, 630
_FONT_DIR = os.path.join(os.path.dirname(__import__("reportlab").__file__), "fonts")
_fonts: dict = {}


def _font(size: int, bold: bool = True):
    k = (size, bold)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(os.path.join(_FONT_DIR, "VeraBd.ttf" if bold else "Vera.ttf"), size)
    return _fonts[k]


# --- cache d'images : borné (LRU) et indexé par le contenu, donc il se renouvelle tout seul quand les chiffres changent ---
_cache: "OrderedDict[tuple, bytes]" = OrderedDict()
_lock = Lock()
_CACHE_MAX = 256


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


_base: dict = {}


def _canvas():
    """Fond dégradé vert + motif de points (calculé UNE fois : c'est la partie coûteuse), puis mot-symbole KozzGo."""
    if "img" not in _base:
        # dégradé en 2 axes sur une petite image, agrandie ensuite : ~1000x moins de pixels à calculer
        small = Image.new("RGB", (60, 32))
        sp = small.load()
        for y in range(32):
            for x in range(60):
                t = (x / 60) * 0.55 + (1 - y / 32) * 0.45
                sp[x, y] = (int(18 + 13 * t), int(55 + 67 * t), int(42 + 38 * t))
        img = small.resize((W, H), Image.BILINEAR)
        d = ImageDraw.Draw(img, "RGBA")
        for gx in range(0, W, 26):
            for gy in range(0, H, 26):
                if (gx * 7 + gy * 13) % 5 == 0:
                    d.ellipse((gx, gy, gx + 5, gy + 5), fill=(255, 255, 255, 26))
        _base["img"] = img
    img = _base["img"].copy()
    d = ImageDraw.Draw(img, "RGBA")
    d.text((64, 50), "Kozz", font=_font(46), fill="#ffffff")
    d.text((64 + d.textlength("Kozz", font=_font(46)), 50), "Go", font=_font(46), fill="#ef7b63")
    return img, d


def _fit(d, s: str, size: int, maxw: int) -> str:
    while d.textlength(s, font=_font(size)) > maxw and len(s) > 4:
        s = s[:-2].rstrip() + "…"
    return s


def _passport_png(data: dict, code: str) -> bytes:
    img, d = _canvas()
    d.rounded_rectangle((W - 330, 48, W - 64, 96), radius=24, fill=(255, 255, 255, 40))
    d.text((W - 197, 72), "PASSEPORT D'IMPACT", font=_font(20), fill="#ffffff", anchor="mm")
    d.text((64, 170), "Dons générés par ses achats", font=_font(30, False), fill=(255, 255, 255, 210))
    d.text((64, 215), _eur(data["total"]), font=_font(120), fill="#ffffff")
    d.text((64, 350), f"{data['orders']} commande{'s' if data['orders'] > 1 else ''} solidaire{'s' if data['orders'] > 1 else ''}", font=_font(28, False), fill=(255, 255, 255, 200))
    colors = ["#EF7B63", "#F4A259", "#6FBF9B", "#5B8DEF", "#B07CE8"]
    y = 405
    top = data["causes"][:3]
    mx = max((c["donation"] for c in top), default=1) or 1
    for i, c in enumerate(top):
        d.text((64, y), _fit(d, c["name"], 26, 360), font=_font(26), fill="#ffffff")
        d.rounded_rectangle((440, y + 6, 440 + 520, y + 26), radius=10, fill=(255, 255, 255, 40))
        d.rounded_rectangle((440, y + 6, 440 + max(24, int(520 * c["donation"] / mx)), y + 26), radius=10, fill=colors[i])
        d.text((1000, y), _eur(c["donation"]), font=_font(26), fill="#ffffff")
        y += 48
    d.rounded_rectangle((64, H - 70, 64 + 470, H - 26), radius=22, fill="#ef7b63")
    d.text((64 + 235, H - 48), f"Rejoins-moi · code {code}", font=_font(26), fill="#1a1010", anchor="mm")
    out = io.BytesIO()
    img.save(out, "PNG", optimize=False, compress_level=6)
    return out.getvalue()


def _dest_png(name: str, price: float) -> bytes:
    img, d = _canvas()
    d.text((64, 190), "eSIM voyage", font=_font(34, False), fill=(255, 255, 255, 210))
    d.text((64, 240), _fit(d, name, 130, W - 128), font=_font(130), fill="#ffffff")
    d.text((64, 420), f"Dès {_eur(price)} · activation immédiate", font=_font(40, False), fill="#ffffff")
    d.rounded_rectangle((64, H - 90, 64 + 560, H - 36), radius=27, fill="#ef7b63")
    d.text((64 + 280, H - 63), "10 % du prix HT reversé à une cause", font=_font(24), fill="#1a1010", anchor="mm")
    out = io.BytesIO()
    img.save(out, "PNG", compress_level=6)
    return out.getvalue()


def _page(title: str, desc: str, path: str, image: str) -> Response:
    e = html.escape
    url = f"{SITE_URL}{path}"
    body = (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        f"<title>{e(title)}</title>"
        f'<meta name="description" content="{e(desc)}">'
        f'<link rel="canonical" href="{e(url)}">'
        f'<meta property="og:type" content="website"><meta property="og:site_name" content="KozzGo">'
        f'<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">'
        f'<meta property="og:url" content="{e(url)}"><meta property="og:image" content="{e(image)}">'
        f'<meta property="og:image:width" content="{W}"><meta property="og:image:height" content="{H}"><meta property="og:locale" content="fr_FR">'
        f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}">'
        f'<meta name="twitter:description" content="{e(desc)}"><meta name="twitter:image" content="{e(image)}">'
        f'<meta http-equiv="refresh" content="0;url={e(url)}"></head><body><a href="{e(url)}">{e(title)}</a></body></html>'
    )
    return Response(body, media_type="text/html; charset=utf-8", headers={"Cache-Control": "public, max-age=300"})


def _png(data: bytes) -> Response:
    return Response(data, media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})


def _passport_data(code: str):
    code = "".join(ch for ch in code.upper() if ch.isalnum())[:12]
    with engine.connect() as c:
        cid = c.execute(text("SELECT id FROM customers WHERE referral_code=:c"), {"c": code}).scalar()
    d = _impact(cid) if cid else None
    if not d or not d["orders"]:
        raise HTTPException(404, "Passeport introuvable")
    return code, d


@router.get("/passeport/{code}.png")
def passport_image(code: str):
    code, d = _passport_data(code)
    key = ("pp", code, d["total"], d["orders"], tuple(c["id"] for c in d["causes"][:3]))
    return _png(_cached(key, lambda: _passport_png(d, code)))


@router.get("/passeport/{code}")
def passport_page(code: str):
    code, d = _passport_data(code)
    return _page(
        f"J'ai déjà financé {_eur(d['total'])} de dons avec KozzGo",
        f"Mon passeport d'impact : {d['orders']} commande(s) solidaire(s). Rejoins-moi avec mon code de parrainage {code}.",
        f"/passeport/{code}", f"{SITE_URL}/api/og/passeport/{code}.png",
    )


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
    return _png(_cached(("d", i, name, price), lambda: _dest_png(name, price)))


@router.get("/destinations/{dest_id}")
def dest_page(dest_id: str):
    i, name, price = _dest(dest_id)
    return _page(
        f"eSIM {name} dès {_eur(price)} · KozzGo",
        f"Reste connecté en {name} dès l'atterrissage, sans frais de roaming. 10 % du prix HT finance une cause que tu choisis.",
        f"/destinations/{i}", f"{SITE_URL}/api/og/destinations/{i}.png",
    )


def _home_png() -> bytes:
    img, d = _canvas()
    d.text((64, 200), "Reste connecté", font=_font(96), fill="#ffffff")
    d.text((64, 320), "en voyage. Aide une cause.", font=_font(96), fill="#ef7b63")
    d.text((64, 470), "eSIM dans plus de 180 destinations · 10 % du prix HT reversé", font=_font(32, False), fill=(255, 255, 255, 215))
    out = io.BytesIO()
    img.save(out, "PNG", compress_level=6)
    return out.getvalue()


@router.get("/home.png")
def home_image():
    return _png(_cached(("home",), _home_png))


@router.get("/home")
def home_page():
    return _page("KozzGo : eSIM voyage solidaire", "eSIM pour partir connecté dans plus de 180 destinations. Chaque achat finance une cause que tu choisis.", "/", f"{SITE_URL}/api/og/home.png")
