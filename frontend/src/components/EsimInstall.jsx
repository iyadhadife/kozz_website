import { useState } from "react";
import { motion } from "framer-motion";

const safeLink = (url) => (typeof url === "string" && /^https:\/\//i.test(url) ? url : null);

function One({ e }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(e.activation_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (e.status === "failed") {
    return (
      <div className="esim card">
        <strong>{e.label}</strong>
        <p className="error">Ton paiement est bien reçu, mais nous n'avons pas pu préparer cette eSIM. Nous la résolvons et tu la recevras dès que possible. Écris-nous avec le chat si besoin.</p>
      </div>
    );
  }
  if (!e.qr_png && !e.activation_code) {
    return (
      <div className="esim card">
        <strong>{e.label}</strong>
        <p className="muted">Ton eSIM est créée, mais son QR code doit encore t'être transmis. Écris-nous avec le chat : nous te l'envoyons tout de suite.</p>
      </div>
    );
  }
  const link = safeLink(e.ios_tap_link);
  return (
    <motion.div className="esim card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <strong>{e.label}</strong>
      {e.qr_png && <img className="qr" src={`data:image/png;base64,${e.qr_png}`} alt="QR code d'installation de l'eSIM" width="200" height="200" />}
      <ol className="muted install-steps">
        <li>Connecte-toi au Wi-Fi.</li>
        <li>Ouvre les réglages du téléphone, puis « Données mobiles » ou « Réseau », puis « Ajouter une eSIM ».</li>
        <li>Scanne ce QR code. Active la ligne à ton arrivée.</li>
      </ol>
      <div className="row">
        {link && <a className="btn" href={link} target="_blank" rel="noopener noreferrer">Installer sur iPhone</a>}
        {e.activation_code && <button className="btn btn-ghost" onClick={copy}>{copied ? "Code copié ✓" : "Copier le code d'activation"}</button>}
      </div>
      <p className="muted note">Ne partage pas ce QR code : il ne fonctionne qu'une fois.</p>
    </motion.div>
  );
}

export default function EsimInstall({ esims }) {
  if (!esims?.length) return null;
  return (
    <div className="esims">
      {esims.map((e, i) => <One key={i} e={e} />)}
    </div>
  );
}
