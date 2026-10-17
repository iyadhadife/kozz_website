-- Migration 001 : comptes avec mot de passe haché + sessions + commandes d'invité
-- À appliquer sur une base EXISTANTE (une base neuve utilise déjà 01_schema.sql à jour) :
--   docker exec -i kozz_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" kozz' < db/migrations/001_auth.sql
SET NAMES utf8mb4;

ALTER TABLE customers
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email,      -- hash Argon2id, jamais le mot de passe
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name;

-- Les commandes d'invité ne sont plus rattachées à un compte par simple e-mail (évite qu'un tiers
-- qui s'inscrit avec cet e-mail voie l'historique et les numéros de proches).
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1;
ALTER TABLE orders
  MODIFY customer_id BIGINT UNSIGNED NULL,
  ADD COLUMN guest_email VARCHAR(255) NULL AFTER customer_id,
  ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Anciens "clients" créés sans mot de passe => commandes d'invité
UPDATE orders o JOIN customers c ON c.id = o.customer_id
   SET o.guest_email = c.email, o.customer_id = NULL
 WHERE c.password_hash IS NULL;
DELETE FROM customers WHERE password_hash IS NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,    -- SHA-256 du jeton du cookie ; le jeton lui-même n'est jamais stocké
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  expires_at  DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB;
