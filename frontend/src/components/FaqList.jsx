import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLinks, faqId } from "../faqContent.js";

// Réponse avec liens internes ([[texte|/chemin]])
export const Answer = ({ text }) => (
  <>{parseLinks(text).map((p, i) => (p.to ? <Link key={i} to={p.to}>{p.t}</Link> : <span key={i}>{p.t}</span>))}</>
);

// Accordéon SEO-friendly : la réponse est TOUJOURS dans le HTML (seulement repliée visuellement), la question est un titre h3.
export default function FaqList({ items, openId }) {
  const [open, setOpen] = useState(openId || (location.hash.startsWith("#q-") ? location.hash.slice(1) : null));
  // Lien profond depuis le blog (/faq#q-…) : ouvre la question et la fait défiler à l'écran
  useEffect(() => {
    const id = location.hash.startsWith("#q-") ? location.hash.slice(1) : null;
    if (id && items.some((f) => faqId(f.q) === id)) { setOpen(id); setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 350); }
  }, []);
  return (
    <div className="faq">
      {items.map((f) => {
        const id = faqId(f.q);
        const isOpen = open === id;
        return (
          <div key={f.q} className={`faq-item ${isOpen ? "open" : ""}`} id={id}>
            <h3>
              <button type="button" aria-expanded={isOpen} aria-controls={id + "-a"} onClick={() => setOpen(isOpen ? null : id)}>
                <span>{f.q}</span>
                <motion.span aria-hidden="true" animate={{ rotate: isOpen ? 45 : 0 }}>＋</motion.span>
              </button>
            </h3>
            <div className="faq-a" id={id + "-a"} role="region" aria-hidden={!isOpen}>
              <p><Answer text={f.a} /></p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
