import { t } from "../i18n.js";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { eur, flag, fromPrice } from "../data.js";

export default function DestCard({ d }) {
  return (
    <motion.div whileHover={{ y: -6 }} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
      <Link to={`/destinations/${d.id}`} className="card dest">
        <img src={flag(d.id)} alt="" width="40" height="28" loading="lazy" />
        <span className="dest-name">{d.name}</span>
        <small className="muted">{t("dès {price}", { price: eur(fromPrice(d)) })}</small>
      </Link>
    </motion.div>
  );
}
