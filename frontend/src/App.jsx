import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider, useStore } from "./store.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Cart from "./components/Cart.jsx";
import Chat from "./Chat.jsx";
import Home from "./pages/Home.jsx";
import Destinations from "./pages/Destinations.jsx";
import Destination from "./pages/Destination.jsx";
import { CheckoutCanceled, CheckoutSuccess } from "./pages/Checkout.jsx";
import { Cgv, Confidentialite, MentionsLegales, Remboursement, Retractation } from "./pages/Legal.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { loadCatalog, localizeData, setCurrencyState } from "./data.js";
import { initialLang, loadLang, t } from "./i18n.js";
import { HelpPage, HowPage, ImpactPage, MondePage } from "./pages/Pages.jsx";

// Remonte en haut à chaque page, ou défile vers l'ancre (#assistant…)
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 50);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

// Lien de parrainage : https://site/?ref=CODE -> code mémorisé, puis page d'inscription
function ReferralLanding() {
  const { search, pathname } = useLocation();
  const code = new URLSearchParams(search).get("ref")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!code || pathname === "/connexion") return null;
  try { localStorage.setItem("kozz_ref", code); } catch {}
  return <Navigate to="/connexion?mode=register" replace />;
}

// Remonte l'interface quand la devise change : tous les prix sont recalculés sans rechargement
function Shell({ children }) {
  const { currency, lang, fx } = useStore();
  return <div key={`${currency}-${lang}-${fx ? "fx" : "nofx"}`}>{children}</div>;
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([loadCatalog(), loadLang(initialLang()).then((l) => setCurrencyState({ locale: l.locale }))]).then(() => localizeData()).finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="splash"><img src="/logo.jpg" alt={t("KozzGo")} /></div>; return ( <StoreProvider>
      <ReferralLanding />
      <ScrollManager />
      <Shell>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/commande/succes" element={<CheckoutSuccess />} />
          <Route path="/commande/annulee" element={<CheckoutCanceled />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/cgv" element={<Cgv />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/retractation" element={<Retractation />} />
          <Route path="/remboursement" element={<Remboursement />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<Destination />} />
          <Route path="/kozz-monde" element={<div className="page"><MondePage /></div>} />
          <Route path="/comment-ca-marche" element={<div className="page"><HowPage /></div>} />
          <Route path="/impact" element={<div className="page"><ImpactPage /></div>} />
          <Route path="/aide" element={<div className="page"><HelpPage /></div>} />
          <Route path="*" element={<div className="page"><h2 style={{ padding: "6rem 1.5rem" }}>{t("Page introuvable")}</h2></div>} />
        </Routes>
      </main>
      <Footer />
      <Cart />
      <Chat />
      </Shell>
    </StoreProvider>
  );
}
