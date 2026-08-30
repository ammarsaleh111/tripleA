ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS offer_id INT NULL,
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'product';

ALTER TABLE cart_items
  ALTER COLUMN variant_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cart_items_offer') THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT FK_cart_items_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS offer_id INT NULL,
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS metadata JSONB NULL;

ALTER TABLE order_items
  ALTER COLUMN variant_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_offer') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT FK_order_items_offer FOREIGN KEY (offer_id) REFERENCES offers(id);
  END IF;
END $$;
