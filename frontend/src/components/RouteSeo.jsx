import { useLocation } from "react-router-dom";
import { DESTINATIONS } from "../data.js";
import { NOINDEX, PAGES, SITE, breadcrumbJsonLd, graph, orgJsonLd, useSeo } from "../seo.js";

// Fil d'Ariane de chaque page simple : [libellé de la page]
const CRUMB = { "/destinations": "Destinations", "/comment-ca-marche": "Comment ça marche", "/impact": "Impact", "/kozz-monde": "Kozz Monde", "/telephones-compatibles": "Téléphones compatibles eSIM", "/devenir-partenaire": "Devenir partenaire", "/a-propos": "À propos", "/cgv": "CGV", "/mentions-legales": "Mentions légales", "/confidentialite": "Confidentialité", "/retractation": "Droit de rétractation", "/remboursement": "Remboursement" };

// SEO des pages « simples » : on lit PAGES dans seo.js. Les pages qui calculent leur propre SEO (fiche destination, FAQ) appellent useSeo elles-mêmes.
const OWN = [/^\/destinations\/[^/]+$/, /^\/faq$/, /^\/blog$/, /^\/blog\/[^/]+$/];

export default function RouteSeo() {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const own = OWN.some((r) => r.test(path));
  const priv = NOINDEX.some((p) => path === p || path.startsWith(p + "/"));
  const page = PAGES[path];
  useSeo(own ? {} : priv
    ? { title: `${SITE.name} : ${SITE.tagline}`, description: "", noindex: true, path }
    : page
      ? { ...page, path, jsonLd: path === "/" ? orgJsonLd() : graph(
          breadcrumbJsonLd([["Accueil", "/"], [CRUMB[path] || page.title, path]]),
          path === "/destinations" ? { "@type": "ItemList", name: "Destinations eSIM KozzGo", numberOfItems: DESTINATIONS.length, itemListElement: DESTINATIONS.slice(0, 50).map((d, i) => ({ "@type": "ListItem", position: i + 1, name: `eSIM ${d.name}`, url: `${location.origin}/destinations/${d.id}` })) } : null,
        ) }
      : { title: `Page introuvable | ${SITE.name}`, description: "", noindex: true, path });
  return null;
}
