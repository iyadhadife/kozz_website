import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { eur, fmtNum } from "../data.js";
import EsimInstall from "../components/EsimInstall.jsx";
import { useStore } from "../store.jsx";

const STATUS_LABEL = { created: "En attente de paiement", paid: "Payée", provisioned: "Livrée", refunded: "Remboursée" };

function Feedback({ f }) {
  if (!f) return null;
  return <p className={f.ok ? "ok" : "error"} role="status">{f.msg}</p>;
}

function StatusCard({ user }) {
  const s = user.status;
  const pct = s.next ? Math.min(100, (s.spend / s.next.threshold) * 100) : 100;
  return (
    <div className="card status">
      <span className="pill">{s.label}</span>
      <p className="big">{s.cashback} % <small className="muted">de KozzBack</small></p>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
      <p className="muted">
        {s.next ? `Encore ${eur(s.next.remaining)} d'achats pour passer ${s.next.label}.` : "Tu as atteint le plus haut statut. Merci !"}
      </p>
      <p className="muted">Achats des 12 derniers mois : {eur(s.spend)}</p>
    </div>
  );
}

function Identity({ user, setUser }) {
  const [first, setFirst] = useState(user.first_name || "");
  const [last, setLast] = useState(user.last_name || "");
  const [fb, setFb] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      setUser(await api("/me", { method: "PATCH", body: { first_name: first, last_name: last } }));
      setFb({ ok: true, msg: "Profil mis à jour." });
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card form" onSubmit={save}>
      <h3>Mes informations</h3>
      <label>E-mail<input value={user.email} disabled /></label>
      <div className="two">
        <label>Prénom<input value={first} maxLength={100} autoComplete="given-name" onChange={(e) => setFirst(e.target.value)} /></label>
        <label>Nom<input value={last} maxLength={100} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} /></label>
      </div>
      <Feedback f={fb} />
      <button className="btn" disabled={busy}>Enregistrer</button>
    </form>
  );
}

function Security() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [fb, setFb] = useState(null);
  const [busy, setBusy] = useState(false);

  async function change(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/me/password", { method: "POST", body: { current_password: cur, new_password: next } });
      setCur(""); setNext("");
      setFb({ ok: true, msg: "Mot de passe modifié. Tes autres appareils ont été déconnectés." });
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card form" onSubmit={change}>
      <h3>Mot de passe</h3>
      <label>Mot de passe actuel<input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
      <label>
        Nouveau mot de passe
        <input type="password" autoComplete="new-password" value={next} maxLength={128} onChange={(e) => setNext(e.target.value)} />
        <small className="muted">10 caractères minimum.</small>
      </label>
      <Feedback f={fb} />
      <button className="btn" disabled={busy || !cur || next.length < 10}>Changer le mot de passe</button>
    </form>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    api("/me/orders").then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div className="card">
      <h3>Mes commandes</h3>
      {orders === null && <p className="muted">Chargement…</p>}
      {orders?.length === 0 && <p className="muted">Aucune commande pour l'instant.</p>}
      <ul className="orders">
        {orders?.map((o) => (
          <li key={o.id}>
            <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>
              <span>#{o.id} · {new Date(o.created_at + "Z").toLocaleDateString("fr-FR")}</span>
              <span>{o.cause.emoji} {fmtNum(o.impact_units)} {o.cause.unit}</span>
              <strong>{eur(o.total)}</strong>
              <span className={`status-tag ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
            </button>
            {open === o.id && (
              <motion.ul className="order-items" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                {o.items.map((i, k) => (
                  <li key={k}>{i.qty > 1 && `${i.qty} × `}{i.label}{i.phone && ` · ${i.phone}`} <span>{eur(i.unit_price * i.qty)}</span></li>
                ))}
              </motion.ul>
            )}
            {open === o.id && o.esims?.length > 0 && <EsimInstall esims={o.esims} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Invoices() {
  const [list, setList] = useState(null);
  useEffect(() => {
    api("/me/invoices").then(setList).catch(() => setList([]));
  }, []);
  if (!list?.length) return null;
  return (
    <div className="card">
      <h3>Mes factures</h3>
      <ul className="orders">
        {list.map((f) => (
          <li key={f.number}>
            <a className="inv" href={`/api/me/invoices/${f.number}/pdf`}>
              <span>{f.number}</span>
              <span>{new Date(f.issued_at + "Z").toLocaleDateString("fr-FR")}</span>
              <strong>{eur(f.total)}</strong>
              <span className="accent">Télécharger (PDF)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Danger({ onDeleted }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [fb, setFb] = useState(null);

  async function del(e) {
    e.preventDefault();
    try {
      await api("/me", { method: "DELETE", body: { password: pw } });
      onDeleted();
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    }
  }
  return (
    <div className="card danger">
      <h3>Supprimer mon compte</h3>
      <p className="muted">Ton compte et tes données personnelles sont effacés. Les commandes passées sont conservées de façon anonyme.</p>
      {!open ? (
        <button className="btn btn-ghost" onClick={() => setOpen(true)}>Supprimer mon compte</button>
      ) : (
        <form className="form" onSubmit={del}>
          <label>Confirme avec ton mot de passe<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <Feedback f={fb} />
          <button className="btn btn-danger" disabled={!pw}>Supprimer définitivement</button>
        </form>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useStore();
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);

  if (user === undefined) return <div className="page"><p className="muted" style={{ padding: "6rem 1.5rem" }}>Chargement…</p></div>;
  if (!user) return <Navigate to="/connexion?next=/profil" replace />;

  const link = `${location.origin}/?ref=${user.referral_code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="page profile">
      <motion.div className="profile-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="avatar">{(user.first_name || user.email)[0].toUpperCase()}</span>
        <div>
          <h1>Salut{user.first_name ? `, ${user.first_name}` : ""} 👋</h1>
          <p className="muted">Membre depuis {new Date(user.created_at + "Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
        </div>
        <button className="btn btn-ghost" onClick={async () => { await logout(); nav("/"); }}>Se déconnecter</button>
      </motion.div>

      <div className="profile-grid">
        <StatusCard user={user} />
        <div className="card">
          <span className="lbl">KozzMoney</span>
          <p className="big">{eur(user.kozz_money)}</p>
          <p className="muted">Utilisable sur ton prochain achat, ou convertible en don.</p>
          <span className="lbl" style={{ marginTop: "1rem" }}>Crédit de parrainage</span>
          <p className="big">{eur(user.credit || 0)}</p>
          <p className="muted">Déduit automatiquement de ta prochaine commande{user.referred ? " (ton cadeau de bienvenue en fait partie)" : ""}.</p>
          <span className="lbl" style={{ marginTop: "1rem" }}>Ton lien de parrainage</span>
          <button className="code" onClick={copy} aria-label="Copier le lien de parrainage">
            {user.referral_code} <small>{copied ? "lien copié ✓" : "copier le lien"}</small>
          </button>
          <p className="muted">
            Ton filleul reçoit 1,50 € de remise dès son inscription. Tu reçois 1,50 € quand il paie sa première commande.
            {user.referral_count ? ` ${user.referral_count} filleul${user.referral_count > 1 ? "s" : ""} pour l'instant.` : ""}
          </p>
        </div>
        <Identity user={user} setUser={setUser} />
        <Security />
      </div>

      <Orders />
      <Invoices />
      <Danger onDeleted={() => { setUser(null); nav("/"); }} />
    </div>
  );
}
