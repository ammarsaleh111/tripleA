/**
 * End-to-end Offers flow test (run against a live server on localhost:5000).
 * Covers: product discount lifecycle, bundle lifecycle, variant selections,
 * cart, checkout, inventory, and security rules.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5000/api';
const connStr = process.env.DATABASE_URL || '';
const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1');
const isSslDisabled = connStr.includes('sslmode=disable');

const pool = new pg.Pool({
  connectionString: connStr,
  ssl: (isLocalhost || isSslDisabled) ? false : { rejectUnauthorized: false },
});

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const api = async (path, { method = 'GET', token, sessionId, body } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (sessionId) headers['x-session-id'] = sessionId;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  return { status: response.status, data };
};

const run = async () => {
  const stamp = Date.now();
  const sessionId = `e2e-${stamp}`;

  // ── Setup: admin login + test products ──────────────────────────────────
  console.log('\n[SETUP]');
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  check('Admin login', adminLogin.status === 200 && adminLogin.data?.data?.token);
  const adminToken = adminLogin.data?.data?.token;

  const client = await pool.connect();
  let productA; let productB; let variantA1; let variantA2; let variantB1;
  try {
    const pa = await client.query(
      `INSERT INTO products (name, slug, description, base_price, has_flavor, has_weight)
       VALUES ($1, $2, $3, 1000, TRUE, TRUE) RETURNING id`,
      [`E2E Whey ${stamp}`, `e2e-whey-${stamp}`, 'E2E test product A'],
    );
    productA = pa.rows[0].id;
    const va = await client.query(
      `INSERT INTO product_variants (product_id, sku, flavor, weight_value, weight_unit, price_modifier, stock_quantity)
       VALUES ($1, $2, 'Chocolate', 1, 'kg', 0, 10) RETURNING id`,
      [productA, `E2E-A1-${stamp}`],
    );
    variantA1 = va.rows[0].id;
    const va2 = await client.query(
      `INSERT INTO product_variants (product_id, sku, flavor, weight_value, weight_unit, price_modifier, stock_quantity)
       VALUES ($1, $2, 'Vanilla', 1, 'kg', 0, 10) RETURNING id`,
      [productA, `E2E-A2-${stamp}`],
    );
    variantA2 = va2.rows[0].id;

    const pb = await client.query(
      `INSERT INTO products (name, slug, description, base_price, has_flavor, has_weight)
       VALUES ($1, $2, $3, 300, FALSE, FALSE) RETURNING id`,
      [`E2E Creatine ${stamp}`, `e2e-creatine-${stamp}`, 'E2E test product B'],
    );
    productB = pb.rows[0].id;
    const vb = await client.query(
      `INSERT INTO product_variants (product_id, sku, stock_quantity)
       VALUES ($1, $2, 5) RETURNING id`,
      [productB, `E2E-B1-${stamp}`],
    );
    variantB1 = vb.rows[0].id;
    console.log(`  Products: A=${productA} (variants ${variantA1}/${variantA2}), B=${productB} (variant ${variantB1})`);
  } finally {
    client.release();
  }

  try {
    // ── 1. PRODUCT DISCOUNT ───────────────────────────────────────────────
    console.log('\n[PRODUCT DISCOUNT]');
    const discount = await api('/admin/offers', {
      method: 'POST',
      token: adminToken,
      body: {
        offer_type: 'product_discount',
        name: `E2E Discount ${stamp}`,
        product_id: productA,
        discount_type: 'percentage',
        discount_value: 20,
        starts_at: new Date(Date.now() - 60_000).toISOString(),
        is_active: true,
      },
    });
    check('Create 20% discount', discount.status === 201, JSON.stringify(discount.data));
    const discountId = discount.data?.data?.id;
    check('Effective price = 800 (1000 * 0.8)', discount.data?.data?.product?.effectivePrice === 800, `got ${discount.data?.data?.product?.effectivePrice}`);

    const dbOffer = await pool.query('SELECT product_id, discount_value, discount_type FROM offers WHERE id = $1', [discountId]);
    check('DB: discount references existing product', Number(dbOffer.rows[0]?.product_id) === Number(productA));
    check('DB: base price NOT overwritten', (await pool.query('SELECT base_price FROM products WHERE id = $1', [productA])).rows[0].base_price === '1000.00');

    const shop = await api(`/products/e2e-whey-${stamp}`);
    check('Shop API: effective_price 800, base 1000', shop.data?.data?.effective_price === 800 && shop.data?.data?.base_price === 1000, `got ${shop.data?.data?.effective_price}/${shop.data?.data?.base_price}`);
    check('Shop API: discount_type percentage', shop.data?.data?.discount_type === 'percentage');

    // Future discount must not be active
    const future = await api('/admin/offers', {
      method: 'POST',
      token: adminToken,
      body: {
        offer_type: 'product_discount',
        name: `E2E Future ${stamp}`,
        product_id: productB,
        discount_type: 'percentage',
        discount_value: 50,
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
        is_active: true,
      },
    });
    check('Create future discount', future.status === 201);
    const shopB = await api(`/products/e2e-creatine-${stamp}`);
    check('Future discount NOT active in shop (price 300)', shopB.data?.data?.effective_price === 300 && shopB.data?.data?.discount_type === null, `got ${shopB.data?.data?.effective_price}/${shopB.data?.data?.discount_type}`);

    // Expired discount must not be active
    const expired = await api('/admin/offers', {
      method: 'POST',
      token: adminToken,
      body: {
        offer_type: 'product_discount',
        name: `E2E Expired ${stamp}`,
        product_id: productB,
        discount_type: 'fixed',
        discount_value: 100,
        starts_at: new Date(Date.now() - 120_000).toISOString(),
        ends_at: new Date(Date.now() - 60_000).toISOString(),
        is_active: true,
      },
    });
    check('Create expired discount', expired.status === 201);
    const shopB2 = await api(`/products/e2e-creatine-${stamp}`);
    check('Expired discount NOT active (price 300)', shopB2.data?.data?.effective_price === 300 && shopB2.data?.data?.discount_type === null);

    // Disable discount → normal price
    const disable = await api(`/admin/offers/${discountId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { is_active: false },
    });
    check('Disable discount', disable.status === 200);
    const shopDisabled = await api(`/products/e2e-whey-${stamp}`);
    check('Disabled discount → normal price 1000', shopDisabled.data?.data?.effective_price === 1000 && shopDisabled.data?.data?.discount_type === null);
    await api(`/admin/offers/${discountId}/status`, { method: 'PATCH', token: adminToken, body: { is_active: true } });

    // ── 2. BUNDLE ─────────────────────────────────────────────────────────
    console.log('\n[BUNDLE]');
    const bundle = await api('/admin/offers', {
      method: 'POST',
      token: adminToken,
      body: {
        offer_type: 'bundle',
        name: `E2E Bundle ${stamp}`,
        description: 'E2E test bundle',
        product_ids: [productA, productB],
        bundle_price: 1100,
        starts_at: new Date(Date.now() - 60_000).toISOString(),
        is_active: true,
      },
    });
    check('Create 2-product bundle (1100 EGP)', bundle.status === 201, JSON.stringify(bundle.data));
    const bundleId = bundle.data?.data?.id;

    const dbBundle = await pool.query(
      'SELECT product_id FROM bundle_offer_products WHERE offer_id = $1 ORDER BY product_id',
      [bundleId],
    );
    check('DB: bundle references existing products', dbBundle.rows.length === 2 && Number(dbBundle.rows[0].product_id) === Math.min(productA, productB));
    const e2eProductCount = await pool.query("SELECT COUNT(*) AS c FROM products WHERE slug LIKE 'e2e-%'");
    check('DB: exactly 2 E2E products exist (no bundle-as-product duplicates)', Number(e2eProductCount.rows[0].c) === 2, `got ${e2eProductCount.rows[0].c}`);

    const activeOffers = await api('/offers');
    const homeBundle = (activeOffers.data?.data || []).find((o) => o.id === bundleId);
    check('Customer /offers returns active bundle', Boolean(homeBundle));
    check('Bundle exposes component variants for selection', (homeBundle?.products || []).every((p) => Array.isArray(p.variants)), JSON.stringify(homeBundle?.products?.map((p) => ({ id: p.id, variants: p.variants?.length }))));
    check('Bundle savings computed from base prices (1300-1100=200)', homeBundle && (homeBundle.products.reduce((s, p) => s + p.basePrice, 0) - homeBundle.bundlePrice) === 200, `got ${homeBundle ? homeBundle.products.reduce((s, p) => s + p.basePrice, 0) - homeBundle.bundlePrice : 'n/a'}`);

    // Inactive bundle disappears
    await api(`/admin/offers/${bundleId}/status`, { method: 'PATCH', token: adminToken, body: { is_active: false } });
    const afterDisable = await api('/offers');
    check('Inactive bundle disappears from /offers', !(afterDisable.data?.data || []).some((o) => o.id === bundleId));
    await api(`/admin/offers/${bundleId}/status`, { method: 'PATCH', token: adminToken, body: { is_active: true } });

    // ── 3. CART: bundle requires variant selection ────────────────────────
    console.log('\n[CART]');
    const noSelection = await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1 },
    });
    check('Bundle without variant selections REJECTED (product A has 2 variants)', noSelection.status === 400, JSON.stringify(noSelection.data));

    const badSelection = await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1, variant_selections: { [productA]: 999999, [productB]: variantB1 } },
    });
    check('Bundle with invalid variant REJECTED', badSelection.status === 400);

    const goodSelection = await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1, variant_selections: { [productA]: variantA1, [productB]: variantB1 } },
    });
    check('Bundle with valid selections added to cart', goodSelection.status === 200, JSON.stringify(goodSelection.data));

    // Same bundle + same selections → merge
    const sameAgain = await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1, variant_selections: { [productA]: variantA1, [productB]: variantB1 } },
    });
    const mergedItems = (sameAgain.data?.data?.items || []).filter((i) => i.itemType === 'bundle');
    check('Same bundle + same selections merge into ONE cart item (qty 2)', mergedItems.length === 1 && mergedItems[0].quantity === 2, JSON.stringify(mergedItems.map((i) => i.quantity)));

    // Same bundle + different selections → separate item
    const diffSelection = await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1, variant_selections: { [productA]: variantA2, [productB]: variantB1 } },
    });
    const allBundles = (diffSelection.data?.data?.items || []).filter((i) => i.itemType === 'bundle');
    check('Same bundle + DIFFERENT selections = separate cart item', allBundles.length === 2, `got ${allBundles.length}`);

    const cartState = await api('/cart', { sessionId });
    check('Cart subtotal = 3 x 1100 = 3300 (backend price)', cartState.data?.data?.subtotal === 3300, `got ${cartState.data?.data?.subtotal}`);

    // ── 4. CHECKOUT + INVENTORY ───────────────────────────────────────────
    console.log('\n[CHECKOUT + INVENTORY]');
    const stockBefore = await pool.query(
      'SELECT id, stock_quantity FROM product_variants WHERE id = ANY($1::int[]) ORDER BY id',
      [[variantA1, variantA2, variantB1]],
    );
    const stockMapBefore = Object.fromEntries(stockBefore.rows.map((r) => [r.id, Number(r.stock_quantity)]));

    const checkout = await api('/orders', {
      method: 'POST',
      sessionId,
      body: {
        paymentMethod: 'COD',
        customerName: 'E2E Tester',
        customerPhone: '+201000000000',
        customerAddress: '1 Test Street, Cairo',
        total: 3300,
      },
    });
    check('Checkout succeeds', checkout.status === 201, JSON.stringify(checkout.data));

    const stockAfter = await pool.query(
      'SELECT id, stock_quantity FROM product_variants WHERE id = ANY($1::int[]) ORDER BY id',
      [[variantA1, variantA2, variantB1]],
    );
    const stockMapAfter = Object.fromEntries(stockAfter.rows.map((r) => [r.id, Number(r.stock_quantity)]));
    check('Inventory: variantA1 -2 (exact selected variant)', stockMapAfter[variantA1] === stockMapBefore[variantA1] - 2, `${stockMapBefore[variantA1]} → ${stockMapAfter[variantA1]}`);
    check('Inventory: variantA2 -1 (exact selected variant)', stockMapAfter[variantA2] === stockMapBefore[variantA2] - 1, `${stockMapBefore[variantA2]} → ${stockMapAfter[variantA2]}`);
    check('Inventory: variantB1 -3', stockMapAfter[variantB1] === stockMapBefore[variantB1] - 3, `${stockMapBefore[variantB1]} → ${stockMapAfter[variantB1]}`);
    check('No negative stock', Object.values(stockMapAfter).every((s) => s >= 0));

    const orderItem = await pool.query(
      `SELECT oi.id, oi.item_type, oi.offer_id, oi.price_at_purchase, oi.metadata
       FROM order_items oi
       WHERE oi.item_type = 'bundle'
       ORDER BY oi.id DESC LIMIT 1`,
    );
    check('Order stores bundle price_at_purchase = 1100', Number(orderItem.rows[0]?.price_at_purchase) === 1100, `got ${orderItem.rows[0]?.price_at_purchase}`);
    const allBundleOrderItems = await pool.query(
      "SELECT metadata FROM order_items WHERE item_type = 'bundle' AND metadata::text LIKE '%E2E%' ORDER BY id ASC",
    );
    const allMetaComponents = allBundleOrderItems.rows.flatMap((row) => row.metadata?.components || []);
    check('Order metadata preserves exact variant selections', allMetaComponents.some((c) => Number(c.variantId) === Number(variantA1)) && allMetaComponents.some((c) => Number(c.variantId) === Number(variantA2)), JSON.stringify(allMetaComponents));

    // Cart cleared after checkout
    const cartAfter = await api('/cart', { sessionId });
    check('Cart cleared after checkout', (cartAfter.data?.data?.items || []).length === 0);

    // ── 5. SECURITY ───────────────────────────────────────────────────────
    console.log('\n[SECURITY]');
    const customerReg = await api('/auth/register', {
      method: 'POST',
      body: { email: `e2e-cust-${stamp}@test.com`, password: 'Customer123!', firstName: 'E2E', lastName: 'Cust' },
    });
    const customerToken = customerReg.data?.data?.token;

    const custCreate = await api('/admin/offers', {
      method: 'POST',
      token: customerToken,
      body: { offer_type: 'bundle', name: 'Hack', product_ids: [productA, productB], bundle_price: 1, starts_at: new Date().toISOString() },
    });
    check('Customer CANNOT create offers (403)', custCreate.status === 403, `got ${custCreate.status}`);

    const custDelete = await api(`/admin/offers/${bundleId}`, { method: 'DELETE', token: customerToken });
    check('Customer CANNOT delete offers (403)', custDelete.status === 403, `got ${custDelete.status}`);

    const anonOffers = await api('/admin/offers');
    check('Anonymous CANNOT list admin offers (401)', anonOffers.status === 401, `got ${anonOffers.status}`);

    // Tampered total must be rejected
    await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1, variant_selections: { [productA]: variantA1, [productB]: variantB1 } },
    });
    const tampered = await api('/orders', {
      method: 'POST',
      sessionId,
      body: {
        paymentMethod: 'COD',
        customerName: 'E2E Tester',
        customerPhone: '+201000000000',
        customerAddress: '1 Test Street, Cairo',
        total: 1,
      },
    });
    check('Frontend CANNOT manipulate final price (mismatch rejected)', tampered.status === 400, `got ${tampered.status}`);

    // Expired bundle cannot be purchased
    await api(`/admin/offers/${bundleId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        offer_type: 'bundle',
        name: `E2E Bundle ${stamp}`,
        description: 'E2E test bundle',
        product_ids: [productA, productB],
        bundle_price: 1100,
        starts_at: new Date(Date.now() - 120_000).toISOString(),
        ends_at: new Date(Date.now() - 60_000).toISOString(),
        is_active: true,
      },
    });
    const expiredBuy = await api('/cart/items', {
      method: 'POST',
      sessionId,
      body: { item_type: 'bundle', offer_id: bundleId, quantity: 1, variant_selections: { [productA]: variantA1, [productB]: variantB1 } },
    });
    check('Expired bundle CANNOT be added to cart', expiredBuy.status === 400, `got ${expiredBuy.status}`);

    // ── 6. PRODUCT DELETE GUARD ───────────────────────────────────────────
    console.log('\n[DELETE GUARDS]');
    const delProduct = await api(`/admin/products/${productA}`, { method: 'DELETE', token: adminToken });
    check('Product referenced by offers CANNOT be deleted (409)', delProduct.status === 409, `got ${delProduct.status}`);

    // Offer deletion with order history must succeed and keep order intact
    const delBundle = await api(`/admin/offers/${bundleId}`, { method: 'DELETE', token: adminToken });
    check('Offer with order history CAN be deleted', delBundle.status === 200, `got ${delBundle.status} ${JSON.stringify(delBundle.data)}`);
    const orderStillThere = await pool.query(
      "SELECT id, price_at_purchase FROM order_items WHERE item_type = 'bundle' ORDER BY id DESC LIMIT 1",
    );
    check('Historical order item survives offer deletion (price intact)', orderStillThere.rows.length > 0 && Number(orderStillThere.rows[0].price_at_purchase) === 1100);

    // ── 7. REGRESSION: normal product add-to-cart + checkout ──────────────
    console.log('\n[REGRESSION]');
    const guestSession = `e2e-guest-${stamp}`;
    const addProduct = await api('/cart/items', {
      method: 'POST',
      sessionId: guestSession,
      body: { variant_id: variantA1, quantity: 1 },
    });
    check('Normal product add-to-cart works', addProduct.status === 200);
    const guestCart = await api('/cart', { sessionId: guestSession });
    const cartItem = (guestCart.data?.data?.items || [])[0];
    check('Discounted product cart price = 800 (20% off 1000)', cartItem?.unitPrice === 800, `got ${cartItem?.unitPrice}`);
    check('Cart shows originalPrice 1000', cartItem?.originalPrice === 1000, `got ${cartItem?.originalPrice}`);

    const productCheckout = await api('/orders', {
      method: 'POST',
      sessionId: guestSession,
      body: {
        paymentMethod: 'COD',
        customerName: 'E2E Guest',
        customerPhone: '+201000000001',
        customerAddress: '2 Test Street, Cairo',
        total: 800,
      },
    });
    check('Discounted product checkout works', productCheckout.status === 201, JSON.stringify(productCheckout.data));
    const productOrderItem = await pool.query(
      "SELECT price_at_purchase FROM order_items WHERE item_type = 'product' ORDER BY id DESC LIMIT 1",
    );
    check('Order stores discounted price 800', Number(productOrderItem.rows[0]?.price_at_purchase) === 800, `got ${productOrderItem.rows[0]?.price_at_purchase}`);
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────
    console.log('\n[CLEANUP]');
    const cleanup = await pool.connect();
    try {
      await cleanup.query('BEGIN');
      await cleanup.query("DELETE FROM order_items WHERE metadata::text LIKE '%E2E%' OR product_name LIKE 'E2E%'");
      await cleanup.query('DELETE FROM orders WHERE order_number LIKE $1', [`%${stamp}%`]);
      await cleanup.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id LIKE $1)', ['e2e-%']);
      await cleanup.query('DELETE FROM carts WHERE session_id LIKE $1', ['e2e-%']);
      await cleanup.query('DELETE FROM offers WHERE name LIKE $1', [`E2E %${stamp}%`]);
      await cleanup.query('DELETE FROM bundle_offer_products WHERE product_id = ANY($1::int[])', [[productA, productB]]);
      await cleanup.query('DELETE FROM offers WHERE product_id = ANY($1::int[])', [[productA, productB]]);
      await cleanup.query('DELETE FROM product_variants WHERE product_id = ANY($1::int[])', [[productA, productB]]);
      await cleanup.query('DELETE FROM products WHERE id = ANY($1::int[])', [[productA, productB]]);
      await cleanup.query('DELETE FROM users WHERE email LIKE $1', [`e2e-cust-${stamp}@%`]);
      await cleanup.query('COMMIT');
      console.log('  Test data cleaned up.');
    } catch (error) {
      await cleanup.query('ROLLBACK');
      console.error('  Cleanup failed:', error.message);
    } finally {
      cleanup.release();
      await pool.end();
    }
  }

  console.log(`\n========== RESULTS: ${passed} passed, ${failed} failed ==========`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('E2E test crashed:', error);
  process.exitCode = 1;
});