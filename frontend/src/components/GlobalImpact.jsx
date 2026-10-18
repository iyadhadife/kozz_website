import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Section from "./Section.jsx";
import DonationGauge from "./DonationGauge.jsx";
import { Counter } from "./Impact.jsx";
import { eur, fmtNum } from "../data.js";
import { api } from "../api.js";
import { t, tn } from "../i18n.js";

// Récapitulatif global : tous les dons générés par les achats KozzGo (chiffres du serveur, pas du navigateur)
export default function GlobalImpact() {
  const [g, setG] = useState(null);
  useEffect(() => {
    api("/impact/global").then(setG).catch(() => setG(null));
  }, []);
  if (!g) return null;
  return (
    <Section id="dons" title={t("Ensemble, on a déjà fait avancer des causes")} subtitle={t("Chaque achat finance 10 % du prix HT d'une cause choisie par le client. Voici le total, toutes commandes confondues.")}>
      <div className="card total">
        <span className="lbl">{t("Dons générés avec KozzGo")}</span>
        <strong className="big"><Counter value={g.total} format={eur} /></strong>
        <span className="muted">{tn(g.orders, "{n} commande solidaire", "{n} commandes solidaires")}</span>
      </div>
      <DonationGauge data={g} />
      {g.causes.length > 0 ? (
        <div className="tiers">
          {g.causes.map((c) => (
            <motion.div key={c.id} className="card tier" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <span className="tier-icon">{c.emoji}</span>
              <p className="big"><Counter value={c.units} format={fmtNum} /></p>
              <p className="muted">{t(c.unit)}</p>
              <small className="muted">{eur(c.donation)} · {t(c.name)}</small>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="muted">{t("Les premiers dons apparaîtront ici dès les premières commandes.")}</p>
      )}
      <p className="muted note">{t("Les unités d'impact sont indicatives ; le reversement aux associations partenaires est en cours de formalisation (conventions).")}</p>
    </Section>
  );
}
