import Logo from "./components/Logo.jsx";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import TabBar from "./components/TabBar.jsx";
import { setIntroActive } from "./introState.js";
import WorldIntro, { introSeen } from "./components/WorldIntro.jsx";
import TextMotion from "./components/TextMotion.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
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
import Passport from "./pages/Passport.jsx";
import { ForgotPassword, ResetPassword } from "./pages/PasswordReset.jsx";
import Compatible from "./pages/Compatible.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import About from "./pages/About.jsx";
import Admin from "./pages/Admin.jsx";
import Blog from "./pages/Blog.jsx";
import BlogPost from "./pages/BlogPost.jsx";
import Partner from "./pages/Partner.jsx";
import RouteSeo from "./components/RouteSeo.jsx";
import Profile from "./pages/Profile.jsx";
import { loadCatalog, localizeData, setCurrencyState } from "./data.js";
import { initialLang, loadLang, t } from "./i18n.js";
import { HowPage, ImpactPage, MondePage } from "./pages/Pages.jsx";

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

// Chaque page entre en fondu + léger glissement ; la clé suit l'URL (pas les paramètres ni l'ancre)
function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <motion.main key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.main>
  );
}

export default function App() {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(() => { const v = !introSeen() && !matchMedia("(prefers-reduced-motion: reduce)").matches; setIntroActive(v); return v; });
  const endIntro = useCallback(() => { setIntroActive(false); setIntro(false); }, []);
  useEffect(() => {
    Promise.all([loadCatalog(), loadLang(initialLang()).then((l) => setCurrencyState({ locale: l.locale }))]).then(() => localizeData()).finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="splash"><Logo height={64} /></div>; return ( <StoreProvider>
      <ReferralLanding />
      <ScrollManager />
      <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {intro && <motion.div key="intro" className="qr-intro-wrap" exit={{ opacity: 0 }} transition={{ duration: 0.45 }}><WorldIntro onDone={endIntro} /></motion.div>}
      </AnimatePresence>
      <Shell>
      <ScrollProgress />
      <TextMotion paused={intro} />
      <RouteSeo />
      <Navbar />
      <PageTransition>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/commande/succes" element={<CheckoutSuccess />} />
          <Route path="/commande/annulee" element={<CheckoutCanceled />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/cgv" element={<Cgv />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/retractation" element={<Retractation />} />
          <Route path="/remboursement" element={<Remboursement />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/mot-de-passe/reinitialiser" element={<ResetPassword />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/passeport/:code" element={<Passport />} />
          <Route path="/telephones-compatibles" element={<Compatible />} />
          <Route path="/destinations/:id" element={<Destination />} />
          <Route path="/kozz-monde" element={<div className="page"><MondePage /></div>} />
          <Route path="/comment-ca-marche" element={<div className="page"><HowPage /></div>} />
          <Route path="/impact" element={<div className="page"><ImpactPage /></div>} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/aide" element={<Navigate to="/faq" replace />} />
          <Route path="/devenir-partenaire" element={<Partner />} />
          <Route path="*" element={<div className="page"><h2 style={{ padding: "6rem 1.5rem" }}>{t("Page introuvable")}</h2></div>} />
        </Routes>
      </PageTransition>
      <Footer />
      <Cart />
      <Chat />
      <TabBar />
      </Shell>
      </MotionConfig>
    </StoreProvider>
  );
}
