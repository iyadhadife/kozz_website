-- Vérification de l'e-mail à l'inscription : le compte n'existe qu'après saisie du code reçu
ALTER TABLE customers ADD COLUMN email_verified_at TIMESTAMP NULL;
UPDATE customers SET email_verified_at = created_at WHERE email_verified_at IS NULL;   -- comptes déjà existants

CREATE TABLE IF NOT EXISTS pending_registrations (
  email          VARCHAR(255) PRIMARY KEY,
  password_hash  VARCHAR(255) NOT NULL,
  first_name     VARCHAR(100) NULL,
  ref            VARCHAR(12) NULL,
  code_hash      CHAR(64) NOT NULL,            -- empreinte du code : le code lui-même n'est jamais stocké
  attempts       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  sends          TINYINT UNSIGNED NOT NULL DEFAULT 1,
  expires_at     DATETIME NOT NULL,
  last_sent_at   DATETIME NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
