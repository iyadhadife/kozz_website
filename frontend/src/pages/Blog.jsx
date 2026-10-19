import { Link } from "react-router-dom";
import Section from "../components/Section.jsx";
import { isPublished, latestDate, visibleArticles } from "../blogContent.js";
import { FAQ_GROUPS } from "../faqContent.js";
import { useLocation } from "react-router-dom";
import { PAGES, breadcrumbJsonLd, graph, useSeo } from "../seo.js";

export const readMinutes = (a) => {
  const words = [a.intro, ...a.sections.flatMap((s) => [s.h, ...(s.p || []), ...(s.list || []), ...(s.steps || []), ...(s.after || [])])].join(" ").replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, "$1").split(/\s+/).length;
  return Math.max(2, Math.round(words / 200));
};

// /blog : un H1, une carte par article (titre en h2). Texte en français (source unique : blogContent.js).
export default function Blog() {
  // ?apercu=1 : relire aussi les articles programmés (non indexés tant que leur date n'est pas atteinte)
  const preview = new URLSearchParams(useLocation().search).has("apercu");
  const ARTICLES = visibleArticles(preview);
  const BLOG_DATE = latestDate();
  useSeo({
    ...PAGES["/blog"],
    path: "/blog",
    noindex: preview,
    jsonLd: graph(
      breadcrumbJsonLd([["Accueil", "/"], ["Blog", "/blog"]]),
      { "@type": "CollectionPage", name: "Blog eSIM de voyage KozzGo", url: location.origin + "/blog", inLanguage: "fr", dateModified: BLOG_DATE },
      { "@type": "ItemList", itemListElement: ARTICLES.map((a, i) => ({ "@type": "ListItem", position: i + 1, name: a.title, url: `${location.origin}/blog/${a.slug}` })) },
    ),
  });
  const groupTitle = Object.fromEntries(FAQ_GROUPS.map((g) => [g.id, g.title]));
  return (
    <div className="page">
      <Section id="blog" h1 title="Blog : tout savoir sur l'eSIM de voyage" subtitle="Des guides simples pour choisir, installer et utiliser ton eSIM, avec les mêmes règles que notre FAQ.">
        <div className="blog-grid">
          {ARTICLES.map((a) => (
            <Link key={a.slug} to={`/blog/${a.slug}${preview ? "?apercu=1" : ""}`} className="blog-card">
              <span className="blog-emoji" aria-hidden="true">{a.emoji}</span>
              <span className="blog-tag">{groupTitle[a.group]}{!isPublished(a) && <em className="blog-sched"> · programmé le {a.date.split("-").reverse().join("/")}</em>}</span>
              <h2>{a.title}</h2>
              <p>{a.description}</p>
              <span className="blog-meta">{readMinutes(a)} min de lecture <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <p className="muted blog-faq-link">Une question précise ? Consulte la <Link to="/faq">FAQ eSIM</Link> : {FAQ_GROUPS.reduce((n, g) => n + g.items.length, 0)} réponses courtes.</p>
      </Section>
    </div>
  );
}
