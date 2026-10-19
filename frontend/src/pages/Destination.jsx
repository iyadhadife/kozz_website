import { Link, Navigate, useParams } from "react-router-dom";
import Section from "../components/Section.jsx";
import PlanCards from "../components/PlanCards.jsx";
import PhoneCheck from "../components/PhoneCheck.jsx";
import DataEstimator from "../components/DataEstimator.jsx";
import { DESTINATIONS, TIERS, eur, flag, fromPrice } from "../data.js";
import { motion } from "framer-motion";

import { breadcrumbJsonLd, destinationSeo, useSeo } from "../seo.js";
import { t } from "../i18n.js";

const STEPS = [
  ["Choisis ton forfait", "Compare les forfaits ci-dessus et ajoute le tien au panier."],
  ["Paie en sécurité", "Paiement par carte via Stripe, dans ta devise."],
  ["Reçois ton QR code", "Il arrive par e-mail (et par SMS si tu as donné ton numéro) dès le paiement confirmé."],
  ["Active et connecte-toi", "Scanne le QR code dans les réglages de ton téléphone : la durée démarre à ta première connexion."],
];

// Résumé chiffré propre à chaque pays (texte généré à partir des prix réels : utile aux lecteurs et aux moteurs, pas un texte répété à l'identique)
function summary(d) {
  const per = TIERS.map((tr, k) => ({ tr, k, gb: tr.gb === Infinity ? null : d.prices[k] / tr.gb })).filter((x) => x.gb !== null);
  const best = per.reduce((a, b) => (b.gb < a.gb ? b : a));
  const cheapest = Math.min(...d.prices);
  const unl = TIERS.findIndex((tr) => tr.gb === Infinity);
  return `eSIM ${d.name} : ${TIERS.length} forfaits de ${eur(cheapest)} (${TIERS[0].gb} Go, ${TIERS[0].days} jours) à ${eur(Math.max(...d.prices))}. Le forfait ${best.tr.name} (${best.tr.gb} Go, ${best.tr.days} jours) est le plus avantageux au Go : ${eur(best.gb)} le Go.${unl >= 0 ? ` Pour une utilisation intensive, l'offre Illimité coûte ${eur(d.prices[unl])} pour ${TIERS[unl].days} jours.` : ""} Zone : ${d.zone}.`;
}

// Fiche destination : en-tête avec atouts, forfaits détaillés, vérification du téléphone et estimation de data, 4 étapes.
export default function Destination() {
  const { id } = useParams();
  const dest = DESTINATIONS.find((d) => d.id === id);
  const price = dest ? fromPrice(dest) : 0;
  useSeo(dest ? {
    ...destinationSeo(dest.name, eur(price)),
    path: `/destinations/${dest.id}`,
    jsonLd: { "@context": "https://schema.org", "@graph": [
      { "@type": "Product", "@id": `${location.origin}/destinations/${dest.id}#product`, name: `eSIM ${dest.name}`, sku: `ESIM-${dest.id.toUpperCase()}`,
        description: `Forfaits data eSIM pour voyager en ${dest.name}, activation en 1 minute, sans frais de roaming.`,
        image: `${location.origin}/api/og/destinations/${dest.id}.png`, brand: { "@type": "Brand", name: "KozzGo" },
        offers: { "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: Math.min(...dest.prices), highPrice: Math.max(...dest.prices), offerCount: dest.prices.length,
          offers: TIERS.map((tr, k) => ({ "@type": "Offer", name: `eSIM ${dest.name} ${tr.name}`, price: dest.prices[k], priceCurrency: "EUR", availability: "https://schema.org/InStock", url: `${location.origin}/destinations/${dest.id}` })) } },
      breadcrumbJsonLd([["Accueil", "/"], ["Destinations", "/destinations"], [dest.name, `/destinations/${dest.id}`]]) ] },
  } : {});
  if (!dest) return <Navigate to="/destinations" replace />;

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
        <p className="dest-facts">{summary(dest)}</p>
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
