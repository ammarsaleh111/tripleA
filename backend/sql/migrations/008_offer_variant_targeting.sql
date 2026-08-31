-- 008: Weight-targeted offers.
--
-- Pricing model: effective variant price = products.base_price + price_modifier.
-- All variants sharing the same weight carry the same price_modifier, so the
-- price is determined by WEIGHT, never by FLAVOR.
--
-- This migration lets offers target a specific variant WEIGHT:
--   * offers.variant_id          → product_discount offers apply to the target
--                                  variant's weight only (all flavors of that
--                                  weight). NULL = whole product (legacy).
--   * bundle_offer_products.variant_id → the exact purchasable variant weight
--                                  included in the bundle. NULL = legacy bundle
--                                  component with no specific weight.
--
-- Existing rows keep variant_id NULL and behave exactly as before.

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS variant_id INT NULL,
  ADD CONSTRAINT FK_offers_variant FOREIGN KEY (variant_id)
    REFERENCES product_variants (id) ON DELETE SET NULL;

ALTER TABLE bundle_offer_products
  ADD COLUMN IF NOT EXISTS variant_id INT NULL,
  ADD CONSTRAINT FK_bundle_offer_products_variant FOREIGN KEY (variant_id)
    REFERENCES product_variants (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_variant ON offers (variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bop_variant ON bundle_offer_products (variant_id) WHERE variant_id IS NOT NULL;
