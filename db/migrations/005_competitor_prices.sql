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
