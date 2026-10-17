import { useEffect, useRef } from "react";

// Grille de points façon logo KozzGo : ondulation + réaction à la souris
const COLORS = ["#F27B5C", "#F4A259", "#F6C48A", "#EF7B63"];
const GAP = 28;

export default function Dots() {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, mx = -999, my = -999, raf;

    const resize = () => {
      const r = c.getBoundingClientRect();
      const d = devicePixelRatio || 1;
      w = r.width; h = r.height;
      c.width = w * d; c.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const move = (e) => {
      const r = c.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (let j = 0, y = GAP / 2; y < h; y += GAP, j++) {
        for (let i = 0, x = GAP / 2; x < w; x += GAP, i++) {
          const wave = reduce ? 0 : Math.sin(i * 0.35 + j * 0.25 + t / 900);
          const near = Math.max(0, 1 - Math.hypot(x - mx, y - my) / 170);
          ctx.globalAlpha = 0.12 + 0.18 * ((wave + 1) / 2) + near * 0.65;
          ctx.fillStyle = COLORS[(i + j) % COLORS.length];
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.6, 2 + wave + near * 5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    addEventListener("resize", resize);
    addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas ref={ref} className="dots" aria-hidden="true" />;
}
