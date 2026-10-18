-- KozzGo : schéma de la base
SET NAMES utf8mb4;

-- Clients : connexion sans mot de passe (code e-mail) ou Google/Apple
CREATE TABLE customers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,        -- hash Argon2id, jamais le mot de passe (NULL si connexion Google/Apple)
  first_name    VARCHAR(100) NULL,
  last_name     VARCHAR(100) NULL,
  auth_provider ENUM('email','google','apple') NOT NULL DEFAULT 'email',
  status        ENUM('decouverte','argent','or','legende') NOT NULL DEFAULT 'decouverte',
  kozz_money    DECIMAL(8,2) NOT NULL DEFAULT 0,
  referral_code CHAR(8) NULL UNIQUE,
  referred_by   BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_referrer FOREIGN KEY (referred_by) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Catalogue eSIM
CREATE TABLE destinations (
  id       CHAR(2) PRIMARY KEY,           -- code ISO (sert aussi au drapeau)
  name     VARCHAR(100) NOT NULL,
  zone     VARCHAR(50) NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE tiers (                       -- les 4 usages : city-break, semaine, voyage, illimité
  `key`    VARCHAR(10) PRIMARY KEY,
  name     VARCHAR(50) NOT NULL,
  gb       SMALLINT NULL,                  -- NULL = illimité
  days     SMALLINT NOT NULL,
  icon     VARCHAR(8) NOT NULL,
  blurb    VARCHAR(150) NOT NULL,
  position SMALLINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE plans (                       -- prix TTC par destination x usage
  destination_id  CHAR(2) NOT NULL,
  tier_key        VARCHAR(10) NOT NULL,
  price_ttc       DECIMAL(6,2) NOT NULL,
  price_confirmed BOOLEAN NOT NULL DEFAULT FALSE,   -- FALSE = prix "à confirmer" (relevé incomplet)
  provider_plan_id VARCHAR(40) NULL,                -- forfait correspondant chez le fournisseur (Yesim)
  wholesale_cost   DECIMAL(8,2) NULL,               -- coût de gros HT
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (destination_id, tier_key),
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_key) REFERENCES tiers(`key`)
) ENGINE=InnoDB;

CREATE TABLE subscription_plans (          -- Kozz Monde
  id            VARCHAR(10) PRIMARY KEY,
  name          VARCHAR(50) NOT NULL,
  data_label    VARCHAR(80) NOT NULL,
  price_monthly DECIMAL(6,2) NOT NULL,
  popular       BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

CREATE TABLE causes (
  id            VARCHAR(20) PRIMARY KEY,
  category      VARCHAR(50) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  unit          VARCHAR(80) NOT NULL,
  cost_per_unit DECIMAL(6,2) NOT NULL,     -- indicatif, à valider avec chaque ONG
  emoji         VARCHAR(8) NOT NULL,
  signature     BOOLEAN NOT NULL DEFAULT FALSE,
  position      SMALLINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE corridors (                   -- recharges pour un proche
  id        CHAR(2) PRIMARY KEY,
  country   VARCHAR(60) NOT NULL,
  operators JSON NOT NULL,
  soon      BOOLEAN NOT NULL DEFAULT FALSE,
  position  SMALLINT NOT NULL
) ENGINE=InnoDB;

-- Commandes
CREATE TABLE orders (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id     BIGINT UNSIGNED NULL,      -- NULL = commande d'invité (ou compte supprimé)
  guest_email     VARCHAR(255) NULL,
  cause_id        VARCHAR(20) NOT NULL,
  total_ttc       DECIMAL(8,2) NOT NULL,
  donation_amount DECIMAL(8,4) NOT NULL,
  status          ENUM('created','paid','provisioned','failed','refunded') NOT NULL DEFAULT 'created',  -- created = en attente de paiement
  stripe_session_id     VARCHAR(255) NULL UNIQUE,
  stripe_payment_intent VARCHAR(255) NULL,
  billing_name         VARCHAR(200) NULL,
  billing_address      JSON NULL,
  billing_country      CHAR(2) NULL,
  customer_phone       VARCHAR(30) NULL,     -- téléphone du client (pas celui du proche) : sert aux SMS de commande
  terms_accepted_at    DATETIME NULL,        -- CGV acceptées
  terms_version        VARCHAR(20) NULL,
  withdrawal_waiver_at DATETIME NULL,        -- exécution immédiate demandée + renonciation à la rétractation
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (cause_id) REFERENCES causes(id),
  INDEX idx_orders_customer (customer_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT UNSIGNED NOT NULL,
  kind            ENUM('esim','subscription','topup') NOT NULL,
  label           VARCHAR(255) NOT NULL,
  destination_id  CHAR(2) NULL,
  tier_key        VARCHAR(10) NULL,
  subscription_id VARCHAR(10) NULL,
  corridor_id     CHAR(2) NULL,
  operator        VARCHAR(80) NULL,
  phone           VARCHAR(30) NULL,        -- donnée personnelle d'un tiers : à purger après livraison (RGPD)
  qty             SMALLINT NOT NULL DEFAULT 1,
  unit_price      DECIMAL(8,2) NOT NULL,   -- prix figé au moment de l'achat
  donation        DECIMAL(8,4) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sessions de connexion : on stocke uniquement l'empreinte SHA-256 du jeton (révocable à la déconnexion)
CREATE TABLE sessions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  expires_at  DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB;

-- eSIM livrées par le fournisseur (une ligne par appareil)
CREATE TABLE esims (
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

-- Numérotation chronologique SANS TROU, par année (obligation fiscale). Une ligne par année, verrouillée à l'émission.
CREATE TABLE invoice_counters (
  year        SMALLINT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Factures : jamais modifiées ni supprimées (conservation 10 ans). Le vendeur et le client sont figés au moment de l'émission.
CREATE TABLE invoices (
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
CREATE TABLE notifications (
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
-- Relevés de prix concurrents (traçabilité de chaque prix calculé)
CREATE TABLE IF NOT EXISTS competitor_prices (
  destination_id CHAR(2) NOT NULL,
  tier_key       VARCHAR(10) NOT NULL,
  source         VARCHAR(20) NOT NULL,
  price_ttc      DECIMAL(6,2) NOT NULL,
  plan_label     VARCHAR(60) NOT NULL,       -- ex. « 3 GB / 30 days »
  fetched_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (destination_id, tier_key, source),
  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_key) REFERENCES tiers(`key`)
) ENGINE=InnoDB;
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
-- Paiement en plusieurs devises : taux du jour + devise de chaque commande
CREATE TABLE IF NOT EXISTS fx_rates (
  currency   CHAR(3) PRIMARY KEY,
  rate       DECIMAL(18,8) NOT NULL,              -- unités de la devise pour 1 EUR
  source     VARCHAR(20) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE orders
  ADD COLUMN currency            CHAR(3) NOT NULL DEFAULT 'EUR',        -- devise débitée par Stripe
  ADD COLUMN fx_rate             DECIMAL(18,8) NOT NULL DEFAULT 1,      -- taux appliqué (marge incluse) : 1 EUR = fx_rate devise
  ADD COLUMN charge_amount_minor BIGINT NULL;                           -- montant exact attendu de Stripe, en unités mineures de `currency`
-- Cartes enregistrées chez Stripe (jamais chez nous) : on ne garde que l'identifiant du « Customer » Stripe, pas de numéro de carte.
-- Langue des messages et de la facture : fr ou en (choisie sur le site au moment de la commande).
ALTER TABLE customers ADD COLUMN stripe_customer_id VARCHAR(64) NULL UNIQUE;
ALTER TABLE orders    ADD COLUMN lang CHAR(2) NOT NULL DEFAULT 'fr';

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
