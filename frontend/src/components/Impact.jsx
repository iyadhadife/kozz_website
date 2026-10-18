import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useInView } from "framer-motion";
import Section from "./Section.jsx";
import { eur, fmtNum } from "../data.js";
import { useStore } from "../store.jsx";
import { api } from "../api.js";

import { t, tn } from "../i18n.js";
export function Counter({ value, format }) {
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

// Passeport d'impact : calculé par le serveur à partir des commandes PAYÉES du compte (plus de données locales)
export default function Impact() {
  const { user } = useStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    api("/me/impact").then(setData).catch(() => setData({ total: 0, orders: 0, causes: [] }));
  }, [user]);

  return (
    <Section id="impact" title={t("Ton Passeport d'impact")} subtitle={t("Chaque achat finance 10 % du prix HT à la cause de ton choix. Ici, ce que tu as déjà financé.")}>
      {user === undefined || (user && !data) ? (
        <p className="muted">{t("Chargement…")}</p>) : !user ? ( <div className="card empty">
          <p>{t("Connecte-toi pour voir ton impact.")}</p>
          <p className="muted">{t("Ton passeport additionne les dons générés par tes commandes payées.")}</p>
          <Link to="/connexion?next=/impact" className="btn">{t("Me connecter")}</Link>
        </div>) : data.orders === 0 ? ( <div className="card empty">
          <p>{t("Aucun impact pour l'instant.")}</p>
          <p className="muted">{t("Ta première commande payée apparaîtra ici : en repas, arbres, jours d'école connectée…")}</p>
        </div>
      ) : (
        <>
          <div className="card total">
            <span className="lbl">{t("Dons générés par tes achats")}</span>
            <strong className="big"><Counter value={data.total} format={eur} /></strong>
            <span className="muted">{tn(data.orders, "{n} commande", "{n} commandes")}</span>
          </div>
          <div className="tiers">
            {data.causes.map((c) => (
              <motion.div key={c.id} className="card tier" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <span className="tier-icon">{c.emoji}</span>
                <p className="big"><Counter value={c.units} format={fmtNum} /></p>
                <p className="muted">{t(c.unit)}</p>
                <small className="muted">{eur(c.donation)} · {t(c.name)}</small>
              </motion.div>
            ))}
          </div>
        </>
      )}
      <p className="muted note">{t("Chiffres indicatifs : les unités d'impact seront validées avec chaque ONG partenaire (conventions en cours de finalisation).")}{" "}</p>
    </Section>
  );
}
