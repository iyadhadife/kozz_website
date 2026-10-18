import { LOGO_SVG } from "./logoMarkup.js";
import { t } from "../i18n.js";

// Logo en SVG intégré : « Kozz » et les points clairs prennent la couleur du texte, donc visibles sur fond blanc comme sur fond sombre.
export default function Logo({ height, className = "", label }) {
  return <span className={`logo ${className}`} role="img" aria-label={label ?? t("KozzGo")} style={height ? { "--h": `${height}px` } : undefined} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />;
}
