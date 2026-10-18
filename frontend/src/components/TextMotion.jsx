import { useEffect } from "react";

// Même esprit que l'intro QR code : les textes se « scannent » (balayage de gauche à droite) et les champs de saisie
// s'ouvrent avec un faisceau orange. Appliqué automatiquement à tout le site, y compris aux éléments ajoutés plus tard.
const TEXT = "h1, h2, h3, h4, .lead, .sub, .pill, .stats li, .dest-name, .price, .impact-line, .legal-page p, .legal-page li, .hero p, .muted.note, .menu-title, .cat-block h3, .total";
const FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]), .search > input, select.filter';
const SKIP = ".nav, .tabbar, .mobile-menu, .mega, .chat, .qr-intro-wrap, .drawer, .search-list, [data-rv-skip]";

export default function TextMotion({ paused }) {
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reveal = (el) => {
      el.dataset.rv = "1";
      el.addEventListener("transitionend", function end(e) {
        if (e.propertyName === "--p" || e.propertyName === "clip-path") { el.removeEventListener("transitionend", end); delete el.dataset.rv; }
      });
      setTimeout(() => { delete el.dataset.rv; }, 2600); // filet de sécurité si transitionend n'arrive pas
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); reveal(e.target); }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });

    const prep = (root) => {
      if (!(root instanceof Element)) return;
      const list = [...(root.matches(TEXT) ? [root] : []), ...root.querySelectorAll(TEXT)].map((el) => [el, "text"]);
      list.push(...[...(root.matches(FIELD) ? [root] : []), ...root.querySelectorAll(FIELD)].map((el) => [el, "field"]));
      list.forEach(([el, kind], i) => {
        if (el.dataset.rv || el.dataset.rvDone || el.closest(SKIP)) return;
        el.dataset.rvDone = "1";
        const idx = [...(el.parentElement?.children || [])].indexOf(el);
        el.style.setProperty("--d", `${Math.min(Math.max(idx, 0), 6) * 70}ms`);
        el.dataset.rvk = kind;
        el.dataset.rv = "0";
        io.observe(el);
      });
    };
    prep(document.body);
    const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(prep)));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); document.querySelectorAll("[data-rv]").forEach((el) => { delete el.dataset.rv; }); };
  }, [paused]);
  return null;
}
