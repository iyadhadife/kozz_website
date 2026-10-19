import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

// /admin : réservé aux adresses de ADMIN_EMAILS (.env). Le serveur refuse tout appel d'un autre compte, même si quelqu'un contourne cette page.
export default function Admin() {
  const { user, setPurchases } = useStore();
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user?.is_admin) api("/admin/settings").then(setSt).catch((e) => setErr(e.message));
  }, [user?.is_admin]);

  if (user === undefined) return <div className="page"><p className="muted" style={{ padding: "6rem 1.5rem" }}>Chargement…</p></div>;
  if (!user) return <Navigate to="/connexion" replace />;
  if (!user.is_admin) return <div className="page"><h1 style={{ padding: "6rem 1.5rem" }}>Accès réservé</h1></div>;

  const apply = async (promise) => {
    setBusy(true); setErr("");
    try { const s = await promise; setSt(s); setPurchases(s.purchases_enabled); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const set = (v) => apply(api("/admin/settings", { method: "PUT", body: { purchases_enabled: v } }));
  const reset = () => apply(api("/admin/settings", { method: "DELETE" }));
  const on = st?.purchases_enabled;

  return (
    <div className="page">
      <div className="blog-post">
        <h1>Administration</h1>
        <p className="muted">Connecté en tant que {user.email}.</p>
        <div className="card admin-card">
          <h2>Achats</h2>
          {!st ? <p className="muted">{err || "Chargement…"}</p> : (
            <>
              <p className={`admin-state ${on ? "on" : "off"}`} role="status">
                <span aria-hidden="true">{on ? "🟢" : "🔴"}</span> {on ? "Achats ouverts : les boutons d'achat et le panier sont actifs." : "Achats fermés : les boutons affichent « Bientôt disponible » et les commandes sont refusées."}
              </p>
              <div className="admin-actions">
                {on
                  ? <button className="btn" disabled={busy} onClick={() => set(false)}>Fermer les achats (Bientôt disponible)</button>
                  : <button className="btn" disabled={busy} onClick={() => set(true)}>Ouvrir les achats</button>}
              </div>
              <p className="muted admin-note">
                {st.overridden
                  ? <>Choix fait ici{st.updated_by ? ` par ${st.updated_by}` : ""}{st.updated_at ? ` le ${new Date(st.updated_at + "Z").toLocaleString("fr-FR")}` : ""}. Le réglage du fichier .env ({st.env_default ? "ouvert" : "fermé"}) est ignoré tant que tu ne le rétablis pas. </>
                  : <>Aucun choix fait ici : c'est le réglage du fichier .env ({st.env_default ? "ouvert" : "fermé"}) qui s'applique. </>}
                {st.overridden && <button type="button" className="linklike" disabled={busy} onClick={reset}>Revenir au réglage du .env</button>}
              </p>
              <p className="muted admin-note">Le changement est immédiat pour tous les visiteurs (les pages déjà ouvertes se mettent à jour au prochain chargement). Pense à vérifier que Stripe et le fournisseur d'eSIM sont prêts avant d'ouvrir.</p>
            </>
          )}
          {err && st && <p className="error" role="alert">{err}</p>}
        </div>
      </div>
    </div>
  );
}
