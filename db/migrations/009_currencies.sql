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
