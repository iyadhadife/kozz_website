import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { recommend } from "./Assistant.jsx";
import { USAGE, daysLabel, eur, fmtNum, gbLabel } from "../data.js";
import { useStore } from "../store.jsx";
import { t } from "../i18n.js";

// « De combien de data ai-je besoin ? » : durée (curseur) + usage -> besoin estimé et forfait le moins cher qui le couvre.
export default function DataEstimator({ dest }) {
  const { add } = useStore();
  const [days, setDays] = useState(7);
  const [usageKey, setUsageKey] = useState("mid");
  const usage = USAGE.find((u) => u.key === usageKey);
  const { need, best } = useMemo(() => recommend(dest, days, usage), [dest, days, usage]);
  const tier = best.tier;

  const choose = () =>
    add({
      kind: "esim", destination_id: dest.id, tier_key: tier.key,
      label: `eSIM ${dest.name} · ${tier.gb === Infinity ? "Illimité" : tier.gb + " Go"} / ${tier.days} j`,
      price: best.total / best.qty, qty: best.qty,
    });

  return (
    <div className="card pre-card">
      <h3 className="pre-title"><span className="pre-ico" aria-hidden="true">📊</span>{t("De combien de data ai-je besoin ?")}</h3>
      <div className="de-range">
        <div className="de-row"><label htmlFor="de-days" className="de-lbl">{t("Durée du voyage")}</label><strong className="de-val">{daysLabel(days)}</strong></div>
        <input id="de-days" type="range" min="1" max="60" value={days} onChange={(e) => setDays(+e.target.value)} style={{ "--p": `${((days - 1) / 59) * 100}%` }} />
      </div>
      <div className="de-usage" role="radiogroup" aria-label={t("Ton usage")}>
        {USAGE.map((u) => (
          <button key={u.key} type="button" role="radio" aria-checked={u.key === usageKey} className={u.key === usageKey ? "on" : ""} onClick={() => setUsageKey(u.key)}>
            <strong>{u.label}</strong><small>{u.hint}</small>
          </button>
        ))}
      </div>
      <div className="de-result">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${days}-${usageKey}`} className="de-res-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <strong>{t("Il te faut environ {n} Go", { n: fmtNum(Math.max(0.1, Math.round(need * 10) / 10)) })}</strong>
            <span className="de-plan">{best.qty > 1 && `${best.qty} × `}{gbLabel(tier.gb)} · {daysLabel(tier.days)} · {eur(best.total)}</span>
          </motion.div>
        </AnimatePresence>
        <button className="btn" onClick={choose}>{t("Choisir ce forfait")}</button>
      </div>
      <p className="muted pre-note">{t("Une estimation approximative pour un usage courant. La vidéo et le partage de connexion consomment le plus.")}</p>
    </div>
  );
}
