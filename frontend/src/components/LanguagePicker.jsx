import { LANGS, t } from "../i18n.js";
import { useStore } from "../store.jsx";

export default function LanguagePicker({ compact = false }) {
  const { lang, setLang } = useStore();
  return (
    <select className={`cur-select ${compact ? "compact" : ""}`} value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t("Language")}>
      {LANGS.map((l) => <option key={l.code} value={l.code}>{compact ? l.code.toUpperCase() : l.name}</option>)}
    </select>
  );
}
