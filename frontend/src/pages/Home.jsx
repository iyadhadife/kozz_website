import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Hero from "../components/Hero.jsx";
import Section from "../components/Section.jsx";
import Assistant from "../components/Assistant.jsx";
import DestCard from "../components/DestCard.jsx";
import HowItWorks from "../components/HowItWorks.jsx";
import Faq from "../components/Faq.jsx";
import { CAUSES, DESTINATIONS, MONDE, POPULAR, ZONES, eur, FAQ } from "../data.js";
import { useStore } from "../store.jsx";

const TABS = [
  ["pop", "Populaires"],
  ["local", "Locales"],
  ["reg", "Régionales"],
  ["world", "Mondiales"],
];
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function Tabs() {
  const { add } = useStore();
  const [tab, setTab] = useState("pop");
  const popular = POPULAR.map((id) => DESTINATIONS.find((d) => d.id === id));

  return (
    <Section id="destinations" title="Où pars-tu ?" subtitle="Choisis ta destination, on s'occupe du reste.">
      <div className="chips">
        {TABS.map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            {tab === k && <motion.span layoutId="hometab" className="chip-bg" />}
            <span>{l}</span>
          </button>
        ))}
      </div>

      <motion.div key={tab} className="dest-grid" initial="hidden" animate="show" variants={stagger}>
        {tab === "pop" && popular.map((d) => <DestCard key={d.id} d={d} />)}
        {tab === "local" && DESTINATIONS.map((d) => <DestCard key={d.id} d={d} />)}
        {tab === "reg" &&
          ZONES.map((z) => (
            <motion.div key={z} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -6 }}>
              <Link to={`/destinations?zone=${encodeURIComponent(z)}`} className="card dest">
                <span className="dest-emoji">🌍</span>
                <span className="dest-name">{z}</span>
                <small className="muted">{DESTINATIONS.filter((d) => d.zone === z).length} pays</small>
              </Link>
            </motion.div>
          ))}
        {tab === "world" &&
          MONDE.map((m) => (
            <motion.div key={m.id} className="card dest" variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
              <span className="dest-emoji">🌐</span>
              <span className="dest-name">{m.name}</span>
              <small className="muted">{m.data}</small>
              <small className="price-sm">{eur(m.price)}/mois</small>
              <button className="btn btn-sm" onClick={() => add({ kind: "subscription", subscription_id: m.id, label: `Kozz Monde · ${m.name} (mensuel)`, price: m.price, qty: 1 })}>Ajouter</button>
            </motion.div>
          ))}
      </motion.div>
      <Link to="/destinations" className="more">Voir toutes les destinations →</Link>
    </Section>
  );
}

function ImpactTeaser() {
  return (
    <Section id="causes" title="Ta data voyage. Ta kozz avance." subtitle="12 causes, 6 catégories. Tu choisis à chaque achat.">
      <div className="cause-strip">
        {CAUSES.map((c) => (
          <motion.span key={c.id} className="cause-tag" whileHover={{ scale: 1.08 }}>{c.emoji} {c.name}</motion.span>
        ))}
      </div>
      <Link to="/impact" className="more">Découvrir l'impact →</Link>
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
      <ImpactTeaser />
      <Section id="faq" title="Questions fréquentes">
        <Faq items={FAQ.slice(0, 5)} />
        <Link to="/aide" className="more">Tout le centre d'aide →</Link>
      </Section>
    </>
  );
}
