import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { currentLang, t } from "../i18n.js";

// Modèles de pages légales. À FAIRE VALIDER par un juriste avant l'ouverture : l'encadré orange reste affiché
// tant que l'identité de la société n'est pas entièrement renseignée côté serveur (variables SELLER_*).
const TODO = "[à compléter]";
const v = (x) => x || TODO;

function useLegal() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    api("/legal").then(setInfo).catch(() => setInfo({ seller: {}, terms_version: "", complete: false }));
  }, []);
  return info;
}

function Shell({ title, children, info }) {
  if (!info) return <div className="page"><p className="muted" style={{ padding: "6rem 1.5rem" }}>Chargement…</p></div>;
  return (
    <div className="page legal-page">
      <h1>{title}</h1>
      {!info.complete && (
        <p className="draft" role="note">
          Projet de texte, à faire valider par un juriste. Les champs « {TODO} » seront remplis dès que la société sera immatriculée.
        </p>
      )}
      {currentLang().code !== "fr" && <p className="draft" role="note">{t("Les textes juridiques sont rédigés en français : seule la version française fait foi.")}</p>}
      {children}
      <p className="muted note">Version {info.terms_version}</p>
    </div>
  );
}

export function MentionsLegales() {
  const info = useLegal();
  const s = info?.seller || {};
  return (
    <Shell title="Mentions légales" info={info}>
      <h2>Éditeur du site</h2>
      <p>
        {v(s.name)}, {v(s.legal_form)} au capital de {v(s.capital)} €<br />
        Siège social : {v(s.address)}<br />
        SIREN {v(s.siren)} · {v(s.rcs)}<br />
        N° de TVA intracommunautaire : {s.vat_franchise ? "TVA non applicable (art. 293 B du CGI)" : v(s.vat_number)}<br />
        Contact : {v(s.email)} · {v(s.phone)}
      </p>
      <p>Directeur de la publication : {v(s.publisher)}</p>
      <h2>Hébergeur</h2>
      <p>{v(s.host_name)}<br />{v(s.host_address)}</p>
      <h2>Médiation de la consommation</h2>
      <p>
        En cas de litige non résolu avec notre service client, tu peux saisir gratuitement le médiateur de la consommation : {v(s.mediator)}.
      </p>
      <h2>Autres informations</h2>
      <p>
        Voir nos <Link to="/cgv">conditions générales de vente</Link>, notre <Link to="/confidentialite">politique de confidentialité</Link> et
        l'information sur le <Link to="/retractation">droit de rétractation</Link>.
      </p>
    </Shell>
  );
}

export function Cgv() {
  const info = useLegal();
  const s = info?.seller || {};
  return (
    <Shell title="Conditions générales de vente" info={info}>
      <h2>1. Vendeur</h2>
      <p>{v(s.name)}, {v(s.legal_form)}, SIREN {v(s.siren)}, {v(s.address)} (« KozzGo »). Contact : {v(s.email)}.</p>
      <h2>2. Produits</h2>
      <p>
        KozzGo vend (a) des eSIM de voyage, forfaits de données utilisables à l'étranger, et (b) un abonnement mensuel « Kozz Monde ». Les caractéristiques (volume de données, durée, pays couverts) sont indiquées sur la
        page de chaque produit avant la commande. Pour les offres « illimitées », la politique d'usage raisonnable (fair use) est affichée avant l'achat.
      </p>
      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises. Dix pour cent de la marge de KozzGo sur chaque achat sont reversés à la cause choisie par le
        client ; ce don est pris sur la marge de KozzGo et n'augmente pas le prix payé.
      </p>
      <h2>4. Commande et paiement</h2>
      <p>
        La commande est conclue après acceptation des présentes conditions et paiement. Le paiement par carte est traité par Stripe : KozzGo n'a jamais accès
        aux données de ta carte. Une confirmation de commande, la facture et les informations d'installation sont envoyées par e-mail.
      </p>
      <h2>5. Livraison</h2>
      <p>
        Les produits sont numériques et livrés immédiatement après le paiement (QR code d'eSIM, crédit sur la ligne du proche). Pour utiliser une eSIM, le
        téléphone doit être compatible eSIM et débloqué : il appartient au client de le vérifier. La durée de validité d'un forfait commence à la première
        connexion au réseau, sauf indication contraire sur la fiche produit.
      </p>
      <h2>6. Droit de rétractation</h2>
      <p>
        Tu disposes en principe de 14 jours pour te rétracter. Toutefois, conformément à l'article L221-28 du Code de la consommation, ce droit ne
        s'applique pas aux services pleinement exécutés avant la fin du délai de rétractation, ni aux contenus numériques fournis sans support matériel, lorsque
        tu as demandé expressément l'exécution immédiate et reconnu perdre ton droit de rétractation. Cette demande t'est présentée, par une case à cocher
        distincte, avant chaque paiement. Voir la page <Link to="/retractation">droit de rétractation</Link>.
      </p>
      <h2>7. Abonnement Kozz Monde</h2>
      <p>L'abonnement est mensuel et se renouvelle automatiquement. Tu peux le résilier à tout moment, en ligne et sans frais ; la résiliation prend effet à la fin de la période en cours.</p>
      <h2>7 bis. Parrainage</h2>
      <p>
        Un client peut parrainer une personne qui n'a pas encore de compte en lui transmettant son lien. Le filleul reçoit 1,50 € de remise sur sa prochaine
        commande dès la création de son compte ; le parrain reçoit 1,50 € de remise quand son filleul a payé sa première commande. Les remises sont déduites
        automatiquement du prix, ne sont ni remboursables ni convertibles en argent, ne sont pas cumulables avec un montant à payer inférieur à 0,50 € et ne
        valent que pour un parrainage entre deux personnes distinctes. KozzGo peut refuser ou annuler les remises obtenues par un usage abusif (faux comptes).
      </p>
      <h2>8. Garanties légales</h2>
      <p>
        Tu bénéficies de la garantie légale de conformité prévue par le Code de la consommation et de la garantie des vices cachés (articles 1641 et suivants du
        Code civil). Ces garanties s'appliquent sans préjudice des éventuelles garanties commerciales.
      </p>
      <h2>9. Disponibilité et responsabilité</h2>
      <p>
        La connectivité est fournie via des opérateurs partenaires ; la couverture et le débit dépendent des réseaux locaux. KozzGo est responsable dans les limites
        prévues par la loi. En cas d'échec d'installation de l'eSIM, contacte-nous : nous résolvons le problème ou rembourse l'achat.
      </p>
      <h2>10. Données personnelles</h2>
      <p>Voir la <Link to="/confidentialite">politique de confidentialité</Link>.</p>
      <h2>11. Réclamations et médiation</h2>
      <p>Réclamations : {v(s.email)}. Médiateur de la consommation : {v(s.mediator)}.</p>
      <h2>12. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français. Si tu es consommateur résidant dans l'Union européenne, tu conserves la protection des dispositions impératives du pays où tu résides.</p>
    </Shell>
  );
}

export function Retractation() {
  const info = useLegal();
  const s = info?.seller || {};
  return (
    <Shell title="Droit de rétractation" info={info}>
      <p>
        Pour un achat à distance, le consommateur dispose en principe de 14 jours pour se rétracter sans donner de motif. Pour les eSIM, qui sont
        fournies immédiatement, ce droit est perdu une fois le service fourni si tu as demandé l'exécution immédiate et reconnu cette conséquence avant le
        paiement (article L221-28 du Code de la consommation). Si tu ne l'as pas fait, ou pour l'abonnement Kozz Monde avant sa première utilisation, tu peux te rétracter :
      </p>
      <p>Écris-nous à {v(s.email)} en indiquant ton numéro de commande, ou utilise le modèle ci-dessous.</p>
      <h2>Modèle de formulaire de rétractation</h2>
      <blockquote>
        À l'attention de {v(s.name)}, {v(s.address)}, {v(s.email)} :<br />
        Je vous notifie par la présente ma rétractation du contrat portant sur la vente du produit ci-dessous.<br />
        Commande n° ______ · commandée le ______ · Nom du consommateur : ______ · Adresse : ______ · Date : ______
      </blockquote>
    </Shell>
  );
}

export function Remboursement() {
  const info = useLegal();
  const s = info?.seller || {};
  return (
    <Shell title="Politique de remboursement" info={info}>
      <h2>eSIM non installée ou non utilisée</h2>
      <p>
        Les eSIM sont des produits numériques livrés immédiatement. Une fois l'eSIM délivrée, et comme tu as demandé l'exécution immédiate de ta commande, le droit de
        rétractation ne s'applique plus (voir la page <Link to="/retractation">droit de rétractation</Link>). Si l'eSIM n'a pas été délivrée, ou si tu n'as reçu ni QR code
        ni code d'activation, écris-nous : nous la livrons à nouveau ou nous te remboursons intégralement.
      </p>
      <h2>Problème technique</h2>
      <p>
        Si ton eSIM ne s'installe pas ou ne fonctionne pas dans le pays prévu alors que ton téléphone est compatible et débloqué, contacte-nous à {v(s.email)} avec ton numéro de
        commande : nous cherchons une solution (nouvelle eSIM, forfait équivalent) ou nous te remboursons la part non utilisée.
      </p>
      <h2>Ce qui n'est pas remboursé</h2>
      <p>
        Un téléphone incompatible ou verrouillé par un opérateur, une eSIM déjà activée et consommée normalement, ou une erreur de destination au moment de la commande
        (sauf si l'eSIM n'a pas encore été activée : écris-nous, nous étudions chaque cas).
      </p>
      <h2>Comment es-tu remboursé</h2>
      <p>Les remboursements sont faits sur le moyen de paiement utilisé, dans un délai maximum de 14 jours après ta demande acceptée. Une remise de parrainage utilisée n'est pas remboursée en espèces.</p>
      <h2>Tes droits légaux</h2>
      <p>Cette politique s'ajoute à la garantie légale de conformité et à tes droits de consommateur, qu'elle ne remplace pas. Voir les <Link to="/cgv">conditions générales de vente</Link>.</p>
    </Shell>
  );
}

export function Confidentialite() {
  const info = useLegal();
  const s = info?.seller || {};
  return (
    <Shell title="Politique de confidentialité" info={info}>
      <h2>Responsable du traitement</h2>
      <p>{v(s.name)}, {v(s.address)} · {v(s.email)}</p>
      <h2>Données collectées et finalités</h2>
      <ul>
        <li><strong>Exécuter ta commande</strong> (base légale : contrat) : e-mail, nom, adresse de facturation, téléphone, produits commandés.</li>
        <li><strong>Te facturer et respecter nos obligations comptables</strong> (obligation légale) : factures conservées 10 ans.</li>
        <li><strong>T'envoyer ta confirmation, ta facture et tes informations d'installation</strong> par e-mail et SMS (contrat). Nous n'envoyons pas de publicité sans ton accord préalable.</li>
        <li><strong>Gérer ton compte</strong> (contrat) : tant que ton compte existe. Ton mot de passe est haché ; nous ne pouvons pas le lire.</li>
        <li><strong>Prévenir la fraude et sécuriser le service</strong> (intérêt légitime).</li>
      </ul>
      <h2>Destinataires</h2>
      <p>
        Stripe (paiement), notre fournisseur d'eSIM, nos prestataires d'envoi d'e-mails et de SMS et notre hébergeur, chacun dans la limite de ce qui est nécessaire.
        Certains peuvent être situés hors de l'Union européenne ; les transferts sont alors encadrés par des garanties appropriées (clauses contractuelles types ou décision d'adéquation) {TODO}.
      </p>
      <h2>Durées de conservation</h2>
      <p>Compte : jusqu'à sa suppression. Factures et pièces comptables : 10 ans. Numéro de téléphone d'un proche : {TODO}. Journaux techniques : {TODO}.</p>
      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les rectifier, les effacer, limiter ou t'opposer à leur traitement et demander leur portabilité en écrivant à {v(s.email)}.
        Tu peux supprimer ton compte depuis ton profil. Tu peux aussi saisir la CNIL (cnil.fr).
      </p>
      <h2>Cookies et traceurs</h2>
      <p>
        Nous n'utilisons que ce qui est strictement nécessaire au service (cookie de connexion, panier) : aucun traceur publicitaire ou de mesure d'audience, donc
        aucun bandeau de consentement. Les polices et les drapeaux sont hébergés sur notre propre serveur.
      </p>
    </Shell>
  );
}
