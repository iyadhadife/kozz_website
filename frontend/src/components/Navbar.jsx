import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import CurrencyPicker from "./CurrencyPicker.jsx";
import LanguagePicker from "./LanguagePicker.jsx";
import { DESTINATIONS, POPULAR, ZONES, flag } from "../data.js";
import { useStore } from "../store.jsx";

import { t } from "../i18n.js";
const MENU_TABS = [
  ["pop", "Populaires"],
  ["reg", "Régions"],
  ["all", "Toutes les destinations"],
];

function Mega({ onClose }) {
  const [tab, setTab] = useState("pop");
  const items = tab === "pop" ? POPULAR.map((id) => DESTINATIONS.find((d) => d.id === id)) : DESTINATIONS; return ( <motion.div className="mega" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
      <div className="mega-tabs">
        {MENU_TABS.map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t(l)}</button>
        ))}
      </div>
      <div className="mega-grid">
        {tab === "reg"
          ? ZONES.map((z) => (
              <Link key={z} to={`/destinations?zone=${encodeURIComponent(z)}`} onClick={onClose}>🌍 {t(z)}</Link>
            ))
          : items.map((d) => (
              <Link key={d.id} to={`/destinations/${d.id}`} onClick={onClose}>
                <img src={flag(d.id)} alt="" width="24" height="17" /> {d.name}
              </Link>
            ))}
      </div>
      <Link to="/destinations" className="mega-all" onClick={onClose}>{t("Voir toutes les destinations →")}</Link>
    </motion.div>
  );
}

export default function Navbar() {
  const { cart, setOpen, user } = useStore();
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMega(false); setMobile(false); }, [pathname]);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setMega(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);

  return (
    <motion.header className="nav" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
      <Link to="/" className="brand"><img src="/logo.jpg" alt={t("KozzGo — accueil")} /></Link>

      <nav className="nav-links" aria-label={t("Navigation principale")}>
        <div className="mega-wrap" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
          <button className="nav-btn" aria-expanded={mega} onClick={() => setMega((m) => !m)}>{t("Destinations ▾")}</button>
          <AnimatePresence>{mega && <Mega onClose={() => setMega(false)} />}</AnimatePresence>
        </div>
        <NavLink to="/kozz-monde">{t("Kozz Monde")}</NavLink>
        <NavLink to="/comment-ca-marche">{t("Comment ça marche")}</NavLink>
        <NavLink to="/impact">{t("Impact")}</NavLink>
        <NavLink to="/aide">{t("Aide")}</NavLink>
      </nav>

      <div className="nav-right">
        <LanguagePicker compact />
        <CurrencyPicker compact />
        {user ? (
          <Link to="/profil" className="avatar avatar-sm" aria-label={t("Mon profil")} title={user.email}>
            {(user.first_name || user.email)[0].toUpperCase()}
          </Link>) : user === null ? ( <Link to="/connexion" className="btn btn-ghost nav-login">{t("Connexion")}</Link>
        ) : null}
        <button className="btn btn-ghost" onClick={() => setOpen(true)} aria-label={t("Ouvrir le panier")}>
          {t("Panier")}
          {cart.length > 0 && (
            <motion.span key={cart.length} className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>{cart.length}</motion.span>
          )}
        </button>
        <button className="burger" aria-label={t("Menu")} aria-expanded={mobile} onClick={() => setMobile((m) => !m)}>{mobile ? "✕" : "☰"}</button>
      </div>

      <AnimatePresence>
        {mobile && (
          <motion.nav className="mobile-menu" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Link to="/destinations">{t("Destinations")}</Link>
            <Link to="/kozz-monde">{t("Kozz Monde")}</Link>
            <Link to="/comment-ca-marche">{t("Comment ça marche")}</Link>
            <Link to="/impact">{t("Impact")}</Link>
            <Link to="/aide">{t("Aide")}</Link>
            <Link to={user ? "/profil" : "/connexion"}>{user ? t("Mon profil") : t("Connexion")}</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
