import { countryName, t, tn } from "./i18n.js";

// Prix TTC par destination : [city-break 1 Go/7 j, semaine 3 Go/10 j, voyage 10 Go/30 j, illimité 10 j]
// Source : grille A.1 des hypothèses tarifaires. Plusieurs prix sont encore "à confirmer" (relevés incomplets).
export const TIERS = [
  { key: "city", name: "City-break", gb: 1, days: 7, icon: "🏙️", blurb: "Un week-end, un city-trip" },
  { key: "week", name: "Semaine", gb: 3, days: 10, icon: "📅", blurb: "Séjour d'une à deux semaines" },
  { key: "trip", name: "Voyage", gb: 10, days: 30, icon: "🎒", blurb: "Le best-seller, un mois de tranquillité" },
  { key: "unl", name: "Illimité", gb: Infinity, days: 10, icon: "📶", blurb: "Fair use 3–5 Go/jour, affiché dès l'achat" },
];

export const DESTINATIONS = [
  { id: "ma", name: "Maroc", zone: "Maghreb", prices: [4.9, 8.9, 17.9, 21.9] },
  { id: "es", name: "Espagne", zone: "Europe", prices: [4.5, 7.9, 13.9, 16.9] },
  { id: "it", name: "Italie", zone: "Europe", prices: [4.5, 7.9, 13.9, 16.9] },
  { id: "pt", name: "Portugal", zone: "Europe", prices: [4.5, 7.9, 13.9, 16.9] },
  { id: "tn", name: "Tunisie", zone: "Maghreb", prices: [4.9, 8.9, 15.9, 19.9] },
  { id: "tr", name: "Turquie", zone: "Moyen-Orient", prices: [3.9, 6.9, 11.9, 14.9] },
  { id: "th", name: "Thaïlande", zone: "Asie", prices: [4.5, 6.9, 11.9, 15.9] },
  { id: "id", name: "Indonésie (Bali)", zone: "Asie", prices: [4.5, 7.9, 13.9, 17.9] },
  { id: "ae", name: "Émirats (Dubaï)", zone: "Moyen-Orient", prices: [5.9, 9.9, 16.9, 21.9] },
  { id: "us", name: "États-Unis", zone: "Amériques", prices: [5.9, 9.9, 19.9, 24.9] },
  { id: "vn", name: "Vietnam", zone: "Asie", prices: [4.5, 6.9, 10.9, 14.9] },
  { id: "jp", name: "Japon", zone: "Asie", prices: [5.5, 8.9, 15.9, 19.9] },
  { id: "sa", name: "Arabie Saoudite", zone: "Moyen-Orient", prices: [6.9, 10.9, 18.9, 23.9] },
];

// Conso moyenne par jour (Go) pour l'assistant
export const USAGE = [
  { key: "light", label: "Léger", gbPerDay: 0.2, hint: "Messages, cartes, mails" },
  { key: "mid", label: "Modéré", gbPerDay: 0.6, hint: "+ réseaux sociaux, un peu de vidéo" },
  { key: "heavy", label: "Intensif", gbPerDay: 1.2, hint: "Partage de connexion, streaming, visio" },
];

// Les unités d'impact sont INDICATIVES : à remplacer par les valeurs validées avec chaque ONG (convention de reversement).
export const CAUSES = [
  { id: "restos", cat: "Solidarité", name: "Repas pour tous", unit: "repas offerts", cost: 0.2, emoji: "🍲" },
  { id: "inclusion", cat: "Solidarité", name: "Inclusion numérique en France", unit: "h d'accompagnement", cost: 3, emoji: "🤝" },
  { id: "arbres", cat: "Planète", name: "Reforestation", unit: "arbres plantés", cost: 0.8, emoji: "🌳" },
  { id: "ocean", cat: "Planète", name: "Océans propres", unit: "kg de déchets collectés", cost: 0.5, emoji: "🌊" },
  { id: "tsf", cat: "Éducation & numérique", name: "Data pour data", unit: "jours de connexion pour des réfugiés", cost: 0.5, emoji: "📡", signature: true },
  { id: "ecole", cat: "Éducation & numérique", name: "École connectée", unit: "jours d'école connectée", cost: 1.5, emoji: "🏫" },
  { id: "soins", cat: "Santé & recherche", name: "Accès aux soins", unit: "traitements financés", cost: 1, emoji: "💊" },
  { id: "recherche", cat: "Santé & recherche", name: "Recherche médicale", unit: "h de recherche", cost: 3, emoji: "🔬" },
  { id: "nutrition", cat: "Enfance", name: "Nutrition des enfants", unit: "jours de nutrition", cost: 0.3, emoji: "🧒" },
  { id: "livres", cat: "Enfance", name: "Livres pour enfants", unit: "livres offerts", cost: 2, emoji: "📚" },
  { id: "eau", cat: "Humanitaire", name: "Eau potable au Sahel", unit: "jours d'eau pour une famille", cost: 0.12, emoji: "💧" },
  { id: "energie", cat: "Humanitaire", name: "Électricité solidaire", unit: "h d'électricité", cost: 0.25, emoji: "💡" },
];


// --- Calcul du don (10 % de la marge brute HT) ---
// Hypothèse de marge tant que le Cost Engine n'est pas branché : à remplacer par le vrai coût wholesale.
export const MARGIN_RATE = { esim: 0.45, subscription: 0.3, topup: 0.07 }; // remplacé par les valeurs du serveur
export const donation = (priceTTC, kind) => (priceTTC / 1.2) * MARGIN_RATE[kind] * 0.1;
export const impactUnits = (euros, cause) => euros / cause.cost;

// --- Devises : l'euro TTC reste la référence ; le serveur impose la même règle d'arrondi au paiement (backend/app/fx.py) ---
const FX = { code: "EUR", rate: 1, decimals: 2, step: 0, locale: "fr-FR" };
export const FX_STATE = FX;
export function setCurrencyState(p) {
  Object.assign(FX, p);
}
// prix en euros -> unités mineures de la devise choisie (centimes, yens entiers…), comme le serveur
export const minorOf = (n) => {
  let major = n * FX.rate;
  if (FX.step) major = Math.max(FX.step, Math.round(major / FX.step) * FX.step);
  return Math.round(major * 10 ** FX.decimals + 1e-9);
};
const fmt = (major, code, decimals, locale) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: code, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(major);
export const fmtMinor = (minor) => fmt(minor / 10 ** FX.decimals, FX.code, FX.decimals, FX.locale);
export const eur = (n) => fmtMinor(minorOf(n)); // un prix en euros, affiché dans la devise choisie
export const eurLine = (price, qty) => fmtMinor(minorOf(price) * qty); // même somme que celle débitée
export const eurFixed = (n) => fmt(n, "EUR", 2, FX.locale); // montants comptables (factures, historique) : toujours en euros
export const money = (n, code, decimals = 2) => fmt(n, code, decimals, FX.locale); // montant déjà exprimé dans `code`
export const fmtNum = (n) => n.toLocaleString(FX.locale, { maximumFractionDigits: n < 10 ? 1 : 0 });

// --- Navigation / catalogue ---
export const flag = (id) => `/flags/${id}.svg`; // hébergés chez nous (RGPD : aucune requête vers un tiers) ; les emojis drapeaux ne s'affichent pas sous Windows
export const POPULAR = ["ma", "es", "th", "id", "tr", "ae", "us", "jp", "it", "tn", "pt", "vn"];
export const ZONES = [...new Set(DESTINATIONS.map((d) => d.zone))];
export const fromPrice = (d) => d.prices[0];

// Abonnements "Kozz Monde" : une eSIM pour toutes les destinations (prix du cadrage produit)
export const MONDE = [
  { id: "m10", name: "Monde 10", data: "10 Go / mois", price: 14.9 },
  { id: "m25", name: "Monde 25", data: "25 Go / mois", price: 24.9, popular: true },
  { id: "minf", name: "Monde ∞", data: "Illimité (fair use 5 Go/j)", price: 39.9 },
];

export const FAQ = [
  { cat: "Installation", q: "Mon téléphone est-il compatible eSIM ?", a: "Il faut un smartphone compatible eSIM et débloqué (non verrouillé par un opérateur). C'est le cas de la plupart des iPhone depuis le XS et de nombreux Android récents." },
  { cat: "Installation", q: "Comment installer mon eSIM ?", a: "Après l'achat, tu reçois un QR code. Scanne-le dans les réglages de ton téléphone, puis active la ligne à l'arrivée. L'installation prend environ une minute et peut se faire avant le départ." },
  { cat: "Installation", q: "Et si l'installation échoue ?", a: "Un humain prend le relais en moins de 5 minutes. Si le problème n'est pas résolu sous 24 h, tu es remboursé." },
  { cat: "Achat", q: "Quand démarre la durée de validité ?", a: "À ta première connexion sur place, pas à l'achat. Tu peux donc acheter ton eSIM à l'avance." },
  { cat: "Achat", q: "Que signifie « illimité » ?", a: "Data sans compter, avec un fair use affiché clairement avant l'achat (plein débit jusqu'à un seuil par jour, puis débit réduit). Rien n'est caché." },
  { cat: "Achat", q: "Puis-je acheter plusieurs eSIM ?", a: "Oui : plusieurs appareils (un eSIM par appareil) ou plusieurs destinations dans la même commande, grâce au panier." },
  { cat: "Impact", q: "Comment fonctionne le don ?", a: "10 % de la marge de chaque achat est reversé à la cause de ton choix. Ton impact s'affiche en unités concrètes dans ton Passeport d'impact." },
  { cat: "Impact", q: "Le don change-t-il le prix ?", a: "Non. Le don est pris sur notre marge, tu ne paies pas plus cher." },
];

// --- Catalogue servi par l'API (MySQL) ---
// Les tableaux ci-dessus servent de secours hors-ligne ; on les remplace EN PLACE par ceux de la base
// pour que tous les composants voient les mêmes références.
const replace = (arr, next) => arr.splice(0, arr.length, ...next);

export function hydrateCatalog(c) {
  replace(TIERS, c.tiers.map((x) => ({ ...x, gb: x.gb ?? Infinity })));
  replace(DESTINATIONS, c.destinations);
  replace(ZONES, [...new Set(c.destinations.map((d) => d.zone))]);
  replace(CAUSES, c.causes);
  replace(MONDE, c.monde);
  Object.assign(MARGIN_RATE, c.margin_rates);
  RAW = null; // nouvelles données françaises : on refait la copie de référence
  localizeData();
}

export async function loadCatalog() {
  try {
    const res = await fetch("/api/catalog");
    if (res.ok) hydrateCatalog(await res.json());
    else console.warn("Catalogue API indisponible, données locales utilisées");
  } catch {
    console.warn("API injoignable, données locales utilisées");
  }
}


// --- Langue : les données (forfaits, causes, FAQ, pays…) sont écrites en français dans la base. On garde une copie française de
// référence (RAW) et on traduit les champs affichés en place à chaque changement de langue, sans toucher aux composants. ---
let RAW = null;
const snap = () => ({
  tiers: TIERS.map((x) => ({ name: x.name, blurb: x.blurb })),
  usage: USAGE.map((x) => ({ label: x.label, hint: x.hint })),
  causes: CAUSES.map((x) => ({ cat: x.cat, name: x.name, unit: x.unit })),
  monde: MONDE.map((x) => ({ name: x.name, data: x.data })),
  faq: FAQ.map((x) => ({ cat: x.cat, q: x.q, a: x.a })),
  dest: DESTINATIONS.map((x) => ({ id: x.id, name: x.name })),
});
export function localizeData() {
  if (!RAW) RAW = snap();
  TIERS.forEach((x, i) => { x.name = t(RAW.tiers[i].name); x.blurb = t(RAW.tiers[i].blurb); });
  USAGE.forEach((x, i) => { x.label = t(RAW.usage[i].label); x.hint = t(RAW.usage[i].hint); });
  CAUSES.forEach((x, i) => { const r = RAW.causes[i]; if (r) { x.cat = t(r.cat); x.name = t(r.name); x.unit = t(r.unit); } });
  MONDE.forEach((x, i) => { const r = RAW.monde[i]; if (r) { x.name = t(r.name); x.data = t(r.data); } });
  FAQ.forEach((x, i) => { x.q = t(RAW.faq[i].q); x.a = t(RAW.faq[i].a); }); // `cat` reste en français : le code s'en sert comme identifiant
  DESTINATIONS.forEach((x, i) => { const r = RAW.dest[i]; if (r) x.name = countryName({ id: r.id, name: r.name }); });
}

// Libellés courants
export const gbLabel = (gb) => (gb === Infinity ? t("Illimité") : t("{n} Go", { n: gb }));
export const daysLabel = (n) => tn(n, "{n} jour", "{n} jours");
// Libellé d'une ligne du panier, reconstruit dans la langue courante (le texte enregistré dans le panier reste en français)
export function itemLabel(i) {
  if (i.kind === "esim") {
    const d = DESTINATIONS.find((x) => x.id === i.destination_id);
    const tier = TIERS.find((x) => x.key === i.tier_key);
    if (d && tier) return `${t("eSIM")} ${d.name} · ${gbLabel(tier.gb)} / ${t("{n} j", { n: tier.days })}`;
  }
  if (i.kind === "subscription") {
    const m = MONDE.find((x) => x.id === i.subscription_id);
    if (m) return `Kozz Monde · ${m.name} (${t("mensuel")})`;
  }
  return i.label;
}
