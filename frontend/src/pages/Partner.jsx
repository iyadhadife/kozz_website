import { useState } from "react";
import { Link } from "react-router-dom";
import Section from "../components/Section.jsx";
import { PAGES, breadcrumbJsonLd, graph, useSeo } from "../seo.js";

// Page « actif à liens » (linkable asset) : elle donne aux blogs, médias et associations tout ce qu'il faut pour faire un lien propre vers KozzGo.
// Les ancres proposées sont modifiables ci-dessous ; elles varient exprès (liens naturels, pas 100 % d'ancres identiques).
const ANCHORS = [
  ["eSIM de voyage solidaire", "/"],
  ["acheter une eSIM pour voyager", "/destinations"],
  ["eSIM Maroc", "/destinations/ma"],
  ["eSIM Espagne", "/destinations/es"],
  ["eSIM Japon", "/destinations/jp"],
  ["vérifier si ton téléphone est compatible eSIM", "/telephones-compatibles"],
  ["FAQ eSIM", "/faq"],
  ["voyager en finançant une cause", "/impact"],
];

function Snippet({ label, code }) {
  const [ok, setOk] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* pas de presse-papiers */ } };
  return (
    <div className="snippet">
      <div className="snippet-head"><strong>{label}</strong><button type="button" className="chip" onClick={copy}><span>{ok ? "Copié ✓" : "Copier le code"}</span></button></div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export default function Partner() {
  const o = location.origin;
  useSeo({ ...PAGES["/devenir-partenaire"], path: "/devenir-partenaire", jsonLd: graph(breadcrumbJsonLd([["Accueil", "/"], ["Devenir partenaire", "/devenir-partenaire"]])) });
  const badge = `<a href="${o}/" title="KozzGo : eSIM de voyage solidaire" rel="noopener"><img src="${o}/badge/kozzgo-badge.svg" alt="KozzGo, eSIM de voyage solidaire" width="240" height="64" loading="lazy"></a>`;
  return (
    <div className="page">
      <Section h1 title="Deviens partenaire de KozzGo" subtitle="Blog de voyage, média, association ou communauté d'expatriés : recommande une eSIM qui finance des causes, avec des liens et des visuels prêts à l'emploi.">
        <div className="partner">
        <h2>Pourquoi nous recommander ?</h2>
        <ul className="why-list">
          <li><strong>Utile à ton audience</strong> : une eSIM activée en 1 minute dans plus de 180 destinations, sans frais de roaming.</li>
          <li><strong>Un impact mesurable</strong> : 10 % du prix HT de chaque achat est reversé à une cause choisie par le voyageur ; le <Link to="/impact">Passeport d'impact</Link> le montre en chiffres concrets.</li>
          <li><strong>Transparent</strong> : prix TTC affichés, politique de <Link to="/remboursement">remboursement</Link> claire, <Link to="/faq">FAQ complète</Link>.</li>
        </ul>

        <h2>Le badge KozzGo</h2>
        <p className="muted">Place-le en pied de page, dans ta page « partenaires » ou dans un article. Il s'affiche en SVG net sur tous les écrans.</p>
        <div className="badge-preview"><img src="/badge/kozzgo-badge.svg" alt="Badge KozzGo, eSIM de voyage solidaire" width="240" height="64" /></div>
        <Snippet label="Code HTML du badge" code={badge} />

        <h2>Liens texte à copier</h2>
        <p className="muted">Choisis l'ancre qui correspond au contenu de ta page : elle aide les moteurs de recherche et tes lecteurs à comprendre où mène le lien.</p>
        <div className="snippets">
          {ANCHORS.map(([text, path]) => <Snippet key={path} label={text} code={`<a href="${o}${path}">${text}</a>`} />)}
        </div>

        <h2>Pour les associations et ONG</h2>
        <p>Tu portes une des <Link to="/impact">12 causes</Link> que financent les achats ? Écris-nous : nous pouvons présenter ton action sur la page Impact et publier un témoignage, en échange d'un lien vers KozzGo depuis ta page « partenaires » ou « ils nous soutiennent ».</p>

        <h2>Kit presse</h2>
        <p><strong>En une phrase.</strong> KozzGo est une eSIM de voyage qui reverse 10 % du prix hors taxes de chaque achat à une cause choisie par le voyageur, avec un Passeport d'impact qui montre les dons en repas offerts, arbres plantés ou jours de connexion.</p>
        <ul className="why-list">
          <li><a href="/logo.svg" download>Logo KozzGo (SVG)</a> · <a href="/badge/kozzgo-badge.svg" download>Badge (SVG)</a></li>
          <li>Couleurs : corail <code>#EF7B63</code>, orange <code>#F4A259</code>, crème <code>#FAF7F3</code>, encre <code>#1D1B20</code>. Police : Poppins.</li>
          <li>Contact presse et partenariats : voir les <Link to="/mentions-legales">mentions légales</Link>.</li>
        </ul>
        </div>
      </Section>
    </div>
  );
}
