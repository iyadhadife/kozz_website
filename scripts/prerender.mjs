// Pré-rendu des pages publiques : enregistre le HTML RENDU (comme le voit un visiteur) dans frontend/public/__prerender/.
// Caddy sert ces instantanés UNIQUEMENT aux robots qui n'exécutent pas le JavaScript (IA, Bing, DuckDuckGo, Yandex…) :
// le contenu est identique à celui des visiteurs (ce n'est pas du « cloaking »), seul le moyen de le livrer change.
//
// Usage (site en marche sur https://localhost, Edge ou Chrome installé) :
//   node scripts/prerender.mjs                 # toutes les pages du sitemap
//   node scripts/prerender.mjs /faq /impact    # seulement certaines pages
// puis reconstruire le front : docker compose up -d --build frontend
// À relancer après chaque modification de texte, de prix ou de destination.
import fs from "fs";
import path from "path";

// playwright-core : installe-le (npm i -D playwright-core) ou donne son chemin dans PLAYWRIGHT_PATH (ex. file:///.../node_modules/playwright-core/index.mjs)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright-core");
const BASE = process.env.PRERENDER_BASE || "https://localhost";
const OUT = path.resolve("frontend/public/__prerender");
const BROWSERS = [process.env.CHROME_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/chromium", "/usr/bin/google-chrome"].filter(Boolean);
const exe = BROWSERS.find((p) => fs.existsSync(p));
if (!exe) throw new Error("Aucun navigateur trouvé : définis CHROME_PATH");

const args = process.argv.slice(2);
let routes = args;
if (!routes.length) {
  const xml = await (await fetch(`${BASE}/sitemap.xml`).catch(() => null))?.text?.();
  if (!xml) throw new Error("sitemap.xml inaccessible : le site tourne-t-il ? (NODE_TLS_REJECT_UNAUTHORIZED=0 pour un certificat local)");
  routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
// pas d'animation d'intro dans l'instantané
await ctx.addInitScript(() => { sessionStorage.setItem("kozz_intro", "2"); sessionStorage.setItem("kozz_nudge", "1"); });
const page = await ctx.newPage();
let ok = 0;
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("h1"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  // Les sections qui s'animent au scroll sont opacity:0 tant qu'elles ne sont pas vues : on fait défiler la page pour les révéler
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForTimeout(500);
  let html = await page.evaluate(() => {
    document.querySelectorAll("script:not([type='application/ld+json']), link[rel=modulepreload], .chat, .qr-intro-wrap, .tabbar").forEach((e) => e.remove());
    document.documentElement.removeAttribute("data-theme");
    return "<!doctype html>\n" + document.documentElement.outerHTML;
  });
  const file = path.join(OUT, r === "/" ? "index.html" : r.replace(/\/$/, "") + ".html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  ok++;
  if (ok % 25 === 0) console.log(ok, "/", routes.length);
}
await browser.close();
console.log(`${ok} page(s) pré-rendue(s) dans ${OUT}`);
