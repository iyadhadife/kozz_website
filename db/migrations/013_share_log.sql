-- Partage du passeport par e-mail : journal anti-abus. On ne garde PAS l'adresse du destinataire, seulement son empreinte (30 jours).
CREATE TABLE IF NOT EXISTS share_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  to_hash     CHAR(64) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_customer (customer_id, created_at),
  INDEX idx_share_to (to_hash, created_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
