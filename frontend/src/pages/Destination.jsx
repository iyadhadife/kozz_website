import { Link, Navigate, useParams } from "react-router-dom";
import Section from "../components/Section.jsx";
import PlanCards from "../components/PlanCards.jsx";
import PhoneCheck from "../components/PhoneCheck.jsx";
import DataEstimator from "../components/DataEstimator.jsx";
import { DESTINATIONS, TIERS, eur, flag, fromPrice } from "../data.js";
import { motion } from "framer-motion";

import { t } from "../i18n.js";

const STEPS = [
  ["Choisis ton forfait", "Compare les forfaits ci-dessus et ajoute le tien au panier."],
  ["Paie en sécurité", "Paiement par carte via Stripe, dans ta devise."],
  ["Reçois ton QR code", "Il arrive par e-mail (et par SMS si tu as donné ton numéro) dès le paiement confirmé."],
  ["Active et connecte-toi", "Scanne le QR code dans les réglages de ton téléphone : la durée démarre à ta première connexion."],
];

// Fiche destination : en-tête avec atouts, forfaits détaillés, vérification du téléphone et estimation de data, 4 étapes.
export default function Destination() {
  const { id } = useParams();
  const dest = DESTINATIONS.find((d) => d.id === id); if (!dest) return <Navigate to="/destinations" replace />;

  return (
    <>
      <div className="dest-head">
        <nav className="crumbs" aria-label={t("Fil d'Ariane")}>
          <Link to="/">{t("Accueil")}</Link> › <Link to="/destinations">{t("Destinations")}</Link> › <span>{dest.name}</span>
        </nav>
        <motion.div className="dest-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <img src={flag(dest.id)} alt="" width="64" height="44" />
          <div>
            <h1>eSIM {dest.name}</h1>
            <p className="muted">{t("À partir de {price} · installation en 1 minute · 10 % de la marge reversée à ta kozz", { price: eur(fromPrice(dest)) })}</p>
          </div>
        </motion.div>
        <ul className="dest-badges">
          <li>{t("{n} forfaits disponibles", { n: TIERS.length })}</li>
          <li>{t("Activation instantanée")}</li>
          <li>{t("Paiement sécurisé")}</li>
        </ul>
      </div>

      <Section title={t("Choisis ton forfait")} subtitle={t("Le forfait démarre à ta première connexion sur place.")}>
        <PlanCards dest={dest} />
        <p className="muted note">{t("Forfait Illimité : fair use affiché dès l'achat. Besoin d'aide pour choisir ?")}{" "}<Link to="/#assistant" className="accent">{t("Essaie l'assistant")}</Link>.
        </p>
      </Section>

      <Section title={t("Avant d'acheter ton eSIM : {country}", { country: dest.name })}>
        <div className="pre-grid">
          <PhoneCheck />
          <DataEstimator dest={dest} />
        </div>
      </Section>

      <Section title={t("Comment te connecter : {country}", { country: dest.name })} subtitle={t("Active ton eSIM en 4 étapes simples.")}>
        <motion.ol className="steps" initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
          {STEPS.map(([title, d], i) => (
            <motion.li key={title} className="card" variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0 } }}>
              <span className="step-n">{i + 1}</span>
              <h3>{t(title)}</h3>
              <p className="muted">{t(d)}</p>
            </motion.li>
          ))}
        </motion.ol>
      </Section>

    </>
  );
}
