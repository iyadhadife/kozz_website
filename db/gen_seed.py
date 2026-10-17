"""Génère db/init/02_seed.sql. Après la 1re création de la base, les prix se modifient directement en SQL
(UPDATE plans ...), ce script ne sert qu'à régénérer le jeu de données initial."""
import json
from pathlib import Path

q = lambda s: "'" + str(s).replace("'", "''") + "'"

tiers = [
    ("city", "City-break", 1, 7, "🏙️", "Un week-end, un city-trip"),
    ("week", "Semaine", 3, 10, "📅", "Séjour d'une à deux semaines"),
    ("trip", "Voyage", 10, 30, "🎒", "Le best-seller, un mois de tranquillité"),
    ("unl", "Illimité", None, 10, "📶", "Fair use 3–5 Go/jour, affiché dès l'achat"),
]
# (id, nom, zone, [prix city, semaine, voyage, illimité])
dests = [
    ("ma", "Maroc", "Maghreb", [4.9, 8.9, 17.9, 21.9]),
    ("es", "Espagne", "Europe", [4.5, 7.9, 13.9, 16.9]),
    ("it", "Italie", "Europe", [4.5, 7.9, 13.9, 16.9]),
    ("pt", "Portugal", "Europe", [4.5, 7.9, 13.9, 16.9]),
    ("tn", "Tunisie", "Maghreb", [4.9, 8.9, 15.9, 19.9]),
    ("tr", "Turquie", "Moyen-Orient", [3.9, 6.9, 11.9, 14.9]),
    ("th", "Thaïlande", "Asie", [4.5, 6.9, 11.9, 15.9]),
    ("id", "Indonésie (Bali)", "Asie", [4.5, 7.9, 13.9, 17.9]),
    ("ae", "Émirats (Dubaï)", "Moyen-Orient", [5.9, 9.9, 16.9, 21.9]),
    ("us", "États-Unis", "Amériques", [5.9, 9.9, 19.9, 24.9]),
    ("vn", "Vietnam", "Asie", [4.5, 6.9, 10.9, 14.9]),
    ("jp", "Japon", "Asie", [5.5, 8.9, 15.9, 19.9]),
    ("sa", "Arabie Saoudite", "Moyen-Orient", [6.9, 10.9, 18.9, 23.9]),
]
# Seuls ces prix ont un relevé public complet ; les autres sont "à confirmer"
confirmed = {"ma": [1, 0, 1, 1], "th": [1, 0, 0, 0], "id": [1, 0, 0, 0]}
monde = [("m10", "Monde 10", "10 Go / mois", 14.9, 0), ("m25", "Monde 25", "25 Go / mois", 24.9, 1), ("minf", "Monde ∞", "Illimité (fair use 5 Go/j)", 39.9, 0)]
causes = [
    ("restos", "Solidarité", "Repas pour tous", "repas offerts", 0.2, "🍲", 0),
    ("inclusion", "Solidarité", "Inclusion numérique en France", "h d'accompagnement", 3, "🤝", 0),
    ("arbres", "Planète", "Reforestation", "arbres plantés", 0.8, "🌳", 0),
    ("ocean", "Planète", "Océans propres", "kg de déchets collectés", 0.5, "🌊", 0),
    ("tsf", "Éducation & numérique", "Data pour data", "jours de connexion pour des réfugiés", 0.5, "📡", 1),
    ("ecole", "Éducation & numérique", "École connectée", "jours d'école connectée", 1.5, "🏫", 0),
    ("soins", "Santé & recherche", "Accès aux soins", "traitements financés", 1, "💊", 0),
    ("recherche", "Santé & recherche", "Recherche médicale", "h de recherche", 3, "🔬", 0),
    ("nutrition", "Enfance", "Nutrition des enfants", "jours de nutrition", 0.3, "🧒", 0),
    ("livres", "Enfance", "Livres pour enfants", "livres offerts", 2, "📚", 0),
    ("eau", "Humanitaire", "Eau potable au Sahel", "jours d'eau pour une famille", 0.12, "💧", 0),
    ("energie", "Humanitaire", "Électricité solidaire", "h d'électricité", 0.25, "💡", 0),
]
corridors = [
    ("ma", "Maroc", ["Maroc Telecom (IAM)", "Inwi", "Orange"], 0),
    ("sn", "Sénégal", ["Orange (Sonatel)", "Free", "Expresso"], 0),
    ("ci", "Côte d'Ivoire", ["MTN", "Moov", "Orange"], 0),
    ("ml", "Mali", ["Orange Mali", "Moov", "Malitel"], 0),
    ("cm", "Cameroun", ["MTN", "Orange", "Camtel"], 0),
    ("tn", "Tunisie", ["Ooredoo", "Orange", "Tunisie Telecom"], 0),
    ("lb", "Liban", ["touch", "alfa"], 0),
    ("km", "Comores", ["Comores Telecom", "HURI"], 1),
    ("dz", "Algérie", ["Mobilis", "Djezzy", "Ooredoo"], 1),
]

out = ["SET NAMES utf8mb4;", "-- Données initiales (hypothèses tarifaires oct. 2026). price_confirmed = 0 : prix à confirmer", ""]
out.append("INSERT INTO tiers (`key`,name,gb,days,icon,blurb,position) VALUES")
out.append(",\n".join(f"({q(k)},{q(n)},{'NULL' if g is None else g},{d},{q(i)},{q(b)},{p})" for p, (k, n, g, d, i, b) in enumerate(tiers)) + ";\n")
out.append("INSERT INTO destinations (id,name,zone,position) VALUES")
out.append(",\n".join(f"({q(i)},{q(n)},{q(z)},{p})" for p, (i, n, z, _) in enumerate(dests)) + ";\n")
out.append("INSERT INTO plans (destination_id,tier_key,price_ttc,price_confirmed) VALUES")
rows = []
for i, _n, _z, prices in dests:
    for t, price, ok in zip(tiers, prices, confirmed.get(i, [0, 0, 0, 0])):
        rows.append(f"({q(i)},{q(t[0])},{price},{ok})")
out.append(",\n".join(rows) + ";\n")
out.append("INSERT INTO subscription_plans (id,name,data_label,price_monthly,popular) VALUES")
out.append(",\n".join(f"({q(a)},{q(b)},{q(c)},{d},{e})" for a, b, c, d, e in monde) + ";\n")
out.append("INSERT INTO causes (id,category,name,unit,cost_per_unit,emoji,signature,position) VALUES")
out.append(",\n".join(f"({q(a)},{q(b)},{q(c)},{q(d)},{e},{q(f)},{g},{p})" for p, (a, b, c, d, e, f, g) in enumerate(causes)) + ";\n")
out.append("INSERT INTO corridors (id,country,operators,soon,position) VALUES")
out.append(",\n".join(f"({q(a)},{q(b)},{q(json.dumps(c, ensure_ascii=False))},{d},{p})" for p, (a, b, c, d) in enumerate(corridors)) + ";")

Path(__file__).parent.joinpath("init", "02_seed.sql").write_text("\n".join(out) + "\n", encoding="utf-8")
print("02_seed.sql généré")
