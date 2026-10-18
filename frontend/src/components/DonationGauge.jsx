import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Counter } from "./Impact.jsx";
import { eur } from "../data.js";
import { t } from "../i18n.js";

// Jauge en demi-cercle : chaque couleur est une cause qui a reçu des dons (largeur proportionnelle à son montant),
// et la jauge se remplit jusqu'au prochain palier. Montants réels du serveur, en euros, convertis dans la devise choisie à l'affichage.
const COLORS = ["#EF7B63", "#F4A259", "#6FBF9B", "#5B8DEF", "#B07CE8", "#E8C14A", "#E26D9A", "#4FB6C9", "#8DB255", "#D98A5F", "#7C86E8", "#C9A07A"];
const STEPS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const CX = 150, CY = 150, R = 118, SW = 26;
const pt = (a) => [CX + R * Math.cos(Math.PI - a), CY - R * Math.sin(Math.PI - a)];
const arc = (a0, a1) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M ${x0} ${y0} A ${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`; };

export default function DonationGauge({ data }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const causes = data.causes.filter((c) => c.donation > 0);
  if (!causes.length) return null;
  const total = causes.reduce((s, c) => s + c.donation, 0);
  const goal = STEPS.find((s) => s > total) || Math.ceil(total / 1000) * 1000 + 1000;
  const fill = Math.min(1, total / goal);
  let acc = 0;
  const segs = causes.map((c, i) => {
    const a0 = acc * fill * Math.PI;
    acc += c.donation / total;
    return { c, color: COLORS[i % COLORS.length], a0, a1: acc * fill * Math.PI };
  });
  const gap = 0.012; // petit espace entre les segments

  return (
    <div className="gauge card" ref={ref}>
      <div className="gauge-svg">
        <svg viewBox="0 0 300 175" role="img" aria-label={t("Jauge des dons par cause")}>
          <path d={arc(0, Math.PI)} className="gauge-track" strokeWidth={SW} fill="none" strokeLinecap="round" />
          {segs.map((s, i) => (
            <motion.path key={s.c.id} d={arc(s.a0 + (i ? gap : 0), Math.max(s.a0 + 0.01, s.a1 - gap))} stroke={s.color} strokeWidth={SW} fill="none" strokeLinecap="butt"
              initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 0.9, delay: 0.25 + i * 0.28, ease: [0.22, 1, 0.36, 1] }} />
          ))}
          <text x={CX - R} y={CY + 22} textAnchor="middle" className="gauge-tick">0</text>
          <text x={CX + R} y={CY + 22} textAnchor="middle" className="gauge-tick">{eur(goal)}</text>
        </svg>
        <div className="gauge-center">
          <strong><Counter value={total} format={eur} /></strong>
          <span className="muted">{t("{pct} % du palier de {goal}", { pct: Math.max(1, Math.round(fill * 100)), goal: eur(goal) })}</span>
        </div>
      </div>
      <ul className="gauge-legend">
        {segs.map((s) => (
          <li key={s.c.id}>
            <i style={{ background: s.color }} />
            <span className="gl-name">{s.c.emoji} {t(s.c.name)}</span>
            <strong>{eur(s.c.donation)}</strong>
            <small className="muted">{Math.round((s.c.donation / total) * 100)} %</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
