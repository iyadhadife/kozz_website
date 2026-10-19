# Audit SEO KozzGo (site local) : synthèse et plan d'action

Outils : plugin Claude SEO (agents seo-technical, seo-schema, seo-content, seo-geo, seo-agentic) sur https://localhost.
Limites : Chromium du plugin non installé (disque presque plein) donc pas de Lighthouse, ni de Core Web Vitals mesurés par le plugin, ni de captures par le plugin ; HTML rendu et mesures de chargement faits avec Edge. Site local : aucune donnée Google (Search Console, CrUX), aucun backlink mesurable, pas de concurrence SERP.

## Scores avant corrections

| Domaine | Score | Rapport |
|---|---|---|
| Technique | 74/100 | findings/technical.md |
| Données structurées | 62/100 | findings/schema.md |
| Contenu / E-E-A-T | 58/100 | findings/content.md |
| Visibilité IA (GEO) | 38/100 | findings/geo.md |
| Prêt pour les agents IA | ≈ 72/100 (estimation statique) | findings/agentic.md |
| **Santé SEO globale** | **≈ 65/100** (estimation pondérée ; performance non mesurée) | |

## Corrigé dans cette passe

1. **Pages vides sans JavaScript** (critique) : le HTML brut faisait 716 octets. Un instantané HTML rendu de 198 pages est servi aux robots sans JS (IA, Bing, DuckDuckGo, Yandex, Baidu, Apple) : `scripts/prerender.mjs`, `proxy/Caddyfile`. Googlebot reste sur la SPA (il exécute le JS).
2. **Faux 200 (soft-404)** : les routes inconnues répondent maintenant 404, y compris `/ads.txt`, `/llms.txt` inexistants (`frontend/nginx.conf`). `index.html` n'est plus mis en cache.
3. **Données structurées** : logo Organization en PNG 512 px (le SVG n'est pas accepté), description, Product avec image, sku, `@id` et une `Offer` par forfait (disponibilité sur chaque offre), fil d'Ariane sur toutes les pages, `ItemList` sur /destinations.
4. **`/llms.txt`** réel (texte) et ligne `Content-Signal` dans robots.txt (`search=yes, ai-input=yes` ; `ai-train` volontairement non précisé : décision de l'éditeur).
5. **Contenu** : résumé chiffré propre à chaque fiche pays (prix, prix au Go, forfait le plus avantageux) pour réduire le risque de pages quasi identiques ; espace manquant dans le H1 de l'accueil.
6. **Accessibilité / agents** : `aria-pressed` sur les filtres, `aria-label` du champ de chat.

## À faire ensuite

| Priorité | Action |
|---|---|
| Haute | **Contradiction sur le don** : l'interface (accueil « 10 % de la marge », fiche pays, mail de commande, CGV) dit « marge » ; le calcul réel (`backend/app/pricing.py`) et les pages de partage disent « 10 % du prix HT ». Un seul énoncé, validé juridiquement, partout. |
| Haute | **Contenu unique par pays** : 150-300 mots propres à chacun des pays principaux (opérateurs locaux, couverture, prix d'une SIM locale, achat à l'aéroport). Sinon `noindex` sur les pays sans contenu propre. |
| Haute | **Page À propos** (qui est KozzGo, société, SIREN, adresse), avis clients vérifiés, preuve des dons (reçus des associations) : signaux E-E-A-T. |
| Haute | `SITE_URL` sur le vrai domaine, puis `node scripts/prerender.mjs` à chaque mise en ligne de contenu ; Search Console + Bing Webmaster ; mesurer Core Web Vitals en production. |
| Moyenne | Pages guides : « eSIM, SIM locale ou roaming ? », « Meilleure eSIM pour voyager », « Internet au Maroc / Japon / USA ». Questions d'achat dans la FAQ (prix, couverture). |
| Moyenne | Ouvrir chaque réponse de FAQ par une phrase directe de 40 à 80 mots avec un chiffre. Chiffres d'impact en texte daté sur /impact. |
| Moyenne | `sameAs` de l'Organization (LinkedIn, Instagram, YouTube) dès que les comptes existent. |
| Moyenne | Plusieurs langues : URLs par langue (`/en/…`) + hreflang si le marché étranger compte. |
| Basse | Combobox accessible pour la recherche de destination, `role="dialog"` sur le panier, HSTS `includeSubDomains; preload` en production, `lastmod` réel dans le sitemap. |
