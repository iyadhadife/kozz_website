import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Hero from "../components/Hero.jsx";
import Section from "../components/Section.jsx";
import Assistant from "../components/Assistant.jsx";
import DestCard from "../components/DestCard.jsx";
import HowItWorks from "../components/HowItWorks.jsx";
import Faq from "../components/Faq.jsx";
import { CAUSES, DESTINATIONS, MONDE, POPULAR, ZONES, eur, fmtNum, FAQ } from "../data.js";
import { useStore } from "../store.jsx";
import { Counter } from "../components/Impact.jsx";
import { api } from "../api.js";

import { t, tn } from "../i18n.js";
const TABS = [
  ["pop", "Populaires"],
  ["local", "Locales"],
  ["reg", "Régionales"],
  ["world", "Mondiales"],
];
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };

function Tabs() {
  const { add } = useStore();
  const [tab, setTab] = useState("pop");
  const popular = POPULAR.map((id) => DESTINATIONS.find((d) => d.id === id)); return ( <Section id="destinations" title={t("Où pars-tu ?")} subtitle={t("Choisis ta destination, on s'occupe du reste.")}>
      <div className="chips">
        {TABS.map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            {tab === k && <motion.span layoutId="hometab" className="chip-bg" />}
            <span>{t(l)}</span>
          </button>
        ))}
      </div>

      <motion.div key={tab} className="dest-grid" initial="hidden" animate="show" variants={stagger}>
        {tab === "pop" && popular.map((d) => <DestCard key={d.id} d={d} />)}
        {tab === "local" && DESTINATIONS.slice(0, 24).map((d) => <DestCard key={d.id} d={d} />)}
        {tab === "reg" &&
          ZONES.map((z) => (
            <motion.div key={z} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -6 }}>
              <Link to={`/destinations?zone=${encodeURIComponent(z)}`} className="card dest">
                <span className="dest-emoji">🌍</span>
                <span className="dest-name">{t(z)}</span>
                <small className="muted">{t("{n} pays", { n: DESTINATIONS.filter((d) => d.zone === z).length })}</small>
              </Link>
            </motion.div>
          ))}
        {tab === "world" &&
          MONDE.map((m) => (
            <motion.div key={m.id} className="card dest" variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
              <span className="dest-emoji">🌐</span>
              <span className="dest-name">{m.name}</span>
              <small className="muted">{m.data}</small>
              <small className="price-sm">{t("{price}/mois", { price: eur(m.price) })}</small>
              <button className="btn btn-sm" onClick={() => add({ kind: "subscription", subscription_id: m.id, label: `Kozz Monde · ${m.name} (mensuel)`, price: m.price, qty: 1 })}>{t("Ajouter")}</button>
            </motion.div>
          ))}
      </motion.div>
      <Link to="/destinations" className="more">{t("Voir toutes les destinations →")}</Link>
    </Section>
  );
}

// Récapitulatif global : tous les dons générés par les achats KozzGo (chiffres du serveur, pas du navigateur)
function GlobalImpact() {
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

function ImpactTeaser() {
  return (
    <Section id="causes" title={t("Ta data voyage. Ta kozz avance.")} subtitle={t("12 causes, 6 catégories. Tu choisis à chaque achat.")}>
      <div className="cause-strip">
        {CAUSES.map((c) => (
          <motion.span key={c.id} className="cause-tag" whileHover={{ scale: 1.08 }}>{c.emoji} {c.name}</motion.span>
        ))}
      </div>
      <Link to="/impact" className="more">{t("Découvrir l'impact →")}</Link>
    </Section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Tabs />
      <Assistant />
      <HowItWorks />
      <GlobalImpact />
      <ImpactTeaser />
      <Section id="faq" title={t("Questions fréquentes")}>
        <Faq items={FAQ.slice(0, 5)} />
        <Link to="/aide" className="more">{t("Tout le centre d'aide →")}</Link>
      </Section>
    </>
  );
}
