import { useEffect, useState } from "react";
import { api } from "./api.js";

// Chiffres d'impact globaux : une seule requête partagée par tous les composants de la page.
let pending;
export function useGlobalImpact() {
  const [g, setG] = useState(null);
  useEffect(() => {
    let live = true;
    pending = api("/impact/global");
    pending.then((d) => live && setG(d)).catch(() => live && setG(null));
    return () => { live = false; };
  }, []);
  return g;
}
