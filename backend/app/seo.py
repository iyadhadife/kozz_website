"""sitemap.xml et robots.txt (servis à la racine du site par Caddy). Générés à chaque appel depuis la base : les nouvelles destinations
apparaissent toutes seules. L'adresse du site vient de SITE_URL (.env)."""
import os
from datetime import date
from xml.sax.saxutils import escape

from fastapi import APIRouter, Response
from sqlalchemy import text

from .db import engine

router = APIRouter(prefix="/api/seo")
SITE_URL = os.getenv("SITE_URL", "https://localhost").rstrip("/")

# (chemin, fréquence de mise à jour, priorité) : à ajuster ici ; les fiches destination sont ajoutées automatiquement
STATIC = [
    ("/", "weekly", "1.0"),
    ("/destinations", "weekly", "0.9"),
    ("/faq", "monthly", "0.8"),
    ("/comment-ca-marche", "monthly", "0.8"),
    ("/impact", "daily", "0.7"),
    ("/kozz-monde", "monthly", "0.7"),
    ("/telephones-compatibles", "monthly", "0.7"),
    ("/devenir-partenaire", "monthly", "0.5"),
    ("/remboursement", "yearly", "0.3"),
    ("/retractation", "yearly", "0.3"),
    ("/cgv", "yearly", "0.3"),
    ("/confidentialite", "yearly", "0.3"),
    ("/mentions-legales", "yearly", "0.3"),
]
# Pages privées : ni explorées ni indexées
DISALLOW = ["/api/", "/chat/", "/profil", "/connexion", "/commande/", "/mot-de-passe", "/mot-de-passe-oublie", "/passeport/"]


@router.get("/sitemap.xml")
def sitemap():
    with engine.connect() as c:
        dests = c.execute(text("SELECT d.id FROM destinations d JOIN plans p ON p.destination_id = d.id GROUP BY d.id, d.position ORDER BY d.position, d.id")).scalars().all()
    today = date.today().isoformat()
    rows = [(p, f, pr) for p, f, pr in STATIC] + [(f"/destinations/{i}", "weekly", "0.8") for i in dests]
    body = "".join(f"<url><loc>{escape(SITE_URL + p)}</loc><lastmod>{today}</lastmod><changefreq>{f}</changefreq><priority>{pr}</priority></url>" for p, f, pr in rows)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return Response(xml, media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})


@router.get("/robots.txt")
def robots():
    lines = ["User-agent: *", "Allow: /", *[f"Disallow: {p}" for p in DISALLOW], "", f"Sitemap: {SITE_URL}/sitemap.xml", ""]
    # Les robots d'aperçu de liens ont besoin de /api/og/ (images de partage) : on l'autorise explicitement
    lines.insert(2, "Allow: /api/og/")
    return Response("\n".join(lines), media_type="text/plain; charset=utf-8", headers={"Cache-Control": "public, max-age=3600"})
