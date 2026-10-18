import Logo from "./Logo.jsx";
import { Link } from "react-router-dom";

import { t } from "../i18n.js";
const COLS = [
  ["Nos eSIM", [["/destinations", "Toutes les destinations"], ["/destinations?zone=Maghreb", "Maghreb"], ["/destinations?zone=Europe", "Europe"], ["/destinations?zone=Asie", "Asie"], ["/kozz-monde", "Kozz Monde"]]],
  ["Aide", [["/faq", "FAQ eSIM"], ["/comment-ca-marche", "Installer mon eSIM"], ["/telephones-compatibles", "Téléphones compatibles eSIM"], ["/remboursement", "Remboursement"]]],
  ["Destinations populaires", [["/destinations/ma", "eSIM Maroc"], ["/destinations/es", "eSIM Espagne"], ["/destinations/it", "eSIM Italie"], ["/destinations/tr", "eSIM Turquie"], ["/destinations/th", "eSIM Thaïlande"], ["/destinations/jp", "eSIM Japon"], ["/destinations/us", "eSIM États-Unis"]]],
  ["KozzGo", [["/profil", "Mon compte"], ["/comment-ca-marche", "Comment ça marche"], ["/impact", "Impact & causes"], ["/devenir-partenaire", "Devenir partenaire"], ["/", "Accueil"]]],
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Logo />
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
