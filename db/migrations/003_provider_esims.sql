-- Migration 003 : fournisseur eSIM (Yesim) + eSIM livrées
--   docker exec -i kozz_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" kozz' < db/migrations/003_provider_esims.sql
SET NAMES utf8mb4;

-- Lien entre chaque forfait KozzGo et le forfait du fournisseur, et coût de gros (HT) pour calculer la marge
ALTER TABLE plans
  ADD COLUMN provider_plan_id VARCHAR(40) NULL,
  ADD COLUMN wholesale_cost   DECIMAL(8,2) NULL;

-- Une ligne par eSIM livrée (une commande peut en contenir plusieurs : 1 par appareil)
CREATE TABLE IF NOT EXISTS esims (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id            BIGINT UNSIGNED NOT NULL,
  order_item_id       BIGINT UNSIGNED NOT NULL,
  seq                 SMALLINT NOT NULL DEFAULT 0,
  provider            VARCHAR(20) NOT NULL DEFAULT 'yesim',
  status              ENUM('pending','provisioned','failed') NOT NULL DEFAULT 'pending',
  provider_payment_id VARCHAR(64) NOT NULL UNIQUE,   -- clé envoyée au fournisseur (payment_id) pour retrouver la commande
  iccid               VARCHAR(32) NULL,
  activation_code     TEXT NULL,                     -- code d'installation (LPA) : sensible, ne jamais logger
  qr_png              MEDIUMTEXT NULL,               -- QR code en base64
  ios_tap_link        VARCHAR(500) NULL,
  error               VARCHAR(255) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_item_seq (order_item_id, seq),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;
