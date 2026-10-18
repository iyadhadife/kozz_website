import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DESTINATIONS, eur, flag, fromPrice } from "../data.js";

import { t } from "../i18n.js";
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Recherche de destination avec autocomplétion (comme le champ "Où vas-tu ?" des concurrents)
export default function SearchBox({ placeholder = t("Où vas-tu ? Maroc, Thaïlande, Japon…") }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef();

  const results = useMemo(() => {
    const n = norm(q.trim());
    return (n ? DESTINATIONS.filter((d) => norm(d.name).includes(n)) : DESTINATIONS.slice(0, 6)).slice(0, 6);
  }, [q]);

  const go = (d) => {
    setFocus(false);
    setQ("");
    nav(`/destinations/${d.id}`);
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
    if (e.key === "Escape") setFocus(false);
  };

  return (
    <div className="search">
      <span className="search-ico" aria-hidden="true">🔍</span>
      <input
        value={q}
        placeholder={placeholder}
        aria-label={t("Rechercher une destination")}
        onChange={(e) => { setQ(e.target.value); setActive(0); }}
        onFocus={() => { clearTimeout(timer.current); setFocus(true); }}
        onBlur={() => (timer.current = setTimeout(() => setFocus(false), 150))}
        onKeyDown={onKey}
      />
      <AnimatePresence>
        {focus && (
          <motion.ul className="search-list" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {results.length === 0 && <li className="search-empty">{t("Oh ! On n'a rien trouvé. Essaie un autre pays.")}</li>}
            {results.map((d, i) => (
              <li key={d.id}>
                <button type="button" className={i === active ? "on" : ""} onMouseEnter={() => setActive(i)} onMouseDown={() => go(d)}>
                  <img src={flag(d.id)} alt="" width="28" height="20" />
                  <span>{d.name}</span>
                  <small>{t("dès {price}", { price: eur(fromPrice(d)) })}</small>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
