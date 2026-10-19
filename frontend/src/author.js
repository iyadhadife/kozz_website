// Auteur affiché sous chaque article et sur /a-propos. À COMPLÉTER avec une vraie personne (nom, rôle, courte biographie) :
// Google et les assistants IA valorisent les contenus signés par un auteur identifiable (signal E-E-A-T). Laisse `name` vide tant que ce n'est pas renseigné :
// les articles sont alors signés « Équipe KozzGo » (organisation), ce qui reste honnête.
export const AUTHOR = {
  name: "",            // ex. "Prénom Nom"
  role: "",            // ex. "Fondateur de KozzGo"
  bio: "",             // 2 à 3 phrases : expérience du voyage, des télécoms, de l'eSIM… (uniquement des faits vrais)
  url: "",             // optionnel : profil LinkedIn
};
export const authorLabel = () => AUTHOR.name || "Équipe KozzGo";
