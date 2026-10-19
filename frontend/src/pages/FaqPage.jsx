import { useMemo, useState } from "react";
import Section from "../components/Section.jsx";
import FaqList from "../components/FaqList.jsx";
import { FAQ_FLAT, FAQ_GROUPS, plain } from "../faqContent.js";
import { PAGES, breadcrumbJsonLd, useSeo } from "../seo.js";
import { t } from "../i18n.js";

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// /faq : un seul H1, un H2 par thème, un H3 par question. Le texte est en français (une seule source : faqContent.js).
export default function FaqPage() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  useSeo({
    ...PAGES["/faq"],
    path: "/faq",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "FAQPage", mainEntity: FAQ_FLAT.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plain(f.a) } })) },
        breadcrumbJsonLd([["Accueil", "/"], ["FAQ", "/faq"]]),
      ],
    },
  });

  const groups = useMemo(() => {
    const k = norm(q.trim());
    return FAQ_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => (!group || g.id === group) && (!k || norm(i.q + " " + plain(i.a)).includes(k))) })).filter((g) => g.items.length);
  }, [q, group]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="page">
      <Section id="faq" h1 title="Questions fréquentes sur les eSIM de voyage" subtitle={`${FAQ_FLAT.length} réponses pour installer, activer et utiliser ton eSIM KozzGo sans stress.`}>
        <div className="search dest-search">
          <span className="search-ico" aria-hidden="true">🔍</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Une question ? ex. installer, remboursement, hotspot…" aria-label="Rechercher dans la FAQ" autoComplete="off" />
          {q && <button type="button" className="search-clear" onClick={() => setQ("")} aria-label={t("Effacer la recherche")}>✕</button>}
        </div>
        <nav className="chips" aria-label="Thèmes de la FAQ">
          <button className={`chip ${!group ? "on" : ""}`} aria-pressed={!!(!group)} onClick={() => setGroup("")}><span>Tout</span></button>
          {FAQ_GROUPS.map((g) => <button key={g.id} className={`chip ${group === g.id ? "on" : ""}`} aria-pressed={!!(group === g.id)} onClick={() => setGroup(g.id)}><span>{g.title}</span></button>)}
        </nav>
        {total === 0 && <p className="muted">Aucune question ne correspond. Écris-nous : un humain te répond.</p>}
        {groups.map((g) => (
          <section key={g.id} id={g.id} className="faq-group">
            <h2>{g.title}</h2>
            <FaqList items={g.items} />
          </section>
        ))}
      </Section>
    </div>
  );
}
