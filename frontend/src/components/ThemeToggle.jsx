import { useEffect, useState } from "react";
import { t } from "../i18n.js";

const get = () => { try { if (localStorage.getItem("kozz_theme") === "dark") return "dark"; } catch {} return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; };

// Thème clair par défaut ; le choix est mémorisé sur cet appareil.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(get);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("kozz_theme", theme); } catch {}
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#121212" : "#ffffff");
  }, [theme]);
  return (
    <button type="button" className="theme-toggle" onClick={() => setTheme((x) => (x === "dark" ? "light" : "dark"))} aria-label={theme === "dark" ? t("Thème clair") : t("Thème sombre")} title={theme === "dark" ? t("Thème clair") : t("Thème sombre")}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "dark" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />}
      </svg>
    </button>
  );
}
