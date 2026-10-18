import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Section from "../components/Section.jsx";
import { flat, key, loadDevices } from "../components/PhoneCheck.jsx";
import { currentLocale, t } from "../i18n.js";

const CATS = [["phone", "Téléphones"], ["tablet", "Tablettes"], ["watch", "Montres"], ["laptop", "Ordinateurs"]];

// Liste des appareils compatibles eSIM : recherche, filtre par type et par marque.
export default function Compatible() {
  const [data, setData] = useState(null);
  const [updated, setUpdated] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("phone");
  const [brand, setBrand] = useState("");
  useEffect(() => { loadDevices().then((m) => { setData(flat(m)); setUpdated(m.ESIM_UPDATED); }); }, []);

  const inCat = useMemo(() => (data || []).filter((d) => d.cat === cat), [data, cat]);
  const brands = useMemo(() => {
    const c = new Map();
    inCat.forEach((d) => c.set(d.brand, (c.get(d.brand) || 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [inCat]);
  const shown = useMemo(() => {
    const k = key(q);
    return inCat.filter((d) => (!brand || d.brand === brand) && (!k || key(d.brand + d.n).includes(k)));
  }, [inCat, q, brand]);
  const groups = useMemo(() => {
    const g = new Map();
    shown.forEach((d) => g.set(d.brand, [...(g.get(d.brand) || []), d]));
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [shown]);
  const month = updated ? new Intl.DateTimeFormat(currentLocale(), { month: "long", year: "numeric" }).format(new Date(updated + "-01")) : "";

  return (
    <Section id="compatibles" title={t("Téléphones compatibles eSIM")} subtitle={t("Retrouve ton appareil dans la liste. Elle regroupe plus de {n} modèles, issus de listes publiques : la compatibilité peut varier selon le pays d'achat, la version et le blocage de l'opérateur.", { n: Math.floor((data?.length || 700) / 50) * 50 })}>
      <input className="filter" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher un appareil ou une marque…")} aria-label={t("Rechercher un appareil ou une marque…")} />
      <div className="chips">
        {CATS.map(([k, l]) => (
          <button key={k} className={`chip ${cat === k ? "on" : ""}`} onClick={() => { setCat(k); setBrand(""); }}>
            {cat === k && <motion.span layoutId="compat-cat" className="chip-bg" />}<span>{t(l)}</span>
          </button>
        ))}
      </div>
      <div className="chips brands">
        <button className={`chip ${!brand ? "on" : ""}`} onClick={() => setBrand("")}>{!brand && <motion.span layoutId="compat-brand" className="chip-bg" />}<span>{t("Toutes")}</span></button>
        {brands.slice(0, 14).map(([b, n]) => (
          <button key={b} className={`chip ${brand === b ? "on" : ""}`} onClick={() => setBrand(b)}>
            {brand === b && <motion.span layoutId="compat-brand" className="chip-bg" />}<span>{b === "Autres" ? t("Autres marques") : b} <small>{n}</small></span>
          </button>
        ))}
      </div>
      <p className="muted">{t("{n} appareils", { n: shown.length })}</p>

      {!data ? <p className="muted">{t("Chargement…")}</p> : groups.length === 0 ? <p className="muted">{t("Aucun appareil ne correspond à ta recherche.")}</p> : groups.map(([b, list]) => (
        <div key={b} className="cat-block">
          <h3>{b === "Autres" ? t("Autres marques") : b} <small className="muted">{list.length}</small></h3>
          <ul className="dev-grid">
            {list.map((d) => <li key={d.n} className="dev"><span className="pc-check" aria-hidden="true">✓</span>{d.n}</li>)}
          </ul>
        </div>
      ))}

      <div className="card compat-how">
        <h3>{t("Comment vérifier ton téléphone")}</h3>
        <ul>
          <li>{t("iPhone : Réglages > Données cellulaires > Ajouter une eSIM.")}</li>
          <li>{t("Samsung : Paramètres > Connexions > Gestionnaire de SIM > Ajouter une eSIM.")}</li>
          <li>{t("Pixel : Paramètres > Réseau et Internet > SIM > « Télécharger une SIM ».")}</li>
          <li>{t("Autres Android : compose *#06# ; si un numéro EID s'affiche, c'est bon.")}</li>
        </ul>
        <p className="muted">{t("Ton téléphone doit aussi être désimlocké (non verrouillé par un opérateur). Certains modèles vendus en Chine continentale n'ont pas l'eSIM.")}</p>
        <p className="muted note">{t("Sources : listes publiques de roamiapp.com, esim.school et esimcard.com, croisées. Mise à jour : {date}. Liste non exhaustive.", { date: month })}</p>
      </div>
    </Section>
  );
}
