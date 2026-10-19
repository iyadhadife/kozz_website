// Blog KozzGo : contenu MODIFIABLE ICI (une seule source pour /blog, chaque article et le balisage Article de Google).
//
// Un article par thème de la FAQ (voir faqContent.js) : chaque question de la FAQ y sert de H2/H3, avec le mot-clé tel que les gens le tapent.
// Les règles (remboursement, durée de validité, partage de connexion, parrainage…) sont celles de la FAQ : si l'une change, change-la aux deux endroits.
// Ajouter un article : l'ajouter ici ET dans BLOG_SLUGS de backend/app/seo.py (sitemap) ET dans la regex `spa_known` de frontend/nginx.conf, puis relancer le prérendu.
//
// Syntaxe des paragraphes : [[texte du lien|/chemin]] crée un lien interne. `list` = liste à puces. `steps` = liste numérotée.

export const BLOG_DATE = "2026-10-19";

const BASE = [
  {
    slug: "qu-est-ce-qu-une-esim",
    group: "comprendre",
    emoji: "📲",
    title: "Qu'est-ce qu'une eSIM ? Le guide complet pour voyager sans roaming",
    description: "eSIM, SIM physique, roaming : comment ça marche, ce que ça change pour ton numéro, tes appels et ton budget. Le guide simple de l'eSIM de voyage.",
    intro: "Tu pars bientôt et tu entends partout « prends une eSIM ». Concrètement, c'est quoi, comment ça marche et est-ce vraiment plus simple que le roaming de ton opérateur ? Voici l'essentiel, sans jargon.",
    sections: [
      { h: "Qu'est-ce qu'une eSIM ?", p: ["Une eSIM est une carte SIM intégrée à ton téléphone. Au lieu d'insérer une puce en plastique, tu installes un profil numérique en scannant un QR code. Tu peux garder ta ligne habituelle et ajouter une eSIM de voyage en même temps, sans rien démonter."] },
      { h: "Comment fonctionne une eSIM de voyage ?", p: ["Le principe tient en quatre étapes :"], steps: ["Tu choisis ta destination et ton forfait de data.", "Tu paies et tu reçois un QR code par e-mail, immédiatement.", "Tu scannes le QR code dans les réglages de ton téléphone.", "À l'arrivée, ta data se connecte automatiquement au réseau d'un opérateur local."], after: ["Pas de carte à changer, pas de livraison, pas de file d'attente à l'aéroport. Le détail pas à pas est sur la page [[Comment ça marche|/comment-ca-marche]]."] },
      { h: "Quelle différence entre une eSIM et une SIM physique ?", p: ["La SIM physique est une carte qu'on insère et qu'on peut perdre. L'eSIM est un profil logiciel, installé en quelques minutes, qui s'ajoute à ta ligne sans la remplacer. Elle est livrée par e-mail : tu peux l'acheter la veille du départ, ou depuis l'avion si tu as du Wi-Fi."] },
      { h: "Peut-on garder son numéro de téléphone ?", p: ["Oui. Ton numéro habituel reste sur ta SIM principale : tu continues à recevoir tes SMS de vérification (banque, messageries) pendant que l'eSIM gère internet. C'est l'un des grands avantages face à une SIM locale, qui t'oblige à retirer ta puce."] },
      { h: "Peut-on appeler et envoyer des SMS avec une eSIM de voyage ?", p: ["Les forfaits KozzGo sont des forfaits de données. Pour appeler et écrire, utilise WhatsApp, FaceTime, Messenger ou Signal : ces applications passent par la data de ton eSIM, sans frais de téléphonie. Pour la plupart des voyageurs, c'est déjà ce qu'ils font."] },
      { h: "Pourquoi choisir une eSIM plutôt que le roaming ?", p: ["Hors de l'Union européenne, le roaming est souvent facturé cher ou plafonné à de petits volumes. Une eSIM de voyage te donne un volume de data fixé à l'avance, à un prix affiché avant l'achat. Pas de mauvaise surprise sur ta facture au retour. Nous détaillons la comparaison dans [[eSIM, roaming ou SIM locale|/blog/esim-roaming-ou-sim-locale]]."] },
      { h: "Et si mon téléphone n'est pas compatible ?", p: ["Avant d'acheter, vérifie-le : c'est gratuit et ça prend dix secondes. Tout est expliqué dans [[Mon téléphone est-il compatible eSIM ?|/blog/telephone-compatible-esim]]."] },
    ],
    related: ["telephone-compatible-esim", "esim-roaming-ou-sim-locale", "installer-esim-iphone-android"],
  },
  {
    slug: "telephone-compatible-esim",
    group: "compatibilite",
    emoji: "📱",
    title: "Mon téléphone est-il compatible eSIM ? Le test en 10 secondes",
    description: "iPhone, Samsung, Pixel : comment savoir si ton téléphone supporte l'eSIM (test *#06#), pourquoi il doit être débloqué, et le cas des iPhone chinois.",
    intro: "Avant d'acheter une eSIM de voyage, une seule question compte : ton téléphone la supporte-t-il ? Voici comment le savoir en dix secondes, et quoi faire en cas de doute.",
    sections: [
      { h: "Comment savoir rapidement si mon téléphone supporte l'eSIM ?", p: ["Compose *#06# sur le clavier de ton téléphone. Si un numéro EID s'affiche, ton téléphone est compatible eSIM. Tu peux aussi chercher « Ajouter une eSIM » dans les réglages de ta ligne mobile : si l'option existe, c'est bon."] },
      { h: "Quels téléphones sont compatibles eSIM ?", p: ["La plupart des iPhone depuis les XS et XR le sont, ainsi que de nombreux Android récents : Samsung Galaxy S20 et suivants, Google Pixel 3 et suivants, entre autres. Tape ton modèle dans notre [[liste des téléphones compatibles|/telephones-compatibles]] pour une réponse immédiate."] },
      { h: "Mon téléphone doit-il être débloqué ?", p: ["Oui. Un téléphone verrouillé par un opérateur (SIM lock) refuse les eSIM d'autres fournisseurs. Demande le déblocage à ton opérateur avant de partir : en France, il est gratuit une fois le forfait terminé ou après 3 mois d'abonnement. C'est la première cause d'échec d'installation, alors fais-le en premier."] },
      { h: "Les iPhone vendus en Chine, à Hong Kong ou à Macao sont-ils compatibles ?", p: ["Selon Apple, en Chine continentale seuls quelques modèles récents acceptent l'eSIM, et à Hong Kong et à Macao certains modèles ont deux nano-SIM au lieu d'une eSIM. Détails dans [[iPhone de Chine, Hong Kong ou Macao : l'eSIM fonctionne-t-elle ?|/blog/iphone-chine-hong-kong-macao-esim]]."] },
      { h: "Les tablettes, montres et ordinateurs portables sont-ils compatibles ?", p: ["Certains iPad, tablettes Android et PC portables (Windows avec modem cellulaire) acceptent les eSIM de données. Retrouve-les dans la [[liste des appareils compatibles|/telephones-compatibles]], onglets Tablettes, Montres et Ordinateurs."] },
      { h: "Mon modèle n'est pas dans la liste : que faire ?", p: ["La liste n'est pas exhaustive. Si ton modèle est récent, fais le test *#06# ou cherche « Ajouter une eSIM » dans les réglages : c'est la vérification la plus fiable. En cas de doute, écris-nous avant d'acheter : un humain te répond."] },
      { h: "Résumé : la checklist avant d'acheter", p: [], list: ["Le test *#06# affiche un numéro EID.", "Le téléphone n'est pas verrouillé par un opérateur.", "Tu as du Wi-Fi pour installer l'eSIM.", "Tu connais ta destination et la durée de ton séjour."], after: ["Tout est bon ? Passe à l'étape suivante : [[installer son eSIM sur iPhone ou Android|/blog/installer-esim-iphone-android]]."] },
    ],
    related: ["installer-esim-iphone-android", "qu-est-ce-qu-une-esim", "esim-ne-fonctionne-pas-remboursement"],
  },
  {
    slug: "installer-esim-iphone-android",
    group: "installation",
    emoji: "⚙️",
    title: "Comment installer son eSIM sur iPhone et Android (pas à pas)",
    description: "Installer une eSIM de voyage en 2 minutes : étapes iPhone et Android, installation manuelle sans QR code, QR code non valide, quand installer.",
    intro: "Installer une eSIM prend une à deux minutes. Voici la marche à suivre sur iPhone et sur Android, et les erreurs à éviter, comme supprimer l'eSIM par erreur.",
    sections: [
      { h: "Quand installer mon eSIM : avant ou après le départ ?", p: ["Idéalement avant le départ, chez toi, avec une connexion Wi-Fi stable. Une fois installée, ton eSIM reste en attente et se connecte dès ton arrivée : la durée de validité ne démarre qu'à ta première connexion au réseau sur place. Tu peux donc l'installer des semaines à l'avance."] },
      { h: "Comment installer mon eSIM sur iPhone ?", p: [], steps: ["Ouvre Réglages > Données cellulaires > Ajouter une eSIM.", "Choisis « Utiliser un code QR » et scanne le QR code reçu par e-mail.", "Donne un nom à la ligne, par exemple « Voyage », et choisis-la pour les données mobiles à l'arrivée."], after: ["Sur iOS 17.4 et suivants, le lien d'installation de l'e-mail permet aussi d'installer l'eSIM en un geste."] },
      { h: "Comment installer mon eSIM sur Android ?", p: ["Le chemin dépend de la marque. Sur Samsung : Paramètres > Connexions > Gestionnaire de SIM > Ajouter une eSIM. Sur Pixel : Paramètres > Réseau et Internet > SIM > Télécharger une SIM. Choisis « Scanner le QR code » et suis les instructions."] },
      { h: "Puis-je installer l'eSIM sans scanner de QR code ?", p: ["Oui, avec la saisie manuelle : ton e-mail contient l'adresse SM-DP+ et le code d'activation à entrer dans les réglages (« Saisir les informations manuellement »). C'est utile si tu lis l'e-mail sur le téléphone même où tu veux installer l'eSIM, puisque tu ne peux pas scanner ton propre écran."] },
      { h: "Faut-il être connecté à internet pour installer l'eSIM ?", p: ["Oui : le téléphone télécharge le profil eSIM, donc il faut du Wi-Fi ou de la data sur ta ligne habituelle pendant l'installation."] },
      { h: "Mon QR code affiche « code non valide » : que faire ?", p: ["Un QR code d'eSIM ne s'installe qu'une seule fois. Si l'installation a déjà été lancée, il n'est plus valable. Vérifie d'abord que l'eSIM n'est pas déjà présente dans les réglages de ton téléphone. Sinon, contacte-nous avec ton numéro de commande : un humain prend le relais, voir la [[politique de remboursement|/remboursement]]."] },
      { h: "Puis-je réinstaller mon eSIM si je la supprime par erreur ?", p: ["Ne supprime pas ton eSIM avant la fin du voyage : un QR code est à usage unique et une eSIM supprimée ne peut pas toujours être réinstallée. Si c'est arrivé, écris-nous rapidement avec ton numéro de commande : nous étudions chaque cas."] },
      { h: "Faut-il scanner le QR code sur plusieurs appareils ?", p: ["Non. Une eSIM s'installe sur un seul appareil. Si tu voyages avec plusieurs appareils, achète une eSIM par appareil : tu peux les commander dans la même commande grâce au panier."] },
    ],
    related: ["activer-esim-a-l-arrivee", "telephone-compatible-esim", "esim-ne-fonctionne-pas-remboursement"],
  },
  {
    slug: "activer-esim-a-l-arrivee",
    group: "activation",
    emoji: "🛬",
    title: "Activer son eSIM à l'arrivée : data, hotspot et dépannage",
    description: "Activer la data de ton eSIM à l'atterrissage, suivre ta consommation, utiliser le partage de connexion, et que faire si l'eSIM ne se connecte pas.",
    intro: "Tu as installé ton eSIM, tu atterris. Voici les trois réglages à faire, ce qui se passe quand la data est épuisée, et la liste de vérification si rien ne s'affiche.",
    sections: [
      { h: "Quand démarre la durée de validité de mon forfait ?", p: ["Elle commence à ta première connexion au réseau sur place, pas à l'achat ni à l'installation. Acheter et installer ton eSIM avant le départ ne consomme donc pas tes jours de voyage."] },
      { h: "Comment activer ma data une fois arrivé à destination ?", p: [], steps: ["À l'atterrissage, sélectionne l'eSIM KozzGo comme ligne de données mobiles.", "Active l'itinérance de données (« data roaming ») sur cette ligne.", "Attends quelques secondes que le réseau local s'affiche.", "Garde ta ligne principale pour les appels et SMS."] },
      { h: "Mon eSIM ne se connecte pas : que vérifier ?", p: ["Procède dans l'ordre :"], steps: ["L'eSIM KozzGo est activée et choisie pour les données mobiles.", "L'itinérance de données est activée sur cette ligne.", "Active le mode avion quelques secondes, puis redémarre le téléphone.", "Le réseau est sélectionné en automatique."], after: ["Si rien ne marche, contacte-nous avec ton numéro de commande : en cas d'échec d'installation, un humain prend le relais en moins de 5 minutes."] },
      { h: "Comment suivre ma consommation de data ?", p: ["Les réglages de ton téléphone affichent la data utilisée par ligne. Pour un suivi précis, remets les compteurs à zéro le jour de ton arrivée et compare-les au volume de ton forfait."] },
      { h: "La data est-elle partagée sur toute la durée ?", p: ["Oui : le volume est un total valable pendant toute la durée de validité, pas un quota par jour. Un forfait de 3 Go sur 10 jours te donne 3 Go à répartir comme tu veux. L'offre illimitée applique, elle, une politique d'usage raisonnable affichée avant l'achat."] },
      { h: "Puis-je utiliser le partage de connexion (hotspot) ?", p: ["Oui. Le partage de connexion consomme la data de ton forfait comme n'importe quelle autre utilisation : prévois un volume plus généreux si tu partages avec un ordinateur ou d'autres personnes. Certains opérateurs locaux peuvent le restreindre : vérifie la fiche de ta destination."] },
      { h: "Que se passe-t-il quand je n'ai plus de data ?", p: ["La connexion s'arrête, ou passe en débit réduit pour l'offre illimitée après le seuil d'usage raisonnable. Tu peux commander un nouveau forfait pour la même destination : il arrive comme une nouvelle eSIM à installer à côté de la première. La data non utilisée n'est ni remboursée ni reportée : à la fin de la validité, elle expire."] },
      { h: "Que signifie « illimité » ?", p: ["Une data sans compter, avec une politique d'usage raisonnable (fair use) affichée clairement avant l'achat : plein débit jusqu'à un seuil quotidien, puis débit réduit."] },
      { h: "L'eSIM fonctionne-t-elle dans l'avion ou en croisière ?", p: ["En général non : les forfaits se connectent aux réseaux mobiles terrestres du pays choisi. Ils ne couvrent ni les vols, ni les réseaux satellites des navires."] },
    ],
    related: ["quel-forfait-esim-choisir", "installer-esim-iphone-android", "esim-ne-fonctionne-pas-remboursement"],
  },
  {
    slug: "quel-forfait-esim-choisir",
    group: "forfaits",
    emoji: "🧮",
    title: "Quel forfait eSIM choisir ? Combien de data pour ton voyage",
    description: "De combien de Go as-tu besoin ? Estimation par usage, forfaits local, régional et mondial, plusieurs eSIM dans une commande et abonnement Kozz Monde.",
    intro: "Trop peu de data et tu te retrouves coupé en pleine ville. Trop, et tu paies pour rien : la data non utilisée expire. Voici comment viser juste.",
    sections: [
      { h: "De combien de data ai-je besoin pour mon voyage ?", p: ["Pour un usage courant, compte :"], list: ["environ 0,2 Go par jour pour les messages et les cartes ;", "0,6 Go par jour avec réseaux sociaux et un peu de vidéo ;", "1,2 Go par jour ou plus avec visio, streaming et partage de connexion."], after: ["Sur la page de chaque destination, notre estimateur calcule le volume pour ta durée et ton usage."] },
      { h: "Quels forfaits propose KozzGo ?", p: ["Quatre formats par destination :"], list: ["City-break : 1 Go, 7 jours ;", "Semaine : 3 Go, 10 jours ;", "Voyage : 10 Go, 30 jours ;", "Illimité : 10 jours, usage raisonnable."], after: ["Retrouve-les dans toutes nos [[destinations|/destinations]]."] },
      { h: "Dans combien de pays puis-je utiliser mon eSIM ?", p: ["Nos fiches couvrent plus de 180 destinations. Chaque forfait est valable dans le pays indiqué sur sa fiche : vérifie la zone de couverture avant d'acheter si ton voyage traverse plusieurs pays."] },
      { h: "Forfait local, régional ou mondial : quelle différence ?", p: ["Un forfait local fonctionne dans un seul pays, un forfait régional dans plusieurs pays d'une zone (Europe, Asie…), un forfait mondial dans de nombreuses destinations. Nos fiches indiquent clairement les pays couverts."] },
      { h: "Puis-je acheter plusieurs eSIM dans une même commande ?", p: ["Oui : plusieurs appareils (une eSIM par appareil) ou plusieurs destinations, grâce au panier. Tu paies une seule fois et tu reçois une eSIM par ligne de commande."] },
      { h: "Qu'est-ce que l'abonnement Kozz Monde ?", p: ["C'est une eSIM mensuelle utilisable dans plusieurs destinations au même prix, sans engagement : tu résilies en ligne, et la résiliation prend effet à la fin de la période en cours. Pense-y si tu voyages souvent : détails sur la page [[Kozz Monde|/kozz-monde]]."] },
      { h: "Mon conseil pour ne pas se tromper", p: ["Prends le volume juste au-dessus de ton estimation : s'il te manque de la data, tu peux toujours commander un forfait supplémentaire pour la même destination, mais la data inutilisée n'est pas remboursée. Et pour les voyages d'un mois, le format Voyage est généralement le plus avantageux au Go."] },
    ],
    related: ["activer-esim-a-l-arrivee", "payer-esim-prix-tva-facture", "esim-roaming-ou-sim-locale"],
  },
  {
    slug: "payer-esim-prix-tva-facture",
    group: "prix-paiement",
    emoji: "💳",
    title: "Payer son eSIM : prix TTC, devises, facture et carte enregistrée",
    description: "Les prix incluent-ils la TVA ? Quels moyens de paiement, quelles devises, facture PDF, carte enregistrée et remise de parrainage : tout sur le paiement.",
    intro: "Le prix affiché est le prix payé. Voici comment fonctionne le paiement chez KozzGo : TVA, devises, facture, carte enregistrée et remise de parrainage.",
    sections: [
      { h: "Les prix affichés incluent-ils la TVA ?", p: ["Oui, les prix sont affichés toutes taxes comprises (TTC). Le prix que tu vois est celui que tu paies : pas de frais cachés au moment du paiement."] },
      { h: "Quels moyens de paiement acceptez-vous ?", p: ["Le paiement se fait par carte bancaire via Stripe, un prestataire de paiement sécurisé. KozzGo n'a jamais accès aux données de ta carte."] },
      { h: "Puis-je payer dans ma devise ?", p: ["Oui : tu peux afficher les prix et payer dans de nombreuses devises. Le taux appliqué est indiqué sur ta facture ; la facture elle-même est établie en euros."] },
      { h: "Vais-je recevoir une facture ?", p: ["Oui. Une facture PDF est jointe à ton e-mail de confirmation et reste disponible dans ton espace client, rubrique factures."] },
      { h: "Puis-je enregistrer ma carte pour mes prochains achats ?", p: ["Oui, depuis ton [[profil|/profil]] tu peux enregistrer une carte via Stripe : seuls les derniers chiffres et la date d'expiration sont visibles chez nous."] },
      { h: "Comment utiliser un code ou une remise de parrainage ?", p: ["La remise de parrainage (1,50 € pour le filleul et le parrain) s'applique automatiquement au panier quand elle est disponible. Elle est débloquée quand le filleul et le parrain ont chacun déjà payé une commande. Le fonctionnement complet est expliqué dans [[l'article sur les dons et le parrainage|/blog/esim-solidaire-dons-impact-parrainage]]."] },
      { h: "Combien coûte une eSIM de voyage ?", p: ["Le prix dépend de la destination, du volume et de la durée. Chaque fiche affiche les prix de ses forfaits : consulte la liste des [[destinations|/destinations]] pour comparer. Pour choisir le bon volume, lis [[quel forfait eSIM choisir|/blog/quel-forfait-esim-choisir]]."] },
    ],
    related: ["quel-forfait-esim-choisir", "esim-solidaire-dons-impact-parrainage", "esim-ne-fonctionne-pas-remboursement"],
  },
  {
    slug: "esim-ne-fonctionne-pas-remboursement",
    group: "remboursement",
    emoji: "🛟",
    title: "eSIM qui ne fonctionne pas : remboursement, rétractation et garanties",
    description: "QR code non reçu, eSIM qui ne marche pas, droit de rétractation de 14 jours, délai de remboursement, garanties légales : tes droits et nos règles.",
    intro: "Une eSIM peut avoir un souci : QR code non reçu, installation bloquée, réseau absent. Voici ce que tu peux demander, dans quels cas on rembourse et sous quel délai.",
    sections: [
      { h: "Puis-je être remboursé si mon eSIM ne fonctionne pas ?", p: ["Si ton eSIM ne s'installe pas ou ne fonctionne pas dans le pays prévu alors que ton téléphone est compatible et débloqué, contacte-nous avec ton numéro de commande. Nous cherchons une solution (nouvelle eSIM, forfait équivalent) ou nous te remboursons la part non utilisée. Voir la [[politique de remboursement|/remboursement]]."] },
      { h: "Et si je n'ai pas reçu mon QR code ?", p: ["Écris-nous : nous te le renvoyons ou nous te remboursons intégralement. Regarde d'abord tes courriers indésirables et la page de confirmation de commande, où ton QR code est aussi disponible."] },
      { h: "Quand l'eSIM n'est-elle pas remboursable ?", p: ["Dans trois cas :"], list: ["téléphone incompatible ou verrouillé par un opérateur ;", "eSIM déjà activée et consommée normalement ;", "erreur de destination au moment de la commande (nous étudions toutefois chaque cas si l'eSIM n'a pas encore été activée)."], after: ["D'où l'intérêt de [[vérifier la compatibilité avant d'acheter|/blog/telephone-compatible-esim]]."] },
      { h: "Ai-je un droit de rétractation de 14 jours ?", p: ["Les eSIM sont des produits numériques livrés immédiatement. Comme tu demandes l'exécution immédiate avant de payer, le droit de rétractation ne s'applique plus une fois l'eSIM délivrée (article L221-28 du Code de la consommation). Détails : [[droit de rétractation|/retractation]]."] },
      { h: "En combien de temps suis-je remboursé ?", p: ["Les remboursements acceptés sont effectués sur le moyen de paiement utilisé dans un délai maximum de 14 jours après l'acceptation de ta demande."] },
      { h: "Quelles garanties légales s'appliquent à mon achat ?", p: ["Tu bénéficies de la garantie légale de conformité et de la garantie des vices cachés, qui s'ajoutent à nos engagements. Voir nos [[conditions générales de vente|/cgv]]."] },
      { h: "Avant de nous écrire", p: ["Le plus souvent, un problème se règle en deux minutes : suis la liste de [[dépannage à l'arrivée|/blog/activer-esim-a-l-arrivee]] (eSIM choisie pour les données, itinérance activée, mode avion puis redémarrage). Sinon, ton numéro de commande suffit : un humain prend le relais."] },
    ],
    related: ["activer-esim-a-l-arrivee", "installer-esim-iphone-android", "compte-donnees-esim"],
  },
  {
    slug: "esim-solidaire-dons-impact-parrainage",
    group: "impact",
    emoji: "🌍",
    title: "eSIM solidaire : dons, Passeport d'impact et parrainage expliqués",
    description: "10 % du prix HT de chaque eSIM reversé à une cause : comment fonctionne le don, le Passeport d'impact à partager et le parrainage à 1,50 €.",
    intro: "Chaque eSIM KozzGo finance une cause que tu choisis. Voici comment fonctionne le don, ce que montre le Passeport d'impact et comment le parrainage te fait gagner 1,50 €.",
    sections: [
      { h: "Comment fonctionne le don à une cause ?", p: ["À chaque achat, 10 % du prix hors taxes est reversé à la cause de ton choix parmi 12 : repas, reforestation, eau potable, éducation connectée… Tu ne paies pas plus cher pour cela. Découvre-les sur la page [[Impact|/impact]]."] },
      { h: "Qu'est-ce que le Passeport d'impact ?", p: ["C'est le récapitulatif, calculé à partir de tes commandes payées, des dons que tu as générés, converti en unités concrètes : repas offerts, arbres plantés, jours de connexion… Tu peux le partager par WhatsApp ou par e-mail avec ton code de parrainage."] },
      { h: "Comment fonctionne le parrainage ?", p: ["Partage ton lien de parrainage. Quand la personne invitée crée son compte et paie sa première commande, vous recevez chacun 1,50 € de remise, à condition que tu aies toi-même déjà payé au moins une commande. Tout est dans ton [[profil|/profil]], rubrique Parrainage."] },
      { h: "Les unités d'impact sont-elles garanties ?", p: ["Les chiffres sont indicatifs : ils estiment ce que ton don finance, en attendant la finalisation des conventions avec nos associations partenaires. Nous le précisons sur la page [[Impact|/impact]]."] },
      { h: "Pourquoi une eSIM solidaire ?", p: ["Voyager connecté est devenu un réflexe. Autant que cet achat, que tu fais de toute façon, serve aussi une cause. Tu choisis laquelle, tu vois ton impact, et tu peux inviter tes proches à faire de même."] },
    ],
    related: ["payer-esim-prix-tva-facture", "qu-est-ce-qu-une-esim", "compte-donnees-esim"],
  },
  {
    slug: "compte-donnees-esim",
    group: "compte-securite",
    emoji: "🔐",
    title: "Compte, mot de passe et données personnelles : ce qu'il faut savoir",
    description: "Acheter une eSIM sans compte, réinitialiser son mot de passe, sécurité des données, suppression du compte et contact du support KozzGo.",
    intro: "Tu veux savoir si un compte est obligatoire, comment récupérer un mot de passe oublié, ou ce que nous faisons de tes données. Voici les réponses courtes.",
    sections: [
      { h: "Faut-il un compte pour acheter une eSIM ?", p: ["Non, tu peux commander sans compte avec ton adresse e-mail. Un compte te permet de retrouver tes eSIM, tes factures, ton Passeport d'impact et le parrainage."] },
      { h: "J'ai oublié mon mot de passe : comment le réinitialiser ?", p: ["Sur la page de [[connexion|/connexion]], clique sur « Mot de passe oublié ? ». Nous t'envoyons par e-mail un lien valable 30 minutes pour choisir un nouveau mot de passe. Pense à regarder tes indésirables."] },
      { h: "Mes données personnelles sont-elles protégées ?", p: ["Oui : ton mot de passe est haché (Argon2) et ne peut pas être lu, le paiement est traité par Stripe, et nous ne collectons que ce qui est nécessaire à ta commande. Voir notre [[politique de confidentialité|/confidentialite]]."] },
      { h: "Comment supprimer mon compte ?", p: ["Depuis ton [[profil|/profil]], tu peux supprimer ton compte à tout moment : tes commandes sont conservées de façon anonymisée pour nos obligations comptables, et les numéros de proches sont effacés."] },
      { h: "Comment contacter le support ?", p: ["Par e-mail à l'adresse indiquée dans nos [[mentions légales|/mentions-legales]], ou via l'assistant de chat en bas à droite du site. En cas d'échec d'installation, un humain prend le relais en moins de 5 minutes."] },
    ],
    related: ["esim-ne-fonctionne-pas-remboursement", "payer-esim-prix-tva-facture", "qu-est-ce-qu-une-esim"],
  },
  {
    slug: "esim-roaming-ou-sim-locale",
    group: "comprendre",
    emoji: "⚖️",
    title: "eSIM, roaming ou SIM locale : que choisir pour voyager ?",
    description: "Comparatif honnête eSIM de voyage, roaming de ton opérateur et SIM locale : prix, simplicité, numéro conservé, couverture. Pour chaque cas, le bon choix.",
    intro: "Trois façons d'avoir internet à l'étranger : le roaming de ton opérateur, une SIM locale achetée sur place, ou une eSIM de voyage. Aucune n'est la meilleure en toutes circonstances. Voici comment choisir.",
    sections: [
      { h: "Le roaming de ton opérateur", p: ["C'est l'option par défaut : rien à faire, ton forfait fonctionne à l'étranger. Dans l'Union européenne, il est généralement inclus. Hors de l'UE, il est souvent facturé cher ou plafonné à de petits volumes : vérifie les conditions de ton opérateur avant de partir."], list: ["Avantage : aucune démarche.", "Limite : prix et plafonds variables hors UE."] },
      { h: "La SIM locale", p: ["Tu achètes une carte sur place, à l'aéroport ou en boutique. Les prix locaux peuvent être très bas, mais il faut trouver un point de vente, parfois présenter une pièce d'identité, et retirer ta SIM habituelle : tu ne reçois plus tes SMS."], list: ["Avantage : tarif local.", "Limite : temps perdu à l'arrivée, numéro principal injoignable, démarches variables selon les pays."] },
      { h: "L'eSIM de voyage", p: ["Tu l'achètes et l'installes avant de partir, et elle se connecte à l'atterrissage. Ton numéro reste actif sur ta SIM principale. Le prix est fixé à l'avance, par volume et par durée."], list: ["Avantage : instantanée, numéro conservé, prix connu d'avance.", "Limite : il faut un téléphone compatible et débloqué, et la data non utilisée expire."] },
      { h: "Quel choix selon ton voyage ?", p: [], list: ["Week-end en Europe : le roaming inclus suffit souvent.", "Voyage hors UE de quelques jours à quelques semaines : l'eSIM est le plus simple.", "Séjour long dans un seul pays, avec un numéro local nécessaire : la SIM locale peut se justifier.", "Tu voyages souvent : l'abonnement [[Kozz Monde|/kozz-monde]] évite de racheter à chaque fois."] },
      { h: "Comment passer à l'eSIM ?", p: ["Commence par vérifier que ton téléphone la supporte : [[le test prend dix secondes|/blog/telephone-compatible-esim]]. Puis choisis ta destination dans la liste des [[eSIM par pays|/destinations]]."] },
    ],
    related: ["qu-est-ce-qu-une-esim", "quel-forfait-esim-choisir", "telephone-compatible-esim"],
  },
];

import { SCHEDULED } from "./blogContent2.js";
import { GUIDES } from "./blogGuides.js";
import { EXTRA } from "./blogExtras.js";
import { faqId } from "./faqContent.js";

// Tous les articles (publiés ou programmés). Les articles de BASE sont publiés le BLOG_DATE ; ceux de blogContent2.js ont leur propre date.
const withExtra = (a) => { const x = EXTRA[a.slug]; return x ? { ...a, sections: [...a.sections, ...x.sections], sources: [...(a.sources || []), ...x.sources], updated: x.updated } : a; };
export const ALL_ARTICLES = [...BASE.map((a) => withExtra({ date: BLOG_DATE, ...a })), ...SCHEDULED, ...GUIDES];
export const ARTICLE_BY_SLUG = Object.fromEntries(ALL_ARTICLES.map((a) => [a.slug, a]));
export const BLOG_SLUGS = ALL_ARTICLES.map((a) => a.slug);

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const isPublished = (a, today = todayIso()) => a.date <= today;
// Articles visibles (les plus récents d'abord). preview = true : inclut les articles programmés (?apercu=1).
export const visibleArticles = (preview = false) => ALL_ARTICLES.filter((a) => preview || isPublished(a)).sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
export const ARTICLES = visibleArticles();
export const latestDate = () => ARTICLES.reduce((m, a) => (a.date > m ? a.date : m), BLOG_DATE);

// [[texte|faq:Question exacte]] -> /faq#q-… ; les autres chemins sont inchangés
export const resolveLink = (to) => (to.startsWith("faq:") ? "/faq#" + faqId(to.slice(4)) : to);
