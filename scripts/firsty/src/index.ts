// Provisionne une eSIM de test chez Firsty (sandbox) et affiche le code d'activation.
// Identifiants lus dans l'environnement : FIRSTY_CLIENT_ID, FIRSTY_CLIENT_SECRET (jamais dans le code).
import { randomUUID } from "node:crypto";

const BASE = (process.env.FIRSTY_BASE_URL ?? "https://connect.test.firsty.app/api/v3").replace(/\/$/, "");
const CLIENT_ID = process.env.FIRSTY_CLIENT_ID;
const CLIENT_SECRET = process.env.FIRSTY_CLIENT_SECRET;
const PLAN = process.env.FIRSTY_PLAN ?? "CG3M75T0HXDGLN"; // 3 Go Global, 30 jours

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("FIRSTY_CLIENT_ID et FIRSTY_CLIENT_SECRET sont requis.");
  process.exit(1);
}

class UserError extends Error {}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let token: { value: string; expires: number } | null = null;

async function getToken(force = false): Promise<string> {
  if (!force && token && Date.now() < token.expires) return token.value;
  const r = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID!, client_secret: CLIENT_SECRET! }),
  });
  if (!r.ok) throw new UserError(`Authentification refusée (${r.status}) : ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expires: Date.now() + (j.expires_in - 300) * 1000 }; // marge de 5 min
  return token.value;
}

// POST avec clé d'idempotence réutilisée à chaque nouvel essai.
async function post<T>(path: string, body: unknown, key = randomUUID()): Promise<T> {
  let reauthed = false;
  let attempts5xx = 0;
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": key,
        
      },
      body: JSON.stringify(body),
    });
    if (r.ok) { const j = (await r.json()) as { data?: T }; return (j.data ?? j) as T; }
    if (r.status === 409) return (await r.json().catch(() => ({}))) as T; // déjà traité : succès
    if (r.status === 401 && !reauthed) { reauthed = true; await getToken(true); continue; }
    if (r.status === 429 && attempt < 5) {
      const ra = Number(r.headers.get("Retry-After"));
      await sleep((ra > 0 ? ra * 1000 : 2 ** attempt * 500) + Math.random() * 250);
      continue;
    }
    if (r.status >= 500 && ++attempts5xx < 3) { await sleep(2 ** attempts5xx * 500 + Math.random() * 500); continue; }
    const txt = (await r.text()).slice(0, 300);
    if (r.status >= 400 && r.status < 500) throw new UserError(`Erreur ${r.status} sur ${path} : ${txt}`);
    throw new Error(`Erreur ${r.status} sur ${path} : ${txt}`);
  }
}

type Esim = { profileReference: string; esimReference: string; iccid: string; activationCode: string };
type Pkg = { packageReference: string; status: string; expiresAt: string };


const esim = await post<Esim>("/esims", {});
const pkg = await post<Pkg>(`/profiles/${esim.profileReference}/esims/${esim.esimReference}/packages`, { planReference: PLAN });

console.log("\n===== eSIM de test Firsty =====");
console.log("ICCID            :", esim.iccid);
console.log("Profil / eSIM    :", esim.profileReference, "/", esim.esimReference);
console.log("Forfait          :", PLAN, "→", pkg.status, "jusqu'au", pkg.expiresAt);
console.log("Code d'activation:\n" + esim.activationCode);
console.log("===============================\n");
