import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api.js";
import { CAUSES, donation, eur, fmtNum, impactUnits } from "../data.js";
import { useStore } from "../store.jsx";

export default function Cart() {
  const { cart, remove, open, setOpen, user } = useStore();
  const [causeId, setCauseId] = useState("tsf");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const don = cart.reduce((s, i) => s + donation(i.price * i.qty, i.kind), 0);
  const cause = CAUSES.find((c) => c.id === causeId);
  const units = impactUnits(don, cause);
  const emailOk = !!user || /^\S+@\S+\.\S+$/.test(email);

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      // Le serveur recalcule les prix depuis la base, enregistre la commande puis ouvre une session Stripe Checkout
      const o = await api("/orders", {
        method: "POST",
        body: { email: user ? undefined : email, cause_id: causeId, items: cart.map(({ uid, label, price, ...ref }) => ref) },
      });
      window.location.assign(o.checkout_url); // page de paiement hébergée par Stripe
    } catch (e) {
      setError(e.message || "Impossible de lancer le paiement.");
      setBusy(false);
    }
  };
  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            className="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <button className="close" onClick={close} aria-label="Fermer">✕</button>

              <>
                <h3>Ton panier</h3>
                {cart.length === 0 ? (
                  <p className="muted">Ton panier est vide.</p>
                ) : (
                  <>
                    <ul className="lines">
                      <AnimatePresence initial={false}>
                        {cart.map((i) => (
                          <motion.li key={i.uid} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                            <span>{i.qty > 1 && `${i.qty} × `}{i.label}</span>
                            <strong>{eur(i.price * i.qty)}</strong>
                            <button onClick={() => remove(i.uid)} aria-label="Retirer">✕</button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>

                    <span className="lbl">Choisis ta kozz</span>
                    <div className="causes">
                      {CAUSES.map((c) => (
                        <button key={c.id} className={`cause ${c.id === causeId ? "on" : ""}`} onClick={() => setCauseId(c.id)} title={c.cat}>
                          <span>{c.emoji}</span>
                          <small>{c.name}</small>
                        </button>
                      ))}
                    </div>
                    <motion.p key={causeId + units} className="impact-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      {cause.emoji} Cet achat financera ≈ <strong>{fmtNum(units)} {cause.unit}</strong>
                    </motion.p>

                    {user ? (
                      <p className="muted">Commande rattachée à ton compte ({user.email}).</p>
                    ) : (
                      <>
                        <label>
                          E-mail (facture + installation)
                          <input type="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </label>
                        <p className="muted"><Link to="/connexion" onClick={() => setOpen(false)} className="accent">Connecte-toi</Link> pour retrouver tes commandes.</p>
                      </>
                    )}

                    <div className="totalrow"><span>Total TTC</span><strong>{eur(total)}</strong></div>
                    {error && <p className="error" role="alert">{error}</p>}
                    <button className="btn" disabled={!emailOk || busy} onClick={pay}>{busy ? "Redirection vers le paiement…" : `Payer ${eur(total)}`}</button>
                    <p className="muted secure">🔒 Paiement sécurisé par Stripe. Tes données de carte ne transitent jamais par KozzGo.</p>
                  </>
                )}
              </>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
