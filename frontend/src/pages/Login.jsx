import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store.jsx";

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
      setSentInfo("Nouveau code envoyé.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (pending) {
    return (
      <div className="page auth">
        <motion.div className="card auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <img src="/logo.jpg" alt="KozzGo" className="auth-logo" />
          <h2>Vérifie ton e-mail</h2>
          <p className="muted">Nous avons envoyé un code à 6 chiffres à <strong>{pending}</strong>. Il est valable 15 minutes. Pense à regarder tes indésirables.</p>
          <form className="form" onSubmit={verify} noValidate>
            <label>
              Code de vérification
              <input
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                aria-label="Code à 6 chiffres"
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            {sentInfo && !error && <p className="muted" role="status">{sentInfo}</p>}
            <button className="btn" disabled={code.length !== 6 || busy}>{busy ? "…" : "Valider et créer mon compte"}</button>
          </form>
          <p className="muted note">
            Pas reçu ?{" "}
            <button type="button" className="linklike" onClick={resend} disabled={wait > 0}>
              {wait > 0 ? `Renvoyer le code dans ${wait} s` : "Renvoyer le code"}
            </button>
            {" · "}
            <button type="button" className="linklike" onClick={() => { setPending(null); setError(""); }}>Changer d'e-mail</button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page auth">
      <motion.div className="card auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        {ref && isRegister && <p className="ref-banner" role="note">🎁 Code de parrainage <strong>{ref}</strong> : 1,50 € offerts sur ta prochaine commande après ton inscription.</p>}
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
            {busy ? "…" : isRegister ? "Recevoir mon code" : "Me connecter"}
          </button>
        </form>

        <p className="muted note">
          Ton mot de passe est protégé par un hachage Argon2 : nous ne le stockons jamais en clair et ne pouvons pas le lire.
        </p>
      </motion.div>
    </div>
  );
}
