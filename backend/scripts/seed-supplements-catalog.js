// Seeds/updates the 65-product supplements catalog (name + price only).
// Idempotent: upserts by product slug; safe to re-run.
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const CATEGORIES = {
  protein: 'Protein',
  creatine: 'Creatine',
  'pre-workout': 'Pre-Workout',
  'amino-acids': 'Amino Acids',
  carb: 'Carb',
  vitamins: 'Vitamins',
};

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// name, price (EGP), category
const PRODUCTS = [
  ['Kevin Levrone Gold Creatine (300g)', 1000, 'creatine'],
  ['Novogen 100% Whey Protein (1kg)', 1600, 'protein'],
  ['Bad Ass Mass Gainer', 3750, 'carb'],
  ['Bad Ass Crea (300g)', 1000, 'creatine'],
  ['Bad Ass Zero (2kg)', 4250, 'carb'],
  ['Bad Ass Isobolic (2kg)', 4250, 'protein'],
  ['Bad Ass Whey (2kg)', 3750, 'protein'],
  ['Mass Gainer Build Muscle (5.4kg)', 2500, 'carb'],
  ['Carbofit Maxfit (2kg)', 600, 'carb'],
  ['Pureganic Mass Ganic Ultra Premium (5.44kg)', 2500, 'carb'],
  ['Optimum Nutrition Serious Mass', 5000, 'carb'],
  ['Whey Protein Isolate (775g)', 2250, 'protein'],
  ['Novogen Carb+ Minerals (1.05kg)', 400, 'carb'],
  ['Azgard Nutrition 100% Whey (908g)', 2350, 'protein'],
  ['Marvelous BIG Extreme Weight Gainer (3kg)', 2200, 'carb'],
  ['Kevin Levrone Anabolic Mass (3kg)', 2300, 'carb'],
  ['Dymatize ISO100 Hydrolyzed', 4000, 'protein'],
  ['Azgard Nutrition 100% Whey Isolate (2.27kg)', 5000, 'protein'],
  ['Dragon Pharma Creatine Monohydrate (150g)', 350, 'creatine'],
  ['Pureganic Carboganic (1.5kg)', 550, 'carb'],
  ['Tractor Nutrition Creatine (480g)', 800, 'creatine'],
  ['Dragon Pharma Citrulline Malate (150g)', 350, 'amino-acids'],
  ['Pureganic Creatine Monohydrate (300g)', 600, 'creatine'],
  ['Max Fit Creatine Monohydrate (300g)', 500, 'creatine'],
  ['Novogen Whey Protein Isolate (2kg)', 3250, 'protein'],
  ['Superior 14 Hyper Rush Extreme Pre-workout', 1700, 'pre-workout'],
  ['Kevin Levrone Anabolic ISO Whey (2kg)', 4250, 'protein'],
  ['Marvelous Nutrition Creatine (384g)', 1000, 'creatine'],
  ['DY Nutrition Blood & Guts Pre-workout (380g)', 1800, 'pre-workout'],
  ['Cellucor C4 Original Pre-workout (455g)', 2300, 'pre-workout'],
  ['Tractor Nutrition Crea Red (180g)', 650, 'creatine'],
  ['Azgard Hulk Mass Extreme (8.1kg)', 5000, 'carb'],
  ['Whey Protein Concentrate (950g)', 1950, 'protein'],
  ['Pureganic Creatine Monohydrate (150g)', 400, 'creatine'],
  ['Superior 14 100% Hydro Whey', 4250, 'protein'],
  ['Nutrex Creatine Monohydrate (300g)', 1000, 'creatine'],
  ['Dragon Pharma Creatine Monohydrate (300g)', 600, 'creatine'],
  ['MuscleTech Nitro Tech Whey Gold (2.28kg)', 4500, 'protein'],
  ['Dragon Pharma Creatine Monohydrate (600g)', 800, 'creatine'],
  ['Novogen Micronized Creatine (300g)', 700, 'creatine'],
  ['Dymatize ISO100 Hydrolyzed (20 Servings)', 2300, 'protein'],
  ['Dragon Pharma Creatine Monohydrate (120g)', 250, 'creatine'],
  ['Dragon Pharma Crazy Pump Pre-workout', 1000, 'pre-workout'],
  ['MuscleTech Platinum 100% Creatine (400g)', 2000, 'creatine'],
  ['Ownmax Whey Protein', 1600, 'protein'],
  ['Kevin Levrone Anabolic Creatine (300g)', 1000, 'creatine'],
  ['Maxfit Mass Gainer (2.7kg)', 1000, 'carb'],
  ['MuscleTech Cell Tech Creatine (2.72kg)', 3300, 'creatine'],
  ['Azgard Creatine Nano (300g)', 1000, 'creatine'],
  ['Redcon1 Total War Pre-workout', 1650, 'pre-workout'],
  ['Tractor Nutrition Citrulline Malate 3000 (130g)', 400, 'amino-acids'],
  ['Cloma Pharma Black Spider 25 (100 Caps)', 1300, 'pre-workout'],
  ['Superior 14 100% Creatine Monohydrate (300g)', 700, 'creatine'],
  ['Tractor Nutrition Creatine (240g)', 550, 'creatine'],
  ['Tractor Nutrition Carb Carbohydrates (2.27kg)', 600, 'carb'],
  ['Kevin Levrone Gold Glutamine (300g)', 1000, 'amino-acids'],
  ['Cellucor Cor-Performance Creatine (306g)', 1000, 'creatine'],
  ['Tractor Nutrition Creatine (120g / 40 Servings)', 350, 'creatine'],
  ['William Bonac Crea Legend (Pure Creatine)', 1500, 'creatine'],
  ['QP Premium Creatine (500g / 100 Servings)', 850, 'creatine'],
  ['William Bonac Crea Legend (Small)', 1000, 'creatine'],
  ['MuscleTech Platinum Multi Vitamin (90 Tabs)', 1200, 'vitamins'],
  ['Yava Labs Multi Vitamin (60 Caps)', 1000, 'vitamins'],
  ['Yava Labs Creatine Pure (300g)', 1100, 'creatine'],
  ['QP Premium Protein (900g)', 1750, 'protein'],
];

const ensureCategory = async (client, slug, name) => {
  // Ensure the Supplements parent exists
  const parent = await client.query(
    `INSERT INTO categories (name, slug)
     VALUES ('Supplements', 'supplements')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const parentId = parent.rows[0].id;

  const result = await client.query(
    `INSERT INTO categories (name, slug, parent_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id
     RETURNING id`,
    [name, slug, parentId],
  );
  return result.rows[0].id;
};

const run = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (backend/.env)');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    const categoryIds = {};
    for (const [slug, name] of Object.entries(CATEGORIES)) {
      categoryIds[slug] = await ensureCategory(client, slug, name);
    }

    for (const [name, price, categorySlug] of PRODUCTS) {
      const slug = slugify(name);
      const result = await client.query(
        `INSERT INTO products (category_id, name, slug, base_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               base_price = EXCLUDED.base_price,
               category_id = EXCLUDED.category_id,
               updated_at = now()
         RETURNING id, (xmax = 0) AS was_insert`,
        [categoryIds[categorySlug], name, slug, price],
      );
      const { id: productId, was_insert: wasInsert } = result.rows[0];
      if (wasInsert) inserted += 1; else updated += 1;

      // Ensure at least one variant exists so the product is usable in cart flows
      const variantSku = `TA-${slug.slice(0, 40).toUpperCase()}`.replace(/[^A-Z0-9-]/g, '');
      await client.query(
        `INSERT INTO product_variants (product_id, sku, size, stock_quantity)
         VALUES ($1, $2, 'Standard', 100)
         ON CONFLICT (sku) DO NOTHING`,
        [productId, variantSku],
      );
    }

    await client.query('COMMIT');
    console.log(`Catalog seed complete: ${inserted} inserted, ${updated} updated (${PRODUCTS.length} total).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error('Catalog seed failed:', error.message);
  process.exit(1);
});
