-- 009: Remove the product `description` column.
-- The product description field has been removed from the system. Product
-- presentation now relies on name, price, materials_care, images, and
-- variants only. The column is dropped if it still exists on existing data.
ALTER TABLE products DROP COLUMN IF EXISTS description;
