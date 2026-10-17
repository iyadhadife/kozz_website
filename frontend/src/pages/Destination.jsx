import { Link, Navigate, useParams } from "react-router-dom";
import Section from "../components/Section.jsx";
import PlanCards from "../components/PlanCards.jsx";
import DestCard from "../components/DestCard.jsx";
import Faq from "../components/Faq.jsx";
import { DESTINATIONS, FAQ, eur, flag, fromPrice } from "../data.js";
import { motion } from "framer-motion";

export default function Destination() {
  const { id } = useParams();
  const dest = DESTINATIONS.find((d) => d.id === id);
  if (!dest) return <Navigate to="/destinations" replace />;

  const related = DESTINATIONS.filter((d) => d.zone === dest.zone && d.id !== dest.id).slice(0, 4);

  return (
    <>
      <div className="dest-head">
        <nav className="crumbs" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link> › <Link to="/destinations">Destinations</Link> › <span>{dest.name}</span>
        </nav>
        <motion.div className="dest-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <img src={flag(dest.id)} alt="" width="64" height="44" />
          <div>
            <h1>eSIM {dest.name}</h1>
            <p className="muted">À partir de {eur(fromPrice(dest))} · installation en 1 minute · 10 % de la marge reversée à ta kozz</p>
          </div>
        </motion.div>
      </div>

      <Section title="Choisis ton forfait" subtitle="Le forfait démarre à ta première connexion sur place.">
        <PlanCards dest={dest} />
        <p className="muted note">
          Forfait Illimité : fair use affiché dès l'achat. Besoin d'aide pour choisir ? <Link to="/#assistant" className="accent">Essaie l'assistant</Link>.
        </p>
      </Section>

      {related.length > 0 && (
        <Section title={`Aussi en ${dest.zone}`}>
          <div className="dest-grid">{related.map((d) => <DestCard key={d.id} d={d} />)}</div>
        </Section>
      )}

      <Section title="Questions fréquentes">
        <Faq items={FAQ.filter((f) => f.cat === "Installation" || f.cat === "Achat")} />
      </Section>
    </>
  );
}
