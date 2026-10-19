// Compléments des 4 articles à fort potentiel (compatibilité, installation, roaming, data) : sections supplémentaires, sources officielles, date de mise à jour.
// Les sections s'ajoutent APRÈS celles de l'article d'origine (blogContent.js). `sources` : liens externes vers des pages officielles (affichés en bas de l'article).
// Règle éditoriale : on cite la source officielle de chaque affirmation vérifiable (Apple, ARCEP…) et on n'avance pas de chiffre qu'on ne peut pas sourcer.

export const EXTRA = {
  "telephone-compatible-esim": {
    updated: "2026-10-19",
    sections: [
      { h: "Quels iPhone sont compatibles eSIM ?", p: ["D'après la page d'assistance d'Apple, l'eSIM nécessite un iPhone XS, XS Max, XR ou un modèle plus récent, et un opérateur ou un fournisseur de services qui la prend en charge. Tous les iPhone vendus depuis 2018 ne se valent pas pour autant : la région de vente compte (voir plus bas). Pour les modèles précis, la [[liste des téléphones compatibles|/telephones-compatibles]] se filtre par marque et par modèle."] },
      { h: "Et chez Samsung, Google et les autres Android ?", p: ["Côté Android, la prise en charge dépend de la marque, du modèle et parfois du pays de vente. Les familles les plus courantes sont les Samsung Galaxy S20 et suivants, les Google Pixel 3 et suivants et plusieurs pliants. Une même gamme peut exister avec ou sans eSIM selon la version : ne te fie jamais au nom du modèle seul et fais le test *#06#."], list: ["Samsung : Paramètres > Connexions > Gestionnaire de SIM, option « Ajouter une eSIM ».", "Pixel : Paramètres > Réseau et Internet > SIM, option « Télécharger une SIM ».", "Autres marques : cherche « eSIM » dans la barre de recherche des paramètres."] },
      { h: "Pourquoi le même modèle peut ou non avoir l'eSIM", p: ["Les constructeurs adaptent leurs appareils aux réglementations locales. Selon la page d'Apple, en Chine continentale seuls quelques modèles récents acceptent l'eSIM, et à Hong Kong et à Macao certains modèles ont deux emplacements nano-SIM à la place. Un iPhone acheté en voyage ou d'occasion à l'étranger peut donc ne pas avoir d'eSIM alors que le même modèle acheté en France en a une."] },
      { h: "Test de compatibilité : que signifie le résultat ?", p: ["En composant *#06#, tu vois les identifiants de ton appareil. Un numéro appelé EID signifie que la puce eSIM est présente. Son absence ne veut pas dire que ton téléphone est défectueux : il n'a simplement pas d'eSIM. Dans le doute, l'option « Ajouter une eSIM » dans les réglages de la ligne mobile tranche."] },
      { h: "Les erreurs qui font croire qu'un téléphone n'est pas compatible", p: [], list: ["Le téléphone est verrouillé par l'opérateur : l'option existe mais l'eSIM d'un autre fournisseur est refusée. Voir [[débloquer son téléphone avant de partir|/blog/debloquer-son-telephone-avant-de-partir]].", "Le système n'est pas à jour : certaines options n'apparaissent qu'après une mise à jour d'iOS ou d'Android.", "Tu cherches au mauvais endroit : le menu change d'une marque à l'autre et d'une version à l'autre."] },
      { h: "Si ton téléphone n'est pas compatible", p: ["Tu as deux solutions : emprunter ou utiliser un téléphone compatible pour le voyage, ou te tourner vers une SIM locale ou le roaming. Le comparatif complet est dans [[eSIM, roaming ou SIM locale|/blog/esim-roaming-ou-sim-locale]]."] },
    ],
    sources: [
      { t: "Apple : Configurer une eSIM sur iPhone (modèles compatibles, exceptions par région)", u: "https://support.apple.com/en-us/118669" },
    ],
  },
  "installer-esim-iphone-android": {
    updated: "2026-10-19",
    sections: [
      { h: "Avant de commencer : les 4 prérequis", p: [], list: ["Un téléphone compatible eSIM et débloqué (test *#06#).", "Une connexion Wi-Fi stable, pour télécharger le profil.", "L'e-mail de commande ouvert sur un autre écran, ou la page de confirmation sur ordinateur, pour scanner le QR code.", "Ton numéro de commande à portée de main, au cas où tu aurais besoin du support."] },
      { h: "Le déroulé complet, sur iPhone", p: ["D'après Apple, tout se passe dans Réglages > Données cellulaires (ou Réglages > Mobile selon ta langue et ta version d'iOS) : tu choisis « Ajouter une eSIM », puis « Utiliser un code QR » (il faut parfois passer par « Autres options »). Tu cadres le QR code, ou tu saisis les informations à la main. L'iPhone te propose ensuite de nommer la ligne et de choisir quelle ligne sert pour quoi."], steps: ["Nomme la ligne « Voyage » pour ne pas la confondre avec la principale.", "Garde ta ligne habituelle pour les appels et les SMS.", "Choisis la ligne principale comme ligne par défaut pour iMessage et FaceTime si tu veux les garder sur ton numéro.", "Mets l'eSIM de voyage comme ligne de données mobiles seulement à l'arrivée, et active l'itinérance de données sur cette ligne."] },
      { h: "Le déroulé complet, sur Android", p: ["Sur Samsung : Paramètres > Connexions > Gestionnaire de SIM > Ajouter une eSIM, puis « Scanner le code QR de l'opérateur ». Sur Pixel : Paramètres > Réseau et Internet > SIM > « Télécharger une SIM ». Les libellés changent selon la marque : si tu ne trouves pas l'option, tape « eSIM » dans la recherche des paramètres."] },
      { h: "Le piège classique : un seul téléphone", p: ["Si tu lis l'e-mail sur le téléphone à équiper, tu ne peux pas scanner ton propre écran. Trois solutions : ouvrir le QR code sur un ordinateur, une tablette ou le téléphone d'un proche ; l'enregistrer en image et le choisir depuis tes photos si ton téléphone le permet ; ou saisir manuellement l'adresse SM-DP+ et le code d'activation fournis dans l'e-mail."] },
      { h: "Après l'installation : ce que tu dois vérifier", p: [], steps: ["La ligne eSIM apparaît dans les réglages de ta ligne mobile.", "Elle est bien activée (interrupteur allumé), sans pour autant être choisie pour les données avant le départ.", "Tu as noté où trouver le code et l'adresse SM-DP+ dans l'e-mail, au cas où.", "Tu n'as supprimé aucun profil : une eSIM supprimée ne se réinstalle pas toujours."] },
      { h: "Et si l'installation échoue ?", p: ["Les causes les plus fréquentes sont un téléphone verrouillé, un Wi-Fi instable ou un QR code déjà utilisé. Ta marche à suivre est dans [[QR code eSIM non valide : les solutions|/blog/qr-code-esim-non-valide-solutions]]. Si tu es bloqué, un humain prend le relais : voir [[la politique de remboursement|/remboursement]]."] },
    ],
    sources: [
      { t: "Apple : Configurer une eSIM sur iPhone", u: "https://support.apple.com/en-us/118669" },
      { t: "Apple : Configurer le service cellulaire sur iPhone", u: "https://support.apple.com/guide/iphone/iph3f11fba92/ios" },
    ],
  },
  "esim-roaming-ou-sim-locale": {
    updated: "2026-10-19",
    sections: [
      { h: "Ce que dit la réglementation sur le roaming", p: ["Selon l'ARCEP, le principe du « roam like at home » permet d'utiliser son mobile aux conditions de son pays d'origine dans l'Espace économique européen (l'UE, plus l'Islande, le Liechtenstein et la Norvège). Depuis le 1er janvier 2026, l'ARCEP indique aussi que les frais d'itinérance sont supprimés pour les déplacements vers l'Ukraine et la Moldavie."] },
      { h: "Hors de ces zones, des frais peuvent s'appliquer", p: ["L'ARCEP précise que ce principe ne s'applique pas dans les pays hors UE, ni à bord des navires et des avions, où des frais supplémentaires peuvent s'appliquer. Le Royaume-Uni est considéré comme un pays tiers depuis le 1er janvier 2021 : les opérateurs peuvent volontairement maintenir la suppression des frais, mais ce n'est pas une obligation. Consulte ton contrat ou ton opérateur avant le départ."] },
      { h: "Le piège des réseaux à bord des avions et des bateaux", p: ["Ton téléphone peut se connecter automatiquement aux réseaux mobiles des navires ou des avions, facturés hors forfait. L'ARCEP conseille de désactiver la connexion à ces réseaux non terrestres (le mode avion suffit) pour éviter des frais imprévus, qui peuvent ne pas être plafonnés. C'est aussi vrai avec une eSIM de voyage : elle couvre les réseaux terrestres du pays, pas ceux des bateaux."] },
      { h: "Quand le roaming reste le bon choix", p: ["Pour un week-end dans l'UE, ton forfait habituel suffit généralement, sans rien acheter. Il peut y avoir des limites d'usage raisonnable sur les gros forfaits : vérifie la mention dans ton contrat."] },
      { h: "Quand l'eSIM devient plus intéressante", p: [], list: ["Tu pars hors UE pour plus de quelques jours.", "Tu veux un volume et un prix connus avant le départ.", "Tu veux garder ton numéro actif pour les SMS (banque, authentification).", "Tu voyages dans plusieurs pays : un forfait régional ou [[Kozz Monde|/kozz-monde]] évite de racheter à chaque frontière."] },
      { h: "Combien de temps faut-il pour s'organiser ?", p: ["Avec une eSIM, il suffit de dix minutes chez soi : vérifier la compatibilité, choisir son forfait, installer le QR code. Avec une SIM locale, compte du temps à l'arrivée et souvent une pièce d'identité. Avec le roaming, il n'y a rien à faire, mais il faut avoir lu son contrat avant."] },
    ],
    sources: [
      { t: "ARCEP : L'itinérance (roaming) en Europe et hors Europe", u: "https://www.arcep.fr/demarches-et-services/litinerance-roaming-en-europe-au-sein-de-lespace-economique-europeen.html" },
    ],
  },
  "quel-forfait-esim-choisir": {
    updated: "2026-10-19",
    sections: [
      { h: "Comment estimer ta consommation, activité par activité", p: ["Ces ordres de grandeur sont des moyennes à ajuster à ton usage : la qualité de la vidéo, la résolution des photos envoyées et les mises à jour automatiques les font varier fortement. Le plus fiable reste de relever la consommation réelle de ton téléphone sur une semaine normale : dans les réglages, la data mobile est détaillée par application."], list: ["Messages texte et cartes : très peu de data, c'est le poste le plus léger.", "Réseaux sociaux : le défilement de photos et de vidéos courtes fait grimper la consommation.", "Vidéo en streaming : le poste le plus lourd ; baisse la qualité en voyage.", "Visioconférence et partage de connexion : prévois une marge importante."] },
      { h: "Les réglages qui font économiser des Go", p: [], list: ["Désactive les mises à jour automatiques d'applications sur données mobiles.", "Télécharge tes cartes hors ligne avant de partir, en Wi-Fi.", "Règle la qualité des vidéos et des sauvegardes de photos sur Wi-Fi seulement.", "Surveille la consommation par application dans les réglages et coupe celles qui consomment en arrière-plan."] },
      { h: "Un forfait trop petit ou trop grand : lequel est pire ?", p: ["Trop petit : tu risques d'être coupé au mauvais moment, mais tu peux commander un forfait supplémentaire pour la même destination, qui arrive comme une nouvelle eSIM. Trop grand : tu paies pour une data qui expire à la fin de la validité, sans remboursement. Dans le doute, prends le volume juste au-dessus de ton estimation, pas le double."] },
      { h: "Durée du séjour et durée de validité", p: ["La validité démarre à ta première connexion sur place, pas à l'achat. Si ton séjour dépasse la durée du forfait, prévois un second forfait ou un format plus long. Pour un mois de voyage, le format Voyage (10 Go, 30 jours) est conçu pour cela ; pour dix jours de travail à distance, regarde l'illimité."] },
      { h: "Le bon réflexe pour comparer des offres", p: ["Compare toujours trois choses : le volume réel (en Go), la durée de validité, et le prix TTC affiché avant paiement. Ensuite, vérifie ce qui n'est pas dans le prix : politique d'usage raisonnable, partage de connexion, pays couverts. Les offres changent souvent : relis les conditions avant l'achat."] },
    ],
    sources: [],
  },
};
