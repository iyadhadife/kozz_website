import { useStore } from "../store.jsx";
import { t } from "../i18n.js";

// Bouton d'achat : quand les achats sont fermés (PURCHASES_ENABLED=false), il devient un bouton grisé « Bientôt disponible ».
export default function BuyButton({ className = "btn", onClick, children, ...rest }) {
  const { purchases } = useStore();
  if (!purchases) return <button type="button" {...rest} className={`${className} btn-soon`} disabled aria-disabled="true">{t("Bientôt disponible")}</button>;
  return <button type="button" className={className} onClick={onClick} {...rest}>{children}</button>;
}

// Bandeau d'information affiché au-dessus des forfaits quand les achats sont fermés
export function SoonNotice() {
  const { purchases } = useStore();
  if (purchases) return null;
  return <p className="soon-note" role="status">🚀 {t("La vente d'eSIM ouvre très bientôt. Reviens nous voir !")}</p>;
}
