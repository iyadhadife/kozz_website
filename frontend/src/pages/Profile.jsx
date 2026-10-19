import BuyButton from "../components/BuyButton.jsx";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";
import { CAUSES, eur, eurFixed, eurLine, fmtNum } from "../data.js";
import CurrencyPicker from "../components/CurrencyPicker.jsx";
import LanguagePicker from "../components/LanguagePicker.jsx";
import EsimInstall from "../components/EsimInstall.jsx";
import { useStore } from "../store.jsx";

import { LANGS, currentLang, currentLocale, t, tn } from "../i18n.js";
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
      <span className="pill">{t(s.label)}</span>
      <p className="big">{s.cashback} % <small className="muted">{t("de KozzBack")}</small></p>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
      <p className="muted">
        {s.next ? t("Encore {amount} d'achats pour passer {status}.", { amount: eurFixed(s.next.remaining), status: t(s.next.label) }) : t("Tu as atteint le plus haut statut. Merci !")}
      </p>
      <p className="muted">{t("Achats des 12 derniers mois : {amount}", { amount: eurFixed(s.spend) })}</p>
    </div>
  );
}

function Identity({ user, setUser }) {
  const [first, setFirst] = useState(user.first_name || "");
  const [last, setLast] = useState(user.last_name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [fb, setFb] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      setUser(await api("/me", { method: "PATCH", body: { first_name: first, last_name: last, phone } }));
      setFb({ ok: true, msg: t("Profil mis à jour.") });
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card form" onSubmit={save}>
      <label>{t("E-mail")}<input value={user.email} disabled /></label>
      <div className="two">
        <label>{t("Prénom")}<input value={first} maxLength={100} autoComplete="given-name" onChange={(e) => setFirst(e.target.value)} /></label>
        <label>{t("Nom")}<input value={last} maxLength={100} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} /></label>
      </div>
      <label>{t("Téléphone (format international)")}<input type="tel" value={phone} maxLength={30} autoComplete="tel" placeholder="+33612345678" onChange={(e) => setPhone(e.target.value)} /></label>
      <Feedback f={fb} />
      <button className="btn" disabled={busy}>{t("Enregistrer")}</button>
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
      setFb({ ok: true, msg: t("Mot de passe modifié. Tes autres appareils ont été déconnectés.") });
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card form" onSubmit={change}>
      <h3>{t("Mot de passe")}</h3>
      <label>{t("Mot de passe actuel")}<input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
      <label>{t("Nouveau mot de passe")}{" "}<input type="password" autoComplete="new-password" value={next} maxLength={128} onChange={(e) => setNext(e.target.value)} />
        <small className="muted">{t("10 caractères minimum.")}</small>
      </label>
      <Feedback f={fb} />
      <button className="btn" disabled={busy || !cur || next.length < 10}>{t("Changer le mot de passe")}</button>
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
      <h3>{t("Mes commandes")}</h3>
      {orders === null && <p className="muted">{t("Chargement…")}</p>}
      {orders?.length === 0 && <p className="muted">{t("Aucune commande pour l'instant.")}</p>}
      <ul className="orders">
        {orders?.map((o) => (
          <li key={o.id}>
            <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>
              <span>#{o.id} · {new Date(o.created_at + "Z").toLocaleDateString("fr-FR")}</span>
              <span>{o.cause.emoji} {fmtNum(o.impact_units)} {o.cause.unit}</span>
              <strong>{eurFixed(o.total)}</strong>
              <span className={`status-tag ${o.status}`}>{STATUS_LABEL[o.status] ? t(STATUS_LABEL[o.status]) : o.status}</span>
            </button>
            {open === o.id && (
              <motion.ul className="order-items" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                {o.items.map((i, k) => (
                  <li key={k}>{i.qty > 1 && `${i.qty} × `}{i.label}{i.phone && ` · ${i.phone}`} <span>{eurFixed(i.unit_price * i.qty)}</span></li>
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
      <h3>{t("Mes factures")}</h3>
      <ul className="orders">
        {list.map((f) => (
          <li key={f.number}>
            <a className="inv" href={`/api/me/invoices/${f.number}/pdf`}>
              <span>{f.number}</span>
              <span>{new Date(f.issued_at + "Z").toLocaleDateString("fr-FR")}</span>
              <strong>{eurFixed(f.total)}</strong>
              <span className="accent">{t("Télécharger (PDF)")}</span>
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
      <h3>{t("Supprimer mon compte")}</h3>
      <p className="muted">{t("Ton compte et tes données personnelles sont effacés. Les commandes passées sont conservées de façon anonyme.")}</p>
      {!open ? (
        <button className="btn btn-ghost" onClick={() => setOpen(true)}>{t("Supprimer mon compte")}</button>
      ) : (
        <form className="form" onSubmit={del}>
          <label>{t("Confirme avec ton mot de passe")}<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <Feedback f={fb} />
          <button className="btn btn-danger" disabled={!pw}>{t("Supprimer définitivement")}</button>
        </form>
      )}
    </div>
  );
}

const BRANDS = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", cartes_bancaires: "Cartes Bancaires", discover: "Discover", diners: "Diners Club", jcb: "JCB", unionpay: "UnionPay" };

// Cartes enregistrées : lues chez Stripe à chaque affichage (marque, 4 derniers chiffres, expiration). Rien n'est stocké chez KozzGo.
function Cards() {
  const [cards, setCards] = useState(null);
  const [fb, setFb] = useState(() => (new URLSearchParams(location.search).get("carte") === "ajoutee" ? { ok: true, msg: t("Carte ajoutée.") } : null));
  const [busy, setBusy] = useState(false);

  const load = () => api("/me/cards").then((r) => setCards(r.available ? r.cards : false)).catch(() => setCards(false));
  useEffect(() => { load(); }, []);

  async function remove(id) {
    setFb(null);
    try {
      await api(`/me/cards/${id}`, { method: "DELETE" });
      setFb({ ok: true, msg: t("Carte retirée.") });
      load();
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    }
  }
  async function add() {
    setBusy(true);
    setFb(null);
    try {
      const r = await api(`/me/cards/setup?lang=${currentLang().code}`, { method: "POST" });
      window.location.assign(r.url); // page Stripe : le numéro est saisi chez Stripe
    } catch (err) {
      setFb({ ok: false, msg: err.message });
      setBusy(false);
    }
  }

  return (
    <div className="card form">
      <p className="muted">{t("Tes cartes sont enregistrées et protégées par Stripe, jamais par KozzGo. Tu peux en ajouter ou en retirer ici. À ton prochain paiement, Stripe te les proposera.")}</p>
      <span className="lbl">{t("Tes cartes enregistrées")}</span>
      {cards === null ? <p className="muted">{t("Chargement…")}</p> : cards === false ? <p className="muted">{t("Les cartes ne sont pas disponibles pour le moment.")}</p> : cards.length === 0 ? <p className="muted">{t("Aucune carte enregistrée.")}</p> : (
        <ul className="orders">
          {cards.map((c) => (
            <li key={c.id} className="rowline">
              <span><strong>{BRANDS[c.brand] || c.brand}</strong> •••• {c.last4} <small className="muted">{t("expire {date}", { date: `${String(c.exp_month).padStart(2, "0")}/${c.exp_year}` })}</small></span>
              <button type="button" className="linklike" onClick={() => remove(c.id)} aria-label={`${t("Retirer")} ${c.last4}`}>{t("Retirer")}</button>
            </li>
          ))}
        </ul>
      )}
      <Feedback f={fb} />
      {cards !== false && <BuyButton disabled={busy} onClick={add}>{busy ? "…" : t("Ajouter une carte")}</BuyButton>}
      <p className="muted note">{t("Les reçus de paiement sont envoyés par Stripe, et ta facture KozzGo est dans « Mes commandes ».")}</p>
    </div>
  );
}

function Relatives({ user, setUser }) {
  const [list, setList] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fb, setFb] = useState(null);

  const load = () => api("/me/relatives").then((r) => { setList(r); setUser((u) => ({ ...u, relatives_count: r.length })); }).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setFb(null);
    try {
      await api("/me/relatives", { method: "POST", body: { name, phone: phone || null } });
      setName("");
      setPhone("");
      load();
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    }
  }
  const del = async (id) => { await api(`/me/relatives/${id}`, { method: "DELETE" }).catch(() => {}); load(); };

  return (
    <div className="card form">
      <p className="muted">{t("Garde le prénom et le numéro de tes proches pour les retrouver facilement. Ils ne sont jamais contactés par KozzGo et sont supprimés avec ton compte. Ne les ajoute qu'avec leur accord.")}</p>
      {list === null ? <p className="muted">{t("Chargement…")}</p> : list.length === 0 ? <p className="muted">{t("Aucun proche pour l'instant.")}</p> : (
        <ul className="orders">
          {list.map((r) => (
            <li key={r.id} className="rowline">
              <span><strong>{r.name}</strong> <small className="muted">{r.phone || ""}</small></span>
              <button type="button" className="linklike" onClick={() => del(r.id)} aria-label={`Retirer ${r.name}`}>{t("Retirer")}</button>
            </li>
          ))}
        </ul>
      )}
      <form className="two" onSubmit={add}>
        <label>{t("Prénom")}<input value={name} maxLength={100} required onChange={(e) => setName(e.target.value)} /></label>
        <label>{t("Téléphone (facultatif)")}<input type="tel" value={phone} maxLength={30} placeholder="+212612345678" onChange={(e) => setPhone(e.target.value)} /></label>
        <button className="btn" disabled={!name.trim()}>{t("Ajouter")}</button>
      </form>
      <Feedback f={fb} />
    </div>
  );
}

// A2F par SMS : visible seulement si le serveur l'a activée (PHONE_VERIFICATION_ENABLED). Le code est envoyé puis saisi ici.
function PhoneVerify({ user, setUser }) {
  const pv = user.phone_verification;
  const [phone, setPhone] = useState(user.phone || "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState(null);
  if (!pv?.enabled) return null;
  if (pv.verified) return <p className="ok">{t("Numéro vérifié ✓")}</p>;
  if (!pv.pending_gift) return null;
  async function send(e) {
    e.preventDefault();
    setBusy(true); setFb(null);
    try {
      await api("/me/phone/send-code", { method: "POST", body: { phone: phone.replace(/[ .\-()]/g, ""), lang: currentLang().code } });
      setSent(true);
      setFb({ ok: true, msg: t("Code envoyé par SMS. Il est valable 10 minutes.") });
    } catch (err) { setFb({ ok: false, msg: err.message }); }
    setBusy(false);
  }
  async function check(e) {
    e.preventDefault();
    setBusy(true); setFb(null);
    try {
      await api("/me/phone/verify", { method: "POST", body: { code } });
      setUser(await api("/me"));
      setFb({ ok: true, msg: t("Numéro vérifié : ton cadeau de parrainage est débloqué.") });
    } catch (err) { setFb({ ok: false, msg: err.message }); }
    setBusy(false);
  }
  return (
    <form className="form" onSubmit={sent ? check : send}>
      <p className="draft">{t("Vérifie ton numéro pour débloquer ton cadeau de parrainage.")}</p>
      <label>{t("Téléphone (format international)")}<input type="tel" autoComplete="tel" value={phone} maxLength={30} placeholder="+33612345678" disabled={sent} onChange={(e) => setPhone(e.target.value)} /></label>
      {sent && <label>{t("Code reçu par SMS")}<input className="code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>}
      <button className="btn" disabled={busy || (sent ? code.length !== 6 : phone.length < 8)}>{sent ? t("Vérifier le code") : t("Recevoir un code par SMS")}</button>
      {sent && <button type="button" className="linklike" onClick={() => { setSent(false); setCode(""); setFb(null); }}>{t("Changer de numéro")}</button>}
      <Feedback f={fb} />
    </form>
  );
}

function Referral({ user, setUser }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?ref=${user.referral_code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="card">
      <span className="lbl">{t("Crédit de parrainage")}</span>
      <p className="big">{eur(user.credit || 0)}</p>
      <PhoneVerify user={user} setUser={setUser} />
      <p className="muted">{t("Déduit automatiquement de ta prochaine commande.")}</p>
      {user.referral_pending && <p className="draft">{t("Ton cadeau de parrainage est en attente : il sera débloqué quand ton parrain et toi aurez chacun payé une commande.")}</p>}
      <span className="lbl" style={{ marginTop: "1rem" }}>{t("Ton lien de parrainage")}</span>
      <button className="code" onClick={copy} aria-label={t("Copier le lien de parrainage")}>
        {user.referral_code} <small>{copied ? t("lien copié ✓") : t("copier le lien")}</small>
      </button>
      <p className="muted">
        {t("Quand ton filleul a payé sa première commande, vous recevez chacun 1,50 € de crédit. Il faut que vous ayez tous les deux déjà effectué un achat.")}
        {user.referral_count ? " " + tn(user.referral_count, "{n} filleul pour l'instant.", "{n} filleuls pour l'instant.") : ""}
      </p>
    </div>
  );
}

function CausePicker({ user, setUser }) {
  const [fb, setFb] = useState(null);
  async function pick(id) {
    setFb(null);
    try {
      setUser(await api("/me", { method: "PATCH", body: { cause_id: id } }));
      setFb({ ok: true, msg: t("Cause enregistrée : elle sera présélectionnée à ta prochaine commande.") });
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    }
  }
  return (
    <div className="card">
      <p className="muted">{t("À chaque achat, 10 % du prix HT finance la cause que tu choisis. Celle-ci sera présélectionnée (tu pourras la changer à chaque commande).")}</p>
      <div className="cause-strip">
        {CAUSES.map((c) => (
          <button key={c.id} type="button" className={`cause ${c.id === user.cause_id ? "on" : ""}`} onClick={() => pick(c.id)} title={c.cat}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>
      <Feedback f={fb} />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className="check toggle">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <small className="muted"> — {hint}</small>}</span>
    </label>
  );
}

function Notifications({ user, setUser }) {
  const [fb, setFb] = useState(null);
  async function set(patch) {
    setFb(null);
    try {
      setUser(await api("/me", { method: "PATCH", body: patch }));
    } catch (err) {
      setFb({ ok: false, msg: err.message });
    }
  }
  return (
    <div className="card form">
      <Toggle label={t("E-mails de commande, facture et installation")} hint={t("toujours envoyés, ils font partie de ta commande")} checked disabled onChange={() => {}} />
      {user.sms_notifications
        ? <Toggle label={t("SMS de confirmation de commande")} checked={user.notif_sms} onChange={(v) => set({ notif_sms: v })} />
        : <p className="muted">{t("Les SMS de confirmation sont désactivés pour le moment : tout est envoyé par e-mail.")}</p>}
      <Toggle label={t("Offres et actualités KozzGo par e-mail")} hint={t("désactivé tant que tu n'as pas accepté")} checked={user.marketing_optin} onChange={(v) => set({ marketing_optin: v })} />
      <Toggle label={t("Notifications push et alertes de consommation")} hint={t("bientôt disponible")} checked={false} disabled onChange={() => {}} />
      <Feedback f={fb} />
    </div>
  );
}

const Info = ({ children }) => <div className="card"><p className="muted">{children}</p></div>;

export default function Profile() {
  const { user, setUser, logout, currency, fx, lang } = useStore();
  const nav = useNavigate();
  const [openKey, setOpenKey] = useState(() => (new URLSearchParams(location.search).get("carte") ? "carte" : null));

  if (user === undefined) return <div className="page"><p className="muted" style={{ padding: "6rem 1.5rem" }}>{t("Chargement…")}</p></div>; if (!user) return <Navigate to="/connexion?next=/profil" replace />;

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const GROUPS = [
    {
      title: null,
      rows: [
        { key: "infos", icon: "✏️", title: t("Mes informations"), sub: [name, user.email, user.phone].filter(Boolean).join(" · "),
          panel: <><Identity user={user} setUser={setUser} /><Security /></> },
        { key: "carte", icon: "💳", title: t("Carte de paiement"), sub: t("Gérée par Stripe, aucune carte conservée chez nous"), panel: <Cards /> },
        { key: "proches", icon: "👥", title: t("Mes proches"), sub: user.relatives_count ? tn(user.relatives_count, "{n} personne", "{n} personnes") : t("Aucun pour l'instant"), panel: <Relatives user={user} setUser={setUser} /> },
        { key: "parrainage", icon: "🎁", title: t("Parrainage"), sub: t("{count} · {amount} de crédit", { count: tn(user.referral_count || 0, "{n} filleul", "{n} filleuls"), amount: eur(user.credit || 0) }), panel: <Referral user={user} setUser={setUser} /> },
        { key: "cause", icon: "💛", title: t("Ma cause"), sub: user.cause_name ? t(user.cause_name) : t("Choisis ta cause préférée"), panel: <CausePicker user={user} setUser={setUser} /> },
        { key: "commandes", icon: "📦", title: t("Mes commandes"), sub: user.orders_count ? tn(user.orders_count, "{n} commande", "{n} commandes") : t("Aucune commande"), panel: <><Orders /><Invoices /></> },
      ],
    },
    {
      title: t("Réglages"),
      rows: [
        { key: "notifs", icon: "🔔", title: t("Notifications"), sub: [t("E-mail de commande"), user.sms_notifications && user.notif_sms && "SMS", user.marketing_optin && t("offres")].filter(Boolean).join(" · "), panel: <Notifications user={user} setUser={setUser} /> },
        { key: "langue", icon: "🌐", title: t("Langue"), sub: LANGS.find((l) => l.code === lang)?.name, panel: <div className="card form"><label>{t("Langue du site")}<LanguagePicker /></label></div> },
        { key: "devise", icon: "💱", title: t("Devise"), sub: currency, panel: (
          <div className="card form">
            <label>{t("Devise d'affichage et de paiement")}<CurrencyPicker /></label>
            <p className="muted">
              {t("Les prix sont fixés en euros TTC et convertis chaque jour au taux de la Banque centrale européenne (et d'Exchange Rate API pour quelques devises). Le montant exact est affiché avant le paiement. Les factures restent établies en euros. Les abonnements se paient toujours en euros.")}
              {fx?.updated_at ? " " + t("Taux du {date}.", { date: new Date(fx.updated_at + "Z").toLocaleDateString(currentLocale()) }) : ""}
              {fx?.margin_pct ? " " + t("Quand tu paies dans une autre devise que l'euro, les frais de conversion de Stripe (environ {pct} %) sont inclus dans le taux.", { pct: fx.margin_pct }) : ""}
            </p>
          </div>
        ) },
      ],
    },
    {
      title: t("Assistance"),
      rows: [
        ...(user.is_admin ? [{ key: "admin", icon: "🛠️", title: "Administration", sub: "Activer ou désactiver les achats", to: "/admin" }] : []),
        { key: "aide", icon: "🛟", title: t("Centre d'aide"), sub: t("Guide, compatibilité, contact"), to: "/faq" },
        { key: "cgv", icon: "📄", title: t("Conditions d'utilisation"), sub: t("Informations légales"), to: "/cgv" },
        { key: "conf", icon: "🔒", title: t("Politique de confidentialité"), sub: t("Vos données"), to: "/confidentialite" },
        { key: "remb", icon: "💶", title: t("Politique de remboursement"), sub: t("Retours et remboursements"), to: "/remboursement" },
      ],
    },
  ];

  return (
    <div className="page profile">
      <motion.div className="profile-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="avatar">{(user.first_name || user.email)[0].toUpperCase()}</span>
        <div>
          <h1>{user.first_name ? t("Salut, {name} 👋", { name: user.first_name }) : t("Salut 👋")}</h1>
          <p className="muted">{t("Membre depuis {date}", { date: new Date(user.created_at + "Z").toLocaleDateString(currentLocale(), { month: "long", year: "numeric" }) })}</p>
        </div>
        <button className="btn btn-ghost" onClick={async () => { await logout(); nav("/"); }}>{t("Se déconnecter")}</button>
      </motion.div>

      <StatusCard user={user} />

      {GROUPS.map((g) => (
        <section key={g.title || "main"} className="menu-group">
          {g.title && <h2 className="menu-title">{g.title}</h2>}
          <ul className="menu">
            {g.rows.map((r) => {
              const open = openKey === r.key;
              const inner = (
                <>
                  <span className="menu-icon" aria-hidden="true">{r.icon}</span>
                  <span className="menu-text"><strong>{r.title}</strong><small className="muted">{r.sub}</small></span>
                  <span className="menu-chev" aria-hidden="true">{r.to ? "›" : open ? "⌄" : "›"}</span>
                </>); return ( <li key={r.key}>
                  {r.to ? (
                    <Link className="menu-row" to={r.to}>{inner}</Link>
                  ) : (
                    <button type="button" className="menu-row" aria-expanded={open} onClick={() => setOpenKey(open ? null : r.key)}>{inner}</button>
                  )}
                  {open && r.panel && <div className="menu-panel">{r.panel}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Danger onDeleted={() => { setUser(null); nav("/"); }} />
    </div>
  );
}
