-- 006: Persist order contact details.
--
-- Checkout already collects name/phone/email/address, but previously only the
-- WhatsApp response used them — nothing was stored. Guest orders (user_id NULL)
-- therefore had NO recoverable contact information. These columns store the
-- contact details supplied at checkout for every order (guest and registered).
-- Historical orders keep NULL here: the data was never recorded, and we do not
-- invent it.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS customer_address TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);