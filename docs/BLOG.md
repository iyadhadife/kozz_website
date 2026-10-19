# Blog : écrire, programmer, publier

Source unique : `frontend/src/blogContent.js` (articles publiés le 19/10/2026) et `frontend/src/blogContent2.js` (articles **programmés**, chacun avec une `date`).

## Programmer un article
1. Ajouter l'article dans `blogContent2.js` avec `date: "AAAA-MM-JJ"` (même structure que les autres : `slug`, `group`, `emoji`, `title`, `description` ≤ 160 caractères, `intro`, `sections`, `related`).
2. Liens vers la FAQ : `[[texte|faq:Question exacte de la FAQ]]` (ouvre la question directement sur /faq). Liens vers une page : `[[texte|/chemin]]`.
3. `node scripts/blog_sync.mjs` : contrôle les liens FAQ, les articles liés, les doublons et les longueurs, puis met à jour `backend/app/blog_schedule.json` (sitemap) et la liste des adresses valides de `frontend/nginx.conf`.
4. `docker compose up -d --build backend frontend`.
5. Relire avant la date : `/blog?apercu=1` (liste complète avec « programmé le … », aucun de ces articles n'est indexé).

## Le jour de la publication
L'article apparaît tout seul dans la liste du blog et dans le sitemap à sa date (le navigateur compare la date du jour, le serveur aussi). Pour que les robots sans JavaScript (IA, Bing) le lisent en entier, relancer le prérendu ce jour-là :
`node scripts/prerender.mjs` puis `docker compose up -d --build frontend` (voir docs/SEO.md). Googlebot exécute le JavaScript et n'a pas besoin du prérendu.

## Contrôle seul
`node scripts/blog_sync.mjs --check` (code de sortie 1 si une erreur).
