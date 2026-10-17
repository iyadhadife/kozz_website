import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { StoreProvider } from "./store.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Cart from "./components/Cart.jsx";
import Chat from "./Chat.jsx";
import Home from "./pages/Home.jsx";
import Destinations from "./pages/Destinations.jsx";
import Destination from "./pages/Destination.jsx";
import { CheckoutCanceled, CheckoutSuccess } from "./pages/Checkout.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { loadCatalog } from "./data.js";
import { HelpPage, HowPage, ImpactPage, MondePage, RechargePage } from "./pages/Pages.jsx";

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

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadCatalog().finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="splash"><img src="/logo.jpg" alt="KozzGo" /></div>;

  return (
    <StoreProvider>
      <ScrollManager />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/commande/succes" element={<CheckoutSuccess />} />
          <Route path="/commande/annulee" element={<CheckoutCanceled />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<Destination />} />
          <Route path="/kozz-monde" element={<div className="page"><MondePage /></div>} />
          <Route path="/recharge" element={<div className="page"><RechargePage /></div>} />
          <Route path="/comment-ca-marche" element={<div className="page"><HowPage /></div>} />
          <Route path="/impact" element={<div className="page"><ImpactPage /></div>} />
          <Route path="/aide" element={<div className="page"><HelpPage /></div>} />
          <Route path="*" element={<div className="page"><h2 style={{ padding: "6rem 1.5rem" }}>Page introuvable</h2></div>} />
        </Routes>
      </main>
      <Footer />
      <Cart />
      <Chat />
    </StoreProvider>
  );
}
