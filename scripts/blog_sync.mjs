// Synchronise le blog avec le reste du site et contrôle les articles.
//   node scripts/blog_sync.mjs           écrit backend/app/blog_schedule.json (sitemap) et la liste des adresses valides de frontend/nginx.conf
//   node scripts/blog_sync.mjs --check   contrôle seulement (liens FAQ, articles liés, doublons, longueurs) : code 1 si erreur
// Ensuite : docker compose up -d --build backend frontend, puis (le jour d'une publication) node scripts/prerender.mjs.
import fs from "fs";
import { pathToFileURL } from "url";

const { ALL_ARTICLES } = await import(pathToFileURL("frontend/src/blogContent.js").href);
const { FAQ_FLAT } = await import(pathToFileURL("frontend/src/faqContent.js").href);
const questions = new Set(FAQ_FLAT.map((f) => f.q));
const slugs = new Set(ALL_ARTICLES.map((a) => a.slug));
const errors = [];
const seen = new Set();
for (const a of ALL_ARTICLES) {
  if (seen.has(a.slug)) errors.push(`${a.slug}: slug en double`);
  seen.add(a.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) errors.push(`${a.slug}: date invalide (${a.date})`);
  if (a.description.length > 160) errors.push(`${a.slug}: description de ${a.description.length} caractères (max 160)`);
  for (const r of a.related || []) if (!slugs.has(r)) errors.push(`${a.slug}: article lié inconnu « ${r} »`);
  const texts = [a.intro, ...a.sections.flatMap((s) => [...(s.p || []), ...(s.list || []), ...(s.steps || []), ...(s.after || [])])];
  for (const t of texts) for (const m of t.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
    const to = m[2];
    if (to.startsWith("faq:") && !questions.has(to.slice(4))) errors.push(`${a.slug}: question FAQ introuvable « ${to.slice(4)} »`);
    if (to.startsWith("/blog/") && !slugs.has(to.slice(6))) errors.push(`${a.slug}: lien vers un article inconnu ${to}`);
  }
}
const faqLinks = ALL_ARTICLES.reduce((n, a) => n + JSON.stringify(a.sections).split("|faq:").length - 1, 0);
console.log(`${ALL_ARTICLES.length} articles, ${faqLinks} liens vers des questions de la FAQ`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
if (process.argv.includes("--check")) process.exit(0);

fs.writeFileSync("backend/app/blog_schedule.json", JSON.stringify(ALL_ARTICLES.map((a) => ({ slug: a.slug, date: a.date })), null, 1) + "\n");
const ng = fs.readFileSync("frontend/nginx.conf", "utf8");
const out = ng.replace(/"~\^\/blog\/\([^)]*\)\/\?\$" 1;/, `"~^/blog/(${[...slugs].join("|")})/?$" 1;`);
fs.writeFileSync("frontend/nginx.conf", out);
console.log("blog_schedule.json et nginx.conf mis à jour");
