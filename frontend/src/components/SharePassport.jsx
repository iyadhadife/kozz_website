import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { eur } from "../data.js";
import { t } from "../i18n.js";

// Bouton « Partager mon passeport » : WhatsApp, e-mail ou lien. Le lien ouvre le passeport interactif (/passeport/CODE).
export default function SharePassport({ user, total }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!user?.referral_code) return null;
  const link = `${location.origin}/passeport/${user.referral_code}`;
  const msg = t("J'ai déjà financé {amount} de dons avec KozzGo, l'eSIM de voyage solidaire. Découvre mon passeport d'impact et rejoins-moi avec mon code de parrainage {code} :", { amount: eur(total), code: user.referral_code });
  const wa = `https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}`;
  const mail = `mailto:?subject=${encodeURIComponent(t("Mon passeport d'impact KozzGo"))}&body=${encodeURIComponent(`${msg}\n\n${link}`)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers indisponible */ }
  };

  return (
    <div className="share-pp">
      <button className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>↗ {t("Partager mon passeport")}</button>
      <AnimatePresence>
        {open && (
          <motion.div className="share-menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><span aria-hidden="true">💬</span> WhatsApp</a>
            <a href={mail} onClick={() => setOpen(false)}><span aria-hidden="true">✉️</span> {t("Par e-mail")}</a>
            <button type="button" onClick={copy}><span aria-hidden="true">🔗</span> {copied ? t("Lien copié ✓") : t("Copier le lien")}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
