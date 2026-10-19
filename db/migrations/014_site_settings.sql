-- Réglages modifiables depuis l'espace admin (ex. achats ouverts / « bientôt disponible »). Une valeur ici l'emporte sur le .env ; sans ligne, le .env s'applique.
CREATE TABLE IF NOT EXISTS site_settings (
  `key`      VARCHAR(64) NOT NULL PRIMARY KEY,
  value      VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
