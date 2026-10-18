"""Jeu de données FICTIF pour la démo : ~100 faux clients et leurs commandes, pour remplir les pages d'impact.

Tout ce qui est créé ici est repérable : les comptes ont une adresse en @demo.invalid (domaine réservé, qui ne peut jamais exister).
Ces commandes ne comptent dans les chiffres PUBLICS que si IMPACT_INCLUDE_DEMO=true (voir .env). Ne JAMAIS l'activer en production :
afficher des dons qui n'ont pas eu lieu est trompeur (et illégal pour un site qui collecte des dons).

Usage (depuis la racine du dépôt) :
  docker compose exec -T -e PYTHONPATH=/srv backend python - --yes [--target 10000] [--users 100] < scripts/seed_demo.py
  docker compose exec -T -e PYTHONPATH=/srv backend python - --purge --yes < scripts/seed_demo.py     # supprime tout le jeu fictif
"""
import json
import os
import random
import string
import sys
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import text

from app.db import engine
from app.pricing import donation

ARGS = sys.argv[1:]
DOMAIN = "demo.invalid"
arg = lambda k, d: type(d)(ARGS[ARGS.index(k) + 1]) if k in ARGS else d

if "--yes" not in ARGS:
    sys.exit("Ajoute --yes pour confirmer (données fictives).")
if os.getenv("STRIPE_SECRET_KEY", "").startswith(("sk_live", "rk_live")):
    sys.exit("Clé Stripe LIVE détectée : refus de créer des données fictives sur un environnement de production.")

if "--purge" in ARGS:
    with engine.begin() as c:
        ids = [r[0] for r in c.execute(text("SELECT id FROM customers WHERE email LIKE :d"), {"d": f"%@{DOMAIN}"})]
        if ids:
            n = c.execute(text("DELETE FROM orders WHERE customer_id IN :ids").bindparams(__import__("sqlalchemy").bindparam("ids", expanding=True)), {"ids": ids}).rowcount
            c.execute(text("DELETE FROM customers WHERE id IN :ids").bindparams(__import__("sqlalchemy").bindparam("ids", expanding=True)), {"ids": ids})
            print(f"supprimé : {len(ids)} faux clients, {n} commandes")
        else:
            print("aucune donnée fictive")
    sys.exit(0)

TARGET = Decimal(str(arg("--target", 10000)))
N_USERS = arg("--users", 100)
rnd = random.Random(2026)

FIRST = ["Léa", "Hugo", "Emma", "Lucas", "Inès", "Nathan", "Chloé", "Louis", "Manon", "Adam", "Sarah", "Jules", "Camille", "Yanis", "Lina", "Tom", "Zoé", "Karim", "Alice", "Mehdi",
         "Jade", "Noé", "Anna", "Rayan", "Louise", "Ethan", "Clara", "Sofiane", "Eva", "Théo", "Maëlle", "Ilyes", "Julie", "Paul", "Nora", "Antoine", "Salma", "Victor", "Océane", "Bilal"]
LAST = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier",
        "Morel", "Girard", "André", "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand", "Benali", "Haddad", "Diallo", "Nguyen", "Silva"]
# Destinations populaires (poids) ; les autres pays se partagent le reste
POP = {"ma": 14, "es": 9, "it": 8, "tr": 8, "th": 7, "jp": 7, "us": 7, "pt": 6, "tn": 6, "sn": 4, "gr": 5, "gb": 5, "de": 4, "dz": 4, "eg": 4, "mx": 3, "ca": 3, "vn": 3, "id": 3, "ae": 3, "hr": 3, "nl": 3, "ch": 2, "cn": 2, "kr": 2, "br": 2, "au": 2, "za": 2, "mu": 2, "cv": 2}
TIER_W = {"city": 3, "week": 5, "trip": 4, "unl": 2}
# Causes : la cause signature (Data pour data) en tête, puis les plus « parlantes »
CAUSE_W = {"tsf": 20, "restos": 14, "arbres": 12, "eau": 10, "ecole": 9, "nutrition": 8, "ocean": 7, "soins": 6, "livres": 5, "inclusion": 4, "energie": 3, "recherche": 2}


def pick(weights):
    return rnd.choices(list(weights), weights=list(weights.values()))[0]


def code():
    return "".join(rnd.choices(string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789", k=8))


with engine.begin() as c:
    if c.execute(text("SELECT COUNT(*) FROM customers WHERE email LIKE :d"), {"d": f"%@{DOMAIN}"}).scalar():
        sys.exit("Des données fictives existent déjà : lance d'abord --purge --yes.")
    dests = [r[0] for r in c.execute(text("SELECT DISTINCT destination_id FROM plans"))]
    price = {(r[0], r[1]): Decimal(str(r[2])) for r in c.execute(text("SELECT destination_id, tier_key, price_ttc FROM plans"))}
    dname = {r[0]: r[1] for r in c.execute(text("SELECT id, name FROM destinations"))}
    tname = {"city": "3 Go / 7 j", "week": "5 Go / 15 j", "trip": "10 Go / 30 j", "unl": "Illimité / 10 j"}
    dw = {d: POP.get(d, 0.35) for d in dests}
    now = datetime.now().replace(microsecond=0)
    start = now - timedelta(days=150)  # ~5 mois d'historique

    # faux clients : inscrits à des dates étalées, avec un « poids » (certains achètent beaucoup plus que d'autres)
    users = []
    used = set()
    for i in range(N_USERS):
        fn, ln = rnd.choice(FIRST), rnd.choice(LAST)
        rc = code()
        while rc in used:
            rc = code()
        used.add(rc)
        joined = start + timedelta(days=rnd.random() ** 1.4 * 148)
        cid = c.execute(
            text("INSERT INTO customers (email, first_name, last_name, auth_provider, referral_code, created_at, email_verified_at, cause_id) "
                 "VALUES (:e, :f, :l, 'email', :rc, :j, :j, :ca)"),
            {"e": f"demo{i + 1:03d}@{DOMAIN}", "f": fn, "l": ln, "rc": rc, "j": joined, "ca": pick(CAUSE_W)},
        ).lastrowid
        users.append({"id": cid, "joined": joined, "w": rnd.paretovariate(1.6), "cause": pick(CAUSE_W)})

    total = Decimal("0")
    n_orders = 0
    uw = [u["w"] for u in users]
    while total < TARGET:
        u = rnd.choices(users, weights=uw)[0]
        # un acheteur reste plutôt fidèle à sa cause, mais en change parfois
        cause = u["cause"] if rnd.random() < 0.7 else pick(CAUSE_W)
        span = (now - u["joined"]).total_seconds()
        when = u["joined"] + timedelta(seconds=rnd.random() ** 0.8 * span)  # plus de commandes récentes : courbe en croissance
        items, order_ttc, order_don = [], Decimal("0"), Decimal("0")
        for _ in range(rnd.choices([1, 2, 3], weights=[55, 30, 15])[0]):
            d, t = rnd.choices(dests, weights=[dw[x] for x in dests])[0], pick(TIER_W)
            if (d, t) not in price:
                continue
            q = rnd.choices([1, 2, 3], weights=[75, 18, 7])[0]
            p = price[(d, t)]
            don = donation(p, "esim") * q
            items.append((d, t, q, p, don))
            order_ttc += p * q
            order_don += don
        if not items:
            continue
        if total + order_don > TARGET + Decimal("1.5"):
            break
        oid = c.execute(
            text("INSERT INTO orders (customer_id, cause_id, total_ttc, donation_amount, status, created_at, billing_country, terms_accepted_at, terms_version, lang) "
                 "VALUES (:c, :ca, :t, :d, 'provisioned', :w, 'FR', :w, 'demo', 'fr')"),
            {"c": u["id"], "ca": cause, "t": order_ttc, "d": order_don, "w": when},
        ).lastrowid
        for d, t, q, p, don in items:
            c.execute(
                text("INSERT INTO order_items (order_id, kind, label, destination_id, tier_key, qty, unit_price, donation) VALUES (:o, 'esim', :l, :d, :t, :q, :p, :don)"),
                {"o": oid, "l": f"eSIM {dname.get(d, d)} · {tname[t]}", "d": d, "t": t, "q": q, "p": p, "don": don / q},
            )
        total += order_don
        n_orders += 1

    by = c.execute(text("SELECT ca.name, ROUND(SUM(o.donation_amount),2) FROM orders o JOIN causes ca ON ca.id=o.cause_id JOIN customers cu ON cu.id=o.customer_id "
                        "WHERE cu.email LIKE :d GROUP BY ca.name ORDER BY 2 DESC"), {"d": f"%@{DOMAIN}"}).all()
    top = c.execute(text("SELECT referral_code FROM customers cu WHERE email LIKE :d ORDER BY (SELECT COUNT(*) FROM orders o WHERE o.customer_id=cu.id) DESC LIMIT 3"), {"d": f"%@{DOMAIN}"}).scalars().all()
print(f"créé : {N_USERS} faux clients, {n_orders} commandes, {total:.2f} € de dons fictifs")
for name, v in by:
    print(f"  {name:<34}{v:>9} €")
print("codes de passeport à essayer (/passeport/CODE) :", ", ".join(top))
