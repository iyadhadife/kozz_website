import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Section from "../components/Section.jsx";
import DestCard from "../components/DestCard.jsx";
import { DESTINATIONS, ZONES } from "../data.js";

import { t, tn } from "../i18n.js";
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Destinations() {
  const [params, setParams] = useSearchParams();
  const zone = params.get("zone") || "";
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const list = useMemo(
    () => DESTINATIONS.filter((d) => (!zone || d.zone === zone) && (!q.trim() || [d.name, d.zone, d.id].some((f) => norm(t(f)).includes(norm(q.trim())) || norm(f).includes(norm(q.trim()))))),
    [zone, q]
  );
  const setZone = (z) => (z ? setParams({ zone: z }) : setParams({}));

  return (
    <Section title={t("Toutes les destinations")} subtitle={t("Filtre par région ou cherche un pays.")}>
      <div className="search dest-search">
        <span className="search-ico" aria-hidden="true">🔍</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && list.length === 1) nav(`/destinations/${list[0].id}`); }} placeholder={t("Où vas-tu ? Maroc, Thaïlande, Japon…")} aria-label={t("Rechercher une destination")} autoComplete="off" />
        {q && <button type="button" className="search-clear" onClick={() => setQ("")} aria-label={t("Effacer la recherche")}>✕</button>}
      </div>
      <p className="muted dest-count" aria-live="polite">{tn(list.length, "{n} destination", "{n} destinations")}</p>
      <div className="chips">
        {["", ...ZONES].map((z) => (
          <button key={z || "all"} className={`chip ${zone === z ? "on" : ""}`} onClick={() => setZone(z)}>
            {zone === z && <motion.span layoutId="zonechip" className="chip-bg" />}
            <span>{z ? t(z) : t("Toutes")}</span>
          </button>
        ))}
      </div>
      <motion.div key={zone + q} className="dest-grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.008 } } }}>
        {list.map((d) => <DestCard key={d.id} d={d} />)}
      </motion.div>
      {list.length === 0 && <p className="muted">{t("Oh ! On n'a rien trouvé. Essaie un autre pays.")}</p>}
      <p className="muted note">{t("Plus de destinations arrivent : le catalogue complet (190+) sera disponible au lancement.")}</p>
    </Section>
  );
}
