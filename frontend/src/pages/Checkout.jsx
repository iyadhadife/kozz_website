import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { eur, eurFixed, fmtNum, money } from "../data.js";
import EsimInstall from "../components/EsimInstall.jsx";
import { useStore } from "../store.jsx";

import { t } from "../i18n.js";
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
          if (o.fulfilment !== "pending") return; // sinon on continue : l'eSIM est en cours de préparation chez le fournisseur
          if (++tries >= MAX_TRIES) return;
          timer = setTimeout(check, POLL_MS);
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
          <h2>{t("Confirmation du paiement…")}</h2>
          <p className="muted">{t("Ça ne prend que quelques secondes.")}</p>
        </>
      )}

      {state === "paid" && (
        <motion.div className="checkout-result" style={{ padding: 0 }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div className="heart" animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>🧡</motion.div>
          <h1>{t("Merci !")}</h1>
          <p>{t("Paiement de {amount} confirmé. Ta commande finance", { amount: order.currency && order.currency !== "EUR" ? money(order.charged, order.currency, order.currency === "JPY" || order.currency === "KRW" || order.currency === "VND" ? 0 : 2) : eurFixed(order.total) })}</p>
          <p className="big">{fmtNum(order.impact_units)} {t(order.cause.unit)}</p>
          <p className="muted">{order.cause.emoji} {t(order.cause.name)} · {t("{amount} reversés", { amount: eur(order.donation) })}</p>
          <p className="muted">{t("Commande n°{n}. Un reçu t'a été envoyé par Stripe.", { n: order.order_id })}</p>
          {order.fulfilment === "pending" && (
            <div className="checkout-result" style={{ padding: 0 }}>
              <div className="spinner" aria-hidden="true" />
              <p className="muted">{t("Nous préparons ton eSIM…")}</p>
            </div>
          )}
          <EsimInstall esims={order.esims} />
          {order.invoice && (
            <a className="btn btn-ghost" href={`/api/checkout/${encodeURIComponent(sessionId)}/invoice`}>{t("Télécharger ma facture {number}", { number: order.invoice })}</a>
          )}
          <p className="muted note">{t("Ta confirmation, ta facture et tes informations d'installation sont aussi envoyées par e-mail (et par SMS si tu as donné ton numéro).")}</p>
          <div className="row">
            <Link to="/profil" className="btn">{t("Voir mes commandes")}</Link>
            <Link to="/impact" className="btn btn-ghost">{t("Mon Passeport d'impact")}</Link>
          </div>
        </motion.div>
      )}

      {state === "pending" && (
        <>
          <h2>{t("Paiement en cours de validation")}</h2>
          <p className="muted">{t("Stripe n'a pas encore confirmé ton paiement. Ta commande apparaîtra dans ton profil dès que ce sera fait. Tu ne seras débité qu'une fois.")}</p>
          <Link to="/" className="btn btn-ghost">{t("Retour à l'accueil")}</Link>
        </>
      )}

      {state === "error" && (
        <>
          <h2>{t("Nous n'avons pas pu confirmer ce paiement")}</h2>
          <p className="muted">{t("Si tu as été débité, contacte-nous avec le chat : nous retrouverons ta commande.")}</p>
          <Link to="/" className="btn btn-ghost">{t("Retour à l'accueil")}</Link>
        </>
      )}
    </div>
  );
}

export function CheckoutCanceled() {
  const { setOpen, cart } = useStore();
  return (
    <div className="page checkout-result">
      <h2>{t("Paiement annulé")}</h2>
      <p className="muted">{t("Aucun montant n'a été débité.")}{cart.length > 0 && " " + t("Ton panier est toujours là.")}</p>
      <div className="row">
        {cart.length > 0 && <button className="btn" onClick={() => setOpen(true)}>{t("Revenir au panier")}</button>}
        <Link to="/" className="btn btn-ghost">{t("Retour à l'accueil")}</Link>
      </div>
    </div>
  );
}
