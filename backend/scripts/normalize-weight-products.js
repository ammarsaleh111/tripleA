/**
 * normalize-weight-products.js
 *
 * Data normalization script: auto-converts "legacy" products whose name embeds a
 * weight (e.g. "Whey Protein 1kg") into products that expose a real Weight
 * variant.
 *
 * A product is a conversion candidate when ALL of the following are true:
 *   1. `products.has_weight = FALSE`  (Weight option not yet enabled)
 *   2. `products.has_flavor = FALSE`  (no Flavor option either)
 *   3. The product name contains a recognizable weight token
 *      (e.g. 500g, 1kg, 1.5kg, 2kg, …)
 *   4. None of the product's existing variants already carry a weight
 *      (idempotency / safety guard)
 *
 * For each candidate the script:
 *   - Removes ONLY the weight token from the product name.
 *   - Sets `has_weight = TRUE`.
 *   - Regenerates a unique slug from the cleaned name.
 *   - Creates or updates exactly ONE weight variant using the product's
 *     current `base_price` (price_modifier = 0) and the preserved total stock.
 *
 * Running the script again is a no-op: converted products have
 * `has_weight = TRUE` and a weight-free name, so they are skipped.
 *
 * Can be run standalone (`node scripts/normalize-weight-products.js`) or
 * imported as `{ normalizeWeightProducts }` for programmatic / test use.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Matches a weight token anywhere in a string.
 * Captures:  [1] numeric value, [2] unit (kg|g)
 * Examples: 500g, 1kg, 1.5kg, 2 kg, 750 g
 */
const WEIGHT_REGEX = /(\d+(?:\.\d+)?)\s*(kg|g)\b/i;

/**
 * Parse a weight token out of a free-form product name.
 * Returns null when no recognizable weight is found.
 */
export const parseWeightFromName = (name) => {
  const match = WEIGHT_REGEX.exec(String(name || '').trim());
  if (!match) return null;
  return {
    weightValue: Number(Number(match[1]).toFixed(2)),
    weightUnit: match[2].toLowerCase(),
    matchedText: match[0],
  };
};

/**
 * Remove the matched weight text from the name and tidy up leftover
 * whitespace / brackets that may remain.
 */
export const stripWeightFromName = (name, matchedText) => {
  let cleaned = String(name || '')
    .replace(matchedText, '')
    .replace(/[()\[\]{}"]/g, '') // remove leftover empty brackets
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();

  return cleaned || name;
};

/** Lower-camel slug from any string (mirrors the admin controller logic). */
const normalizeSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const withSuffix = (baseValue, suffix) => {
  const trimmed = String(baseValue || '').slice(0, 100);
  const compound = `${trimmed}-${suffix}`;
  if (compound.length <= 100) return compound;
  const overflow = compound.length - 100;
  return `${trimmed.slice(0, Math.max(1, trimmed.length - overflow))}-${suffix}`;
};

/**
 * Ensure a product slug is unique within the products table.
 * Uses $n parameter style (pg native).
 */
const ensureUniqueProductSlug = async (query, desiredSlug, excludeProductId = null) => {
  const baseSlug = normalizeSlug(desiredSlug);
  if (!baseSlug) return null;

  let candidate = baseSlug;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = excludeProductId
      ? await query('SELECT id FROM products WHERE slug = $1 AND id <> $2 LIMIT 1', [candidate, excludeProductId])
      : await query('SELECT id FROM products WHERE slug = $1 LIMIT 1', [candidate]);

    if (!result.rowCount) return candidate;

    candidate = withSuffix(baseSlug, suffix);
    suffix += 1;
  }
};

/**
 * Convert the pool `query` method into a callable that returns the pg
 * Result object (which has `.rows` and `.rowCount`).
 */
const makeQuery = (pool) => async (sql, params = []) => pool.query(sql, params);

/**
 * Run the normalization against an existing pg Pool (or any object with a
 * compatible `query` method).
 *
 * Returns a summary object:
 *   { converted: number, skipped: number, errors: Array }
 *
 * The entire operation for a single product runs inside its own transaction
 * so that a failure on one product never leaves partial state behind.
 */
export const normalizeWeightProducts = async (pool) => {
  const query = makeQuery(pool);
  const summary = { converted: 0, skipped: 0, errors: [] };

  // Candidates: has_weight = FALSE AND has_flavor = FALSE
  // (idempotency: converted products set has_weight = TRUE, so they are
  //  excluded on re-runs)
  const { rows: candidates } = await query(
    `SELECT id, name, slug, base_price, has_weight, has_flavor
       FROM products
      WHERE has_weight = FALSE
        AND has_flavor = FALSE
      ORDER BY id ASC`,
  );

  for (const product of candidates) {
    try {
      const parsed = parseWeightFromName(product.name);

      // No weight in the name → leave untouched.
      if (!parsed) {
        summary.skipped += 1;
        continue;
      }

      const { weightValue, weightUnit, matchedText } = parsed;
      const cleanedName = stripWeightFromName(product.name, matchedText);

      // Safety guard: if the product already has a variant carrying a weight
      // value, it has been converted already (or was configured that way).
      // Don't touch it.
      const { rows: weightVariantRows } = await query(
        `SELECT id FROM product_variants
           WHERE product_id = $1
             AND weight_value IS NOT NULL
             AND weight_unit IS NOT NULL
          LIMIT 1`,
        [product.id],
      );

      if (weightVariantRows.length) {
        summary.skipped += 1;
        continue;
      }

      // New slug from the cleaned name (must be unique — regenerate).
      const newSlug = await ensureUniqueProductSlug(query, cleanedName, product.id);

      // Compute the weight display label that the rest of the app expects,
      // e.g. "1 kg" or "500 g".
      const weightLabel = `${Number(weightValue).toString()} ${weightUnit}`;

      // Sum all existing stock so we never lose inventory.
      const { rows: stockRows } = await query(
        `SELECT COALESCE(SUM(stock_quantity), 0) AS total_stock
           FROM product_variants
          WHERE product_id = $1`,
        [product.id],
      );

      const totalStock = Number(stockRows[0]?.total_stock || 0);

      // --- Transaction per product ---
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await convertProduct(client, product, cleanedName, newSlug, weightValue, weightUnit, weightLabel, totalStock);
        await client.query('COMMIT');
        summary.converted += 1;
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }
    } catch (error) {
      summary.errors.push({ product: product.id, name: product.name, error: error.message });
    }
  }

    return summary;
};

/**
 * The actual product update logic, executed inside a transaction.
 * Separated so it can be tested / reasoned about independently.
 */
const convertProduct = async (client, product, cleanedName, newSlug, weightValue, weightUnit, weightLabel, totalStock) => {
  // 1. Update the product: cleaned name, new slug, enable Weight.
  await client.query(
    `UPDATE products
        SET name = $1,
            slug = $2,
            has_weight = TRUE,
            updated_at = NOW()
      WHERE id = $3`,
    [cleanedName, newSlug, product.id],
  );

  // 2. Find existing non-weight variants to upgrade.
  const { rows: existingVariants } = await client.query(
    `SELECT id, sku, stock_quantity
       FROM product_variants
      WHERE product_id = $1
        AND (weight_value IS NULL OR weight_unit IS NULL)
      ORDER BY id ASC`,
    [product.id],
  );

  if (existingVariants.length) {
    const variant = existingVariants[0];
    const preservedStock = Number(variant.stock_quantity || 0);

    // Consolidate any additional non-weight variants' stock into the one we
    // keep, then delete the extras.  This guarantees exactly ONE weight variant.
    const { rows: extraVariants } = await client.query(
      `SELECT id, stock_quantity
         FROM product_variants
        WHERE product_id = $1
          AND (weight_value IS NULL OR weight_unit IS NULL)
          AND id <> $2`,
      [product.id, variant.id],
    );

    let extraStock = 0;
    for (const extra of extraVariants) {
      extraStock += Number(extra.stock_quantity || 0);
    }

    if (extraVariants.length) {
      await client.query(
        `DELETE FROM product_variants
          WHERE product_id = $1
            AND (weight_value IS NULL OR weight_unit IS NULL)
            AND id <> $2`,
        [product.id, variant.id],
      );
    }

    await client.query(
      `UPDATE product_variants
          SET size = $1,
              weight_value = $2,
              weight_unit = $3,
              price_modifier = $4,
              stock_quantity = $5
        WHERE id = $6
          AND product_id = $7`,
      [
        weightLabel,
        weightValue,
        weightUnit,
        0, // price_modifier = 0 → variant price = base_price
        preservedStock + extraStock,
        variant.id,
        product.id,
      ],
    );
  } else {
    // No existing variant at all → create exactly one weight variant.
    const baseSku = `RSH-${normalizeSlug(cleanedName || product.name).replace(/-/g, '').slice(0, 12).toUpperCase()}-${weightLabel.replace(/\s/g, '').toUpperCase()}`;
    let skuCandidate = baseSku;
    let skuSuffix = 2;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const skuCheck = await client.query(
        'SELECT id FROM product_variants WHERE sku = $1 LIMIT 1',
        [skuCandidate],
      );
      if (!skuCheck.rowCount) break;
      skuCandidate = `${baseSku}-${skuSuffix}`;
      skuSuffix += 1;
    }

    await client.query(
      `INSERT INTO product_variants
         (product_id, sku, size, color, color_hex, flavor,
          weight_value, weight_unit, price_modifier, stock_quantity)
       VALUES ($1, $2, $3, NULL, NULL, NULL, $4, $5, $6, $7)`,
      [
        product.id,
        skuCandidate,
        weightLabel,
        weightValue,
        weightUnit,
        0,
        totalStock,
      ],
    );
  }
};

/**
 * Open a pool, run the normalization, and close the pool.
 */
const run = async () => {
  const connStr = process.env.DATABASE_URL || '';
  if (!connStr || connStr.includes('your_postgres_connection_string_here')) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exitCode = 1;
    return;
  }

  const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1');
  const isSslDisabled = connStr.includes('sslmode=disable');

  const pool = new Pool({
    connectionString: connStr,
    ssl: isLocalhost || isSslDisabled ? false : { rejectUnauthorized: false },
  });

  try {
    console.log('Running weight-product normalization…');
    const result = await normalizeWeightProducts(pool);
    console.log(`Converted: ${result.converted}`);
    console.log(`Skipped:   ${result.skipped}`);
    if (result.errors.length) {
      console.error('Errors:', result.errors);
    }
  } finally {
    await pool.end();
  }
};

// Run when executed directly via `node scripts/normalize-weight-products.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}


