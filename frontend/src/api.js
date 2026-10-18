import { t } from "./i18n.js";
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Les messages du serveur sont en français : on les traduit s'ils sont dans le dictionnaire (ceux qui contiennent un nombre via un modèle)
const DYN = [
  [/^Réessaie dans (\d+) secondes\.$/, "Réessaie dans {n} secondes."],
  [/^Un code vient d'être envoyé\. Réessaie dans (\d+) secondes\.$/, "Un code vient d'être envoyé. Réessaie dans {n} secondes."],
  [/^Code incorrect\. Il te reste (\d+) essai\(s\)\.$/, "Code incorrect. Il te reste {n} essai(s)."],
  [/^Le mot de passe doit contenir entre (\d+) et (\d+) caractères\.$/, "Le mot de passe doit contenir entre {a} et {b} caractères."],
];
function serverMessage(msg) {
  for (const [re, key] of DYN) {
    const m = re.exec(msg);
    if (m) return t(key, { n: m[1], a: m[1], b: m[2] });
  }
  return t(msg);
}

// Appel JSON vers /api. Le cookie de session (HttpOnly) est envoyé automatiquement : le JS n'y a jamais accès.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const d = data?.detail;
    // FastAPI renvoie soit un texte, soit une liste d'erreurs de validation
    throw new ApiError(res.status, typeof d === "string" ? serverMessage(d) : t("Les informations saisies sont invalides."));
  }
  return data;
}
