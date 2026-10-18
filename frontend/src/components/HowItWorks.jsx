import { motion } from "framer-motion";
import Section from "./Section.jsx";

import { t } from "../i18n.js";
const STEPS = [
  ["1", "Choisis ton forfait", "Ta destination, tes dates, ton usage. L'assistant te recommande le bon forfait."],
  ["2", "Choisis ta kozz", "Une cause parmi 12. 10 % de la marge lui est reversée, sans surcoût pour toi."],
  ["3", "Installe en 1 minute", "Scanne le QR code, avant le départ si tu veux. Le forfait démarre à ta première connexion."],
];

export default function HowItWorks() {
  return (
    <Section id="comment" title={t("Comment ça marche")} subtitle={t("Trois étapes, aucune carte SIM à changer.")}>
      <motion.ol className="steps" initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.15 } } }}>
        {STEPS.map(([n, title, d]) => (
          <motion.li key={n} className="card" variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}>
            <span className="step-n">{n}</span>
            <h3>{t(title)}</h3>
            <p className="muted">{t(d)}</p>
          </motion.li>
        ))}
      </motion.ol>
    </Section>
  );
}
