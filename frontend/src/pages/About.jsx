import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Section from "../components/Section.jsx";
import { api } from "../api.js";
import { AUTHOR, authorLabel } from "../author.js";
import { PAGES, breadcrumbJsonLd, graph, useSeo } from "../seo.js";

// /a-propos : qui est derrière KozzGo (signal de confiance E-E-A-T). L'identité de la société vient de /api/legal (variables SELLER_*) : seuls les champs renseignés s'affichent.
export default function About() {
  const [seller, setSeller] = useState({});
  useEffect(() => { api("/legal").then((i) => setSeller(i.seller || {})).catch(() => {}); }, []);
  useSeo({
    ...PAGES["/a-propos"],
    path: "/a-propos",
    jsonLd: graph(
      breadcrumbJsonLd([["Accueil", "/"], ["À propos", "/a-propos"]]),
      { "@type": "AboutPage", name: "À propos de KozzGo", url: location.origin + "/a-propos", inLanguage: "fr", about: { "@id": location.origin + "/#org" } },
    ),
  });
  const company = [seller.name && `${seller.name}${seller.legal_form ? ", " + seller.legal_form : ""}`, seller.address, seller.siren && `SIREN ${seller.siren}`].filter(Boolean);
  return (
    <div className="page">
      <Section id="a-propos" h1 title="À propos de KozzGo" subtitle="Des eSIM de voyage simples, et un don à une cause à chaque achat.">
        <div className="blog-post" style={{ padding: 0 }}>
          <h2>Notre mission</h2>
          <p>KozzGo vend des eSIM de voyage dans plus de 180 destinations : tu choisis ta destination et ton forfait de data, tu reçois un QR code par e-mail, et ta connexion démarre à l'arrivée. À chaque achat, 10 % du prix hors taxes est reversé à une cause que tu choisis parmi 12 : tu vois ton effet dans ton <Link to="/impact">Passeport d'impact</Link>.</p>
          <h2>Comment nous écrivons nos guides</h2>
          <p>Nos articles du <Link to="/blog">blog</Link> et notre <Link to="/faq">FAQ</Link> suivent quelques règles simples :</p>
          <ul>
            <li>Nous citons la source officielle de chaque affirmation vérifiable (Apple, ARCEP, régulateurs, administrations) en bas de l'article.</li>
            <li>Nous n'inventons ni chiffre de couverture, ni prix : les prix affichés sont ceux de nos fiches destination, TTC.</li>
            <li>Quand une information change (modèles compatibles, règles de roaming), nous mettons à jour l'article et sa date.</li>
            <li>Une erreur ? Écris-nous : nous la corrigeons et le disons.</li>
          </ul>
          <h2>L'auteur des guides</h2>
          <div className="about-author">
            <span className="about-avatar" aria-hidden="true">{authorLabel()[0]}</span>
            <div>
              <strong>{authorLabel()}</strong>{AUTHOR.role && <span className="muted"> · {AUTHOR.role}</span>}
              <p>{AUTHOR.bio || "Les guides sont rédigés par l'équipe KozzGo, à partir des documentations officielles des constructeurs et des régulateurs."}</p>
              {AUTHOR.url && <p><a href={AUTHOR.url} target="_blank" rel="noopener">Profil professionnel ↗</a></p>}
            </div>
          </div>
          <h2>La société</h2>
          {company.length ? <p>{company.map((l, i) => <span key={i}>{l}<br /></span>)}</p> : <p className="muted">Les informations sur la société figurent dans les <Link to="/mentions-legales">mentions légales</Link>.</p>}
          <p>Voir aussi : <Link to="/mentions-legales">mentions légales</Link>, <Link to="/cgv">conditions générales de vente</Link>, <Link to="/confidentialite">confidentialité</Link>, <Link to="/remboursement">remboursement</Link>.</p>
          {seller.email && <p>Contact : <a href={`mailto:${seller.email}`}>{seller.email}</a></p>}
        </div>
      </Section>
    </div>
  );
}
