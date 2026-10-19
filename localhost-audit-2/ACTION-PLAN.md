# Audit SEO KozzGo, passe 2 (site local https://localhost)

Méthode : exploration des 198 URLs du sitemap avec l'agent d'un robot IA (instantané rendu), contrôle des en-têtes, des 404, du comportement par type de robot, du JSON-LD ; PageSpeed Insights réel sur l'URL ngrok (performances, accessibilité, bonnes pratiques). Données brutes : `pages.json`.
Limites : site local donc aucune donnée Google (Search Console, CrUX), aucun backlink, aucune SERP. Le plugin Claude SEO n'accepte pas le certificat auto-signé de localhost : son contrôle « agentic » local est inexploitable. Le score SEO et la « navigation agentique » de PageSpeed sur ngrok sont faussés par la page d'avertissement ngrok (voir plus bas) : ne pas en tenir compte.

## Résultats mesurés

| Contrôle | Résultat |
|---|---|
| Pages du sitemap | 198, toutes en 200, aucune en noindex |
| Titres | tous présents, aucun doublon ; 3 sur 198 dépassent 60 caractères (51 avant lecture des entités HTML, 31 avant correction) |
| Meta descriptions | toutes présentes, aucune en doublon, 1 dépasse 160 caractères |
| H1 | un seul par page, sur les 198 |
| Canonical | présente et cohérente partout |
| Images | 383 images, 0 sans attribut alt |
| JSON-LD | présent sur toutes les pages ; fiche pays : Product (6 offres, sku, image, marque) + BreadcrumbList |
| Contenu des fiches pays | 567 à 571 mots chacune (texte propre aux chiffres du pays, mais gabarit commun) |
| Pages courtes | /comment-ca-marche 211 mots, /kozz-monde 205, /mentions-legales 252, /retractation 294 |
| Robots IA / Bing | reçoivent l'instantané rendu (55 Ko) ; Googlebot reçoit la SPA (713 octets) et exécute le JS |
| Aperçus de liens (WhatsApp...) | reçoivent une page Open Graph dédiée (1,5 Ko) |
| 404 réels | /zzz-unknown, /ads.txt, /.well-known/ai-catalog.json |
| HTTP vers HTTPS | redirection 308 |
| En-têtes | HSTS, CSP, nosniff, Referrer-Policy, index.html en no-cache |
| PageSpeed (ngrok) | Performances 97, Accessibilité 96 (corrigée, voir ci-dessous), Bonnes pratiques 100 ; LCP 1,1 s, TBT 0 ms, CLS 0,002 |

## Corrigé pendant cet audit

1. **Soft-404 sur les codes pays inconnus** : `/destinations/zz` répondait 200 avec la coquille de l'app. nginx n'accepte plus que les 185 codes réels (`frontend/nginx.conf`) ; le reste répond 404. À régénérer si une destination est ajoutée.
2. **Titres trop longs** : les noms de pays longs dépassaient 60 caractères (31 pages). Le titre se raccourcit automatiquement (`destTitle` dans `frontend/src/seo.js`) ; instantanés de prérendu régénérés.
3. **Contraste du texte corail** (accessibilité 96) : `--coral-ink` passe de `#d4553c` à `#b8402a` ; plus aucun échec sur l'accueil, /destinations, /faq, /impact.
4. **Interrupteur ngrok** (`NGROK` / `NGROK_HOST` dans `.env`) pour tester une URL publique sans casser localhost.

## À faire

| Priorité | Action |
|---|---|
| Haute | **Contradiction sur le don** : « 10 % de la marge » (accueil, CGV, e-mail) contre « 10 % du prix HT » (calcul réel, pages de partage, descriptions SEO). Un énoncé unique, validé juridiquement. Les meta descriptions disent « prix HT ». |
| Haute | **Contenu unique par pays** : 185 fiches de ~570 mots mais au même gabarit. 150-300 mots propres aux pays principaux (opérateurs, couverture réelle, prix d'une SIM locale), sinon risque de contenu quasi dupliqué. |
| Haute | **Mise en ligne** : domaine réel dans `DOMAIN`/`SITE_URL`, relancer le prérendu, Search Console et Bing Webmaster, mesure CrUX. Re-lancer PageSpeed et le plugin sur l'URL de production : le SEO de PageSpeed (54) et la navigation agentique (2/4) obtenus via ngrok viennent de la page d'avertissement ngrok (elle remplace robots.txt, llms.txt et ai-catalog.json par du HTML et ajoute `X-Robots-Tag: noindex`), pas du site. |
| Haute | **Page À propos**, avis vérifiés, reçus de dons des associations : signaux E-E-A-T. |
| Moyenne | Étoffer les pages courtes (comment ça marche, Kozz Monde : 205-211 mots). |
| Moyenne | Pas de `favicon.ico` (404) ni de manifeste web : ajouter `/favicon.ico` et un `manifest.webmanifest` (le SVG est déjà déclaré). |
| Moyenne | Guides : « eSIM, SIM locale ou roaming ? », « Meilleure eSIM pour voyager », « Internet au Maroc / Japon / USA ». |
| Moyenne | `sameAs` de l'Organization dès que les comptes sociaux existent ; URLs par langue + hreflang si le marché étranger compte. |
| Basse | Combobox accessible pour la recherche, `lastmod` réel dans le sitemap, ressources JS inutilisées (-45 Ko signalés par PageSpeed). |

## Score estimé

≈ 72/100 (65 à la passe 1). Technique, schéma et accessibilité sont solides ; ce qui retient la note est le contenu (gabarit commun, absence de À propos/avis) et l'absence de signaux externes, impossibles à mesurer en local.
