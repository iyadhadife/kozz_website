import { useEffect, useRef } from "react";
import QRCode from "qrcode";

// Introduction à l'ouverture du site : un vrai QR code (qui mène au site) se compose point par point dans les couleurs du logo,
// un faisceau le « scanne », il se disperse, puis le logo KozzGo apparaît et le rideau se lève. Une fois par session ; un toucher la saute.
const COLORS = ["#F27B5C", "#F4A259", "#F6C48A", "#EF7B63"];
const BG = "#121212";
const T_BUILD = 1500, T_SCAN = 2300, T_BURST = 3100, T_END = 3800; // ms
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.8; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

export function introSeen() {
  try { return sessionStorage.getItem("kozz_intro") === "1"; } catch { return false; }
}

export default function QrIntro({ onDone }) {
  const ref = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem("kozz_intro", "1"); } catch {}
    const c = ref.current;
    const ctx = c.getContext("2d");
    const qr = QRCode.create(location.origin + "/", { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const data = qr.modules.data;
    const logo = new Image();
    logo.src = "/logo.jpg";

    let W = 0, H = 0, cell = 0, ox = 0, oy = 0, raf, start = 0, done = false;
    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      c.width = W * d; c.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const size = Math.min(W * 0.72, H * 0.5, 340);
      cell = size / n;
      ox = (W - size) / 2; oy = (H - size) / 2 - 20;
    };
    resize();
    addEventListener("resize", resize);

    // chaque module : instant d'apparition (du centre vers l'extérieur, avec du hasard), couleur et direction de dispersion
    const mods = [];
    const isFinder = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!data[y * n + x]) continue;
        const dx = x - n / 2, dy = y - n / 2, dist = Math.hypot(dx, dy) / (n / 2);
        mods.push({
          x, y, finder: isFinder(x, y), dist,
          at: (isFinder(x, y) ? 0 : 150) + dist * 650 + Math.random() * 420,
          col: COLORS[(Math.random() * COLORS.length) | 0],
          vx: dx / (Math.hypot(dx, dy) || 1) * (0.6 + Math.random()), vy: dy / (Math.hypot(dx, dy) || 1) * (0.6 + Math.random()) - 0.4,
        });
      }
    }

    const finish = () => { if (!done) { done = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); onDone(); } };

    const frame = (now) => {
      if (!start) start = now;
      const t = now - start;
      if (t > T_END) return finish();
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      const burst = t > T_SCAN ? ease((t - T_SCAN) / (T_BURST - T_SCAN)) : 0;
      const scanY = t > T_BUILD - 250 && t < T_SCAN ? oy + ((t - (T_BUILD - 250)) / (T_SCAN - T_BUILD + 250)) * (n * cell) : -1;

      for (const m of mods) {
        const k = back((t - m.at) / 380);
        if (k <= 0) continue;
        let s = k, px = ox + m.x * cell, py = oy + m.y * cell, a = 1;
        if (burst) {
          px += m.vx * burst * cell * 14; py += m.vy * burst * cell * 14 + burst * burst * cell * 10;
          s *= 1 - burst * 0.9; a = 1 - burst;
        }
        // reflet du faisceau : les modules proches de la ligne s'éclairent
        const lit = scanY > 0 ? Math.max(0, 1 - Math.abs(py + cell / 2 - scanY) / (cell * 3)) : 0;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = lit > 0.05 ? "#fff3e0" : m.col;
        const r = (cell * s) / 2, cx = px + cell / 2, cy = py + cell / 2;
        if (m.finder) {
          const q = cell * s * 0.98; // coins du viseur : carrés aux angles arrondis
          ctx.beginPath(); ctx.roundRect(cx - q / 2, cy - q / 2, q, q, q * 0.28); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r * 0.86), 0, 7); ctx.fill(); // points ronds, comme le logo
        }
      }
      ctx.globalAlpha = 1;

      // faisceau de scan
      if (scanY > 0) {
        const g = ctx.createLinearGradient(0, scanY - 26, 0, scanY + 3);
        g.addColorStop(0, "rgba(244,162,89,0)"); g.addColorStop(1, "rgba(244,162,89,.55)");
        ctx.fillStyle = g; ctx.fillRect(ox - 12, scanY - 26, n * cell + 24, 29);
        ctx.fillStyle = "#F4A259"; ctx.fillRect(ox - 12, scanY, n * cell + 24, 2);
      }

      // logo : apparaît quand le QR code se disperse
      const lk = ease((t - (T_SCAN + 250)) / 700);
      if (lk > 0 && logo.complete && logo.naturalWidth) {
        const lw = Math.min(W * 0.62, 260) * (0.8 + 0.2 * lk), lh = lw * (logo.naturalHeight / logo.naturalWidth);
        ctx.globalAlpha = lk;
        ctx.save();
        ctx.beginPath(); ctx.roundRect(W / 2 - lw / 2, H / 2 - lh / 2 - 20, lw, lh, 14); ctx.clip();
        ctx.drawImage(logo, W / 2 - lw / 2, H / 2 - lh / 2 - 20, lw, lh);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const skip = (e) => { if (e.type === "keydown" && e.key !== "Escape" && e.key !== "Enter") return; finish(); };
    addEventListener("keydown", skip);
    return () => { done = true; cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("keydown", skip); };
  }, [onDone]);

  return <canvas ref={ref} className="qr-intro" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))} aria-hidden="true" />;
}
