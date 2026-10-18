import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Counter } from "../components/Impact.jsx";
import Logo from "../components/Logo.jsx";
import { eur, fmtNum } from "../data.js";
import { api } from "../api.js";
import { t, tn } from "../i18n.js";

// Un tampon : touche-le pour le retourner (emoji -> chiffres d'impact de la cause).
function Stamp({ c, i }) {
  const [flip, setFlip] = useState(false);
  return (
    <motion.button type="button" className="pp-stamp" aria-pressed={flip} onClick={() => setFlip((f) => !f)}
      initial={{ opacity: 0, scale: 1.7, rotate: -18 }} animate={{ opacity: 1, scale: 1, rotate: (i % 2 ? 4 : -4) }}
      transition={{ delay: 0.5 + i * 0.18, type: "spring", stiffness: 260, damping: 16 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <motion.span className="pp-face" animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration: 0.5 }}>
        <span className="pp-front"><span className="pp-emoji">{c.emoji}</span><small>{t(c.name)}</small></span>
        <span className="pp-back"><strong>{fmtNum(Math.round(c.units * 10) / 10)}</strong><small>{t(c.unit)}</small><em>{eur(c.donation)}</em></span>
      </motion.span>
    </motion.button>
  );
}

// Passeport d'impact partagé : carte qui s'incline, tampons à retourner, code de parrainage cliquable.
export default function Passport() {
  const { code } = useParams();
  const [data, setData] = useState(undefined);
  useEffect(() => { api(`/public/passport/${encodeURIComponent(code)}`).then(setData).catch(() => setData(null)); }, [code]);

  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [9, -9]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-11, 11]), { stiffness: 120, damping: 14 });
  const tilt = (e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1); };
  const reset = () => { mx.set(0); my.set(0); };

  if (data === undefined) return <div className="page"><p className="muted" style={{ padding: "6rem 1.5rem" }}>{t("Chargement…")}</p></div>;
  if (!data) return (
    <div className="page"><div className="pp-wrap"><div className="card empty"><p>{t("Ce passeport n'existe pas ou n'a pas encore d'impact.")}</p><Link to="/" className="btn">{t("Découvrir KozzGo")}</Link></div></div></div>
  );

  return (
    <div className="page">
      <div className="pp-wrap">
        <motion.div className="pp-card" style={{ rotateX: rx, rotateY: ry }} onPointerMove={tilt} onPointerLeave={reset} initial={{ opacity: 0, y: 30, rotateX: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="pp-head"><Logo /><span className="pp-tag">{t("Passeport d'impact")}</span></div>
          <p className="pp-lbl">{t("Dons générés par ses achats")}</p>
          <strong className="pp-total"><Counter value={data.total} format={eur} /></strong>
          <p className="pp-sub">{tn(data.orders, "{n} commande", "{n} commandes")}</p>
          <div className="pp-stamps">{data.causes.map((c, i) => <Stamp key={c.id} c={c} i={i} />)}</div>
          <p className="pp-hint">{t("Touche un tampon pour le retourner")}</p>
        </motion.div>

        <motion.div className="pp-invite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <p className="pp-join">{t("Rejoins-moi sur KozzGo")}</p>
          <Link to={`/?ref=${data.code}`} className="pp-code" aria-label={`${t("Mon code de parrainage : touche-le")} ${data.code}`}>
            <small>{t("Mon code de parrainage : touche-le")}</small>
            <strong>{data.code}</strong>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
