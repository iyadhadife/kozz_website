import { motion } from "framer-motion";
import Section from "./Section.jsx";
import { t } from "../i18n.js";

const I = {
  heart: <path d="M12 21C4 14.5 2.5 9.5 5 6.5 7.2 4 10.6 4.6 12 7.2 13.4 4.6 16.8 4 19 6.5c2.5 3 1 8-7 14.5z" />,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M7 12h10" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  gift: <><rect x="3" y="9" width="18" height="11" rx="1.5" /><path d="M12 9v11M3 13h18M12 9C9 9 8 5 10.5 5 12.5 5 12 9 12 9zM12 9c3 0 4-4 1.5-4C11.500 5 12 9 12 9z" /></>,
};

// « Pourquoi KozzGo » : six raisons, chacune avec son pictogramme qui s'anime à l'apparition.
const REASONS = [
  ["heart", "Chaque achat finance une cause", "10 % du prix HT de ton eSIM est reversé à la cause que tu choisis parmi 12. Sans surcoût pour toi."],
  ["tag", "Des prix alignés sur le marché", "Nos tarifs partent de la moyenne des grands vendeurs d'eSIM, moins 5 %. Le don est inclus."],
  ["scan", "Connecté en 1 minute", "Un QR code à scanner, avant le départ si tu veux. La durée ne démarre qu'à ta première connexion sur place."],
  ["lock", "Paiement sécurisé, dans ta devise", "Stripe gère le paiement dans plus de 30 devises. Tes données de carte ne passent jamais par KozzGo."],
  ["chart", "Ton impact, en chiffres concrets", "Repas offerts, jours de connexion, arbres plantés : ton Passeport d'impact montre ce que tes achats ont permis."],
  ["gift", "Parrainage : 1,50 € pour vous deux", "Invite un proche : quand vous avez tous les deux acheté, vous recevez chacun 1,50 € de crédit."],
];

export default function WhyKozz() {
  return (
    <Section id="pourquoi" title={t("Pourquoi KozzGo ?")} subtitle={t("Six raisons de partir connecté avec nous.")}>
      <motion.ul className="why" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ show: { transition: { staggerChildren: 0.09 } } }}>
        {REASONS.map(([ico, title, text], i) => (
          <motion.li key={ico} className="card why-card" variants={{ hidden: { opacity: 0, y: 34 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }} whileHover={{ y: -5 }}>
            <motion.span className="why-ico" initial={{ scale: 0.6, rotate: -12 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 + i * 0.09 }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[ico]}</svg>
            </motion.span>
            <h3>{t(title)}</h3>
            <p className="muted">{t(text)}</p>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
