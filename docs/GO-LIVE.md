# Mise en ligne, Search Console et backlinks

## 1. Mettre le site en ligne
1. Louer un serveur (VPS) avec Docker et acheter un nom de domaine. Pointer le domaine vers l'IP du serveur (enregistrement DNS A, et AAAA si IPv6).
2. Sur le serveur, dans `.env` : `DOMAIN=ton-domaine.fr`, `ACME_EMAIL=ton@email`, `NGROK=false`. Caddy obtient alors tout seul le certificat HTTPS (Let's Encrypt) ; les ports 80 et 443 doivent être ouverts.
3. Renseigner l'identité de la société (`SELLER_*` : nom, forme juridique, adresse, SIREN, directeur de la publication, hébergeur, médiateur) : elles alimentent les mentions légales et la page À propos. Remplacer les clés Stripe de test par les clés live, mots de passe MySQL changés, `IMPACT_INCLUDE_DEMO=false`, données de démonstration purgées (`scripts/seed_demo.py --purge --yes`).
4. `docker compose up -d --build`, puis `node scripts/prerender.mjs` avec `PRERENDER_BASE=https://ton-domaine.fr`, puis `docker compose up -d --build frontend`.
5. Vérifier : `https://ton-domaine.fr/robots.txt`, `/sitemap.xml`, `/llms.txt`, une fiche destination, un article.

## 2. Search Console et Bing
1. https://search.google.com/search-console : ajouter une propriété « Domaine » ; la vérification se fait par un enregistrement DNS TXT.
2. Sitemaps : envoyer `https://ton-domaine.fr/sitemap.xml`. Demander l'indexation de l'accueil, /faq, /blog et 3 ou 4 articles.
3. https://www.bing.com/webmasters : importer la propriété depuis Search Console (couvre aussi DuckDuckGo et une partie des assistants IA).
4. Revenir après 2 à 4 semaines : pages indexées, requêtes, positions. Ces données alimentent les décisions suivantes (quels articles étoffer). L'outil SEOcrawl lit ces données dès que la propriété est connectée à son compte.

## 3. Auteur
Renseigner `frontend/src/author.js` (nom, rôle, courte biographie de faits vrais, profil professionnel). Les articles et la page /a-propos s'affichent alors au nom de cette personne, avec un auteur `Person` dans les données structurées.

## 4. Backlinks : quoi chercher et quoi proposer
Un lien entrant utile vient d'un site pertinent (voyage, télécoms, solidarité) qui te cite parce que tu lui apportes quelque chose. Ne pas acheter de liens ni échanger en masse : Google sanctionne ces pratiques.

| Cible | Ce que tu leur apportes | Page à proposer |
|---|---|---|
| Associations que tu soutiens | Un partenariat concret : nombre d'eSIM qui financent leur cause | /impact |
| Blogs et forums de voyage (voyage à petit budget, voyage en famille, expatriés) | Un guide fiable à citer, avec sources officielles | guides par destination, /blog |
| Annuaires et comparateurs de services de voyage | Une fiche complète et honnête | accueil, /devenir-partenaire |
| Journalistes, newsletters locales, sites étudiants (Erasmus) | Une donnée originale : impact total généré, comparaison roaming et eSIM | /impact, /blog |
| Partenaires (agences, comités d'entreprise, écoles) | Le badge « partenaire KozzGo » prêt à intégrer | /devenir-partenaire (badge) |

Message type : « Bonjour, nous avons publié un guide sur [sujet] avec les sources officielles (Apple, ARCEP…). Il pourrait compléter votre page [page] : [lien]. Nous sommes ouverts à une correction si une information vous paraît inexacte. » Un message personnalisé par site ; pas d'envoi en masse.

Suivi : un tableur (site, contact, date, réponse, lien obtenu), et Search Console > Liens pour voir les liens réellement reçus.
