-- Profil : téléphone, cause préférée, notifications, proches
ALTER TABLE customers
  ADD COLUMN phone              VARCHAR(30) NULL,
  ADD COLUMN cause_id           VARCHAR(20) NULL,
  ADD COLUMN notif_sms          BOOLEAN NOT NULL DEFAULT TRUE,     -- SMS de commande (les e-mails de commande/facture sont toujours envoyés)
  ADD COLUMN marketing_optin    BOOLEAN NOT NULL DEFAULT FALSE,    -- offres et actualités : OFF par défaut, consentement explicite
  ADD COLUMN marketing_optin_at TIMESTAMP NULL,
  ADD CONSTRAINT fk_customer_cause FOREIGN KEY (cause_id) REFERENCES causes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS relatives (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(30) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_relatives_customer (customer_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE   -- supprimés avec le compte
) ENGINE=InnoDB;
