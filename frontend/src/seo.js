import { useEffect } from "react";

// ===== SEO : TOUT SE MODIFIE ICI =====
// - PAGES : titre (≈ 50-60 caractères) et description (≈ 140-155 caractères) de chaque page. Le mot-clé principal en premier.
// - destinationSeo() : modèle appliqué aux 185 fiches destination.
// - NOINDEX : pages privées ou sans intérêt pour Google (compte, paiement, passeports partagés…).
// Le titre H1 de chaque page est dans le composant de la page (un seul H1 par page).
export const SITE = { name: "KozzGo", tagline: "eSIM voyage solidaire", image: "/api/og/home.png", locale: "fr_FR" };

export const PAGES = {
  "/": {
    title: "eSIM voyage solidaire : data en 1 minute | KozzGo",
    description: "Reste connecté dans plus de 180 destinations avec une eSIM de voyage KozzGo. Activation en 1 minute, prix clairs, et 10 % du prix HT reversé à une cause.",
  },
  "/destinations": {
    title: "eSIM par pays : toutes les destinations (180+) | KozzGo",
    description: "Trouve ton eSIM de voyage parmi plus de 180 destinations : Maroc, Espagne, Japon, États-Unis, Thaïlande… Forfaits data, activation immédiate.",
  },
  "/comment-ca-marche": {
    title: "Comment fonctionne une eSIM de voyage ? | KozzGo",
    description: "Choisis ta destination, paie, scanne le QR code : ton eSIM est active en 1 minute. Le guide en 3 étapes pour voyager connecté sans changer de carte SIM.",
  },
  "/faq": {
    title: "FAQ eSIM : installation, compatibilité, remboursement | KozzGo",
    description: "Toutes les réponses sur l'eSIM de voyage : compatibilité de ton téléphone, installation, activation, partage de connexion, remboursement et paiement.",
  },
  "/impact": {
    title: "Impact : 12 causes soutenues par chaque eSIM | KozzGo",
    description: "Chaque achat finance 10 % du prix HT d'une cause de ton choix : repas, reforestation, eau potable, éducation. Découvre les dons générés par la communauté KozzGo.",
  },
  "/kozz-monde": {
    title: "Kozz Monde : abonnement eSIM mensuel sans engagement | KozzGo",
    description: "Une seule eSIM pour toutes tes destinations, au même prix partout. Abonnement mensuel sans engagement, résiliable en ligne à tout moment.",
  },
  "/telephones-compatibles": {
    title: "Liste des téléphones compatibles eSIM (700+ modèles) | KozzGo",
    description: "Vérifie si ton iPhone, Samsung, Pixel ou autre appareil est compatible eSIM. Plus de 700 modèles, recherche par marque, et test rapide avec *#06#.",
  },
  "/devenir-partenaire": {
    title: "Devenir partenaire ou afficher le badge KozzGo | KozzGo",
    description: "Blogs de voyage, associations, médias : affichez le badge KozzGo et recommandez une eSIM de voyage qui finance des causes. Badges, textes et kit presse.",
  },
  "/cgv": { title: "Conditions générales de vente | KozzGo", description: "Conditions générales de vente des eSIM et abonnements KozzGo : prix, paiement, livraison, droit de rétractation et garanties." },
  "/mentions-legales": { title: "Mentions légales | KozzGo", description: "Mentions légales de KozzGo : éditeur, hébergeur, contact et médiation de la consommation." },
  "/confidentialite": { title: "Politique de confidentialité | KozzGo", description: "Comment KozzGo protège tes données personnelles : données collectées, finalités, durées de conservation et droits RGPD." },
  "/retractation": { title: "Droit de rétractation | KozzGo", description: "Ce que prévoit le droit de rétractation pour les eSIM, produits numériques livrés immédiatement (article L221-28)." },
  "/remboursement": { title: "Politique de remboursement des eSIM | KozzGo", description: "Dans quels cas ton eSIM est remboursée ou remplacée : eSIM non livrée, problème technique, délais de remboursement." },
};

export const destinationSeo = (name, priceLabel) => ({
  title: `eSIM ${name} dès ${priceLabel} : forfait data voyage | KozzGo`,
  description: `eSIM ${name} : forfaits dès ${priceLabel}, installation en 1 minute, sans frais de roaming. 10 % du prix HT reversé à une cause.`,
});

// Préfixes à ne pas indexer (balise robots noindex + exclusion du robots.txt côté serveur)
export const NOINDEX = ["/profil", "/connexion", "/commande", "/mot-de-passe", "/mot-de-passe-oublie", "/passeport"];

const setMeta = (sel, attr, val) => {
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement(sel.startsWith("link") ? "link" : "meta");
    const m = /\[(\w+)="([^"]+)"\]/.exec(sel);
    if (m) el.setAttribute(m[1], m[2]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, val);
};

// Applique titre, description, canonique, Open Graph / Twitter, robots et données structurées (JSON-LD) de la page.
export function useSeo({ title, description, path, noindex = false, jsonLd }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    if (!title) return;
    const url = location.origin + (path ?? location.pathname);
    document.title = title;
    setMeta('meta[name="description"]', "content", description || "");
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[name="robots"]', "content", noindex ? "noindex,follow" : "index,follow,max-image-preview:large");
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[property="og:site_name"]', "content", SITE.name);
    setMeta('meta[property="og:locale"]', "content", SITE.locale);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description || "");
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", location.origin + SITE.image);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description || "");
    let s = document.getElementById("kozz-jsonld");
    if (ld) {
      if (!s) { s = document.createElement("script"); s.id = "kozz-jsonld"; s.type = "application/ld+json"; document.head.appendChild(s); }
      s.textContent = ld;
    } else s?.remove();
  }, [title, description, path, noindex, ld]);
}

export const orgJsonLd = () => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": location.origin + "/#org", name: SITE.name, url: location.origin, logo: location.origin + "/logo.svg", slogan: SITE.tagline },
    { "@type": "WebSite", "@id": location.origin + "/#site", url: location.origin, name: SITE.name, inLanguage: "fr", publisher: { "@id": location.origin + "/#org" } },
  ],
});

export const breadcrumbJsonLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: location.origin + path })),
});
