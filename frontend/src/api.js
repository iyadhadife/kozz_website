export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
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
    throw new ApiError(res.status, typeof d === "string" ? d : "Les informations saisies sont invalides.");
  }
  return data;
}
