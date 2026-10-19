import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Dots from "./Dots.jsx";
import SearchBox from "./SearchBox.jsx";
import Assistant from "./Assistant.jsx";
import { useIntroActive } from "../introState.js";

import { t, tx } from "../i18n.js";
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } };
const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const STATS = [
  ["190+", "destinations"],
  ["1 min", "pour installer"],
  ["10 %", "de la marge reversée"],
];

const useWide = () => {
  const mq = "(min-width: 960px)";
  const [w, setW] = useState(() => matchMedia(mq).matches);
  useEffect(() => { const m = matchMedia(mq), f = () => setW(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return w;
};

// Accueil : le titre arrive au centre, puis se décale à droite pendant que l'assistant glisse depuis la gauche.
export default function Hero() {
  const wide = useWide();
  const intro = useIntroActive();
  const [shifted, setShifted] = useState(false);
  useEffect(() => {
    if (intro) return;
    const id = setTimeout(() => setShifted(true), 1100); // le temps de lire le titre au centre
    return () => clearTimeout(id);
  }, [intro]);
  const open = wide ? shifted : true; // sur mobile : titre puis assistant l'un sous l'autre

  return (
    <section className="hero">
      <Dots />
      <div className={`hero-grid ${open ? "open" : ""}`}>
        <motion.div className="hero-side" initial={false} animate={{ opacity: open ? 1 : 0, x: open ? 0 : (wide ? -90 : 0), y: open || wide ? 0 : 30, scale: open ? 1 : 0.96 }} transition={{ type: "spring", stiffness: 60, damping: 16, delay: open ? 0.15 : 0 }} style={{ pointerEvents: open ? "auto" : "none" }}>
          <Assistant />
        </motion.div>
        <motion.div className="hero-inner" animate={{ x: wide && !shifted ? "-51%" : 0 }} transition={{ type: "spring", stiffness: 55, damping: 15 }}>
          <motion.div className="hero-copy" variants={container} initial="hidden" animate={intro ? "hidden" : "show"}>
            <motion.span className="pill" variants={item}>{t("eSIM voyage solidaires")}</motion.span>
            <motion.h1 variants={item}>{t("Voyagez connecté.")}{" "}<br />{tx("Voyagez {u}", { u: <span className="accent">{t("utile.")}</span> })}</motion.h1>
            <motion.p className="lead" variants={item}>{t("Chaque eSIM finance une cause que tu choisis. Ton impact est visible dans l'appli.")}{" "}</motion.p>
            <motion.div className="hero-search" variants={item}><SearchBox /></motion.div>
            <motion.ul className="stats" variants={item}>
              {STATS.map(([n, l]) => (
                <li key={l}><strong dir="ltr">{n}</strong><span>{t(l)}</span></li>
              ))}
            </motion.ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
