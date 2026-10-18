import { createElement, Fragment } from "react";

// Traduction : le français est la langue source. t("texte français") renvoie la traduction de la langue choisie,
// ou le texte français s'il n'y en a pas encore. Les variables s'écrivent {nom} : t("Encore {n} jours", { n: 3 }).
// Les dictionnaires sont dans src/locales/<code>.json, chargés à la demande (une langue = un fichier).
export const LANGS = [
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "en", name: "English", locale: "en-GB" },
  { code: "de", name: "Deutsch", locale: "de-DE" },
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "it", name: "Italiano", locale: "it-IT" },
  { code: "pt", name: "Português", locale: "pt-PT" },
  { code: "nl", name: "Nederlands", locale: "nl-NL" },
  { code: "ru", name: "Русский", locale: "ru-RU" },
  { code: "tr", name: "Türkçe", locale: "tr-TR" },
  { code: "zh", name: "中文", locale: "zh-CN" },
  { code: "ja", name: "日本語", locale: "ja-JP" },
  { code: "ko", name: "한국어", locale: "ko-KR" },
  { code: "ar", name: "العربية", locale: "ar", dir: "rtl" },
  { code: "hi", name: "हिन्दी", locale: "hi-IN" },
];

const files = import.meta.glob("./locales/*.json");
let dict = {};
let current = LANGS[0];

// Textes sans traduction rencontrés dans la langue courante (outil de contrôle : window.__i18nMissing)
export const missing = new Set();
if (typeof window !== "undefined") window.__i18nMissing = missing;

export const t = (s, vars) => {
  if (current.code !== "fr" && dict[s] === undefined && /[A-Za-zÀ-ÿ]{3}/.test(s)) missing.add(s);
  let out = dict[s] ?? s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return out;
};
export const currentLang = () => current;
export const currentLocale = () => current.locale;

// Langue de départ : choix mémorisé, sinon langue du navigateur si on la propose, sinon français
export function initialLang() {
  try {
    const saved = localStorage.getItem("kozz_lang");
    if (saved && LANGS.some((l) => l.code === saved)) return saved;
  } catch {}
  const nav = (typeof navigator !== "undefined" && navigator.language || "fr").slice(0, 2).toLowerCase();
  return LANGS.some((l) => l.code === nav) ? nav : "fr";
}

export async function loadLang(code) {
  const lang = LANGS.find((l) => l.code === code) || LANGS[0];
  let d = {};
  const loader = files[`./locales/${lang.code}.json`];
  if (lang.code !== "fr" && loader) {
    try {
      d = (await loader()).default || {};
    } catch {}
  }
  dict = d;
  current = lang;
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir || "ltr";
  }
  return lang;
}

// Nom d'un pays dans la langue choisie (Intl, sans dictionnaire). Le français garde les noms de la base (ex. « Indonésie (Bali) »).
export function countryName(d) {
  if (current.code === "fr" || !d?.id || d.id.length !== 2) return d?.name || "";
  try {
    return new Intl.DisplayNames([current.locale], { type: "region" }).of(d.id.toUpperCase()) || d.name;
  } catch {
    return d.name;
  }
}

// Singulier / pluriel : tn(n, "{n} jour", "{n} jours"). Les deux formes sont des clés du dictionnaire ; chaque langue y met ce qui lui convient.
export const tn = (n, one, many) => t(n > 1 ? many : one, { n });

// Phrase avec des éléments React à l'intérieur : tx("J'ai lu les {cgv}.", { cgv: <Link>CGV</Link> }).
// La phrase entière est traduite d'un coup (l'ordre des mots change selon les langues), puis les {variables} sont remplacées.
export const tx = (s, vars) => {
  const parts = (dict[s] ?? s).split(/(\{\w+\})/);
  return parts.map((p, i) => {
    const m = /^\{(\w+)\}$/.exec(p);
    const v = m ? vars?.[m[1]] : p;
    return createElement(Fragment, { key: i }, v ?? p);
  });
};
