import GlobalImpact from "../components/GlobalImpact.jsx";
import ImpactStats from "../components/ImpactStats.jsx";
import CausePhoto from "../components/CausePhoto.jsx";
import { useGlobalImpact } from "../globalImpact.js";
import { useState } from "react";
import { motion } from "framer-motion";
import Section from "../components/Section.jsx";
import Impact from "../components/Impact.jsx";
import HowItWorks from "../components/HowItWorks.jsx";
import Faq from "../components/Faq.jsx";
import { CAUSES, FAQ, MONDE, eur } from "../data.js";
import { useStore } from "../store.jsx";

import { t } from "../i18n.js";
export const HowPage = () => <HowItWorks h1 />;

export function ImpactPage() {
  const g = useGlobalImpact();
  const got = Object.fromEntries((g?.causes || []).map((c) => [c.id, c]));
  return ( <>
      <Section h1 title={t("Notre impact : chaque eSIM finance une cause")} subtitle={t("Suis en direct les dons générés par la communauté KozzGo, et retrouve ton propre Passeport d'impact.")} />
      <Impact />
      <GlobalImpact />
      <ImpactStats g={g} />
      <Section title={t("Les 12 causes")} subtitle={t("Tu choisis ta kozz à chaque achat. Les ONG partenaires sont en cours de finalisation.")}>
        <motion.div className="cause-grid" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
          {CAUSES.map((c) => (
            <motion.div key={c.id} className="card cause-card" variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -5 }}>
              <CausePhoto cause={c} className="cause-pic" />
              <small className="cause-cat">{t(c.cat)}</small>
              <span className="dest-name">{c.emoji} {t(c.name)}</span>
              <small className="muted">{t(c.unit)}</small>
              {got[c.id] && <small className="cause-got">{t("{amount} collectés", { amount: eur(got[c.id].donation) })}</small>}
              {c.signature && <span className="pill">{t("Cause signature")}</span>}
            </motion.div>
          ))}
        </motion.div>
      </Section>
    </>
  );
}

export function HelpPage() {
  const cats = [...new Set(FAQ.map((f) => f.cat))];
  const [cat, setCat] = useState("Tout");
  const items = cat === "Tout" ? FAQ : FAQ.filter((f) => f.cat === cat); return ( <Section title={t("Centre d'aide")} subtitle={t("Installation garantie : si ça ne s'installe pas, un humain prend le relais en moins de 5 minutes.")}>
      <div className="chips">
        {["Tout", ...cats].map((c) => (
          <button key={c} className={`chip ${cat === c ? "on" : ""}`} aria-pressed={!!(cat === c)} onClick={() => setCat(c)}>
            {cat === c && <motion.span layoutId="helpchip" className="chip-bg" />}
            <span>{c}</span>
          </button>
        ))}
      </div>
      <Faq items={items} />
      <p className="muted note">{t("Une autre question ? Utilise le chat en bas à droite.")}</p>
    </Section>
  );
}

export function MondePage() {
  const { add } = useStore();
  return (
    <Section h1 title={t("Kozz Monde")} subtitle={t("Une seule eSIM pour toutes les destinations, au même prix partout. Sans engagement, résiliation en 1 clic.")}>
      <div className="tiers">
        {MONDE.map((m) => (
          <motion.article key={m.id} className={`card tier ${m.popular ? "featured" : ""}`} whileHover={{ y: -6 }}>
            {m.popular && <span className="pill">{t("Populaire")}</span>}
            <span className="tier-icon">🌐</span>
            <h2>{m.name}</h2>
            <p className="big">{m.data}</p>
            <p className="price">{eur(m.price)}<small className="muted">{" "}{t("/mois")}</small></p>
            <button className="btn" onClick={() => add({ kind: "subscription", subscription_id: m.id, label: `Kozz Monde · ${m.name} (mensuel)`, price: m.price, qty: 1 })}>{t("Ajouter")}</button>
          </motion.article>
        ))}
      </div>
      <p className="muted note">{t("Chaque facture mensuelle finance ta kozz : un abonnement solidaire.")}</p>
    </Section>
  );
}
