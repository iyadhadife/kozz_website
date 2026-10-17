-- Migration 002 : liaison des commandes avec Stripe Checkout
--   docker exec -i kozz_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" kozz' < db/migrations/002_stripe.sql
-- Statuts : created = en attente de paiement, paid = payée (confirmée par le webhook Stripe)
ALTER TABLE orders
  ADD COLUMN stripe_session_id VARCHAR(255) NULL UNIQUE,
  ADD COLUMN stripe_payment_intent VARCHAR(255) NULL;
