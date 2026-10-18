import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RangePicker, { addDaysIso, nightsDays, todayIso } from "./RangePicker.jsx";
import { DESTINATIONS, TIERS, USAGE, daysLabel, eur, fmtNum, gbLabel } from "../data.js";
import { useStore } from "../store.jsx";
import { t } from "../i18n.js";

// Choisit le forfait le moins cher qui couvre durée ET conso (quantité > 1 si le voyage dépasse la validité)
export function recommend(dest, days, usage) {
  const need = days * usage.gbPerDay;
  const options = TIERS.map((tier, i) => {
    if (tier.key === "unl" && need <= 10) return null; // illimité seulement si la conso dépasse les gros forfaits
    const qty = Math.max(Math.ceil(days / tier.days), tier.gb === Infinity ? 1 : Math.ceil(need / tier.gb));
    return { tier, qty, total: dest.prices[i] * qty };
  }).filter(Boolean);
  options.sort((a, b) => a.total - b.total);
  return { need, best: options[0], alts: options.slice(1, 3) };
}

// L'assistant : destination + période (un seul calendrier) + usage -> UN forfait recommandé
export default function Assistant() {
  const { add } = useStore();
  const [destId, setDestId] = useState("ma");
  const [start, setStart] = useState(addDaysIso(todayIso(), 14));
  const [end, setEnd] = useState(addDaysIso(todayIso(), 21));
  const [usageKey, setUsageKey] = useState("mid");

  const dest = DESTINATIONS.find((d) => d.id === destId);
  const usage = USAGE.find((u) => u.key === usageKey);
  const days = start && end ? nightsDays(start, end) : null;
  const rec = useMemo(() => (days ? recommend(dest, days, usage) : null), [dest, days, usage]);

  const addPlan = (o) =>
    add({
      kind: "esim", destination_id: dest.id, tier_key: o.tier.key,
      label: `eSIM ${dest.name} · ${o.tier.gb === Infinity ? "Illimité" : o.tier.gb + " Go"} / ${o.tier.days} j`,
      price: dest.prices[TIERS.indexOf(o.tier)], qty: o.qty,
    });

  return (
    <div className="card assistant-card" id="assistant">
      <h2 className="as-title">{t("L'assistant Kozz")}</h2>
      <p className="muted">{t("Dis-nous où tu vas : on te recommande un seul forfait, au meilleur prix.")}</p>
      <label>{t("Destination")}{" "}
        <select value={destId} onChange={(e) => setDestId(e.target.value)}>
          {DESTINATIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <RangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
      <div>
        <span className="lbl">{t("Ton usage")}</span>
        <div className="seg">
          {USAGE.map((u) => (
            <button key={u.key} type="button" className={u.key === usageKey ? "on" : ""} onClick={() => setUsageKey(u.key)}>
              {u.key === usageKey && <motion.span layoutId="seg" className="seg-bg" />}
              <span>{u.label}</span>
            </button>
          ))}
        </div>
        <small className="muted">{usage.hint} · {t("~{n} Go/jour", { n: usage.gbPerDay })}</small>
      </div>

      <div className="as-result">
        <AnimatePresence mode="wait">
          {rec ? (
            <motion.div key={`${destId}-${days}-${usageKey}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <span className="pill">{t("Recommandé pour toi")}</span>
              <div className="as-line">
                <div>
                  <h3>{rec.best.qty > 1 && `${rec.best.qty} × `}{gbLabel(rec.best.tier.gb)} · {daysLabel(rec.best.tier.days)}</h3>
                  <p className="muted">{dest.name} · {daysLabel(days)} · {t("conso estimée ≈ {n} Go", { n: fmtNum(rec.need) })}</p>
                </div>
                <p className="price">{eur(rec.best.total)}</p>
              </div>
              <button className="btn" onClick={() => addPlan(rec.best)}>{t("Ajouter au panier")}</button>
              {rec.alts.length > 0 && (
                <div className="alts">
                  <span className="lbl">{t("Alternatives")}</span>
                  {rec.alts.map((o) => (
                    <button key={o.tier.key} className="alt" onClick={() => addPlan(o)}>
                      <span>{o.qty > 1 && `${o.qty} × `}{gbLabel(o.tier.gb)} / {t("{n} j", { n: o.tier.days })}</span>
                      <strong>{eur(o.total)}</strong>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.p key="wait" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{t("Sélectionne ta date de retour")}</motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
