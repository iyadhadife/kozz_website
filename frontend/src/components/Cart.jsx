import CausePhoto from "./CausePhoto.jsx";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { api } from "../api.js";
import { CAUSES, FX_STATE, donation, eur, eurLine, fmtMinor, fmtNum, impactUnits, itemLabel, minorOf } from "../data.js";
import { useStore } from "../store.jsx";

import { currentLang, currentLocale, t, tx } from "../i18n.js";
export default function Cart() {
  const { cart, remove, open, setOpen, user, currency, fx } = useStore();
  const [causeId, setCauseId] = useState("tsf");
  useEffect(() => { if (user?.cause_id) setCauseId(user.cause_id); }, [user?.cause_id]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [waive, setWaive] = useState(false);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const don = cart.reduce((s, i) => s + donation(i.price * i.qty, i.kind), 0);
  const cause = CAUSES.find((c) => c.id === causeId);
  const units = impactUnits(don, cause);
  const room = Math.max(0, total - 0.5); // Stripe exige au moins 0,50 € à payer
  const credit = user ? Math.floor(Math.min(user.credit || 0, room) / 1.5) * 1.5 : 0; // crédits de 1,50 €, non fractionnés
  const net = total - credit;
  const hasSub = cart.some((i) => i.kind === "subscription");
  const shown = hasSub ? "EUR" : currency; // un abonnement reste en euros
  const grossMinor = cart.reduce((s, i) => s + minorOf(i.price) * i.qty, 0);
  const netText = shown === currency ? fmtMinor(grossMinor - (credit ? minorOf(credit) : 0)) : eur(net);
  const emailOk = (!!user || /^\S+@\S+\.\S+$/.test(email)) && acceptTerms && waive;

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      // Le serveur recalcule les prix depuis la base, enregistre la commande puis ouvre une session Stripe Checkout
      const o = await api("/orders", {
        method: "POST",
        body: { email: user ? undefined : email, cause_id: causeId, accept_terms: acceptTerms, waive_withdrawal: waive, lang: currentLang().code, currency: cart.some((i) => i.kind === "subscription") ? "EUR" : currency, items: cart.map(({ uid, label, price, ...ref }) => ref) },
      });
      window.location.assign(o.checkout_url); // page de paiement hébergée par Stripe
    } catch (e) {
      setError(e.message || t("Impossible de lancer le paiement."));
      setBusy(false);
    }
  };
  const close = () => setOpen(false);
  const rtl = document.documentElement.dir === "rtl";
  const [phone, setPhone] = useState(() => matchMedia("(max-width: 720px)").matches);
  useEffect(() => {
    const mq = matchMedia("(max-width: 720px)");
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const drag = useDragControls();
  // Mobile : feuille qui monte du bas, se ferme en la tirant vers le bas par la poignée. Bureau : tiroir latéral.
  const from = phone ? { y: "100%" } : { x: rtl ? "-100%" : "100%" };
  return ( <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            className="drawer"
            initial={from}
            animate={{ x: 0, y: 0 }}
            exit={from}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag={phone ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) close(); }}
          >
            {phone && <div className="grab" onPointerDown={(e) => drag.start(e)} aria-hidden="true"><i /></div>}
            <button className="close" onClick={close} aria-label={t("Fermer")}>✕</button>

              <>
                <h3>{t("Ton panier")}</h3>
                {cart.length === 0 ? (
                  <p className="muted">{t("Ton panier est vide.")}</p>
                ) : (
                  <>
                    <ul className="lines">
                      <AnimatePresence initial={false}>
                        {cart.map((i) => (
                          <motion.li key={i.uid} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                            <span>{i.qty > 1 && `${i.qty} × `}{itemLabel(i)}</span>
                            <strong>{eurLine(i.price, i.qty)}</strong>
                            <button onClick={() => remove(i.uid)} aria-label={t("Retirer")}>✕</button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>

                    <span className="lbl">{t("Choisis ta kozz")}</span>
                    <div className="causes">
                      {CAUSES.map((c) => (
                        <button key={c.id} className={`cause ${c.id === causeId ? "on" : ""}`} onClick={() => setCauseId(c.id)} title={c.cat}>
                          <CausePhoto cause={c} className="cause-thumb" />
                          <small>{c.name}</small>
                        </button>
                      ))}
                    </div>
                    <motion.p key={causeId + units} className="impact-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      {cause.emoji} {t("Cet achat financera ≈")} <strong>{fmtNum(units)} {cause.unit}</strong>
                    </motion.p>

                    {user ? (
                      <p className="muted">{t("Commande rattachée à ton compte ({email}).", { email: user.email })}</p>
                    ) : (
                      <>
                        <label>{t("E-mail (facture + installation)")}{" "}<input type="email" placeholder={t("toi@exemple.com")} value={email} onChange={(e) => setEmail(e.target.value)} />
                        </label>
                        <p className="muted">{tx("{login} pour retrouver tes commandes.", {
                          login: <Link to="/connexion" onClick={() => setOpen(false)} className="accent">{t("Connecte-toi")}</Link>,
                        })}</p>
                      </>
                    )}

                    <label className="check">
                      <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                      <span>{tx("J'ai lu et j'accepte les {cgv} et la {privacy}.", {
                        cgv: <Link to="/cgv" target="_blank" className="accent">{t("conditions générales de vente")}</Link>,
                        privacy: <Link to="/confidentialite" target="_blank" className="accent">{t("politique de confidentialité")}</Link>,
                      })}</span>
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} />
                      <span>{tx("Je demande l'exécution immédiate de ma commande et je reconnais que, une fois l'eSIM fournie, je perds mon droit de rétractation ({more}).", {
                        more: <Link to="/retractation" target="_blank" className="accent">{t("en savoir plus")}</Link>,
                      })}</span>
                    </label>

                    {credit > 0 && <div className="totalrow"><span>{t("🎁 Crédit parrainage")}</span><strong>−{eur(credit)}</strong></div>}
                    {currency !== "EUR" && (
                      <p className="muted note">
                        {hasSub
                          ? t("Un abonnement se paie toujours en euros.")
                          : t("Tu seras débité en {cur} au taux du jour, frais de conversion inclus (1 € = {rate} {cur}).", { cur: currency, rate: FX_STATE.rate.toLocaleString(currentLocale(), { maximumFractionDigits: 4 }) })}
                      </p>
                    )}
                    <div className="totalrow"><span>{t("Total TTC")}</span><strong>{netText}</strong></div>
                    {error && <p className="error" role="alert">{error}</p>}
                    <button className="btn pay-cta" disabled={!emailOk || busy} onClick={pay}>{busy ? t("Redirection vers le paiement…") : t("Payer {amount}", { amount: netText })}</button>
                    <p className="muted secure">{t("🔒 Paiement sécurisé par Stripe. Tes données de carte ne transitent jamais par KozzGo.")}</p>
                  </>
                )}
              </>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
