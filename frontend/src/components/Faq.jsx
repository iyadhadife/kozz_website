import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FAQ } from "../data.js";

export default function Faq({ items = FAQ }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="faq">
      {items.map((f, i) => (
        <div key={f.q} className="faq-item">
          <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span>{f.q}</span>
            <motion.span animate={{ rotate: open === i ? 45 : 0 }}>＋</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                {f.a}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
