import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Dots from "./Dots.jsx";
import SearchBox from "./SearchBox.jsx";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } };
const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const STATS = [
  ["190+", "destinations"],
  ["1 min", "pour installer"],
  ["10 %", "de la marge reversée"],
];

export default function Hero() {
  return (
    <section className="hero">
      <Dots />
      <motion.div className="hero-inner" variants={container} initial="hidden" animate="show">
        <motion.span className="pill" variants={item}>eSIM voyage & recharges solidaires</motion.span>
        <motion.h1 variants={item}>
          Voyagez connecté.<br />
          Voyagez <span className="accent">utile.</span>
        </motion.h1>
        <motion.p className="lead" variants={item}>
          Chaque eSIM et chaque recharge finance une cause que tu choisis. Ton impact est visible dans l'appli.
        </motion.p>
        <motion.div className="hero-search" variants={item}>
          <SearchBox />
        </motion.div>
        <motion.div className="row" variants={item}>
          <Link to="/#assistant" className="btn btn-ghost">Trouver le forfait idéal</Link>
          <Link to="/recharge" className="btn btn-ghost">Recharger un proche</Link>
        </motion.div>
        <motion.ul className="stats" variants={item}>
          {STATS.map(([n, l]) => (
            <li key={l}><strong>{n}</strong><span>{l}</span></li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}
