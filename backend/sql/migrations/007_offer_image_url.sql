-- 007: Add image_url to offers table for bundle offer images.
--
-- Bundle Offers support their own image URL independent of product images.
-- This allows admins to set a custom image for each bundle offer.

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_offers_image_url ON offers (image_url) WHERE image_url IS NOT NULL;