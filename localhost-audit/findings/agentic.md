# Agentic readiness - KozzGo (analyse statique, 2026-10-19)
Lighthouse Agentic Browsing: non execute (Chromium absent). Agent-UX heuristique: partiel, statique, ~72/100 (hors fraction Lighthouse).
Acces: entrainement/recherche/agents utilisateur = tous autorises (robots.txt "User-agent: *", Allow /), sans Content-Signal (draft).
Les bots IA recoivent le HTML prerendu (Caddyfile).

## Correctifs
P1 1. Caddyfile/backend seo.py: /llms.txt renvoie le fallback SPA (200 text/html) alors que Caddy route vers /api/seo/llms.txt -> verifier que le backend/proxy deploye est a jour; renvoyer text/plain.
P1 2. Chat.jsx:85 et Cart.jsx:105 : input sans label (placeholder seul) -> ajouter aria-label; cause buttons: ajouter aria-pressed.
P2 3. Navbar.jsx:23, Home.jsx:32, Destinations.jsx:33, Compatible.jsx:42-50, FaqPage.jsx:41, Pages.jsx:49 : groupes de chips -> aria-pressed={actif}.
P2 4. FaqPage.jsx:37-40 : aria-label en dur en francais -> t().
P2 5. Navbar.jsx:74 mega-menu : ajouter aria-controls + fermeture Escape ; Cart.jsx : role="dialog" aria-modal, piege/retour du focus.
P2 6. SearchBox.jsx:52 : suggestions en onMouseDown + hover -> role=combobox/listbox, aria-activedescendant, navigation clavier.
P3 7. robots.txt (seo.py): ajouter ligne Content-Signal (ex. search=yes, ai-input=yes, ai-train=a decider) - draft; /destinations en ld+json manquant (0 bloc) -> ajouter.
P3 8. Opportunites: Markdown (Accept: text/markdown renvoie du HTML), /.well-known/ai-catalog.json (fallback SPA), WebMCP (absent) : pas des defauts.

## Deja bon
Un seul h1 par page, title/canonical uniques, landmarks (header/nav/main/footer), JSON-LD sur home/faq, boutons-icones avec aria-label (panier, menu, fermer, theme, mdp), SVG decoratifs aria-hidden, images alt="" ou descriptives, aria-expanded sur FAQ/menus, radiogroup du DataEstimator, labels sur formulaires Login/Profil/Checkout, CSP stricte, prerendu pour bots IA, robots.txt propre (Disallow /api, /chat, /commande, /profil).
Non verifie: ordre de focus reel (necessite navigateur).
