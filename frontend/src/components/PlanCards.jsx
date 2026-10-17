import { motion } from "framer-motion";
import { TIERS, eur } from "../data.js";
import { useStore } from "../store.jsx";

// Les 4 usages d'une destination (city-break / semaine / voyage / illimité)
export default function PlanCards({ dest }) {
  const { add } = useStore();
  return (
    <motion.div className="tiers" key={dest.id} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {TIERS.map((t, i) => (
        <motion.article
          key={t.key}
          className={`card tier ${t.key === "trip" ? "featured" : ""}`}
          variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -6 }}
        >
          {t.key === "trip" && <span className="pill">Best-seller</span>}
          <span className="tier-icon">{t.icon}</span>
          <h3>{t.name}</h3>
          <p className="big">{t.gb === Infinity ? "Illimité" : `${t.gb} Go`}</p>
          <p className="muted">{t.days} jours · {t.blurb}</p>
          <p className="price">{eur(dest.prices[i])}</p>
          <button
            className="btn"
            onClick={() =>
              add({
                kind: "esim",
                destination_id: dest.id,
                tier_key: t.key,
                label: `eSIM ${dest.name} · ${t.gb === Infinity ? "Illimité" : t.gb + " Go"} / ${t.days} j`,
                price: dest.prices[i],
                qty: 1,
              })
            }
          >
            Ajouter
          </button>
        </motion.article>
      ))}
    </motion.div>
  );
}
