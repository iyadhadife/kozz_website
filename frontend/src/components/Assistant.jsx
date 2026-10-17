import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Section from "./Section.jsx";
import { DESTINATIONS, TIERS, USAGE, eur, fmtNum } from "../data.js";
import { useStore } from "../store.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5) + 1);

// Choisit le forfait le moins cher qui couvre durée ET conso (quantité > 1 si le voyage dépasse la validité)
function recommend(dest, days, usage) {
  const need = days * usage.gbPerDay;
  const options = TIERS.map((t, i) => {
    if (t.key === "unl" && need <= 10) return null; // illimité seulement si la conso dépasse les gros forfaits
    const qty = Math.max(Math.ceil(days / t.days), t.gb === Infinity ? 1 : Math.ceil(need / t.gb));
    return { tier: t, qty, total: dest.prices[i] * qty };
  }).filter(Boolean);
  options.sort((a, b) => a.total - b.total);
  return { need, best: options[0], alts: options.slice(1, 3) };
}

export default function Assistant() {
  const { add } = useStore();
  const [destId, setDestId] = useState("ma");
  const [start, setStart] = useState(addDays(today(), 14));
  const [end, setEnd] = useState(addDays(today(), 21));
  const [usageKey, setUsageKey] = useState("mid");

  const dest = DESTINATIONS.find((d) => d.id === destId);
  const usage = USAGE.find((u) => u.key === usageKey);
  const days = diffDays(start, end < start ? start : end);
  const { need, best, alts } = useMemo(() => recommend(dest, days, usage), [dest, days, usage]);

  const addPlan = (o) =>
    add({
      kind: "esim",
      destination_id: dest.id,
      tier_key: o.tier.key,
      label: `eSIM ${dest.name} · ${o.tier.gb === Infinity ? "Illimité" : o.tier.gb + " Go"} / ${o.tier.days} j`,
      price: dest.prices[TIERS.indexOf(o.tier)],
      qty: o.qty,
    });

  return (
    <Section id="assistant" title="L'assistant Kozz" subtitle="Dis-nous où tu vas : on te recommande un seul forfait, au meilleur prix.">
      <div className="assistant">
        <div className="card form">
          <label>
            Destination
            <select value={destId} onChange={(e) => setDestId(e.target.value)}>
              {DESTINATIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <div className="two">
            <label>Départ<input type="date" value={start} min={today()} onChange={(e) => setStart(e.target.value)} /></label>
            <label>Retour<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <div>
            <span className="lbl">Ton usage</span>
            <div className="seg">
              {USAGE.map((u) => (
                <button key={u.key} type="button" className={u.key === usageKey ? "on" : ""} onClick={() => setUsageKey(u.key)}>
                  {u.key === usageKey && <motion.span layoutId="seg" className="seg-bg" />}
                  <span>{u.label}</span>
                </button>
              ))}
            </div>
            <small className="muted">{usage.hint} · ~{usage.gbPerDay} Go/jour</small>
          </div>
        </div>

        <div className="card result">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${destId}-${days}-${usageKey}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <span className="pill">Recommandé pour toi</span>
              <h3>
                {best.qty > 1 && `${best.qty} × `}
                {best.tier.gb === Infinity ? "Illimité" : `${best.tier.gb} Go`} · {best.tier.days} jours
              </h3>
              <p className="muted">
                {dest.name} · {days} jour{days > 1 ? "s" : ""} · conso estimée ≈ {fmtNum(need)} Go
              </p>
              <p className="price">{eur(best.total)}</p>
              <button className="btn" onClick={() => addPlan(best)}>Ajouter au panier</button>
              {alts.length > 0 && (
                <div className="alts">
                  <span className="lbl">Alternatives</span>
                  {alts.map((o) => (
                    <button key={o.tier.key} className="alt" onClick={() => addPlan(o)}>
                      <span>{o.qty > 1 && `${o.qty} × `}{o.tier.gb === Infinity ? "Illimité" : `${o.tier.gb} Go`} / {o.tier.days} j</span>
                      <strong>{eur(o.total)}</strong>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
