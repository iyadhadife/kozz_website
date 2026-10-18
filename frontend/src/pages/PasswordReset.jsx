import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo.jsx";
import { api } from "../api.js";
import { currentLang, t } from "../i18n.js";

const MIN = 10;
const Card = ({ children }) => (
  <div className="page auth">
    <motion.div className="card auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
      <Logo className="auth-logo" />
      {children}
    </motion.div>
  </div>
);

// Étape 1 : on demande le lien. La réponse est toujours la même, que le compte existe ou non.
export function ForgotPassword() {
  const loc = useLocation();
  const [email, setEmail] = useState(loc.state?.email || "");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = /^\S+@\S+\.\S+$/.test(email);

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/auth/password/forgot", { method: "POST", body: { email, lang: currentLang().code } });
      setSent(email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2>{t("Mot de passe oublié")}</h2>
      {sent ? (
        <>
          <p className="muted" role="status">{t("Si un compte existe avec {email}, un e-mail vient d'être envoyé. Le lien est valable 30 minutes. Pense à regarder tes indésirables.", { email: sent })}</p>
          <Link to="/connexion" className="btn btn-ghost">{t("Retour à la connexion")}</Link>
        </>
      ) : (
        <>
          <p className="muted">{t("Indique l'e-mail de ton compte : nous t'envoyons un lien pour choisir un nouveau mot de passe.")}</p>
          <form className="form" onSubmit={submit} noValidate>
            <label>{t("E-mail")}{" "}<input type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("toi@exemple.com")} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn" disabled={!valid || busy}>{busy ? "…" : t("Envoyer le lien")}</button>
          </form>
          <p className="muted note"><Link to="/connexion">{t("Retour à la connexion")}</Link></p>
        </>
      )}
    </Card>
  );
}

// Étape 2 : le lien reçu par e-mail ouvre cette page. Le jeton est retiré de la barre d'adresse dès la lecture.
export function ResetPassword() {
  const [params] = useSearchParams();
  const [token] = useState(() => params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dead, setDead] = useState(!token);
  const [done, setDone] = useState(false);

  // retire le jeton de la barre d'adresse sans passer par le routeur (qui remonterait la page et perdrait le jeton)
  useEffect(() => { if (token) history.replaceState(history.state, "", "/mot-de-passe/reinitialiser"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tooShort = password.length > 0 && password.length < MIN;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= MIN && confirm === password;

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/auth/password/reset", { method: "POST", body: { token, password, lang: currentLang().code } });
      setDone(true);
    } catch (err) {
      if (err.status === 410) setDead(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <h2>{t("Nouveau mot de passe")}</h2>
        <p className="muted" role="status">{t("Ton mot de passe a été modifié et tes autres appareils ont été déconnectés. Tu peux maintenant te connecter.")}</p>
        <Link to="/connexion" className="btn">{t("Me connecter")}</Link>
      </Card>
    );
  }
  if (dead) {
    return (
      <Card>
        <h2>{t("Mot de passe oublié")}</h2>
        <p className="error" role="alert">{t("Ce lien est invalide ou a expiré. Demande un nouveau lien.")}</p>
        <Link to="/mot-de-passe-oublie" className="btn">{t("Demander un nouveau lien")}</Link>
      </Card>
    );
  }
  return (
    <Card>
      <h2>{t("Nouveau mot de passe")}</h2>
      <form className="form" onSubmit={submit} noValidate>
        <label>{t("Nouveau mot de passe")} <span className="pwd">
            <input type={show ? "text" : "password"} autoComplete="new-password" autoFocus required value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}>{show ? "🙈" : "👁️"}</button>
          </span>
          <small className={tooShort ? "error" : "muted"}>{t("{n} caractères minimum. Une phrase de passe longue est idéale.", { n: MIN })}</small>
        </label>
        <label>{t("Confirmer le mot de passe")} <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {mismatch && <small className="error">{t("Les mots de passe ne correspondent pas.")}</small>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={!valid || busy}>{busy ? "…" : t("Modifier mon mot de passe")}</button>
      </form>
    </Card>
  );
}
