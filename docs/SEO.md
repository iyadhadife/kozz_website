# SEO KozzGo : où modifier quoi, et plan de backlinks

## 1. Où modifier

| Je veux changer… | Fichier |
|---|---|
| Titre et description Google de chaque page, modèle des 185 fiches pays, pages en `noindex` | [frontend/src/seo.js](../frontend/src/seo.js) (`PAGES`, `destinationSeo`, `NOINDEX`) |
| Questions / réponses de la FAQ (page `/faq`, balisage Google FAQPage, FAQ de l'accueil) | [frontend/src/faqContent.js](../frontend/src/faqContent.js) |
| Ancres des liens proposés aux partenaires, textes du kit presse | [frontend/src/pages/Partner.jsx](../frontend/src/pages/Partner.jsx) (`ANCHORS`) |
| Pages listées dans `sitemap.xml`, fréquence et priorité, pages interdites aux robots (`robots.txt`) | [backend/app/seo.py](../backend/app/seo.py) (`STATIC`, `DISALLOW`) |
| Aperçu des liens partagés (WhatsApp, X, LinkedIn…) | [backend/app/og.py](../backend/app/og.py) |
| Adresse publique du site (canonical, sitemap, aperçus) | variable `SITE_URL` dans `.env` |

Après une modification du front : `docker compose up -d --build frontend` (backend : `... backend`).

**Règles de titres** (déjà appliquées) : un seul `H1` par page, puis des `H2` pour les parties, des `H3` sous un `H2`, jamais de niveau sauté.
`Section` accepte `h1` pour afficher le titre principal : `<Section h1 title="…">`.

**Longueurs** : titre ≈ 50-60 caractères, description ≈ 140-155. Mot-clé principal en premier.

## 2. Ce qui est en place

- Balises par page : `title`, `description`, `canonical`, `robots`, Open Graph, Twitter Card.
- Données structurées (JSON-LD) : `Organization` + `WebSite` (accueil), `Product`/`AggregateOffer` + fil d'Ariane (chaque fiche pays), `FAQPage` + fil d'Ariane (`/faq`).
- `sitemap.xml` (198 URL : pages + 185 destinations) et `robots.txt` générés par le serveur, déclarés à la racine du site.
- Pages privées en `noindex` : profil, connexion, commande, mot de passe, passeports partagés.
- Maillage interne : pied de page (FAQ, destinations populaires avec ancres « eSIM Maroc »…), fil d'Ariane, liens dans les réponses de la FAQ (`[[texte|/chemin]]`).
- Page d'accueil des partenaires `/devenir-partenaire` (badge SVG, liens à copier, kit presse) : c'est l'« actif à liens » du site.

**À faire à la mise en ligne** : mettre `SITE_URL` sur le vrai domaine, déclarer le site dans Google Search Console et Bing Webmaster Tools, soumettre `https://ton-domaine/sitemap.xml`, puis suivre « Couverture » et « Core Web Vitals ».

**Limite à connaître** : le site est une application React. Google exécute le JavaScript, mais l'indexation est plus lente qu'avec du HTML rendu côté serveur. Si le référencement devient un enjeu majeur, la vraie amélioration est le pré-rendu des pages publiques (SSR / SSG).

## 3. FAQ : méthode

On a relevé les questions que les clients posent sur les sites de revendeurs d'eSIM (Airalo, Holafly, Nomad, Saily…) : compatibilité, installation (QR, saisie manuelle), activation et validité, partage de connexion, recharge, remboursement, dépannage, sécurité. Les réponses de `faqContent.js` sont **rédigées pour KozzGo**, avec nos règles (remboursement, durée de validité, politique d'usage raisonnable…). On ne recopie pas les textes des concurrents : ce serait du contenu dupliqué, un risque de droits d'auteur, et leurs conditions ne sont pas les nôtres.

**À vérifier avant de publier** (réponses écrites avec les informations du dépôt, à confirmer côté produit) :
1. Les forfaits sont **data seulement** (pas de numéro, d'appel ni de SMS classiques).
2. Le **partage de connexion** est autorisé sur tous les forfaits.
3. Une recharge = **nouvelle eSIM** (pas d'ajout de data sur la même eSIM).
4. Un QR code est à **usage unique** et une eSIM supprimée ne se réinstalle pas toujours.
5. Délais et formulations de remboursement (page `/remboursement` = 14 jours max ; l'ancienne FAQ promettait « sous 24 h »).
6. Les forfaits **ne couvrent pas** avion, croisière et réseaux satellites.

## 4. Backlinks : ce qu'on fait, ce qu'on ne fait pas

**On ne fait pas** : achat de liens, réseaux de blogs privés (PBN), échanges de liens en masse, commentaires/forums spammés, ancres 100 % exactes. Google le sanctionne (action manuelle ou perte de classement) et ça peut ruiner le domaine.

**Principe** : gagner des liens parce que le contenu est utile ou parce que des partenaires y ont intérêt. Ce que le site offre déjà pour ça : la liste des téléphones compatibles eSIM (700+ modèles, référence que les blogs citent), les chiffres d'impact en direct, la FAQ et la page partenaires avec badge.

### Cibles, par ordre de rendement

1. **Les 12 causes (associations)** : chaque ONG peut mettre un lien « ils nous soutiennent » vers `/impact` ou vers une page dédiée. Intérêt mutuel, lien thématique fort.
2. **Blogs et médias voyage / expatriés / nomades numériques** : proposer la liste des téléphones compatibles et la FAQ comme ressource, offrir une eSIM de test pour un avis.
3. **Comparateurs et guides eSIM francophones** : demander l'ajout de KozzGo dans les comparatifs (envoyer prix, couverture, particularité « don »).
4. **Écoles, associations étudiantes, Erasmus, campus** : page « voyager connecté » pointant vers le guide d'installation.
5. **Presse locale et solidaire** (innovation sociale, ESS, impact) : communiqué appuyé sur un chiffre réel (« X € reversés »).
6. **Annuaires sérieux** : fiches entreprise (Google Business Profile, Trustpilot, annuaires de l'ESS et des start-up). Peu de valeur SEO, utile pour la confiance et les citations.
7. **Contenus à partager** : un guide « eSIM : comment choisir » ou « rapport annuel d'impact » téléchargeable.

### Ancres (répartition cible, pour rester naturel)

| Type | Part | Exemples |
|---|---|---|
| Marque | ~40 % | « KozzGo », « le site KozzGo » |
| URL nue | ~20 % | `kozzgo.com` |
| Générique | ~15 % | « ce site », « cliquer ici » |
| Partielle (mot-clé + contexte) | ~20 % | « une eSIM de voyage solidaire », « vérifier la compatibilité eSIM de ton téléphone » |
| Exacte | ≤ 5 % | « eSIM Maroc » (sur des pages vraiment dédiées) |

La page `/devenir-partenaire` propose déjà ces ancres variées, liées à la page la plus pertinente (`/destinations/ma` pour « eSIM Maroc », `/telephones-compatibles` pour la compatibilité, `/faq` pour les questions).

### Modèle de message (blog / média)

> Bonjour {prénom},
> J'ai lu votre article « {titre} », surtout la partie sur {sujet précis}. Nous avons mis en ligne une liste de plus de 700 téléphones compatibles eSIM, avec un test rapide (*#06#) : {lien /telephones-compatibles}. Elle peut compléter votre article si ça vous est utile.
> Si vous voulez tester KozzGo (eSIM de voyage qui reverse 10 % du prix HT à une cause), je vous envoie une eSIM pour votre prochain départ, sans obligation de contenu.
> Bien cordialement, {nom}

### Modèle de message (association partenaire)

> Bonjour,
> KozzGo reverse 10 % du prix hors taxes de chaque eSIM vendue à une cause choisie par le voyageur ; « {cause} » en fait partie. Nous aimerions présenter votre action sur notre page Impact. En retour, un lien vers KozzGo depuis votre page « partenaires » nous aiderait à faire connaître le dispositif. Nous vous fournissons badge et texte : {lien /devenir-partenaire}.

### Suivi

Mesure les liens obtenus avec Google Search Console (rapport « Liens »), Ahrefs Webmaster Tools (gratuit pour son propre site) ou Bing Webmaster Tools. Objectif réaliste : 3 à 5 liens de qualité par mois (domaines différents, thématiques proches), plutôt que des centaines de liens faibles.
