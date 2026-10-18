import { Link } from "react-router-dom";

import { t } from "../i18n.js";
const COLS = [
  ["Nos eSIM", [["/destinations", "Toutes les destinations"], ["/destinations?zone=Maghreb", "Maghreb"], ["/destinations?zone=Europe", "Europe"], ["/destinations?zone=Asie", "Asie"], ["/kozz-monde", "Kozz Monde"]]],
  ["Aide", [["/aide", "Centre d'aide"], ["/comment-ca-marche", "Installer mon eSIM"], ["/aide", "Compatibilité"]]],
  ["KozzGo", [["/profil", "Mon compte"], ["/comment-ca-marche", "Comment ça marche"], ["/impact", "Impact & causes"], ["/", "Accueil"]]],
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <img src="/logo.jpg" alt={t("KozzGo")} />
          <p className="muted">{t("Ta data voyage. Ton impact reste.")}</p>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <h4>{t(title)}</h4>
            <ul>
              {links.map(([to, label]) => (
                <li key={label}><Link to={to}>{t(label)}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="muted legal">{t("© 2026 KozzGo · Paiement sécurisé · Prix TTC ·")}{" "}
        <Link to="/mentions-legales">{t("Mentions légales")}</Link> · <Link to="/cgv">{t("CGV")}</Link> · <Link to="/confidentialite">{t("Confidentialité")}</Link> ·{" "}
        <Link to="/retractation">{t("Rétractation")}</Link> · <Link to="/remboursement">{t("Remboursement")}</Link>
      </p>
    </footer>
  );
}
