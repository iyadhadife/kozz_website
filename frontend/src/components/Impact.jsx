import { useEffect, useRef } from "react";
import { animate, motion, useInView } from "framer-motion";
import Section from "./Section.jsx";
import { CAUSES, eur, fmtNum, impactUnits } from "../data.js";
import { useStore } from "../store.jsx";

function Counter({ value, format }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const ctrl = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => (ref.current.textContent = format(v)),
    });
    return () => ctrl.stop();
  }, [inView, value]);
  return <span ref={ref}>{format(0)}</span>;
}

export default function Impact() {
  const { passport } = useStore();
  const totalDon = passport.reduce((s, o) => s + o.don, 0);
  const byCause = CAUSES.map((c) => {
    const don = passport.filter((o) => o.causeId === c.id).reduce((s, o) => s + o.don, 0);
    return { cause: c, don, units: impactUnits(don, c) };
  }).filter((x) => x.don > 0);

  return (
    <Section id="impact" title="Ton Passeport d'impact" subtitle="Chaque achat finance 10 % de la marge à la cause de ton choix. Ici, ce que tu as déjà financé.">
      {passport.length === 0 ? (
        <div className="card empty">
          <p>Aucun impact pour l'instant.</p>
          <p className="muted">Ton premier achat apparaîtra ici : en repas, arbres, jours d'école connectée…</p>
        </div>
      ) : (
        <>
          <div className="card total">
            <span className="lbl">Total reversé</span>
            <strong className="big"><Counter value={totalDon} format={eur} /></strong>
            <span className="muted">{passport.length} commande{passport.length > 1 ? "s" : ""}</span>
          </div>
          <div className="tiers">
            {byCause.map(({ cause, units }) => (
              <motion.div key={cause.id} className="card tier" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <span className="tier-icon">{cause.emoji}</span>
                <p className="big"><Counter value={units} format={fmtNum} /></p>
                <p className="muted">{cause.unit}</p>
              </motion.div>
            ))}
          </div>
        </>
      )}
      <p className="muted note">
        Chiffres indicatifs en démo : les unités d'impact seront validées avec chaque ONG partenaire (conventions en cours de finalisation).
      </p>
    </Section>
  );
}
