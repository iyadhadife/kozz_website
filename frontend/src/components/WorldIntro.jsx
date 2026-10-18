import Logo from "./Logo.jsx";
import { useEffect, useRef, useState } from "react";
import { CAUSES } from "../data.js";
import { worldPoints } from "./worldMask.js";

// Introduction à l'ouverture du site : un monde en points, des antennes réseau qui émettent, des avions qui relient les villes,
// et un compteur par cause (en dollars) qui monte jusqu'au total réellement reversé. Une fois par session ; un toucher la saute.
const T_END = 4200; // ms
const HUBS = [
  ["Paris", 2.35, 48.85], ["New York", -74, 40.7], ["Los Angeles", -118.2, 34], ["Mexico", -99.1, 19.4], ["São Paulo", -46.6, -23.5],
  ["Dakar", -17.4, 14.7], ["Casablanca", -7.6, 33.6], ["Lagos", 3.4, 6.5], ["Le Caire", 31.2, 30], ["Nairobi", 36.8, -1.3],
  ["Johannesburg", 28, -26.2], ["Istanbul", 29, 41], ["Dubaï", 55.3, 25.2], ["Mumbai", 72.8, 19], ["Bangkok", 100.5, 13.7],
  ["Singapour", 103.8, 1.35], ["Tokyo", 139.7, 35.7], ["Sydney", 151.2, -33.9], ["Séoul", 127, 37.5], ["Jakarta", 106.8, -6.2], ["Moscou", 37.6, 55.7],
];
const ROUTES = [[0, 1], [0, 5], [0, 12], [1, 4], [1, 2], [5, 4], [6, 0], [8, 13], [12, 15], [15, 17], [16, 2], [14, 16], [10, 9], [9, 12], [7, 10],
  [13, 14], [18, 16], [3, 4], [19, 17], [20, 0], [11, 12], [0, 8], [2, 3], [4, 10]];
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const fmt = (n, loc) => new Intl.NumberFormat(loc, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function introSeen() {
  try { return sessionStorage.getItem("kozz_intro") === "2"; } catch { return false; }
}

export default function WorldIntro({ onDone }) {
  const ref = useRef(null);
  const numEls = useRef([]);
  const totalEl = useRef(null);
  const targets = useRef({}); // dollars par cause : { id: montant }

  // vrais montants reversés (agrégats du serveur), convertis en dollars au taux du jour
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const [g, fx] = await Promise.all([fetch("/api/impact/global").then((r) => r.json()), fetch("/api/fx").then((r) => r.json())]);
        const usd = fx?.rates?.USD || 1.1;
        const m = {};
        for (const c of g.causes || []) m[c.id] = c.donation * usd;
        if (!off) targets.current = m;
      } catch { /* compteurs à zéro */ }
    })();
    return () => { off = true; };
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem("kozz_intro", "2"); } catch {}
    const c = ref.current;
    const ctx = c.getContext("2d");
    const pts = worldPoints();
    const phone = innerWidth < 600;
    const cs = getComputedStyle(document.documentElement);
    const BG = cs.getPropertyValue("--bg").trim() || "#fff", INK = cs.getPropertyValue("--text").trim() || "#111", DOT = cs.getPropertyValue("--dot").trim() || "#888";
    const dark = document.documentElement.dataset.theme === "dark";
    let W = 0, H = 0, k = 1, cx = 0, cy = 0, raf, start = 0, done = false, dpr = 1;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      k = (W / 360) * (phone ? 1.75 : 1.0);
      if (!phone) k = Math.min(k, (H * 0.52) / 140);
      cx = W / 2;
      const top = 110, bottom = H - (phone ? 330 : 160); // entre le total et les compteurs
      cy = top + Math.max(0, (bottom - top - 140 * k) / 2) + 70 * k;
    };
    resize();
    addEventListener("resize", resize);

    const proj = (lon, lat, lon0) => [cx + (lon - lon0) * k, cy + (12 - lat) * k];
    const hubs = HUBS.map(([name, lon, lat], i) => ({ name, lon, lat, at: 250 + i * 40 }));
    const routes = ROUTES.map(([a, b], i) => ({ a: hubs[a], b: hubs[b], period: 1700 + ((i * 397) % 900), off: 350 + i * 85 }));
    const rad = Math.max(0.65, k * 0.8);

    const finish = () => { if (!done) { done = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); onDone(); } };

    const frame = (now) => {
      if (!start) start = now;
      const t = now - start;
      if (t > T_END) return finish();
      const lon0 = phone ? -40 + (t / T_END) * 80 : 0;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

      const hp = hubs.map((h) => proj(h.lon, h.lat, lon0));
      const rings = hubs.map((h, i) => (t > h.at ? ((t - h.at) % 1700) / 1700 : -1));

      // points du monde : apparition en vague depuis le centre, puis éclairés par les ondes des antennes
      for (let i = 0; i < pts.length; i++) {
        const [lon, lat] = pts[i];
        const [x, y] = proj(lon, lat, lon0);
        if (x < -4 || x > W + 4) continue;
        const reveal = ease((t - Math.hypot(x - cx, (y - cy) * 1.6) * 1.2) / 450);
        if (reveal <= 0) continue;
        let glow = 0;
        for (let h = 0; h < hp.length; h++) {
          if (rings[h] < 0) continue;
          const d = Math.hypot(x - hp[h][0], y - hp[h][1]);
          const R = rings[h] * k * 20;
          const diff = Math.abs(d - R);
          if (diff < k * 3.2) glow = Math.max(glow, (1 - diff / (k * 3.2)) * (1 - rings[h]));
        }
        ctx.globalAlpha = reveal * ((dark ? 0.42 : 0.6) + glow * 0.4);
        ctx.fillStyle = glow > 0.05 ? (glow > 0.55 ? (dark ? "#F6C48A" : "#F4A259") : "#EF7B63") : DOT;
        ctx.beginPath(); ctx.arc(x, y, rad * (1 + glow * 0.7), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // avions : arc entre deux villes, traînée qui s'estompe
      for (const r of routes) {
        const tt = ((t - r.off) % r.period) / r.period;
        if (t < r.off || tt < 0) continue;
        const A = proj(r.a.lon, r.a.lat, lon0), B = proj(r.b.lon, r.b.lat, lon0);
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2 - Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.3;
        const at = (u) => [(1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * mx + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * my + u * u * B[1]];
        const head = ease(tt * 1.08), tail = Math.max(0, head - 0.4);
        ctx.lineWidth = 1.4; ctx.lineCap = "round";
        const N = 22;
        for (let s = 0; s < N; s++) {
          const u0 = tail + ((head - tail) * s) / N, u1 = tail + ((head - tail) * (s + 1)) / N;
          const p0 = at(u0), p1 = at(u1);
          ctx.strokeStyle = `rgba(244,162,89,${(s / N) * 0.9 * (1 - Math.max(0, tt - 0.85) * 6)})`;
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
        if (tt < 0.95) {
          const p = at(head), q = at(Math.min(1, head + 0.01)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
          const s = phone ? 1.3 : 1.5;
          ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.scale(s, s);
          ctx.fillStyle = INK;
          ctx.beginPath(); // silhouette d'avion vue de dessus
          ctx.moveTo(6, 0); ctx.lineTo(1.5, -1); ctx.lineTo(-1, -5); ctx.lineTo(-2.2, -5); ctx.lineTo(-1.2, -1); ctx.lineTo(-4, -0.8); ctx.lineTo(-5, -2.6); ctx.lineTo(-6, -2.6);
          ctx.lineTo(-5.4, 0); ctx.lineTo(-6, 2.6); ctx.lineTo(-5, 2.6); ctx.lineTo(-4, 0.8); ctx.lineTo(-1.2, 1); ctx.lineTo(-2.2, 5); ctx.lineTo(-1, 5); ctx.lineTo(1.5, 1);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }

      // antennes réseau : mât, deux arcs et point rayonnant
      hubs.forEach((h, i) => {
        const a = ease((t - h.at) / 350);
        if (a <= 0) return;
        const [x, y] = hp[i];
        const hh = (phone ? 9 : 11) * a;
        ctx.globalAlpha = a;
        ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x - hh * 0.28, y); ctx.lineTo(x, y - hh); ctx.lineTo(x + hh * 0.28, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - hh * 0.16, y - hh * 0.35); ctx.lineTo(x + hh * 0.16, y - hh * 0.35); ctx.stroke();
        const blink = 0.55 + 0.45 * Math.sin(t / 220 + i);
        ctx.fillStyle = "#EF7B63"; ctx.beginPath(); ctx.arc(x, y - hh - 1.5, 2.2 * a * (0.8 + 0.4 * blink), 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(239,123,99,${0.7 * blink})`; ctx.lineWidth = 1;
        for (const rr of [4.5, 7.5]) { ctx.beginPath(); ctx.arc(x, y - hh - 1.5, rr * a, -2.2, -0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - hh - 1.5, rr * a, Math.PI + 0.9, Math.PI + 2.2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });

      // compteurs : un par cause, chacun à son rythme
      const loc = document.documentElement.lang || "fr";
      let sum = 0;
      CAUSES.forEach((cz, i) => {
        const target = targets.current[cz.id] || 0;
        const v = target * ease((t - (300 + i * 60)) / (1800 + i * 60));
        sum += v;
        if (numEls.current[i]) numEls.current[i].textContent = fmt(v, loc);
      });
      if (totalEl.current) totalEl.current.textContent = fmt(sum, loc);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const skip = (e) => { if (e.type === "keydown" && e.key !== "Escape" && e.key !== "Enter") return; finish(); };
    addEventListener("keydown", skip);
    return () => { done = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("keydown", skip); };
  }, [onDone]);

  return (
    <div className="wi" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))} aria-hidden="true">
      <canvas ref={ref} className="wi-canvas" />
      <Logo className="wi-logo" label="" />
      <div className="wi-total"><span ref={totalEl}>$0.00</span></div>
      <ul className="wi-causes">
        {CAUSES.map((c, i) => (
          <li key={c.id} style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
            <span className="wi-emoji">{c.emoji}</span>
            <span className="wi-name">{c.name}</span>
            <strong ref={(el) => (numEls.current[i] = el)}>$0.00</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
