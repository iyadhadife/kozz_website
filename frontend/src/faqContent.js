// FAQ KozzGo : contenu MODIFIABLE ICI (une seule source pour la page /faq, le balisage FAQPage Google et la FAQ de l'accueil).
//
// Méthode : on a relevé les questions que posent les clients sur les sites des revendeurs d'eSIM (Airalo, Holafly, Nomad, Saily, entre autres :
// compatibilité, installation, activation, validité, partage de connexion, recharge, remboursement, dépannage, sécurité…). Les réponses
// ci-dessous sont RÉDIGÉES POUR KOZZGO avec nos propres mots et nos propres règles : on ne recopie pas les textes des concurrents (droit d'auteur,
// et leurs conditions ne sont pas les nôtres). Si une règle change (remboursement, partage de connexion, recharge…), corrige-la ici.
//
// Syntaxe des réponses : [[texte du lien|/chemin]] crée un lien interne (bon pour le maillage SEO). Pas d'autre balisage.
// Chaque groupe a un `id` (ancre #id dans l'URL) ; garde les questions courtes, au format que les gens tapent dans Google.

export const FAQ_GROUPS = [
  {
    id: "comprendre",
    title: "Comprendre l'eSIM",
    items: [
      { q: "Qu'est-ce qu'une eSIM ?", a: "Une eSIM est une carte SIM intégrée à ton téléphone : au lieu d'insérer une puce en plastique, tu installes un profil numérique en scannant un QR code. Tu peux avoir ta ligne habituelle et une eSIM de voyage en même temps, sans rien démonter." },
      { q: "Comment fonctionne une eSIM de voyage KozzGo ?", a: "Tu choisis ta destination et ton forfait, tu paies, puis tu reçois un QR code par e-mail. Tu le scannes dans les réglages de ton téléphone, et à l'arrivée ta data se connecte automatiquement au réseau d'un opérateur local. Pas de roaming, pas de carte à changer. Voir [[Comment ça marche|/comment-ca-marche]]." },
      { q: "Quelle différence entre une eSIM et une SIM physique ?", a: "La SIM physique est une carte qu'on insère et qu'on peut perdre ; l'eSIM est un profil logiciel, installé en quelques minutes, qui s'ajoute à ta ligne sans la remplacer. Elle est livrée instantanément par e-mail, donc pas de livraison ni d'attente à l'aéroport." },
      { q: "Pourquoi choisir une eSIM plutôt que le roaming de mon opérateur ?", a: "Le roaming hors de l'Union européenne est souvent facturé cher ou plafonné à de petits volumes. Une eSIM de voyage te donne un volume de data fixé à l'avance, à un prix affiché avant l'achat, sans mauvaise surprise sur ta facture." },
      { q: "Peut-on garder son numéro de téléphone avec une eSIM de voyage ?", a: "Oui. Ton numéro habituel reste sur ta SIM principale : tu peux continuer à recevoir tes SMS de vérification, tout en utilisant l'eSIM KozzGo pour internet." },
      { q: "Une eSIM KozzGo permet-elle d'appeler ou d'envoyer des SMS ?", a: "Nos forfaits sont des forfaits de données (internet). Pour appeler et écrire, utilise des applications comme WhatsApp, FaceTime, Messenger ou Signal : elles passent par la data de ton eSIM, sans frais de téléphonie." },
    ],
  },
  {
    id: "compatibilite",
    title: "Compatibilité de mon téléphone",
    items: [
      { q: "Mon téléphone est-il compatible eSIM ?", a: "La plupart des iPhone depuis le XS/XR et de nombreux Android récents (Samsung Galaxy S20 et suivants, Google Pixel 3 et suivants, entre autres) le sont. Tape ton modèle dans notre [[liste des téléphones compatibles|/telephones-compatibles]] pour vérifier." },
      { q: "Comment savoir rapidement si mon téléphone supporte l'eSIM ?", a: "Compose *#06# sur ton clavier : si un numéro EID s'affiche, ton téléphone est compatible eSIM. Tu peux aussi chercher « Ajouter une eSIM » dans les réglages de ta ligne mobile." },
      { q: "Mon téléphone doit-il être débloqué ?", a: "Oui. Un téléphone verrouillé par un opérateur (SIM lock) refuse les eSIM d'autres fournisseurs. Demande le déblocage à ton opérateur avant de partir ; c'est gratuit en France une fois le forfait terminé ou après 3 mois d'abonnement." },
      { q: "Les iPhone vendus en Chine, à Hong Kong ou à Macao sont-ils compatibles ?", a: "Les modèles destinés à la Chine continentale n'ont généralement pas d'eSIM. Ceux de Hong Kong et de Macao en ont un, avec parfois des limites selon le modèle : vérifie dans les réglages avant d'acheter." },
      { q: "Les tablettes, montres et ordinateurs portables sont-ils compatibles ?", a: "Certains iPad, tablettes Android et PC portables (Windows avec modem cellulaire) acceptent les eSIM de données. Retrouve-les dans notre [[liste des appareils compatibles|/telephones-compatibles]], onglets Tablettes, Montres et Ordinateurs." },
      { q: "Mon modèle n'est pas dans la liste : que faire ?", a: "La liste n'est pas exhaustive. Si ton modèle est récent, fais le test *#06# ou cherche « Ajouter une eSIM » dans les réglages : c'est la vérification la plus fiable. En cas de doute, écris-nous avant d'acheter." },
    ],
  },
  {
    id: "installation",
    title: "Installer mon eSIM",
    items: [
      { q: "Comment installer mon eSIM sur iPhone ?", a: "Ouvre Réglages > Données cellulaires > Ajouter une eSIM, puis scanne le QR code reçu par e-mail. Sur iOS 17.4 et suivants, le lien d'installation de l'e-mail permet aussi d'installer l'eSIM en un geste." },
      { q: "Comment installer mon eSIM sur Android ?", a: "Selon la marque : sur Samsung, Paramètres > Connexions > Gestionnaire de SIM > Ajouter une eSIM ; sur Pixel, Paramètres > Réseau et Internet > SIM > Télécharger une SIM. Choisis « Scanner le QR code » et suis les instructions." },
      { q: "Quand dois-je installer mon eSIM : avant ou après le départ ?", a: "Idéalement avant le départ, chez toi, avec une connexion Wi-Fi stable : l'installation ne prend qu'une à deux minutes. Une fois installée, ton eSIM reste en attente et se connecte dès ton arrivée." },
      { q: "Puis-je installer l'eSIM sans scanner de QR code ?", a: "Oui, avec la saisie manuelle : ton e-mail contient l'adresse SM-DP+ et le code d'activation à entrer dans les réglages (« Saisir les informations manuellement »). Utile si tu lis l'e-mail sur le téléphone même où tu veux installer l'eSIM." },
      { q: "Faut-il être connecté à internet pour installer l'eSIM ?", a: "Oui : le téléphone télécharge le profil eSIM, donc il faut du Wi-Fi ou de la data sur ta ligne habituelle pendant l'installation." },
      { q: "Mon QR code ne fonctionne pas ou affiche « code non valide » : que faire ?", a: "Un QR code d'eSIM ne s'installe qu'une seule fois : si l'installation a déjà été lancée, il n'est plus valable. Vérifie d'abord que l'eSIM n'est pas déjà dans les réglages de ton téléphone. Sinon contacte-nous avec ton numéro de commande : un humain prend le relais, voir [[Remboursement|/remboursement]]." },
      { q: "Puis-je réinstaller mon eSIM si je la supprime par erreur ?", a: "Ne supprime pas ton eSIM avant la fin du voyage : un QR code est à usage unique et une eSIM supprimée ne peut pas toujours être réinstallée. Si c'est arrivé, écris-nous rapidement avec ton numéro de commande, nous étudions chaque cas." },
      { q: "Faut-il scanner le QR code plusieurs fois ou sur plusieurs appareils ?", a: "Non. Une eSIM s'installe sur un seul appareil. Si tu voyages avec plusieurs appareils, achète une eSIM par appareil : tu peux les commander dans la même commande grâce au panier." },
    ],
  },
  {
    id: "activation",
    title: "Activer et utiliser ma data",
    items: [
      { q: "Quand démarre la durée de validité de mon forfait ?", a: "Elle commence à ta première connexion au réseau sur place, pas à l'achat ni à l'installation. Tu peux donc acheter et installer ton eSIM plusieurs semaines avant le départ." },
      { q: "Comment activer ma data une fois arrivé à destination ?", a: "À l'atterrissage, sélectionne l'eSIM KozzGo comme ligne de données mobiles, active l'itinérance de données (« data roaming ») sur cette ligne et attends quelques secondes que le réseau s'affiche. Garde ta ligne principale pour les appels et SMS." },
      { q: "Mon eSIM ne se connecte pas : que vérifier ?", a: "Dans l'ordre : 1) l'eSIM KozzGo est activée et choisie pour les données mobiles, 2) l'itinérance de données est activée sur cette ligne, 3) le mode avion puis un redémarrage du téléphone, 4) le réseau est sélectionné en automatique. Si rien ne marche, contacte-nous avec ton numéro de commande." },
      { q: "Comment suivre ma consommation de data ?", a: "Les réglages de ton téléphone affichent la data utilisée par ligne. Pour un suivi précis, remets les compteurs à zéro le jour de ton arrivée et compare-les au volume de ton forfait." },
      { q: "La data du forfait est-elle partagée sur toute la durée ?", a: "Oui : le volume est un total valable pendant toute la durée de validité, pas un quota par jour. Un forfait de 3 Go sur 10 jours te donne 3 Go à répartir comme tu veux sur la période. L'offre illimitée, elle, applique une politique d'usage raisonnable affichée avant l'achat." },
      { q: "Puis-je utiliser le partage de connexion (hotspot) ?", a: "Oui, le partage de connexion consomme la data de ton forfait comme n'importe quelle autre utilisation : prévois un volume plus généreux si tu partages avec un ordinateur ou d'autres personnes. Certains opérateurs locaux peuvent le restreindre : vérifie la fiche de ta destination." },
      { q: "Que se passe-t-il quand je n'ai plus de data ?", a: "La connexion s'arrête (ou passe en débit réduit pour l'offre illimitée après le seuil d'usage raisonnable). Tu peux commander un nouveau forfait pour la même destination : il arrive comme une nouvelle eSIM à installer à côté de la première. Notre [[estimateur de data|/destinations]] t'aide à bien choisir dès le départ." },
      { q: "Les données non utilisées sont-elles remboursées ou reportées ?", a: "Non : à la fin de la durée de validité, la data restante expire. Mieux vaut choisir un forfait adapté à ton usage ; l'estimateur de la page de chaque destination calcule le volume dont tu as besoin." },
      { q: "Que signifie « illimité » chez KozzGo ?", a: "Data sans compter, avec une politique d'usage raisonnable (fair use) affichée clairement avant l'achat : plein débit jusqu'à un seuil quotidien, puis débit réduit. Rien n'est caché dans les petites lignes." },
      { q: "L'eSIM fonctionne-t-elle dans l'avion, en croisière ou en mer ?", a: "Non, en général : les forfaits se connectent aux réseaux mobiles terrestres du pays choisi. Ils ne couvrent ni les vols, ni les réseaux satellites des navires. Vérifie la couverture indiquée sur la fiche de ta destination." },
    ],
  },
  {
    id: "forfaits",
    title: "Choisir un forfait",
    items: [
      { q: "De combien de data ai-je besoin pour mon voyage ?", a: "Pour un usage courant : environ 0,2 Go par jour pour les messages et les cartes, 0,6 Go avec réseaux sociaux et un peu de vidéo, 1,2 Go ou plus avec visio, streaming et partage de connexion. Sur la page de chaque destination, notre estimateur calcule le volume pour ta durée et ton usage." },
      { q: "Quels forfaits proposez-vous ?", a: "Quatre formats par destination : City-break (1 Go, 7 jours), Semaine (3 Go, 10 jours), Voyage (10 Go, 30 jours) et Illimité (10 jours, usage raisonnable). Voir toutes nos [[destinations|/destinations]]." },
      { q: "Dans combien de pays puis-je utiliser mon eSIM KozzGo ?", a: "Nos fiches couvrent plus de 180 destinations. Chaque forfait est valable dans le pays indiqué sur sa fiche ; vérifie la zone de couverture avant d'acheter si ton voyage traverse plusieurs pays." },
      { q: "Puis-je acheter plusieurs eSIM dans une même commande ?", a: "Oui : plusieurs appareils (une eSIM par appareil) ou plusieurs destinations, grâce au panier. Tu paies une seule fois et reçois une eSIM par ligne de commande." },
      { q: "Quelle est la différence entre un forfait local, régional et mondial ?", a: "Un forfait local fonctionne dans un seul pays, un forfait régional dans plusieurs pays d'une zone (Europe, Asie…), et un forfait mondial dans de nombreuses destinations. Nos fiches indiquent clairement les pays couverts ; l'abonnement [[Kozz Monde|/kozz-monde]] vise les voyageurs réguliers." },
      { q: "Qu'est-ce que l'abonnement Kozz Monde ?", a: "C'est une eSIM mensuelle utilisable dans plusieurs destinations au même prix, sans engagement : tu résilies en ligne, et la résiliation prend effet à la fin de la période en cours. Détails sur la page [[Kozz Monde|/kozz-monde]]." },
    ],
  },
  {
    id: "prix-paiement",
    title: "Prix et paiement",
    items: [
      { q: "Les prix affichés incluent-ils la TVA ?", a: "Oui, les prix sont affichés toutes taxes comprises (TTC). Le prix que tu vois est celui que tu paies : pas de frais cachés au moment du paiement." },
      { q: "Quels moyens de paiement acceptez-vous ?", a: "Le paiement se fait par carte bancaire via Stripe, un prestataire de paiement sécurisé. KozzGo n'a jamais accès aux données de ta carte." },
      { q: "Puis-je payer dans ma devise ?", a: "Oui : tu peux afficher les prix et payer dans de nombreuses devises. Le taux appliqué est indiqué sur ta facture ; la facture elle-même est établie en euros." },
      { q: "Vais-je recevoir une facture ?", a: "Oui, une facture PDF est jointe à ton e-mail de confirmation et reste disponible dans ton espace client, rubrique factures." },
      { q: "Puis-je enregistrer ma carte pour mes prochains achats ?", a: "Oui, depuis ton [[profil|/profil]] tu peux enregistrer une carte via Stripe : seuls les derniers chiffres et la date d'expiration sont visibles chez nous." },
      { q: "Comment utiliser un code ou une remise de parrainage ?", a: "La remise de parrainage (1,50 € pour le filleul et le parrain) s'applique automatiquement au panier quand elle est disponible. Elle est débloquée quand le filleul et le parrain ont chacun déjà payé une commande." },
    ],
  },
  {
    id: "remboursement",
    title: "Remboursement et garanties",
    items: [
      { q: "Puis-je être remboursé si mon eSIM ne fonctionne pas ?", a: "Si ton eSIM ne s'installe pas ou ne fonctionne pas dans le pays prévu alors que ton téléphone est compatible et débloqué, contacte-nous avec ton numéro de commande : nous cherchons une solution (nouvelle eSIM, forfait équivalent) ou nous te remboursons la part non utilisée. Voir la [[politique de remboursement|/remboursement]]." },
      { q: "Et si je n'ai pas reçu mon QR code ?", a: "Écris-nous : nous te le renvoyons ou nous te remboursons intégralement. Pense à regarder tes courriers indésirables et la page de confirmation de commande, où ton QR code est aussi disponible." },
      { q: "Quand l'eSIM n'est-elle pas remboursable ?", a: "Dans le cas d'un téléphone incompatible ou verrouillé par un opérateur, d'une eSIM déjà activée et consommée normalement, ou d'une erreur de destination au moment de la commande (nous étudions toutefois chaque cas si l'eSIM n'a pas encore été activée)." },
      { q: "Ai-je un droit de rétractation de 14 jours ?", a: "Les eSIM sont des produits numériques livrés immédiatement. Comme tu demandes l'exécution immédiate avant de payer, le droit de rétractation ne s'applique plus une fois l'eSIM délivrée (article L221-28 du Code de la consommation). Détails : [[droit de rétractation|/retractation]]." },
      { q: "En combien de temps suis-je remboursé ?", a: "Les remboursements acceptés sont effectués sur le moyen de paiement utilisé dans un délai maximum de 14 jours après l'acceptation de ta demande." },
      { q: "Quelles garanties légales s'appliquent à mon achat ?", a: "Tu bénéficies de la garantie légale de conformité et de la garantie des vices cachés, qui s'ajoutent à nos engagements. Voir nos [[conditions générales de vente|/cgv]]." },
    ],
  },
  {
    id: "impact",
    title: "Dons, impact et parrainage",
    items: [
      { q: "Comment fonctionne le don à une cause ?", a: "À chaque achat, 10 % du prix hors taxes est reversé à la cause de ton choix parmi 12 causes (repas, reforestation, eau potable, éducation connectée…). Ce don est pris sur notre marge : tu ne paies pas plus cher. Découvre-les sur la page [[Impact|/impact]]." },
      { q: "Qu'est-ce que le Passeport d'impact ?", a: "C'est le récapitulatif, calculé à partir de tes commandes payées, des dons que tu as générés, converti en unités concrètes (repas offerts, arbres plantés, jours de connexion…). Tu peux le partager par WhatsApp ou par e-mail avec ton code de parrainage." },
      { q: "Comment fonctionne le parrainage ?", a: "Partage ton lien de parrainage : quand la personne invitée crée son compte et paie sa première commande, vous recevez chacun 1,50 € de remise, à condition que tu aies toi-même déjà payé au moins une commande. Tout est dans ton [[profil|/profil]], rubrique Parrainage." },
      { q: "Les unités d'impact sont-elles garanties ?", a: "Les chiffres sont indicatifs : ils estiment ce que ton don finance, en attendant la finalisation des conventions avec nos associations partenaires. Nous le précisons sur la page [[Impact|/impact]]." },
    ],
  },
  {
    id: "compte-securite",
    title: "Compte, sécurité et données",
    items: [
      { q: "Faut-il un compte pour acheter une eSIM ?", a: "Non, tu peux commander sans compte avec ton adresse e-mail. Un compte te permet de retrouver tes eSIM, tes factures, ton Passeport d'impact et le parrainage." },
      { q: "J'ai oublié mon mot de passe : comment le réinitialiser ?", a: "Sur la page de [[connexion|/connexion]], clique sur « Mot de passe oublié ? » : nous t'envoyons par e-mail un lien valable 30 minutes pour choisir un nouveau mot de passe. Pense à regarder tes indésirables." },
      { q: "Mes données personnelles sont-elles protégées ?", a: "Oui : ton mot de passe est haché (Argon2) et ne peut pas être lu, le paiement est traité par Stripe, et nous ne collectons que ce qui est nécessaire à ta commande. Voir notre [[politique de confidentialité|/confidentialite]]." },
      { q: "Comment supprimer mon compte ?", a: "Depuis ton [[profil|/profil]], tu peux supprimer ton compte à tout moment : tes commandes sont conservées de façon anonymisée pour nos obligations comptables et les numéros de proches sont effacés." },
      { q: "Comment contacter le support ?", a: "Par e-mail à l'adresse indiquée dans nos [[mentions légales|/mentions-legales]], ou via l'assistant de chat en bas à droite du site. En cas d'échec d'installation, un humain prend le relais en moins de 5 minutes." },
    ],
  },
];

export const FAQ_FLAT = FAQ_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id })));
// Les 6 questions affichées sur l'accueil (clés = début de la question)
export const FAQ_HOME = ["Mon téléphone est-il compatible eSIM ?", "Comment installer mon eSIM sur iPhone ?", "Quand démarre la durée de validité de mon forfait ?", "Puis-je utiliser le partage de connexion (hotspot) ?", "Puis-je être remboursé si mon eSIM ne fonctionne pas ?", "Comment fonctionne le don à une cause ?"]
  .map((q) => FAQ_FLAT.find((f) => f.q === q)).filter(Boolean);

// [[texte|/chemin]] -> segments {t} ou {t, to}
export function parseLinks(s) {
  const out = [];
  const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index) });
    out.push({ t: m[1], to: m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last) });
  return out;
}
export const plain = (s) => s.replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, "$1");
