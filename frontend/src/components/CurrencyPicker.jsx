import { useMemo } from "react";
import { useStore } from "../store.jsx";

import { t } from "../i18n.js";
const TOP = ["EUR", "USD", "GBP"];

// Liste des devises disponibles aujourd'hui (celles pour lesquelles on a un taux du jour récent)
export function useCurrencies(locale = "fr") {
  const { fx } = useStore();
  return useMemo(() => {
    const codes = fx ? Object.keys(fx.rates) : ["EUR"];
    let names;
    try { names = new Intl.DisplayNames([locale], { type: "currency" }); } catch {}
    const label = (c) => `${c} — ${names?.of(c) || c}`;
    const sorted = [...TOP.filter((c) => codes.includes(c)), ...codes.filter((c) => !TOP.includes(c)).sort()];
    return sorted.map((c) => ({ code: c, label: label(c) }));
  }, [fx, locale]);
}

export default function CurrencyPicker({ compact = false }) {
  const { currency, setCurrency } = useStore();
  const list = useCurrencies();
  return (
    <select className={`cur-select ${compact ? "compact" : ""}`} value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label={t("Devise")}>
      {list.map((c) => <option key={c.code} value={c.code}>{compact ? c.code : c.label}</option>)}
    </select>
  );
}
