import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import EsimTest from "./EsimTest.jsx";
import { t } from "../i18n.js";

// Chargé à la demande (la liste fait ~25 Ko) : une seule fois pour tout le site.
let cache;
export const loadDevices = () => (cache ||= import("../esimDevices.js"));
export const flat = (m) => m.ESIM_DEVICES.flatMap((g) => g.models.map((x) => ({ ...x, brand: g.brand, cat: g.cat })));
export const key = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9+]/g, "");

// « Mon téléphone est-il compatible ? » : recherche dans la liste des appareils + rappel de la vérification rapide (*#06#).
export default function PhoneCheck() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { loadDevices().then((m) => setData(flat(m))); }, []);

  const hits = useMemo(() => {
    const k = key(q);
    if (!data || k.length < 2) return [];
    return data.filter((d) => d.cat === "phone" || d.cat === "tablet" ? key(d.brand + d.n).includes(k) : false)
      .sort((a, b) => (b.s - a.s) || a.n.length - b.n.length).slice(0, 6);
  }, [data, q]);
  const exact = hits.find((h) => key(h.n) === key(q) || key(h.brand + h.n) === key(q));

  return (
    <div className="card pre-card">
      <h3 className="pre-title"><span className="pre-ico" aria-hidden="true">📱</span>{t("Mon téléphone est-il compatible ?")}</h3>
      <div className="pc-search"><span className="pc-glass" aria-hidden="true">⌕</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Saisis ton modèle, ex. iPhone 15")} aria-label={t("Mon téléphone est-il compatible ?")} autoComplete="off" /></div>
      <div className="pc-out" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {key(q).length < 2 ? null : hits.length ? (
            <motion.ul key="hits" className="pc-hits" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {exact && <li className="pc-ok"><strong>✓ {t("Compatible eSIM")}</strong></li>}
              {hits.map((h) => (
                <li key={h.brand + h.n}><span className="pc-check" aria-hidden="true">✓</span><span>{h.n.toLowerCase().includes(h.brand.toLowerCase()) || ["Autres", "Apple"].includes(h.brand) ? h.n : `${h.brand} ${h.n}`}</span></li>
              ))}
            </motion.ul>
          ) : (
            <motion.p key="none" className="muted pc-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{t("Ce modèle n'est pas dans notre liste. Fais la vérification rapide ci-dessous : la liste n'est pas exhaustive.")}</motion.p>
          )}
        </AnimatePresence>
      </div>
      <EsimTest />
      <Link to="/telephones-compatibles" className="pre-link">{t("Voir tous les téléphones compatibles →")}</Link>
    </div>
  );
}
