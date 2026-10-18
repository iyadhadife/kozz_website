-- A2F par SMS (activable plus tard via PHONE_VERIFICATION_ENABLED=true quand le compte Twilio est payant).
-- Un numéro vérifié ne peut appartenir qu'à UN compte (anti-fraude au parrainage : pas de faux comptes avec le même téléphone).
ALTER TABLE customers
  ADD COLUMN phone_verified_at     DATETIME    NULL,
  ADD COLUMN phone_verified_number VARCHAR(30) NULL,
  ADD UNIQUE KEY uq_phone_verified (phone_verified_number);

-- Un code en cours par compte ; seul son hash est conservé, jamais le code.
CREATE TABLE IF NOT EXISTS phone_verifications (
  customer_id   BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  phone         VARCHAR(30)  NOT NULL,
  code_hash     CHAR(64)     NOT NULL,
  attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  sends         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  expires_at    DATETIME     NOT NULL,
  first_sent_at DATETIME     NOT NULL,
  last_sent_at  DATETIME     NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
