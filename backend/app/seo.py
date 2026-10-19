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
    lines = ["User-agent: *", "Content-Signal: search=yes, ai-input=yes", "Allow: /", *[f"Disallow: {p}" for p in DISALLOW], "", f"Sitemap: {SITE_URL}/sitemap.xml", ""]
    # Les robots d'aperçu de liens ont besoin de /api/og/ (images de partage) : on l'autorise explicitement
    lines.insert(2, "Allow: /api/og/")
    return Response("\n".join(lines), media_type="text/plain; charset=utf-8", headers={"Cache-Control": "public, max-age=3600"})


@router.get("/llms.txt")
def llms():
    """Résumé du site pour les assistants IA (format llms.txt). Optionnel : Google Search l'ignore, certains assistants le lisent."""
    with engine.connect() as c:
        dests = c.execute(text("SELECT d.id, d.name FROM destinations d JOIN plans p ON p.destination_id = d.id GROUP BY d.id, d.name, d.position ORDER BY d.position LIMIT 12")).all()
    top = "\n".join(f"- [eSIM {n}]({SITE_URL}/destinations/{i})" for i, n in dests)
    body = f"""# KozzGo

> KozzGo vend des eSIM de voyage (forfaits de data, sans carte SIM physique) dans plus de 180 destinations. 10 % du prix hors taxes de chaque achat est reversé à une cause choisie par le client parmi 12. Site en français ; paiement par carte (Stripe) ; prix TTC en euros ou dans la devise du client.

## À lire en priorité
- [FAQ : installation, compatibilité, remboursement]({SITE_URL}/faq): 57 réponses sur l'eSIM de voyage.
- [Comment ça marche]({SITE_URL}/comment-ca-marche): installer une eSIM en 1 minute.
- [Téléphones compatibles eSIM]({SITE_URL}/telephones-compatibles): plus de 700 modèles, test rapide *#06#.
- [Impact]({SITE_URL}/impact): dons générés et causes soutenues.
- [Toutes les destinations]({SITE_URL}/destinations): fiches par pays avec prix.

## Destinations
{top}

## Conditions
- [Remboursement]({SITE_URL}/remboursement)
- [Conditions générales de vente]({SITE_URL}/cgv)
- [Confidentialité]({SITE_URL}/confidentialite)
"""
    return Response(body, media_type="text/plain; charset=utf-8", headers={"Cache-Control": "public, max-age=3600"})
