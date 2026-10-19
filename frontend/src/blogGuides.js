// Guides par destination (programmés). Règle : aucun prix ni chiffre de couverture qu'on ne peut pas sourcer. Les prix des forfaits se lisent sur la fiche destination ;
// la couverture se vérifie sur l'outil officiel du pays (cité en source). Les affirmations moins certaines sont formulées avec prudence (« selon plusieurs comparatifs »).

export const GUIDES = [
  {
    slug: "esim-maroc-guide",
    date: "2027-01-11", group: "forfaits", emoji: "🇲🇦",
    title: "eSIM pour le Maroc : opérateurs, couverture et conseils pratiques",
    description: "Voyager au Maroc connecté : les trois opérateurs, ce qu'il faut vérifier sur la couverture, comment installer ton eSIM avant le départ et quoi prévoir.",
    intro: "Marrakech, Casablanca, Essaouira, le désert : au Maroc, la connexion se prépare avant le départ. Voici les points à connaître pour choisir et utiliser ton eSIM, avec les sources officielles pour vérifier ce qui change souvent.",
    sections: [
      { h: "Les opérateurs au Maroc", p: ["Le marché mobile marocain repose sur trois opérateurs : Maroc Telecom, Orange Maroc et inwi. Une eSIM de voyage se connecte au réseau local d'un de ces opérateurs ; le fournisseur choisit le ou les réseaux partenaires. Les parts de marché varient d'une source à l'autre : pour les chiffres à jour, le régulateur du secteur est l'[[ANRT|https://www.anrt.ma/]] (lien externe)."] },
      { h: "Couverture : villes, montagnes, désert", p: ["Selon plusieurs comparatifs, la 4G est bien présente dans les grandes villes, alors que les zones de montagne (Atlas) et du sud peuvent avoir un signal limité. C'est le cas dans beaucoup de pays : si ton circuit passe par ces régions, télécharge tes cartes hors ligne avant le départ et préviens tes proches que la connexion peut être intermittente."] },
      { h: "Installer son eSIM avant de partir", p: [], steps: ["Vérifie ton téléphone avec le test *#06# : [[mon téléphone est-il compatible eSIM ?|/blog/telephone-compatible-esim]].", "Choisis ton forfait sur la fiche [[eSIM Maroc|/destinations/ma]] : le volume, la durée et le prix y sont affichés.", "Installe l'eSIM chez toi, en Wi-Fi : [[mode d'emploi iPhone et Android|/blog/installer-esim-iphone-android]].", "À l'arrivée, choisis l'eSIM pour les données mobiles et active l'itinérance de données sur cette ligne."] },
      { h: "Quel volume de data prévoir ?", p: ["Pour quelques jours de visite avec cartes, messages et photos, un petit volume suffit. Pour un séjour d'une semaine avec réseaux sociaux et vidéo, prévois plus. Calcule-le avec [[calculer sa consommation de data|/blog/calculer-sa-data-de-voyage]] ou avec l'estimateur de la fiche destination."] },
      { h: "Appels, WhatsApp et applications", p: ["Les appels et messages passent par des applications qui utilisent ta data. Les règles locales sur certains services peuvent évoluer : consulte les [[conseils aux voyageurs|https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/]] du ministère de l'Europe et des Affaires étrangères avant le départ."] },
      { h: "Garder son numéro français", p: ["Avec une eSIM, ta ligne habituelle reste active pour les SMS de la banque : [[garder son numéro avec la double SIM|/blog/garder-son-numero-double-sim]]. Désactive l'itinérance de données sur cette ligne pour éviter des frais hors forfait."] },
    ],
    related: ["quel-forfait-esim-choisir", "calculer-sa-data-de-voyage", "installer-esim-iphone-android"],
    sources: [
      { t: "ANRT (régulateur des télécommunications du Maroc)", u: "https://www.anrt.ma/" },
      { t: "France Diplomatie : conseils aux voyageurs", u: "https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/" },
      { t: "ARCEP : roaming hors Union européenne", u: "https://www.arcep.fr/demarches-et-services/litinerance-roaming-en-europe-au-sein-de-lespace-economique-europeen.html" },
    ],
  },
  {
    slug: "esim-japon-guide",
    date: "2027-01-18", group: "forfaits", emoji: "🇯🇵",
    title: "eSIM pour le Japon : réseaux, couverture et bons réflexes",
    description: "Voyager au Japon avec une eSIM : les quatre opérateurs (Docomo, au, SoftBank, Rakuten), ce qu'on sait de la couverture et comment t'organiser avant le départ.",
    intro: "Au Japon, tout s'organise avec son téléphone : trajets, restaurants, traduction, paiements. Voici comment préparer ta connexion, sans promesse que nous ne pourrions pas sourcer.",
    sections: [
      { h: "Les réseaux japonais", p: ["Quatre opérateurs de réseau se partagent le marché : NTT Docomo, au (KDDI), SoftBank et Rakuten Mobile. Selon les fournisseurs d'eSIM de voyage, une eSIM se connecte généralement à un ou plusieurs de ces réseaux, sans que le voyageur ait à choisir. Pour l'organisme officiel du tourisme japonais, voir le site du [[JNTO|https://www.jnto.go.jp/]] (lien externe)."] },
      { h: "Couverture : grandes villes, campagne", p: ["Selon plusieurs comparatifs, la couverture des principaux opérateurs est comparable dans les grandes villes et sur les axes touristiques. Elle varie davantage en zone rurale et de montagne, où certains réseaux sont moins présents que d'autres. Si ton voyage passe par la campagne, garde des cartes hors ligne."] },
      { h: "Ton téléphone est-il prêt ?", p: ["L'eSIM exige un téléphone compatible et débloqué. Vérifie avec le test *#06# (un numéro EID doit s'afficher) : [[le test en 10 secondes|/blog/telephone-compatible-esim]]. Si ton iPhone a été acheté dans une autre région, consulte [[iPhone de Chine, Hong Kong ou Macao|/blog/iphone-chine-hong-kong-macao-esim]]."] },
      { h: "Comment s'organiser, étape par étape", p: [], steps: ["Choisis ton forfait sur la fiche [[eSIM Japon|/destinations/jp]] : volume, durée et prix TTC y sont indiqués.", "Installe l'eSIM avant le départ, en Wi-Fi : [[installer son eSIM|/blog/installer-esim-iphone-android]].", "À l'atterrissage, sélectionne l'eSIM pour les données mobiles et active l'itinérance de données sur cette ligne.", "Garde ta ligne principale pour les SMS de la banque."] },
      { h: "Combien de data pour le Japon ?", p: ["Cartes, traduction instantanée, recherche de restaurants et photos : l'usage réel dépasse souvent ce que l'on imagine. Estime ton besoin avec [[calculer sa consommation de data|/blog/calculer-sa-data-de-voyage]], puis ajoute une marge si tu comptes partager ta connexion : [[mode d'emploi du hotspot|/blog/partage-de-connexion-esim-voyage]]."] },
      { h: "Dans les transports et les lieux isolés", p: ["Le signal peut faiblir dans certains tunnels, en sous-sol ou en montagne. Télécharge tes billets, tes cartes et tes traductions en Wi-Fi avant de sortir de l'hôtel."] },
    ],
    related: ["telephone-compatible-esim", "calculer-sa-data-de-voyage", "partage-de-connexion-esim-voyage"],
    sources: [
      { t: "JNTO : Office national du tourisme japonais", u: "https://www.jnto.go.jp/" },
      { t: "Apple : Configurer une eSIM sur iPhone", u: "https://support.apple.com/en-us/118669" },
    ],
  },
  {
    slug: "esim-etats-unis-guide",
    date: "2027-01-25", group: "forfaits", emoji: "🇺🇸",
    title: "eSIM pour les États-Unis : réseaux, parcs nationaux et conseils",
    description: "Voyage aux États-Unis avec une eSIM : T-Mobile, AT&T et Verizon, la carte officielle FCC pour vérifier la couverture et les pièges des routes et des parcs.",
    intro: "Les États-Unis sont immenses, et la couverture mobile varie beaucoup selon l'endroit où tu vas. Voici comment vérifier avant de partir, avec l'outil officiel.",
    sections: [
      { h: "Les trois grands réseaux", p: ["Le marché américain est dominé par trois réseaux nationaux : T-Mobile, AT&T et Verizon. Une eSIM de voyage s'appuie sur l'un d'eux (ou plusieurs selon le forfait). Selon la plupart des comparatifs, T-Mobile est réputé fort en ville, Verizon et AT&T plus présents dans les zones rurales. Ces classements viennent surtout de sites marchands : vérifie toi-même sur la carte officielle ci-dessous."] },
      { h: "Vérifier la couverture avec la carte de la FCC", p: ["La FCC, le régulateur américain, publie une carte nationale du haut débit mobile : tu saisis une adresse et tu vois les opérateurs qui y fournissent de la 4G ou de la 5G. Ses limites : elle montre la couverture en extérieur, pas à l'intérieur des bâtiments, et ses données ont une date. Utilise-la pour ton itinéraire : [[carte de la FCC|https://broadbandmap.fcc.gov/]] (lien externe)."] },
      { h: "Road trip et parcs nationaux", p: ["Sur les routes secondaires et dans les parcs nationaux, des zones sans réseau existent quel que soit l'opérateur. Télécharge tes itinéraires hors ligne, prévois des cartes papier ou des fichiers hors connexion, et préviens tes proches de ton parcours."] },
      { h: "Comment s'organiser", p: [], steps: ["Vérifie ton téléphone : [[compatible eSIM et débloqué ?|/blog/telephone-compatible-esim]].", "Choisis ton forfait sur la fiche [[eSIM États-Unis|/destinations/us]], en tenant compte de la durée du séjour.", "Installe l'eSIM avant le départ : [[installer son eSIM|/blog/installer-esim-iphone-android]].", "À l'arrivée, active l'eSIM pour les données et l'itinérance de données."] },
      { h: "Gros voyage, plusieurs États", p: ["Si tu voyages plusieurs semaines, regarde le format Voyage ou l'illimité (usage raisonnable) : [[quel forfait eSIM choisir|/blog/quel-forfait-esim-choisir]]. Si tu pars souvent, l'abonnement [[Kozz Monde|/kozz-monde]] est conçu pour ça."] },
      { h: "Appels et numéro français", p: ["Les appels passent par WhatsApp, FaceTime ou Signal, sur la data de ton eSIM. Ton numéro français reste actif pour les SMS : [[garder son numéro à l'étranger|/blog/garder-son-numero-double-sim]]. Évite le roaming hors forfait : voir [[eSIM, roaming ou SIM locale|/blog/esim-roaming-ou-sim-locale]]."] },
    ],
    related: ["quel-forfait-esim-choisir", "esim-roaming-ou-sim-locale", "installer-esim-iphone-android"],
    sources: [
      { t: "FCC : carte nationale du haut débit (couverture mobile)", u: "https://broadbandmap.fcc.gov/" },
      { t: "France Diplomatie : conseils aux voyageurs", u: "https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/" },
      { t: "ARCEP : roaming hors Union européenne", u: "https://www.arcep.fr/demarches-et-services/litinerance-roaming-en-europe-au-sein-de-lespace-economique-europeen.html" },
    ],
  },
];
