-- Cartes enregistrées chez Stripe (jamais chez nous) : on ne garde que l'identifiant du « Customer » Stripe, pas de numéro de carte.
-- Langue des messages et de la facture : fr ou en (choisie sur le site au moment de la commande).
ALTER TABLE customers ADD COLUMN stripe_customer_id VARCHAR(64) NULL UNIQUE;
ALTER TABLE orders    ADD COLUMN lang CHAR(2) NOT NULL DEFAULT 'fr';
