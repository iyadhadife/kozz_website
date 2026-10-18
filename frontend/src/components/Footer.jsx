import { Link } from "react-router-dom";

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
          <img src="/logo.jpg" alt="KozzGo" />
          <p className="muted">Ta data voyage. Ton impact reste.</p>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <h4>{title}</h4>
            <ul>
              {links.map(([to, label]) => (
                <li key={label}><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="muted legal">
        © 2026 KozzGo · Paiement sécurisé · Prix TTC ·{" "}
        <Link to="/mentions-legales">Mentions légales</Link> · <Link to="/cgv">CGV</Link> · <Link to="/confidentialite">Confidentialité</Link> ·{" "}
        <Link to="/retractation">Rétractation</Link>
      </p>
    </footer>
  );
}
