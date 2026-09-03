import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import dotenv from 'dotenv';
import pg from 'pg';

import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';
import { normalizeWeightProducts } from '../scripts/normalize-weight-products.js';

dotenv.config();

const { Pool } = pg;
const shouldRun = process.env.RUN_DB_TESTS === 'true';
const suite = shouldRun ? describe : describe.skip;

suite('normalize-weight-products', () => {
  let server;
  let baseUrl;
  let pool;
  const prefix = `weight-norm-${Date.now()}`;

  // IDs of products created for testing — cleaned up in after().
  const createdProductIds = [];

  const insertProduct = async (client, name, opts = {}) => {
    const { slug, basePrice, hasFlavor, hasWeight, variants } = {
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      basePrice: 100,
      hasFlavor: false,
      hasWeight: false,
      variants: [{ sku: null, size: 'One Size', stockQuantity: 0, priceModifier: 0 }],
      ...opts,
    };

    const prodRes = await client.query(
      `INSERT INTO products (name, slug, base_price, has_flavor, has_weight, is_featured)
         VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id`,
      [name, slug, basePrice, hasFlavor, hasWeight],
    );
    const productId = prodRes.rows[0].id;
    createdProductIds.push(productId);

    for (const v of variants) {
      const sku = v.sku || `${slug}-v${productId}`;
      // Parse weight from size if it looks like a weight label.
      const weightMatch = String(v.size || '').trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
      const weightValue = weightMatch ? Number(Number(weightMatch[1]).toFixed(2)) : null;
      const weightUnit = weightMatch ? weightMatch[2].toLowerCase() : null;
      await client.query(
        `INSERT INTO product_variants
           (product_id, sku, size, color, color_hex, flavor, weight_value, weight_unit, price_modifier, stock_quantity)
         VALUES ($1, $2, $3, NULL, NULL, $4, $5, $6, $7, $8)`,
        [productId, sku, v.size, v.flavor || null, weightValue, weightUnit, v.priceModifier || 0, v.stockQuantity || 0],
      );
    }

    return productId;
  };

  before(async () => {
    await connectDatabase();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. "Whey Protein 1kg" — weight in name, no variants configured (auto default)
      await insertProduct(client, `${prefix} Whey Protein 1kg`, {
        basePrice: 1400,
        hasFlavor: false,
        hasWeight: false,
        variants: [{ sku: `${prefix}-whey-sku`, size: 'One Size', stockQuantity: 10, priceModifier: 0 }],
      });

      // 2. "Creatine 500g" — weight in name, has an auto-default variant
      await insertProduct(client, `${prefix} Creatine 500g`, {
        basePrice: 800,
        variants: [{ sku: `${prefix}-cre-sku`, size: 'One Size', stockQuantity: 5, priceModifier: 0 }],
      });

      // 3. No weight in name, one default variant — must remain unchanged
      await insertProduct(client, `${prefix} Plain Vitamin Bottle`, {
        basePrice: 50,
        variants: [{ sku: `${prefix}-plain-sku`, size: 'One Size', stockQuantity: 20, priceModifier: 0 }],
      });

      // 4. Already has Weight variants — must remain unchanged
      await insertProduct(client, `${prefix} Protein 1kg`, {
        basePrice: 1000,
        hasWeight: true,
        variants: [
          { sku: `${prefix}-pw-1kg`, size: '1kg', stockQuantity: 15, priceModifier: 0 },
          { sku: `${prefix}-pw-2kg`, size: '2kg', stockQuantity: 8, priceModifier: 10 },
        ],
      });

      // 5. Has Flavor variants — must remain unchanged
      await insertProduct(client, `${prefix} Flavored Drink`, {
        basePrice: 60,
        hasFlavor: true,
        variants: [
          { sku: `${prefix}-flav-choc`, size: 'One Size', flavor: 'Chocolate', stockQuantity: 12, priceModifier: 0 },
          { sku: `${prefix}-flav-van`, size: 'One Size', flavor: 'Vanilla', stockQuantity: 7, priceModifier: 0 },
        ],
      });

      // 6. Both Flavor + Weight — must remain unchanged
      await insertProduct(client, `${prefix} Premium Blend 1kg`, {
        basePrice: 1200,
        hasFlavor: true,
        hasWeight: true,
        variants: [
          { sku: `${prefix}-pb-1kg-choc`, size: '1kg', flavor: 'Chocolate', stockQuantity: 20, priceModifier: 0 },
          { sku: `${prefix}-pb-1kg-van`, size: '1kg', flavor: 'Vanilla', stockQuantity: 18, priceModifier: 0 },
        ],
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      await client.release();
      throw error;
    }
    client.release();

        server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (createdProductIds.length) {
        const pgPlaceholders = createdProductIds.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `DELETE FROM product_variants WHERE product_id IN (${pgPlaceholders})`,
          createdProductIds,
        );
        await client.query(
          `DELETE FROM products WHERE id IN (${pgPlaceholders})`,
          createdProductIds,
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
      server.close();
    }
  });

  const query = async (sql, params = []) => pool.query(sql, params);

  // Helper: run normalization once and return the result
  let normalizationResult = null;
  const runOnce = async () => {
    if (!normalizationResult) {
      normalizationResult = await normalizeWeightProducts(pool);
    }
    return normalizationResult;
  };

  it('converts "Whey Protein 1kg": name stripped, Weight enabled, one variant with price=1400 stock=10', async () => {
    const wheyId = (await query(
      'SELECT id FROM products WHERE name = $1',
      [`${prefix} Whey Protein 1kg`],
    )).rows[0]?.id;

    assert.ok(wheyId, 'Whey product should exist before conversion');

    await runOnce();
    const result = normalizationResult;
    assert.equal(result.converted, 2, 'should convert exactly the 2 weight-in-name products');

    const product = await query('SELECT name, slug, has_weight, has_flavor FROM products WHERE id = $1', [wheyId]);
    assert.equal(product.rows[0].name, `${prefix} Whey Protein`);
    assert.equal(product.rows[0].has_weight, true);
    assert.equal(product.rows[0].has_flavor, false);

    const variants = await query(
      'SELECT size, weight_value, weight_unit, price_modifier, stock_quantity FROM product_variants WHERE product_id = $1',
      [wheyId],
    );
    assert.equal(variants.rows.length, 1, 'should have exactly one variant');
    assert.equal(Number(variants.rows[0].weight_value), 1);
    assert.equal(variants.rows[0].weight_unit, 'kg');
    assert.equal(Number(variants.rows[0].price_modifier), 0);
    assert.equal(variants.rows[0].stock_quantity, 10);
  });

  it('converts "Creatine 500g": name stripped, Weight=500g', async () => {
    await runOnce(); // normalization already ran
    const creId = (await query(
      'SELECT id FROM products WHERE name = $1',
      [`${prefix} Creatine`],
    )).rows[0]?.id;

    const product = await query('SELECT name, has_weight, has_flavor FROM products WHERE id = $1', [creId]);
    assert.equal(product.rows[0].name, `${prefix} Creatine`);
    assert.equal(product.rows[0].has_weight, true);

    const variants = await query(
      'SELECT weight_value, weight_unit, price_modifier, stock_quantity FROM product_variants WHERE product_id = $1',
      [creId],
    );
    assert.equal(variants.rows.length, 1);
    assert.equal(Number(variants.rows[0].weight_value), 500);
    assert.equal(variants.rows[0].weight_unit, 'g');
  });

  it('leaves "Plain Vitamin Bottle" (no weight in name) completely unchanged', async () => {
    await runOnce();
    const plainId = (await query(
      'SELECT id FROM products WHERE name = $1',
      [`${prefix} Plain Vitamin Bottle`],
    )).rows[0]?.id;

    const product = await query('SELECT name, has_weight, has_flavor FROM products WHERE id = $1', [plainId]);
    assert.equal(product.rows[0].name, `${prefix} Plain Vitamin Bottle`);
    assert.equal(product.rows[0].has_weight, false);

    const variants = await query(
      'SELECT size, weight_value, stock_quantity FROM product_variants WHERE product_id = $1',
      [plainId],
    );
    assert.equal(variants.rows.length, 1);
    assert.equal(variants.rows[0].size, 'One Size');
    assert.equal(variants.rows[0].weight_value, null);
    assert.equal(variants.rows[0].stock_quantity, 20);
  });

  it('does NOT modify products that already have Weight variants', async () => {
    await runOnce();
    const prodId = (await query(
      'SELECT id FROM products WHERE slug = $1',
      [`${prefix}-protein-1kg`],
    )).rows[0]?.id;

    const product = await query('SELECT name, has_weight, has_flavor FROM products WHERE id = $1', [prodId]);
    assert.equal(product.rows[0].has_weight, true);
    assert.equal(product.rows[0].name, `${prefix} Protein 1kg`);

    const variants = await query(
      'SELECT weight_value, weight_unit FROM product_variants WHERE product_id = $1 ORDER BY id ASC',
      [prodId],
    );
    assert.equal(variants.rows.length, 2);
    assert.equal(Number(variants.rows[0].weight_value), 1);
    assert.equal(variants.rows[0].weight_unit, 'kg');
    assert.equal(Number(variants.rows[1].weight_value), 2);
    assert.equal(variants.rows[1].weight_unit, 'kg');
  });

  it('does NOT modify products with Flavor variants', async () => {
    await runOnce();
    const prodId = (await query(
      'SELECT id FROM products WHERE name = $1',
      [`${prefix} Flavored Drink`],
    )).rows[0]?.id;

    const product = await query('SELECT name, has_weight, has_flavor FROM products WHERE id = $1', [prodId]);
    assert.equal(product.rows[0].name, `${prefix} Flavored Drink`);
    assert.equal(product.rows[0].has_flavor, true);
    assert.equal(product.rows[0].has_weight, false);
  });

  it('does NOT modify products with both Flavor + Weight', async () => {
    await runOnce();
    const prodId = (await query(
      'SELECT id FROM products WHERE name = $1',
      [`${prefix} Premium Blend 1kg`],
    )).rows[0]?.id;

    const product = await query('SELECT name, has_weight, has_flavor FROM products WHERE id = $1', [prodId]);
    assert.equal(product.rows[0].name, `${prefix} Premium Blend 1kg`);
    assert.equal(product.rows[0].has_weight, true);
    assert.equal(product.rows[0].has_flavor, true);
  });

  it('is idempotent: running a second time does NOT create duplicate variants or modify names', async () => {
    await runOnce();
    normalizationResult = null; // reset so the second call actually re-runs
    const secondResult = await normalizeWeightProducts(pool);
    assert.equal(secondResult.converted, 0, 'second run should convert nothing');

    // Verify Whey product still has exactly 1 variant and correct name
    const wheyProduct = await query(
      'SELECT id, name FROM products WHERE name = $1',
      [`${prefix} Whey Protein`],
    );
    assert.equal(wheyProduct.rows.length, 1);
    const wheyId = wheyProduct.rows[0].id;

    const wheyVariants = await query(
      'SELECT id, weight_value, weight_unit, stock_quantity FROM product_variants WHERE product_id = $1',
      [wheyId],
    );
    assert.equal(wheyVariants.rows.length, 1, 'still exactly one variant');
    assert.equal(Number(wheyVariants.rows[0].weight_value), 1);
    assert.equal(wheyVariants.rows[0].weight_unit, 'kg');
    assert.equal(wheyVariants.rows[0].stock_quantity, 10);
  });

  it('Product Details API returns Weight selector data and correct price/stock', async () => {
    await runOnce();
    const wheyProduct = await query(
      'SELECT slug FROM products WHERE name = $1',
      [`${prefix} Whey Protein`],
    );
    const slug = wheyProduct.rows[0].slug;

    const response = await fetch(`${baseUrl}/api/products/${slug}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);

    const data = body.data;
    assert.equal(data.has_weight, true);
    assert.equal(data.name, `${prefix} Whey Protein`);

    // Should have Weight selector data
    assert.ok(data.availableWeights, 'should have availableWeights array');
    assert.ok(data.availableWeights.length > 0, 'should have at least one weight');
    const weight = data.availableWeights[0];
    assert.equal(weight.value, 1);
    assert.equal(weight.unit, 'kg');

    // Verify the variant has the correct price (base_price + 0 modifier = 1400)
    const weightVariant = data.variants.find((v) => v.weight_label === '1 kg' || v.weight_label === '1kg');
    assert.ok(weightVariant, 'should have a 1kg variant in the API response');
    assert.equal(Number(weightVariant.price), 1400);
    assert.equal(Number(weightVariant.stock_quantity), 10);
    assert.equal(Number(weightVariant.effective_price), 1400);
  });
});



