import { motion } from "framer-motion";

// Apparition au scroll, réutilisée par toutes les sections
export default function Section({ id, title, subtitle, h1 = false, children }) {
  const Title = h1 ? "h1" : "h2";
  return (
    <motion.section
      id={id}
      className="section"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Title>{title}</Title>
      {subtitle && <p className="sub">{subtitle}</p>}
      {children}
    </motion.section>
  );
}
