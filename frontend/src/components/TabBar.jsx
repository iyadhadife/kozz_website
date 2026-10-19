import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../store.jsx";
import { t } from "../i18n.js";

const Ico = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-6 8-6s7 1.5 8 6" /></>,
};
const Icon = ({ n }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{Ico[n]}</svg>
);

// Barre d'onglets du bas : navigation au pouce sur mobile, indicateur animé qui glisse d'un onglet à l'autre
export default function TabBar() {
  const { cart, setOpen, user, open, purchases } = useStore();
  const { pathname } = useLocation();
  const tabs = [
    { k: "home", to: "/", ico: "home", label: t("Accueil"), on: pathname === "/" },
    { k: "dest", to: "/destinations", ico: "globe", label: t("Destinations"), on: pathname.startsWith("/destinations") },
    { k: "cart", ico: "bag", label: t("Panier"), on: open, badge: cart.length, action: () => setOpen(true) },
    { k: "me", to: user ? "/profil" : "/connexion", ico: "user", label: user ? t("Mon profil") : t("Connexion"), on: pathname === "/profil" || pathname === "/connexion" },
  ].filter((tab) => purchases || tab.k !== "cart");
  return (
    <motion.nav className="tabbar" aria-label={t("Navigation principale")} initial={{ y: 90 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.3 }}>
      {tabs.map((tab) => {
        const inner = (
          <>
            {tab.on && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <motion.span className="tab-ico" animate={{ y: tab.on ? -2 : 0, scale: tab.on ? 1.08 : 1 }} whileTap={{ scale: 0.8 }}>
              <Icon n={tab.ico} />
              {tab.badge > 0 && <motion.b key={tab.badge} className="tab-badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>{tab.badge}</motion.b>}
            </motion.span>
            <span className="tab-label">{tab.label}</span>
          </>
        );
        return tab.action ? (
          <button key={tab.k} type="button" className={`tab ${tab.on ? "on" : ""}`} onClick={tab.action}>{inner}</button>
        ) : (
          <NavLink key={tab.k} to={tab.to} className={`tab ${tab.on ? "on" : ""}`}>{inner}</NavLink>
        );
      })}
    </motion.nav>
  );
}
