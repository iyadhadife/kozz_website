import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { eur, fmtNum } from "../data.js";
import { useStore } from "../store.jsx";

const POLL_MS = 2000;
const MAX_TRIES = 15; // ~30 s : le webhook Stripe arrive en général en moins de 5 s

export function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { checkout } = useStore();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("checking"); // checking | paid | pending | error
  const recorded = useRef(false);

  useEffect(() => {
    if (!sessionId) return setState("error");
    let tries = 0;
    let timer;
    const check = async () => {
      try {
        const o = await api(`/checkout/${encodeURIComponent(sessionId)}`);
        if (o.status === "paid") {
          setOrder(o);
          setState("paid");
          if (!recorded.current) {
            recorded.current = true;
            checkout({ date: new Date().toISOString(), total: o.total, don: o.donation, causeId: o.cause.id }); // vide aussi le panier
          }
          return;
        }
        if (o.status === "failed") return setState("error");
      } catch {
        return setState("error");
      }
      if (++tries >= MAX_TRIES) return setState("pending");
      timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="page checkout-result">
      {state === "checking" && (
        <>
          <div className="spinner" aria-hidden="true" />
          <h2>Confirmation du paiement…</h2>
          <p className="muted">Ça ne prend que quelques secondes.</p>
        </>
      )}

      {state === "paid" && (
        <motion.div className="checkout-result" style={{ padding: 0 }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div className="heart" animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>🧡</motion.div>
          <h1>Merci !</h1>
          <p>Paiement de {eur(order.total)} confirmé. Ta commande finance</p>
          <p className="big">{fmtNum(order.impact_units)} {order.cause.unit}</p>
          <p className="muted">{order.cause.emoji} {order.cause.name} · {eur(order.donation)} reversés</p>
          <p className="muted">Commande n°{order.order_id}. Un reçu t'a été envoyé par Stripe.</p>
          <div className="row">
            <Link to="/profil" className="btn">Voir mes commandes</Link>
            <Link to="/impact" className="btn btn-ghost">Mon Passeport d'impact</Link>
          </div>
        </motion.div>
      )}

      {state === "pending" && (
        <>
          <h2>Paiement en cours de validation</h2>
          <p className="muted">Stripe n'a pas encore confirmé ton paiement. Ta commande apparaîtra dans ton profil dès que ce sera fait. Tu ne seras débité qu'une fois.</p>
          <Link to="/" className="btn btn-ghost">Retour à l'accueil</Link>
        </>
      )}

      {state === "error" && (
        <>
          <h2>Nous n'avons pas pu confirmer ce paiement</h2>
          <p className="muted">Si tu as été débité, contacte-nous avec le chat : nous retrouverons ta commande.</p>
          <Link to="/" className="btn btn-ghost">Retour à l'accueil</Link>
        </>
      )}
    </div>
  );
}

export function CheckoutCanceled() {
  const { setOpen, cart } = useStore();
  return (
    <div className="page checkout-result">
      <h2>Paiement annulé</h2>
      <p className="muted">Aucun montant n'a été débité.{cart.length > 0 && " Ton panier est toujours là."}</p>
      <div className="row">
        {cart.length > 0 && <button className="btn" onClick={() => setOpen(true)}>Revenir au panier</button>}
        <Link to="/" className="btn btn-ghost">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
