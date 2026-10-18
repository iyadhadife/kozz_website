import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { eur } from "../data.js";
import { api } from "../api.js";
import { currentLang, t } from "../i18n.js";

// Bouton « Partager mon passeport » : WhatsApp (message + lien du passeport + lien d'inscription parrainé),
// image seule via le partage natif du téléphone, e-mail HTML envoyé par KozzGo à un proche, ou copie du lien.
// Les robots d'aperçu (WhatsApp…) voient l'image du passeport aux couleurs de KozzGo grâce à l'Open Graph côté serveur.
export default function SharePassport({ user, total }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu"); // menu | mail
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  if (!user?.referral_code) return null;

  const code = user.referral_code;
  const passport = `${location.origin}/passeport/${code}`;
  const signup = `${location.origin}/?ref=${code}`;
  const msg = `${t("J'ai déjà financé {amount} de dons avec KozzGo, l'eSIM de voyage solidaire. Voici mon passeport d'impact : {passport}", { amount: eur(total), passport })}
${t("Crée ton compte avec mon code de parrainage {code} : {link}", { code, link: signup })}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const canShareFiles = typeof navigator !== "undefined" && !!navigator.canShare && !!window.File;

  const close = () => { setOpen(false); setView("menu"); setError(""); setDone(""); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${passport}\n${signup}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers indisponible */ }
  };
  const shareImage = async () => {
    try {
      const blob = await (await fetch(`/api/og/passeport/${code}.png`)).blob();
      const file = new File([blob], "passeport-kozzgo.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: msg });
      close();
    } catch (e) { if (e?.name !== "AbortError") setError(t("Impossible de partager l'image sur cet appareil.")); }
  };
  const sendMail = async (e) => {
    e.preventDefault();
    if (busy || !/^\S+@\S+\.\S+$/.test(to)) return;
    setBusy(true); setError("");
    try {
      await api("/me/share/passport", { method: "POST", body: { email: to.trim(), note: note.trim() || undefined, lang: currentLang().code } });
      setDone(to.trim()); setTo(""); setNote("");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="share-pp">
      <button className="btn" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>↗ {t("Partager mon passeport")}</button>
      <AnimatePresence>
        {open && (
          <motion.div className="share-menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            {view === "menu" ? (
              <>
                <a href={wa} target="_blank" rel="noopener noreferrer" onClick={close}><span aria-hidden="true">💬</span> WhatsApp</a>
                {canShareFiles && <button type="button" onClick={shareImage}><span aria-hidden="true">🖼️</span> {t("Envoyer l'image")}</button>}
                <button type="button" onClick={() => setView("mail")}><span aria-hidden="true">✉️</span> {t("Par e-mail")}</button>
                <button type="button" onClick={copy}><span aria-hidden="true">🔗</span> {copied ? t("Lien copié ✓") : t("Copier le lien")}</button>
                {error && <p className="error share-note" role="alert">{error}</p>}
              </>
            ) : done ? (
              <div className="share-mail">
                <p role="status"><strong>{t("Invitation envoyée à {email} ✓", { email: done })}</strong></p>
                <button type="button" className="btn btn-ghost" onClick={() => { setDone(""); setView("menu"); }}>{t("Retour")}</button>
              </div>
            ) : (
              <form className="share-mail" onSubmit={sendMail} noValidate>
                <label>{t("E-mail de ton proche")}<input type="email" autoFocus required autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} placeholder={t("toi@exemple.com")} /></label>
                <label>{t("Un petit mot (facultatif)")}<textarea rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                {error && <p className="error" role="alert">{error}</p>}
                <button className="btn" disabled={busy || !/^\S+@\S+\.\S+$/.test(to)}>{busy ? "…" : t("Envoyer l'invitation")}</button>
                <small className="muted">{t("Nous n'enregistrons pas son adresse. Maximum 5 invitations par jour.")}</small>
                <button type="button" className="linklike" onClick={() => { setView("menu"); setError(""); }}>{t("Retour")}</button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
