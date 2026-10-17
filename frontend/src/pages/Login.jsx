import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store.jsx";

const MIN = 10;

export default function Login() {
  const { user, login, register } = useStore();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/profil";

  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setError(""), [mode]);

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
      if (isRegister) await register(email, password, firstName);
      else await login(email, password);
      nav(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page auth">
      <motion.div className="card auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <img src="/logo.jpg" alt="KozzGo" className="auth-logo" />
        <div className="seg">
          {[["login", "Connexion"], ["register", "Créer un compte"]].map(([k, l]) => (
            <button key={k} type="button" className={mode === k ? "on" : ""} onClick={() => setMode(k)}>
              {mode === k && <motion.span layoutId="authseg" className="seg-bg" />}
              <span>{l}</span>
            </button>
          ))}
        </div>

        <form className="form" onSubmit={submit} noValidate>
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                Prénom (facultatif)
                <input autoComplete="given-name" value={firstName} maxLength={100} onChange={(e) => setFirstName(e.target.value)} />
              </motion.label>
            )}
          </AnimatePresence>

          <label>
            E-mail
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
          </label>

          <label>
            Mot de passe
            <span className="pwd">
              <input
                type={show ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                value={password}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {show ? "🙈" : "👁️"}
              </button>
            </span>
            {isRegister && (
              <small className={tooShort ? "error" : "muted"}>
                {MIN} caractères minimum. Une phrase de passe longue est idéale.
              </small>
            )}
          </label>

          {isRegister && (
            <label>
              Confirmer le mot de passe
              <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              {mismatch && <small className="error">Les mots de passe ne correspondent pas.</small>}
            </label>
          )}

          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={!valid || busy}>
            {busy ? "…" : isRegister ? "Créer mon compte" : "Me connecter"}
          </button>
        </form>

        <p className="muted note">
          Ton mot de passe est protégé par un hachage Argon2 : nous ne le stockons jamais en clair et ne pouvons pas le lire.
        </p>
      </motion.div>
    </div>
  );
}
