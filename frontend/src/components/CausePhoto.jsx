import { useState } from "react";

// Photo d'une cause : fichier /causes/<id>.jpg (dossier frontend/public/causes). Sans photo, un dégradé + l'emoji prennent le relais.
const HUES = { restos: 18, inclusion: 200, arbres: 140, ocean: 195, tsf: 12, ecole: 45, soins: 340, recherche: 265, nutrition: 30, livres: 285, eau: 205, energie: 50 };

export default function CausePhoto({ cause, className = "", alt = "" }) {
  const [ok, setOk] = useState(true);
  const h = HUES[cause.id] ?? 20;
  return (
    <span className={`cphoto ${className}`} style={{ "--h": h }}>
      {ok && <img src={`/causes/${cause.id}.jpg`} alt={alt} loading="lazy" decoding="async" onError={() => setOk(false)} />}
      {!ok && <span className="cphoto-emoji" aria-hidden="true">{cause.emoji}</span>}
    </span>
  );
}
