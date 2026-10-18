import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { currentLocale, t } from "../i18n.js";

// Sélecteur de période : UN seul calendrier, on clique le départ puis le retour, la plage se colore entre les deux.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const todayIso = () => iso(new Date());
export const addDaysIso = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const nightsDays = (a, b) => Math.max(1, Math.round((parse(b) - parse(a)) / 864e5) + 1);

export default function RangePicker({ start, end, onChange, min = todayIso() }) {
  const loc = currentLocale();
  const [view, setView] = useState(() => { const d = parse(start || min); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [hover, setHover] = useState(null);
  const [dir, setDir] = useState(1);
  const fmtMonth = useMemo(() => new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }), [loc]);
  const fmtDay = useMemo(() => new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short" }), [loc]);
  const fmtFull = useMemo(() => new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" }), [loc]);
  const wk = useMemo(() => { // lundi en premier
    const f = new Intl.DateTimeFormat(loc, { weekday: "short" });
    return [...Array(7)].map((_, i) => f.format(new Date(2024, 0, 1 + i)));
  }, [loc]);

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(view.getFullYear(), view.getMonth(), i + 1)))];
  const canPrev = iso(new Date(view.getFullYear(), view.getMonth(), 0)) >= min;

  const pickDay = (d) => {
    if (!start || (start && end)) onChange(d, null); // nouvelle sélection : on repart du départ
    else if (d < start) onChange(d, null);
    else onChange(start, d);
  };
  const preview = start && !end && hover && hover > start ? hover : null;
  const lo = start, hi = end || preview;
  const move = (n) => { setDir(n); setView(new Date(view.getFullYear(), view.getMonth() + n, 1)); };

  return (
    <div className="rp">
      <div className="rp-head">
        <button type="button" className="rp-nav" disabled={!canPrev} onClick={() => move(-1)} aria-label={t("Mois précédent")}>‹</button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.strong key={iso(view)} className="rp-month" initial={{ opacity: 0, x: 14 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 * dir }} transition={{ duration: 0.16 }}>{fmtMonth.format(view)}</motion.strong>
        </AnimatePresence>
        <button type="button" className="rp-nav" onClick={() => move(1)} aria-label={t("Mois suivant")}>›</button>
      </div>
      <div className="rp-grid rp-wk" aria-hidden="true">{wk.map((w, i) => <span key={i}>{w.slice(0, 2)}</span>)}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={iso(view)} className="rp-grid" initial={{ opacity: 0, x: 18 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 * dir }} transition={{ duration: 0.16 }} onMouseLeave={() => setHover(null)}>
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const off = d < min;
            const inRange = lo && hi && d > lo && d < hi;
            const edge = d === start ? "s" : d === end ? "e" : d === preview ? "p" : "";
            return (
              <button key={d} type="button" disabled={off} aria-pressed={d === start || d === end}
                aria-label={fmtFull.format(parse(d))}
                className={`rp-day ${inRange ? "in" : ""} ${edge ? "edge e-" + edge : ""} ${hi && lo && hi !== lo && d === lo ? "has-r" : ""} ${hi && lo && d === hi && hi !== lo ? "has-l" : ""} ${d === todayIso() ? "today" : ""}`}
                onClick={() => pickDay(d)} onMouseEnter={() => setHover(d)}>
                <span>{Number(d.slice(8))}</span>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
      <p className="rp-sum">
        {start && end
          ? <><strong>{fmtDay.format(parse(start))}</strong> → <strong>{fmtDay.format(parse(end))}</strong></>
          : start ? <><strong>{fmtDay.format(parse(start))}</strong> → <span className="muted">{t("Sélectionne ta date de retour")}</span></>
          : <span className="muted">{t("Sélectionne ta date de départ")}</span>}
      </p>
    </div>
  );
}
