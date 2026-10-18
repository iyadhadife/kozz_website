-- Migration 004 : factures conservées, preuve des consentements, journal des envois e-mail/SMS
--   docker exec -i kozz_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" kozz' < db/migrations/004_invoices_notifications.sql
SET NAMES utf8mb4;

-- Coordonnées de facturation (saisies chez Stripe) et preuves de consentement
ALTER TABLE orders
  ADD COLUMN billing_name         VARCHAR(200) NULL,
  ADD COLUMN billing_address      JSON NULL,
  ADD COLUMN billing_country      CHAR(2) NULL,
  ADD COLUMN customer_phone       VARCHAR(30) NULL,     -- téléphone du client (pas celui du proche) : sert aux SMS de commande
  ADD COLUMN terms_accepted_at    DATETIME NULL,        -- CGV acceptées
  ADD COLUMN terms_version        VARCHAR(20) NULL,
  ADD COLUMN withdrawal_waiver_at DATETIME NULL;        -- exécution immédiate demandée + renonciation à la rétractation

-- Numérotation chronologique SANS TROU, par année (obligation fiscale). Une ligne par année, verrouillée à l'émission.
CREATE TABLE IF NOT EXISTS invoice_counters (
  year        SMALLINT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Factures : jamais modifiées ni supprimées (conservation 10 ans). Le vendeur et le client sont figés au moment de l'émission.
CREATE TABLE IF NOT EXISTS invoices (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number      VARCHAR(20) NOT NULL UNIQUE,
  order_id    BIGINT UNSIGNED NOT NULL UNIQUE,
  issued_at   DATETIME NOT NULL,
  seller      JSON NOT NULL,
  customer    JSON NOT NULL,
  line_items  JSON NOT NULL,
  vat_rate    DECIMAL(5,2) NOT NULL,
  total_ht    DECIMAL(10,2) NOT NULL,
  total_vat   DECIMAL(10,2) NOT NULL,
  total_ttc   DECIMAL(10,2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  pdf         MEDIUMBLOB NOT NULL,
  pdf_sha256  CHAR(64) NOT NULL,                        -- empreinte : prouve que le PDF n'a pas changé
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT   -- une commande facturée ne peut pas être supprimée
) ENGINE=InnoDB;

-- Journal des messages (preuve d'envoi, et évite d'envoyer deux fois)
CREATE TABLE IF NOT EXISTS notifications (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id  BIGINT UNSIGNED NOT NULL,
  channel   ENUM('email','sms') NOT NULL,
  kind      VARCHAR(30) NOT NULL DEFAULT 'order',
  recipient VARCHAR(120) NOT NULL,                      -- masqué (j***@gmail.com, +33•••••78)
  status    ENUM('sent','failed','skipped') NOT NULL,
  error     VARCHAR(255) NULL,
  sent_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif (order_id, channel, kind),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
