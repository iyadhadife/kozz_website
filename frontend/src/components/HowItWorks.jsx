import { motion } from "framer-motion";
import Section from "./Section.jsx";

import { t } from "../i18n.js";
const STEPS = [
  ["1", "Choisis ton forfait", "Ta destination, tes dates, ton usage. L'assistant te recommande le bon forfait."],
  ["2", "Choisis ta kozz", "Une cause parmi 12. 10 % de la marge lui est reversée, sans surcoût pour toi."],
  ["3", "Installe en 1 minute", "Scanne le QR code, avant le départ si tu veux. Le forfait démarre à ta première connexion."],
];

export default function HowItWorks({ h1 = false }) {
  const Step = h1 ? "h2" : "h3"; // sous un h1, les étapes sont des h2 (pas de niveau sauté)
  return (
    <Section id="comment" h1={h1} title={t("Comment ça marche")} subtitle={t("Trois étapes, aucune carte SIM à changer.")}>
      <motion.ol className="steps" initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.15 } } }}>
        {STEPS.map(([n, title, d]) => (
          <motion.li key={n} className="card" variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}>
            <span className="step-n">{n}</span>
            <Step>{t(title)}</Step>
            <p className="muted">{t(d)}</p>
          </motion.li>
        ))}
      </motion.ol>
    </Section>
  );
}
