import { useLocation } from "react-router-dom";
import { NOINDEX, PAGES, SITE, orgJsonLd, useSeo } from "../seo.js";

// SEO des pages « simples » : on lit PAGES dans seo.js. Les pages qui calculent leur propre SEO (fiche destination, FAQ) appellent useSeo elles-mêmes.
const OWN = [/^\/destinations\/[^/]+$/, /^\/faq$/];

export default function RouteSeo() {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const own = OWN.some((r) => r.test(path));
  const priv = NOINDEX.some((p) => path === p || path.startsWith(p + "/"));
  const page = PAGES[path];
  useSeo(own ? {} : priv
    ? { title: `${SITE.name} : ${SITE.tagline}`, description: "", noindex: true, path }
    : page
      ? { ...page, path, jsonLd: path === "/" ? orgJsonLd() : undefined }
      : { title: `Page introuvable | ${SITE.name}`, description: "", noindex: true, path });
  return null;
}
