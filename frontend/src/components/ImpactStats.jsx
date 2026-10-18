import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Section from "./Section.jsx";
import { Counter } from "./Impact.jsx";
import { eur, fmtNum } from "../data.js";
import { countryName, currentLocale, t } from "../i18n.js";

const KPIS = [
  ["💶", "Dons générés", (g) => g.total, eur],
  ["🧾", "Commandes solidaires", (g) => g.orders, fmtNum],
  ["🧳", "Voyageurs solidaires", (g) => g.donors, fmtNum],
  ["📲", "eSIM vendues", (g) => g.esims, fmtNum],
  ["🌍", "Pays couverts", (g) => g.destinations, fmtNum],
  ["➗", "Don moyen par commande", (g) => g.avg_donation, eur],
  ["✨", "Unités d'impact cumulées", (g) => g.units_total, (v) => fmtNum(Math.round(v))],
  ["🎁", "Filleuls parrainés", (g) => g.referrals, fmtNum],
];

// 6 derniers mois, y compris ceux sans commande (barre vide)
function lastMonths(months, n = 6) {
  const by = Object.fromEntries(months.map((m) => [m.month, m]));
  const out = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (n - 1));
  for (let i = 0; i < n; i++) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: k, label: new Intl.DateTimeFormat(currentLocale(), { month: "short" }).format(d), donation: by[k]?.donation || 0, orders: by[k]?.orders || 0 });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

// Tableau de bord de l'impact : chiffres clés, dons par mois, top destinations, répartition par cause (données serveur).
export default function ImpactStats({ g }) {
  return g ? <Stats g={g} /> : null; // le crochet useInView doit trouver son élément dès le premier rendu
}

function Stats({ g }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const months = lastMonths(g.months || []);
  const max = Math.max(...months.map((m) => m.donation), 0.01);
  const topMax = Math.max(...g.top_destinations.map((x) => x.esims), 1);
  const since = g.since ? new Intl.DateTimeFormat(currentLocale(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(g.since)) : "";

  return (
    <Section id="chiffres" title={t("L'impact en chiffres")} subtitle={t("Tout ce que la communauté KozzGo a déjà rendu possible, mis à jour en direct.")}>
      <div className="kpis" ref={ref}>
        {KPIS.map(([ico, label, get, fmt], i) => (
          <motion.div key={label} className="card kpi" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.05 }}>
            <span className="kpi-ico" aria-hidden="true">{ico}</span>
            <strong className="kpi-val"><Counter value={get(g)} format={fmt} /></strong>
            <span className="kpi-lbl">{t(label)}</span>
          </motion.div>
        ))}
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <h3>{t("Dons par mois")}</h3>
          <svg viewBox="0 0 300 150" role="img" aria-label={t("Dons par mois")} className="bars">
            {months.map((m, i) => {
              const h = (m.donation / max) * 100;
              return (
                <g key={m.month}>
                  <motion.g initial={{ scaleY: 0 }} animate={inView ? { scaleY: 1 } : {}} transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={{ transformBox: "fill-box", transformOrigin: "bottom" }}>
                    <rect x={i * 50 + 9} y={120 - Math.max(h, m.donation ? 4 : 0)} width="32" height={Math.max(h, m.donation ? 4 : 0)} rx="7" className="mbar" />
                  </motion.g>
                  {m.donation > 0 && <text x={i * 50 + 25} y={112 - h} textAnchor="middle" className="bar-val">{eur(m.donation)}</text>}
                  <text x={i * 50 + 25} y="140" textAnchor="middle" className="bar-lbl">{m.label}</text>
                </g>
              );
            })}
          </svg>
          {since && <small className="muted">{t("Depuis le {date}", { date: since })}</small>}
        </div>

        <div className="card stat">
          <h3>{t("Top destinations")}</h3>
          <ul className="toplist">
            {g.top_destinations.map((d, i) => (
              <li key={d.id}>
                <span className="top-name">{countryName(d)}</span>
                <span className="top-bar"><motion.span initial={{ width: 0 }} animate={inView ? { width: `${(d.esims / topMax) * 100}%` } : {}} transition={{ delay: 0.2 + i * 0.08, duration: 0.7 }} /></span>
                <small className="muted">{fmtNum(d.esims)} eSIM</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="card stat">
          <h3>{t("Répartition par cause")}</h3>
          <ul className="toplist">
            {g.causes.map((c, i) => (
              <li key={c.id}>
                <span className="top-name">{c.emoji} {t(c.name)}</span>
                <span className="top-bar"><motion.span initial={{ width: 0 }} animate={inView ? { width: `${Math.max(c.share * 100, 3)}%` } : {}} transition={{ delay: 0.2 + i * 0.08, duration: 0.7 }} /></span>
                <small className="muted">{Math.round(c.share * 100)} %</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
