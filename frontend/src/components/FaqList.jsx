import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLinks } from "../faqContent.js";

// Réponse avec liens internes ([[texte|/chemin]])
export const Answer = ({ text }) => (
  <>{parseLinks(text).map((p, i) => (p.to ? <Link key={i} to={p.to}>{p.t}</Link> : <span key={i}>{p.t}</span>))}</>
);

// Accordéon SEO-friendly : la réponse est TOUJOURS dans le HTML (seulement repliée visuellement), la question est un titre h3.
export default function FaqList({ items, openId }) {
  const [open, setOpen] = useState(openId || null);
  return (
    <div className="faq">
      {items.map((f) => {
        const id = "q-" + f.q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 60);
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
