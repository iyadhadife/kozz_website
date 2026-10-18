-- Parrainage : crédits de 1,50 € (filleul à l'inscription, parrain à la 1re commande payée du filleul)
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(6,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS referral_credits (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id        BIGINT UNSIGNED NOT NULL,
  amount             DECIMAL(6,2) NOT NULL,
  kind               ENUM('referee','referrer') NOT NULL,
  source_customer_id BIGINT UNSIGNED NOT NULL,           -- l'autre personne du parrainage
  status             ENUM('available','reserved','used') NOT NULL DEFAULT 'available',
  order_id           BIGINT UNSIGNED NULL,               -- commande qui l'a réservé / utilisé
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at            TIMESTAMP NULL,
  UNIQUE KEY uq_credit_once (customer_id, kind, source_customer_id),   -- un parrainage ne rapporte qu'une fois
  INDEX idx_credit_customer (customer_id, status),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
