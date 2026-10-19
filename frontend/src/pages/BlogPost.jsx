import { Link, useLocation, useParams } from "react-router-dom";
import { ARTICLE_BY_SLUG, isPublished, resolveLink } from "../blogContent.js";
import { FAQ_GROUPS, faqId, parseLinks } from "../faqContent.js";
import { AUTHOR, authorLabel } from "../author.js";
import { SITE, breadcrumbJsonLd, graph, useSeo } from "../seo.js";
import { readMinutes } from "./Blog.jsx";

const dateFr = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Texte avec liens : [[texte|/chemin]] (page du site) ou [[texte|faq:Question exacte]] (question de la FAQ, ouverte directement)
const Rich = ({ text }) => <>{parseLinks(text).map((p, i) => (!p.to ? <span key={i}>{p.t}</span>
  : /^https?:\/\//.test(p.to) ? <a key={i} href={p.to} target="_blank" rel="noopener">{p.t}</a>   // source externe officielle
  : <Link key={i} to={resolveLink(p.to)}>{p.t}</Link>))}</>;

// /blog/:slug : un H1, un H2 par question, des liens internes vers la FAQ, les destinations et les articles liés.
function Post({ a, preview }) {
  const group = FAQ_GROUPS.find((g) => g.id === a.group);
  const related = a.related.map((s) => ARTICLE_BY_SLUG[s]).filter((r) => r && (preview || isPublished(r)));
  const faqs = (group?.items || []).slice(0, 8);
  const draft = !isPublished(a);
  useSeo({
    title: `${a.title} | KozzGo`.length <= 62 ? `${a.title} | KozzGo` : a.title,
    description: a.description,
    path: `/blog/${a.slug}`,
    noindex: draft,
    jsonLd: graph(
      breadcrumbJsonLd([["Accueil", "/"], ["Blog", "/blog"], [a.title, `/blog/${a.slug}`]]),
      {
        "@type": "Article", headline: a.title, description: a.description, inLanguage: "fr",
        datePublished: a.date, dateModified: a.updated || a.date,
        mainEntityOfPage: `${location.origin}/blog/${a.slug}`,
        image: location.origin + SITE.image,
        author: AUTHOR.name ? { "@type": "Person", name: AUTHOR.name, jobTitle: AUTHOR.role || undefined, url: AUTHOR.url || undefined } : { "@type": "Organization", name: SITE.name, url: location.origin },
        citation: (a.sources || []).map((s) => s.u),
        publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: location.origin + "/logo-512.png" } },
      },
    ),
  });
  return (
    <div className="page">
      <article className="blog-post">
        <nav className="crumbs" aria-label="Fil d'Ariane"><Link to="/">Accueil</Link> › <Link to="/blog">Blog</Link> › <span>{group?.title}</span></nav>
        {draft && <p className="blog-draft">Aperçu : cet article sera publié le {dateFr(a.date)}. Il n'est ni listé ni indexé avant.</p>}
        <h1>{a.title}</h1>
        <p className="blog-meta">Publié le <time dateTime={a.date}>{dateFr(a.date)}</time> · {a.updated && a.updated !== a.date && <>mis à jour le <time dateTime={a.updated}>{dateFr(a.updated)}</time> · </>}{readMinutes(a)} min de lecture · Par <Link to="/a-propos">{authorLabel()}</Link></p>
        <p className="blog-intro">{a.intro}</p>
        {a.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {(s.p || []).map((t, i) => <p key={i}><Rich text={t} /></p>)}
            {s.list && <ul>{s.list.map((x) => <li key={x}><Rich text={x} /></li>)}</ul>}
            {s.steps && <ol>{s.steps.map((x) => <li key={x}><Rich text={x} /></li>)}</ol>}
            {(s.after || []).map((t, i) => <p key={"a" + i}><Rich text={t} /></p>)}
          </section>
        ))}
        {(a.sources || []).length > 0 && (
          <section className="blog-sources">
            <h2>Sources</h2>
            <ul>{a.sources.map((s) => <li key={s.u}><a href={s.u} target="_blank" rel="noopener">{s.t}</a></li>)}</ul>
          </section>
        )}
        {faqs.length > 0 && (
          <section className="blog-faqs">
            <h2>Les questions fréquentes sur ce sujet</h2>
            <ul>{faqs.map((f) => <li key={f.q}><Link to={`/faq#${faqId(f.q)}`}>{f.q}</Link></li>)}</ul>
            <p><Link to={`/faq#${a.group}`}>Voir toute la FAQ « {group.title} » →</Link></p>
          </section>
        )}
        <aside className="blog-cta">
          <h2>Prêt à partir connecté ?</h2>
          <p>Choisis ta destination, reçois ton QR code par e-mail et finance une cause à chaque achat.</p>
          <Link to="/destinations" className="btn btn-primary">Voir les destinations</Link>
          <Link to={`/faq#${a.group}`} className="btn btn-ghost">FAQ : {group?.title}</Link>
        </aside>
        {related.length > 0 && (
          <section className="blog-related">
            <h2>À lire aussi</h2>
            <div className="blog-grid">
              {related.map((r) => (
                <Link key={r.slug} to={`/blog/${r.slug}${preview ? "?apercu=1" : ""}`} className="blog-card">
                  <span className="blog-emoji" aria-hidden="true">{r.emoji}</span>
                  <h3>{r.title}</h3>
                  <span className="blog-meta">{readMinutes(r)} min de lecture <span aria-hidden="true">→</span></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

function NotFound() {
  useSeo({ title: "Article introuvable | KozzGo", description: "", noindex: true, path: location.pathname });
  return <div className="page"><h1 style={{ padding: "6rem 1.5rem" }}>Article introuvable</h1></div>;
}

export default function BlogPost() {
  const { slug } = useParams();
  const preview = new URLSearchParams(useLocation().search).has("apercu");
  const a = ARTICLE_BY_SLUG[slug];
  if (!a || (!isPublished(a) && !preview)) return <NotFound />;
  return <Post a={a} preview={preview} key={a.slug} />;
}
