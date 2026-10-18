import { useSyncExternalStore } from "react";

// État partagé : l'intro d'ouverture est-elle encore à l'écran ? (le titre de l'accueil attend sa fin pour se décaler)
let active = false;
const subs = new Set();
export const setIntroActive = (v) => { if (active !== v) { active = v; subs.forEach((f) => f()); } };
export const useIntroActive = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => active);
