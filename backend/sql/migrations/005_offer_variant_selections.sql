-- 005: Bundle variant selections + offer integrity hardening.
--
-- 1. cart_items.variant_selections: stores the customer's exact variant choice per
--    bundle component as a JSON object mapping product_id -> variant_id.
--    The backend validates every selection against bundle_offer_products at
--    add-to-cart time and re-verifies at checkout.
-- 2. order_items.offer_id switches to ON DELETE SET NULL so deleting an offer can
--    never break historical orders (price/name/sku/metadata stay intact).
-- 3. Missing CHECK constraints from 003 are added for databases initialized
--    before the hardening (NOT VALID: existing rows are not re-validated).
-- 4. A deferred constraint trigger enforces the "bundle >= 2 products" rule at the
--    database level without blocking offer deletion or type changes.

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS variant_selections JSONB NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE lower(conname) = 'ck_cart_items_selections') THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT CK_cart_items_selections CHECK (
        variant_selections IS NULL OR jsonb_typeof(variant_selections) = 'object'
      );
  END IF;
END $$;

-- Historical orders must survive offer deletion: detach the reference instead of
-- blocking the delete or losing the row.
-- Note: Postgres folds unquoted constraint names to lowercase, so checks use the
-- lowercase form that migration 004 actually stored.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_order_items_offer' AND confdeltype <> 'n'
  ) THEN
    ALTER TABLE order_items DROP CONSTRAINT fk_order_items_offer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_offer') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_offer
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Offers hardening for pre-existing databases (schema.sql already has these for
-- fresh installs). NOT VALID so legacy rows never block the migration; all new
-- writes are enforced.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE lower(conname) = 'ck_offers_bundle_fields') THEN
    ALTER TABLE offers
      ADD CONSTRAINT CK_offers_bundle_fields CHECK (
        (offer_type = 'bundle'
            AND product_id IS NULL
            AND bundle_price IS NOT NULL
            AND bundle_price >= 0
            AND discount_type IS NULL
            AND discount_value IS NULL)
        OR
        (offer_type = 'product_discount'
            AND product_id IS NOT NULL
            AND bundle_price IS NULL
            AND discount_type IN ('percentage', 'fixed')
            AND discount_value IS NOT NULL
            AND discount_value >= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE lower(conname) = 'ck_offers_percentage_value') THEN
    ALTER TABLE offers
      ADD CONSTRAINT CK_offers_percentage_value CHECK (
        discount_type <> 'percentage' OR discount_value <= 100
      ) NOT VALID;
  END IF;
END $$;

-- Enforce "a bundle references at least two products" at the database level.
-- DEFERRED so the admin update flow (delete links, re-insert links) and cascade
-- deletes (offer/product removal) commit cleanly.
CREATE OR REPLACE FUNCTION enforce_bundle_product_minimum() RETURNS trigger AS $$
DECLARE
  target_offer_id INT;
  offer_type_text TEXT;
  component_count INT;
BEGIN
  target_offer_id := COALESCE(NEW.offer_id, OLD.offer_id);

  SELECT offer_type INTO offer_type_text FROM offers WHERE id = target_offer_id;

  -- Offer row is gone (offer deletion) or the offer is no longer a bundle.
  IF offer_type_text IS NULL OR offer_type_text <> 'bundle' THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO component_count
  FROM bundle_offer_products WHERE offer_id = target_offer_id;

  IF component_count < 2 THEN
    RAISE EXCEPTION 'Bundle offers must reference at least two products.';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bundle_product_minimum ON bundle_offer_products;

CREATE CONSTRAINT TRIGGER trg_bundle_product_minimum
  AFTER INSERT OR DELETE ON bundle_offer_products
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_bundle_product_minimum();

CREATE INDEX IF NOT EXISTS idx_cart_items_offer ON cart_items (offer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_offer ON order_items (offer_id);