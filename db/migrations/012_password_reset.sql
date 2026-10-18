-- Réinitialisation du mot de passe par lien envoyé par e-mail : on ne stocke que l'empreinte du jeton (jamais le jeton)
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash   CHAR(64) PRIMARY KEY,
  customer_id  BIGINT UNSIGNED NOT NULL,
  expires_at   DATETIME NOT NULL,
  used_at      DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pwreset_customer (customer_id, created_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
