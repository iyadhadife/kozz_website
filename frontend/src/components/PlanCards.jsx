import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TIERS, daysLabel, eur, gbLabel } from "../data.js";
import { useStore } from "../store.jsx";

import { t } from "../i18n.js";
const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

// Les 4 forfaits d'une destination : data, validité, prix au Go, ce qui est inclus, et le détail du débit pour l'illimité.
export default function PlanCards({ dest }) {
  const { add } = useStore();
  const [info, setInfo] = useState(null);
  return (
    <motion.div className="tiers" key={dest.id} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {TIERS.map((tier, i) => {
        const unl = tier.gb === Infinity;
        return (
          <motion.article
            key={tier.key}
            className={`card tier plan ${tier.key === "trip" ? "featured" : ""}`}
            variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -6 }}
          >
            {tier.key === "trip" && <span className="pill">{t("Best-seller")}</span>}
            <span className="tier-icon">{tier.icon}</span>
            <h3>{tier.name}</h3>
            <p className="big">{gbLabel(tier.gb)}</p>
            <p className="muted">{daysLabel(tier.days)} · {tier.blurb}</p>
            <p className="price">{eur(dest.prices[i])}</p>
            {!unl && <small className="muted ppg">{t("{price} / Go", { price: eur(dest.prices[i] / tier.gb) })}</small>}
            <ul className="plan-feats">
              <li><Check />{unl ? t("Data illimitée (fair use)") : t("{data} de data haut débit", { data: gbLabel(tier.gb) })}</li>
              <li><Check />{t("Valable {days}", { days: daysLabel(tier.days) })}</li>
              <li><Check />{t("Activation instantanée")}</li>
              <li><Check />{t("Couverture : {country}", { country: dest.name })}</li>
            </ul>
            {unl && (
              <div className="speed">
                <button type="button" className="linklike" aria-expanded={info === tier.key} onClick={() => setInfo(info === tier.key ? null : tier.key)}>{t("Détails du débit")}</button>
                <AnimatePresence initial={false}>
                  {info === tier.key && (
                    <motion.p className="muted" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                      {t("Plein débit jusqu'à un seuil quotidien (3 à 5 Go), puis débit réduit. Le seuil est affiché avant l'achat.")}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button
              className="btn plan-btn"
              onClick={() =>
                add({
                  kind: "esim",
                  destination_id: dest.id,
                  tier_key: tier.key,
                  label: `eSIM ${dest.name} · ${tier.gb === Infinity ? "Illimité" : tier.gb + " Go"} / ${tier.days} j`,
                  price: dest.prices[i],
                  qty: 1,
                })
              }
            >{t("Choisir ce forfait")}</button>
          </motion.article>
        );
      })}
    </motion.div>
  );
}
