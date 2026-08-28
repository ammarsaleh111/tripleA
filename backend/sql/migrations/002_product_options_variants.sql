ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_flavor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_weight BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS flavor VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS weight_value DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(2) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_product_variants_weight_unit'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT CK_product_variants_weight_unit
      CHECK (weight_unit IS NULL OR weight_unit IN ('g', 'kg'));
  END IF;
END $$;
