import ThemeToggle from "./ThemeToggle.jsx";
import Logo from "./Logo.jsx";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
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
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { scrollY } = useScroll();

  // La barre se range quand on descend la page et revient dès qu'on remonte
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 12);
    setHidden(y > 140 && y > prev && !mobile);
  });
  useEffect(() => { setMega(false); setMobile(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobile]);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setMega(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);

  return (
    <motion.header className={`nav ${scrolled ? "scrolled" : ""}`} initial={{ y: -80, opacity: 0 }} animate={{ y: hidden ? -90 : 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 26 }}>
      <Link to="/" className="brand"><Logo label={t("KozzGo — accueil")} /></Link>

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
        <span className="nav-pickers"><LanguagePicker compact /><CurrencyPicker compact /></span>
        <ThemeToggle />
        {user ? (
          <Link to="/profil" className="avatar avatar-sm" aria-label={t("Mon profil")} title={user.email}>
            {(user.first_name || user.email)[0].toUpperCase()}
          </Link>) : user === null ? ( <Link to="/connexion" className="btn btn-ghost nav-login">{t("Connexion")}</Link>
        ) : null}
        <button className="btn btn-ghost nav-cart" onClick={() => setOpen(true)} aria-label={t("Ouvrir le panier")}>
          {t("Panier")}
          {cart.length > 0 && (
            <motion.span key={cart.length} className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>{cart.length}</motion.span>
          )}
        </button>
        <button className="burger" aria-label={t("Menu")} aria-expanded={mobile} onClick={() => setMobile((m) => !m)}>
          <span className={`burger-ico ${mobile ? "open" : ""}`}><i /><i /><i /></span>
        </button>
      </div>

      <AnimatePresence>
        {mobile && (
          <>
            <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <motion.nav
              className="mobile-menu"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              {[["/destinations", "Destinations"], ["/kozz-monde", "Kozz Monde"], ["/comment-ca-marche", "Comment ça marche"], ["/impact", "Impact"], ["/aide", "Aide"]].map(([to, l], i) => (
                <motion.div key={to} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.05, duration: 0.35 }}>
                  <Link to={to}><span>{t(l)}</span><span aria-hidden="true">→</span></Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.34, duration: 0.35 }}>
                <Link to={user ? "/profil" : "/connexion"}><span>{user ? t("Mon profil") : t("Connexion")}</span><span aria-hidden="true">→</span></Link>
              </motion.div>
              <motion.div className="menu-pickers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.35 }}>
                <LanguagePicker />
                <CurrencyPicker />
              </motion.div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
