import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import dotenv from 'dotenv';
import pg from 'pg';

import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

dotenv.config();

const { Pool } = pg;
const shouldRun = process.env.RUN_DB_TESTS === 'true';
const suite = shouldRun ? describe : describe.skip;

suite('offers API', () => {
  let server;
  let baseUrl;
  let pool;
  let adminToken;
  let customerToken;
  let productIds;
  let customerId;
  const slugPrefix = `offer-test-${Date.now()}`;

  const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);
  const json = (body) => ({ 'content-type': 'application/json', ...body });

  before(async () => {
    await connectDatabase();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();
    try {
      const products = [];
      for (let index = 1; index <= 2; index += 1) {
        const product = await client.query(
          `INSERT INTO products (name, slug, description, base_price)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [`Offer Test Product ${index}`, `${slugPrefix}-${index}`, 'Temporary offer test product', 100],
        );
        const productId = product.rows[0].id;
        await client.query(
          `INSERT INTO product_variants (product_id, sku, size, stock_quantity)
           VALUES ($1, $2, 'Standard', $3)`,
          [productId, `${slugPrefix}-sku-${index}`, index === 1 ? 10 : 0],
        );
        products.push(productId);
      }
      productIds = products;
    } finally {
      client.release();
    }

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      headers: json({}),
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
    });
    adminToken = (await adminLogin.json()).data.token;

    const customerEmail = `${slugPrefix}@example.com`;
    const customerRegistration = await request('/auth/register', {
      method: 'POST',
      headers: json({}),
      body: JSON.stringify({ email: customerEmail, password: 'Customer123!', firstName: 'Offer', lastName: 'Tester' }),
    });
    const customerBody = await customerRegistration.json();
    customerId = customerBody.data.user.id;
    customerToken = customerBody.data.token;
  });

  after(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM offers WHERE name LIKE $1', [`Offer Test%`]);
      await client.query('DELETE FROM users WHERE id = $1', [customerId]);
      await client.query('DELETE FROM product_variants WHERE product_id = ANY($1::int[])', [productIds]);
      await client.query('DELETE FROM products WHERE id = ANY($1::int[])', [productIds]);
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

  const adminHeaders = () => ({ authorization: `Bearer ${adminToken}` });
  const customerHeaders = () => ({ authorization: `Bearer ${customerToken}` });
  const offerPayload = (overrides = {}) => ({
    offer_type: 'bundle',
    name: 'Offer Test Bundle',
    description: 'Temporary test bundle',
    product_ids: productIds,
    bundle_price: 150,
    starts_at: new Date(Date.now() - 60_000).toISOString(),
    is_active: true,
    ...overrides,
  });

  it('creates a bundle offer', async () => {
    const response = await request('/admin/offers', { method: 'POST', headers: json(adminHeaders()), body: JSON.stringify(offerPayload()) });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.data.products.length, 2);
  });

  it('rejects invalid bundle product selections', async () => {
    for (const product_ids of [[productIds[0]], [productIds[0], productIds[0]], [productIds[0], 999999999]]) {
      const response = await request('/admin/offers', { method: 'POST', headers: json(adminHeaders()), body: JSON.stringify(offerPayload({ name: `Offer Test Invalid ${product_ids.length}`, product_ids })) });
      assert.equal(response.status, 400);
    }
  });

  it('creates percentage discounts and rejects invalid discounts', async () => {
    const valid = await request('/admin/offers', {
      method: 'POST',
      headers: json(adminHeaders()),
      body: JSON.stringify(offerPayload({ offer_type: 'product_discount', name: 'Offer Test Discount', product_ids: undefined, product_id: productIds[0], bundle_price: undefined, discount_type: 'percentage', discount_value: 20 })),
    });
    assert.equal(valid.status, 201);
    assert.equal((await valid.json()).data.product.effectivePrice, 80);

    const invalid = await request('/admin/offers', {
      method: 'POST',
      headers: json(adminHeaders()),
      body: JSON.stringify(offerPayload({ offer_type: 'product_discount', name: 'Offer Test Invalid Discount', product_ids: undefined, product_id: productIds[0], bundle_price: undefined, discount_type: 'percentage', discount_value: 101 })),
    });
    assert.equal(invalid.status, 400);
  });

  it('applies active, future, expired, and unlimited timing rules', async () => {
    const cases = [
      ['Offer Test Future', new Date(Date.now() + 86_400_000), null, false],
      ['Offer Test Active', new Date(Date.now() - 60_000), new Date(Date.now() + 60_000), true],
      ['Offer Test Expired', new Date(Date.now() - 120_000), new Date(Date.now() - 60_000), false],
      ['Offer Test Unlimited', new Date(Date.now() - 60_000), null, true],
    ];
    for (const [name, starts_at, ends_at, expected] of cases) {
      const response = await request('/admin/offers', { method: 'POST', headers: json(adminHeaders()), body: JSON.stringify(offerPayload({ name, starts_at: starts_at.toISOString(), ends_at: ends_at?.toISOString() })) });
      assert.equal(response.status, 201);
      assert.equal((await response.json()).data.isCurrentlyActive, expected);
    }
  });

  it('allows admin modification but denies customer modification', async () => {
    const created = await request('/admin/offers', { method: 'POST', headers: json(adminHeaders()), body: JSON.stringify(offerPayload({ name: 'Offer Test Modification' })) });
    const offerId = (await created.json()).data.id;
    const adminUpdate = await request(`/admin/offers/${offerId}/status`, { method: 'PATCH', headers: json(adminHeaders()), body: JSON.stringify({ is_active: false }) });
    assert.equal(adminUpdate.status, 200);
    const customerUpdate = await request(`/admin/offers/${offerId}/status`, { method: 'PATCH', headers: json(customerHeaders()), body: JSON.stringify({ is_active: true }) });
    assert.equal(customerUpdate.status, 403);
  });

  it('returns only active and available offers publicly', async () => {
    const response = await request('/offers');
    assert.equal(response.status, 200);
    const offers = (await response.json()).data;
    assert.ok(offers.every((offer) => offer.isCurrentlyActive && offer.isAvailable !== false));
  });
});
