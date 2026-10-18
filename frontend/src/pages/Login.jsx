import Logo from "../components/Logo.jsx";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store.jsx";

import { t, tx } from "../i18n.js";
const MIN = 10;

export default function Login() {
  const { user, login, register, verifyRegister, resendRegister } = useStore();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/profil";

  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login"); // login | register
  let ref = "";
  try { ref = localStorage.getItem("kozz_ref") || ""; } catch {}
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [pending, setPending] = useState(null); // e-mail en attente de vérification
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0); // secondes avant de pouvoir redemander un code
  const [sentInfo, setSentInfo] = useState("");

  useEffect(() => setError(""), [mode]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (user) return <Navigate to={next} replace />;

  const isRegister = mode === "register";
  const tooShort = isRegister && password.length > 0 && password.length < MIN;
  const mismatch = isRegister && confirm.length > 0 && confirm !== password;
  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= (isRegister ? MIN : 1) && (!isRegister || confirm === password);

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        const r = await register(email, password, firstName);
        if (r?.id) {
          nav(next, { replace: true });
          return;
        }
        setPending(email.trim().toLowerCase());
        setWait(r?.resend_in ?? 60);
        setCode("");
        return;
      }
      await login(email, password);
      nav(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyRegister(pending, code);
      nav(next, { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.status === 410) setPending(null); // code expiré ou trop d'essais : on recommence
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (wait > 0 || busy) return;
    setError("");
    setSentInfo("");
    try {
      const r = await resendRegister(pending);
      setWait(r?.resend_in ?? 60);
      setSentInfo(t("Nouveau code envoyé."));
    } catch (err) {
      setError(err.message);
    }
  }

  if (pending) {
    return (
      <div className="page auth">
        <motion.div className="card auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <Logo className="auth-logo" />
          <h2>{t("Vérifie ton e-mail")}</h2>
          <p className="muted">{t("Nous avons envoyé un code à 6 chiffres à {email}. Il est valable 15 minutes. Pense à regarder tes indésirables.", { email: pending })}</p>
          <form className="form" onSubmit={verify} noValidate>
            <label>{t("Code de vérification")}{" "}<input
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                aria-label={t("Code à 6 chiffres")}
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            {sentInfo && !error && <p className="muted" role="status">{sentInfo}</p>}
            <button className="btn" disabled={code.length !== 6 || busy}>{busy ? "…" : t("Valider et créer mon compte")}</button>
          </form>
          <p className="muted note">
            {t("Pas reçu ?")}{" "}
            <button type="button" className="linklike" onClick={resend} disabled={wait > 0}>
              {wait > 0 ? t("Renvoyer le code dans {n} s", { n: wait }) : t("Renvoyer le code")}
            </button>
            {" · "}
            <button type="button" className="linklike" onClick={() => { setPending(null); setError(""); }}>{t("Changer d'e-mail")}</button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page auth">
      <motion.div className="card auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        {ref && isRegister && <p className="ref-banner" role="note">{tx("🎁 Code de parrainage {code} : après ta première commande, toi et ton parrain recevez chacun 1,50 € de crédit.", { code: <strong>{ref}</strong> })}</p>}
        <Logo className="auth-logo" />
        <div className="seg">
          {[["login", "Connexion"], ["register", "Créer un compte"]].map(([k, l]) => (
            <button key={k} type="button" className={mode === k ? "on" : ""} onClick={() => setMode(k)}>
              {mode === k && <motion.span layoutId="authseg" className="seg-bg" />}
              <span>{t(l)}</span>
            </button>
          ))}
        </div>

        <form className="form" onSubmit={submit} noValidate>
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>{t("Prénom (facultatif)")}{" "}<input autoComplete="given-name" value={firstName} maxLength={100} onChange={(e) => setFirstName(e.target.value)} />
              </motion.label>
            )}
          </AnimatePresence>

          <label>{t("E-mail")}{" "}<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("toi@exemple.com")} />
          </label>

          <label>{t("Mot de passe")} <span className="pwd">
              <input
                type={show ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                value={password}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}>
                {show ? "🙈" : "👁️"}
              </button>
            </span>
            {isRegister && (
              <small className={tooShort ? "error" : "muted"}>
                {t("{n} caractères minimum. Une phrase de passe longue est idéale.", { n: MIN })}
              </small>
            )}
          </label>

          {isRegister && (
            <label>{t("Confirmer le mot de passe")} <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              {mismatch && <small className="error">{t("Les mots de passe ne correspondent pas.")}</small>}
            </label>
          )}

          {!isRegister && <Link to="/mot-de-passe-oublie" state={{ email }} className="forgot-link">{t("Mot de passe oublié ?")}</Link>}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={!valid || busy}>
            {busy ? "…" : isRegister ? t("Recevoir mon code") : t("Me connecter")}
          </button>
        </form>

        <p className="muted note">{t("Ton mot de passe est protégé par un hachage Argon2 : nous ne le stockons jamais en clair et ne pouvons pas le lire.")}{" "}</p>
      </motion.div>
    </div>
  );
}
