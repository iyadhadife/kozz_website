# GEO KozzGo : 38/100

Détail par dimension : citabilité 12/25, structure 14/20, multimodal 6/15, autorité 4/20, technique 2/20.

## Accès des crawlers IA
- robots.txt contient `User-agent: *` / `Allow: /`. Aucune règle par robot, donc GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot et Google-Extended sont tous autorisés.
- Le blocage est en pratique : le HTML brut fait 716 o et ne contient aucun texte, et ces robots n'exécutent pas le JS. Le contenu leur est donc invisible.
- /llms.txt répond 200 mais renvoie la coquille SPA (faux 200) : il n'existe pas vraiment.

## Correctifs (du plus grave au moins grave)
1. **Critique** : frontend (Vite) : pré-rendu SSG ou SSR des routes publiques listées dans `STATIC` (backend/app/seo.py) et des pages /destinations/{id}.
2. **Critique** : JSON-LD (FAQPage, Product, Organization) injecté côté serveur dans le HTML brut, pas par le JS.
3. **Élevé** : proxy/Caddyfile : renvoyer un vrai 404 pour les fichiers inconnus (*.txt, *.xml) au lieu du repli SPA.
4. **Élevé** : Organization : ajouter `sameAs` (LinkedIn, Instagram, YouTube), `logo` et `foundingDate`. Pour l'instant, aucun signal d'entité (pas de Wikipedia/Wikidata, Reddit ni YouTube).
5. **Moyen** : frontend/src/faqContent.js : ouvrir chaque réponse par une phrase directe de 40 à 80 mots avec un chiffre (prix en €, nombre de pays, % reversé).
6. **Moyen** : /impact : rendre les chiffres (dons, causes) en texte statique daté avec la source, et pas seulement en graphiques.
7. **Faible** : backend/app/seo.py : servir un /llms.txt (route + `handle` Caddy). Il est optionnel et ignoré par Google Search.
8. **Faible** : seo.py : `lastmod` réel au lieu de `date.today()`, et des H1 descriptifs (« Voyagez connecté. », « Kozz Monde »).

## Ce qui est déjà bon
- La hiérarchie H1/H2/H3 est propre : un seul H1 par page, et des H2 en question (« Pourquoi KozzGo ? »).
- 57 Q/R sont balisées FAQPage, avec Product/AggregateOffer, BreadcrumbList et WebSite.
- Les pages privées sont exclues (Disallow) et le sitemap est dynamique.
- Le contenu FAQ est original et a une source unique.
