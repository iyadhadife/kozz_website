"""Textes envoyés par le serveur (e-mails, SMS, facture PDF) en français et en anglais.

Règle : site en français -> français ; toute autre langue du site -> anglais. (Une facture en français reste la règle pour un client français.)
Les libellés des lignes de commande sont reconstruits depuis la base (pays, forfait) dans la langue du message : la base garde le français.
"""
from decimal import Decimal

from babel import Locale
from sqlalchemy import text

SUPPORTED = ("fr", "en")


def lang_for(site_lang: str | None) -> str:
    return "fr" if (site_lang or "fr").lower().startswith("fr") else "en"


def money(lang: str, amount) -> str:
    """Montant en euros : « 12,50 € » (fr) ou « €12.50 » (en)."""
    a = Decimal(str(amount))
    return f"{a:,.2f}".replace(",", " ").replace(".", ",") + " €" if lang == "fr" else f"€{a:,.2f}"


S: dict[str, dict[str, str]] = {
    "fr": {
        # e-mail de commande
        "subject_full": "Ta commande KozzGo n°{id} : facture et installation",
        "subject_inv": "Ta commande KozzGo n°{id} : facture",
        "hello": "Bonjour{name},",
        "thanks": "Merci pour ta commande n°{id} ! Paiement de {total} TTC confirmé.",
        "charged": "Montant débité : {amount} {cur} (taux appliqué : 1 € = {rate} {cur}, frais de conversion inclus).",
        "esim_pending": "eSIM « {label} » : nous finalisons sa préparation et te l'envoyons très vite. Réponds à cet e-mail si besoin.",
        "install_title": "Installer ton eSIM « {label} » :",
        "install_steps": "1) Connecte-toi au Wi-Fi. 2) Réglages > Données mobiles > Ajouter une eSIM. 3) Scanne le QR code (ou saisis le code d'activation).",
        "activation": "Code d'activation : {code}",
        "iphone": "Installation iPhone : {link}",
        "find_qr": "Retrouve aussi ton QR code ici : {link}",
        "html_steps": "<li>Connecte-toi au Wi-Fi.</li><li>Réglages &gt; Données mobiles &gt; Ajouter une eSIM.</li><li>Scanne ce QR code. Active la ligne à ton arrivée.</li>",
        "qr_alt": "QR code d'installation",
        "manual_code": "Code d'activation manuel :",
        "iphone_link": "Installer sur iPhone",
        "qr_warn": "Ne partage pas ce QR code : il ne fonctionne qu'une fois.",
        "inv_attached": "Ta facture {no} est jointe à cet e-mail (PDF).",
        "impact": "Ton impact : {cause} (10 % de notre marge sur cet achat).",
        "legal_title": "Informations légales",
        "withdrawal_waived": "Droit de rétractation : tu as demandé l'exécution immédiate de ton achat le {date} et reconnu perdre ton droit de rétractation une fois le service fourni (art. L221-28 du Code de la consommation).",
        "withdrawal_see": "Droit de rétractation : voir nos conditions générales.",
        "warranty": "Garantie légale de conformité : elle s'applique à tes achats (Code de la consommation).",
        "links": "Conditions générales : {cgv} · Mentions légales : {ml} · Confidentialité : {conf}",
        "mediator": "Médiation de la consommation : {m}",
        "contact": "Contact : {e}",
        # SMS
        "sms_confirmed": "KozzGo : commande {id} confirmee. ",
        "sms_install": "Installe ton eSIM ici : {link} ",
        "sms_code": "Code : {code} ",
        "sms_invoice": "Facture envoyee par e-mail.",
        "sms_verify": "KozzGo : ton code de verification est {code}. Valable {min} min. Ne le partage avec personne.",
        # code de vérification
        "code_subject": "{code} est ton code de vérification KozzGo",
        "code_text": "Ton code de vérification KozzGo : {code}\n\nIl est valable {min} minutes. Si tu n'as pas demandé la création d'un compte, ignore ce message : rien ne sera créé.",
        "code_html1": "Ton code de vérification KozzGo :",
        "code_html2": "Il est valable {min} minutes.",
        "code_html3": "Si tu n'as pas demandé la création d'un compte, ignore ce message : rien ne sera créé.",
        # facture PDF
        "inv_title": "FACTURE", "inv_no": "N° {no}", "inv_issue": "Date d'émission : {d}", "inv_service": "Date de la prestation : {d}",
        "inv_seller": "Vendeur", "inv_client": "Client", "inv_default_client": "Client particulier",
        "inv_capital": "{form} au capital de {cap} €", "inv_siren": "SIREN {s}", "inv_vat_no": "N° TVA intracommunautaire : {v}",
        "inv_col_desc": "Désignation", "inv_col_qty": "Qté", "inv_col_unit": "PU HT", "inv_col_vat": "TVA", "inv_col_ht": "Total HT", "inv_col_ttc": "Total TTC",
        "inv_tot_ht": "Total HT", "inv_tot_vat": "TVA ({r} %)", "inv_tot_ttc": "Total TTC",
        "inv_paid": "Payée par carte bancaire via Stripe.",
        "inv_paid_fx": "Payée par carte bancaire via Stripe. Montant débité : {amount} {cur} (taux appliqué : 1 € = {rate} {cur}, frais de conversion inclus). Facture établie en euros.",
        "inv_currency": "Devise : euro (EUR). Aucun escompte pour paiement anticipé.", "inv_franchise": "TVA non applicable, art. 293 B du CGI.",
        "inv_mediator": "Médiation de la consommation : {m}", "inv_keep": "Facture à conserver. Les prix incluent la TVA applicable.",
        "inv_discount": "Remise parrainage", "inv_doc": "Facture {no}",
    },
    "en": {
        "subject_full": "Your KozzGo order #{id}: invoice and installation",
        "subject_inv": "Your KozzGo order #{id}: invoice",
        "hello": "Hello{name},",
        "thanks": "Thank you for your order #{id}! Payment of {total} incl. tax confirmed.",
        "charged": "Amount charged: {amount} {cur} (rate applied: €1 = {rate} {cur}, conversion fees included).",
        "esim_pending": "eSIM \"{label}\": we are finalising it and will send it to you very soon. Reply to this email if needed.",
        "install_title": "Install your eSIM \"{label}\":",
        "install_steps": "1) Connect to Wi-Fi. 2) Settings > Mobile data > Add eSIM. 3) Scan the QR code (or enter the activation code).",
        "activation": "Activation code: {code}",
        "iphone": "iPhone installation: {link}",
        "find_qr": "You can also find your QR code here: {link}",
        "html_steps": "<li>Connect to Wi-Fi.</li><li>Settings &gt; Mobile data &gt; Add eSIM.</li><li>Scan this QR code. Turn the line on when you arrive.</li>",
        "qr_alt": "Installation QR code",
        "manual_code": "Manual activation code:",
        "iphone_link": "Install on iPhone",
        "qr_warn": "Do not share this QR code: it only works once.",
        "inv_attached": "Your invoice {no} is attached to this email (PDF).",
        "impact": "Your impact: {cause} (10% of our margin on this purchase).",
        "legal_title": "Legal information",
        "withdrawal_waived": "Right of withdrawal: on {date} you asked for immediate execution of your purchase and acknowledged that you lose your right of withdrawal once the service is delivered (art. L221-28 of the French Consumer Code).",
        "withdrawal_see": "Right of withdrawal: see our terms and conditions.",
        "warranty": "Legal guarantee of conformity: it applies to your purchases (French Consumer Code).",
        "links": "Terms: {cgv} · Legal notice: {ml} · Privacy: {conf}",
        "mediator": "Consumer mediation: {m}",
        "contact": "Contact: {e}",
        "sms_confirmed": "KozzGo: order {id} confirmed. ",
        "sms_install": "Install your eSIM here: {link} ",
        "sms_code": "Code: {code} ",
        "sms_invoice": "Invoice sent by email.",
        "sms_verify": "KozzGo: your verification code is {code}. Valid for {min} min. Do not share it with anyone.",
        "code_subject": "{code} is your KozzGo verification code",
        "code_text": "Your KozzGo verification code: {code}\n\nIt is valid for {min} minutes. If you did not ask to create an account, ignore this message: nothing will be created.",
        "code_html1": "Your KozzGo verification code:",
        "code_html2": "It is valid for {min} minutes.",
        "code_html3": "If you did not ask to create an account, ignore this message: nothing will be created.",
        "inv_title": "INVOICE", "inv_no": "No. {no}", "inv_issue": "Issue date: {d}", "inv_service": "Date of service: {d}",
        "inv_seller": "Seller", "inv_client": "Customer", "inv_default_client": "Individual customer",
        "inv_capital": "{form} with share capital of €{cap}", "inv_siren": "SIREN {s}", "inv_vat_no": "Intra-Community VAT no.: {v}",
        "inv_col_desc": "Description", "inv_col_qty": "Qty", "inv_col_unit": "Unit price excl. VAT", "inv_col_vat": "VAT", "inv_col_ht": "Total excl. VAT", "inv_col_ttc": "Total incl. VAT",
        "inv_tot_ht": "Total excl. VAT", "inv_tot_vat": "VAT ({r}%)", "inv_tot_ttc": "Total incl. VAT",
        "inv_paid": "Paid by card via Stripe.",
        "inv_paid_fx": "Paid by card via Stripe. Amount charged: {amount} {cur} (rate applied: €1 = {rate} {cur}, conversion fees included). Invoice issued in euros.",
        "inv_currency": "Currency: euro (EUR). No discount for early payment.", "inv_franchise": "VAT not applicable, art. 293 B of the French Tax Code.",
        "inv_mediator": "Consumer mediation: {m}", "inv_keep": "Please keep this invoice. Prices include the applicable VAT.",
        "inv_discount": "Referral discount", "inv_doc": "Invoice {no}",
    },
}


def T(lang: str, key: str, **kw) -> str:
    return S.get(lang, S["en"])[key].format(**kw) if kw else S.get(lang, S["en"])[key]


def item_labels(c, order_id: int, lang: str) -> list[dict]:
    """Lignes de la commande avec un libellé dans la langue du message : [{label, qty, unit_price}]."""
    rows = c.execute(
        text("SELECT oi.id, oi.label, oi.qty, oi.unit_price, oi.kind, oi.destination_id, oi.subscription_id, t.gb, t.days "
             "FROM order_items oi LEFT JOIN tiers t ON t.`key` = oi.tier_key WHERE oi.order_id=:o ORDER BY oi.id"),
        {"o": order_id},
    ).mappings().all()
    out = []
    for r in rows:
        label = r["label"]  # français, tel qu'enregistré
        if lang == "en":
            if r["kind"] == "esim" and r["destination_id"]:
                try:
                    country = Locale("en").territories.get(r["destination_id"].upper()) or r["destination_id"].upper()
                except Exception:  # noqa: BLE001
                    country = r["destination_id"].upper()
                data = "Unlimited" if r["gb"] is None else f"{r['gb']} GB"
                label = f"eSIM {country} · {data} / {r['days']} d"
            elif r["kind"] == "subscription":
                label = label.replace("(mensuel)", "(monthly)")
        out.append({"id": r["id"], "label": label, "qty": r["qty"], "unit_price": r["unit_price"]})
    return out
