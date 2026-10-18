import { motion } from "framer-motion";
import { TIERS, daysLabel, eur, gbLabel } from "../data.js";
import { useStore } from "../store.jsx";

import { t } from "../i18n.js";
// Les 4 usages d'une destination (city-break / semaine / voyage / illimité)
export default function PlanCards({ dest }) {
  const { add } = useStore();
  return (
    <motion.div className="tiers" key={dest.id} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {TIERS.map((tier, i) => (
        <motion.article
          key={tier.key}
          className={`card tier ${tier.key === "trip" ? "featured" : ""}`}
          variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -6 }}
        >
          {tier.key === "trip" && <span className="pill">{t("Best-seller")}</span>}
          <span className="tier-icon">{tier.icon}</span>
          <h3>{tier.name}</h3>
          <p className="big">{gbLabel(tier.gb)}</p>
          <p className="muted">{daysLabel(tier.days)} · {tier.blurb}</p>
          <p className="price">{eur(dest.prices[i])}</p>
          <button
            className="btn"
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
          >{t("Ajouter")}{" "}</button>
        </motion.article>
      ))}
    </motion.div>
  );
}
