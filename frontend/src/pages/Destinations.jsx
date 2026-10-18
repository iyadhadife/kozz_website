import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Section from "../components/Section.jsx";
import DestCard from "../components/DestCard.jsx";
import { DESTINATIONS, ZONES } from "../data.js";

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Destinations() {
  const [params, setParams] = useSearchParams();
  const zone = params.get("zone") || "";
  const [q, setQ] = useState("");

  const list = useMemo(
    () => DESTINATIONS.filter((d) => (!zone || d.zone === zone) && norm(d.name).includes(norm(q))),
    [zone, q]
  );
  const setZone = (z) => (z ? setParams({ zone: z }) : setParams({}));

  return (
    <Section title="Toutes les destinations" subtitle="Filtre par région ou cherche un pays.">
      <input className="filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pays…" aria-label="Rechercher un pays" />
      <div className="chips">
        {["", ...ZONES].map((z) => (
          <button key={z || "all"} className={`chip ${zone === z ? "on" : ""}`} onClick={() => setZone(z)}>
            {zone === z && <motion.span layoutId="zonechip" className="chip-bg" />}
            <span>{z || "Toutes"}</span>
          </button>
        ))}
      </div>
      <motion.div key={zone + q} className="dest-grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.008 } } }}>
        {list.map((d) => <DestCard key={d.id} d={d} />)}
      </motion.div>
      {list.length === 0 && <p className="muted">Oh ! On n'a rien trouvé. Essaie un autre pays.</p>}
      <p className="muted note">Plus de destinations arrivent : le catalogue complet (190+) sera disponible au lancement.</p>
    </Section>
  );
}
