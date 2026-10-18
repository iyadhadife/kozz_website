import { t, tx } from "../i18n.js";

// Le test le plus rapide : composer *#06#. Court et visible, affiché avec la recherche de modèle.
export default function EsimTest() {
  return (
    <div className="esim-test">
      <span className="et-badge">{t("Test en 5 secondes")}</span>
      <p className="et-title">{tx("Compose {code} sur ton téléphone", { code: <code>*#06#</code> })}</p>
      <p className="et-text"><strong>{t("Un numéro EID s'affiche ? Tu es compatible eSIM.")}</strong> {t("Il doit aussi être désimlocké.")}</p>
    </div>
  );
}
