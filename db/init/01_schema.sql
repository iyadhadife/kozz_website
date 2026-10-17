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
