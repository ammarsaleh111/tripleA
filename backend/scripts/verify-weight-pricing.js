/**
 * Live verification of weight-specific pricing (run against localhost:5000).
 * Cleans up all created data. See verify-weight-pricing.js parts 1-3.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const BASE = 'http://localhost:5000/api';
const stamp = Date.now();
let failures = 0;

const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` — ${extra}`}`);
  if (!ok) failures += 1;
};

const api = async (path, { method = 'GET', token, sessionId, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (sessionId) headers['x-session-id'] = sessionId;
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  return { status: response.status, data };
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const admin = await api('/auth/login', {
  method: 'POST',
  body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
});
const adminToken = admin.data?.data?.token;
check('Admin login', Boolean(adminToken));

const sessionId = `wprice-${stamp}`;
globalThis.__ctx = { api, check, adminToken, sessionId, stamp, pool };

// ── 1. Weight + flavor product: price comes ONLY from weight ─────────────
const whey = await api('/admin/products', {
  method: 'POST', token: adminToken,
  body: {
    name: `WP Whey ${stamp}`, description: 'weight pricing test', base_price: 700,
    category_name: 'Supplements', category_slug: 'supplements',
    subcategory_name: 'Protein', subcategory_slug: 'protein',
    has_flavor: true, has_weight: true,
    variants: [
      { flavor: 'Chocolate', weight_value: 500, weight_unit: 'g', size: '500 g', price_modifier: 100, stock_quantity: 10 },
      { flavor: 'Vanilla', weight_value: 500, weight_unit: 'g', size: '500 g', price_modifier: 100, stock_quantity: 4 },
      { flavor: 'Chocolate', weight_value: 1, weight_unit: 'kg', size: '1 kg', price_modifier: 700, stock_quantity: 8 },
      { flavor: 'Vanilla', weight_value: 1, weight_unit: 'kg', size: '1 kg', price_modifier: 700, stock_quantity: 2 },
      { flavor: 'Chocolate', weight_value: 2, weight_unit: 'kg', size: '2 kg', price_modifier: 1800, stock_quantity: 3 },
    ],
    images: [{ image_url: 'https://example.com/whey.jpg', is_primary: true }],
  },
});
check('Create whey (flavor + 3 weight tiers)', whey.status === 201, JSON.stringify(whey.data));
const wheyId = whey.data?.data?.id;
const wheyVariants = whey.data?.data?.variants || [];
const pickVariant = (flavor, value) => wheyVariants.find(
  (v) => (v.flavor || v.color) === flavor && Number(v.weightValue ?? v.weight_value) === Number(value),
);
const v500C = pickVariant('Chocolate', 500);
const v500V = pickVariant('Vanilla', 500);
const v1kC = pickVariant('Chocolate', 1);
const v1kV = pickVariant('Vanilla', 1);
const v2k = wheyVariants.find((v) => Number(v.weightValue ?? v.weight_value) === 2);
const detail = await api(`/products/${whey.data?.data?.slug}`);
const eff = (id) => Number((detail.data?.data?.variants || []).find((v) => Number(v.id) === Number(id))?.effective_price);
check('Chocolate 500g = 800', eff(v500C.id) === 800, eff(v500C.id));
check('Vanilla 500g = 800 (same weight, same price)', eff(v500V.id) === 800, eff(v500V.id));
check('Chocolate 1kg = 1400', eff(v1kC.id) === 1400, eff(v1kC.id));
check('Vanilla 1kg = 1400 (same weight, same price)', eff(v1kV.id) === 1400, eff(v1kV.id));
check('2kg = 2500', eff(v2k.id) === 2500, eff(v2k.id));
globalThis.__whey = { whey, wheyId, v500C, v500V, v1kC, v1kV, v2k };

// ── 2. Weight-targeted discount: 20% off 1kg ONLY ────────────────────────
const discount = await api('/admin/offers', {
  method: 'POST', token: adminToken,
  body: {
    offer_type: 'product_discount', name: `WP Disc ${stamp}`, product_id: wheyId,
    variant_id: v1kC.id, discount_type: 'percentage', discount_value: 20,
    starts_at: new Date(Date.now() - 60_000).toISOString(), is_active: true,
  },
});
check('Create weight-targeted discount (1kg, 20%)', discount.status === 201, JSON.stringify(discount.data));

const detail2 = await api(`/products/${whey.data?.data?.slug}`);
const eff2 = (id) => Number((detail2.data?.data?.variants || []).find((v) => Number(v.id) === Number(id))?.effective_price);
check('After discount: 500g still 800', eff2(v500C.id) === 800, eff2(v500C.id));
check('After discount: 1kg = 1120 (20% off 1400)', eff2(v1kC.id) === 1120, eff2(v1kC.id));
check('After discount: 2kg still 2500', eff2(v2k.id) === 2500, eff2(v2k.id));
check('Product-level price NOT distorted by weight discount', Number(detail2.data?.data?.effective_price) === 700, detail2.data?.data?.effective_price);

await api('/cart/items', { method: 'POST', sessionId, body: { variant_id: v1kV.id, quantity: 1 } });
const cart1 = await api('/cart', { sessionId });
const item1kV = (cart1.data?.data?.items || []).find((i) => Number(i.variantId) === Number(v1kV.id));
check('Cart: Vanilla 1kg unit price = 1120', Number(item1kV?.unitPrice) === 1120, item1kV?.unitPrice);
await api('/cart/items', { method: 'POST', sessionId, body: { variant_id: v500C.id, quantity: 1 } });
const cart2 = await api('/cart', { sessionId });
const item500 = (cart2.data?.data?.items || []).find((i) => Number(i.variantId) === Number(v500C.id));
check('Cart: Chocolate 500g unit price = 800', Number(item500?.unitPrice) === 800, item500?.unitPrice);
const total = Number(cart2.data?.data?.subtotal);
check('Cart subtotal = 1120 + 800 = 1920', total === 1920, total);

const shop = await api(`/products?search=${encodeURIComponent(`WP Whey ${stamp}`)}`);
check('Shop list has weight-aware min/max prices', Number(shop.data?.data?.[0]?.min_price) === 800 && Number(shop.data?.data?.[0]?.max_price) === 2500, JSON.stringify({ min: shop.data?.data?.[0]?.min_price, max: shop.data?.data?.[0]?.max_price }));
globalThis.__disc = { discount, total };

// ── 3. Weight-pinned bundle + no-options product ─────────────────────────
const shaker = await api('/admin/products', {
  method: 'POST', token: adminToken,
  body: {
    name: `WP Shaker ${stamp}`, description: 'no options', base_price: 123,
    category_name: 'Gym Accessories', category_slug: 'gym-accessories',
    has_flavor: false, has_weight: false,
    variants: [{ stock_quantity: 20 }],
    images: [],
  },
});
check('Create shaker (no flavor/weight)', shaker.status === 201, JSON.stringify(shaker.data));
const shakerId = shaker.data?.data?.id;
const shakerVariantId = Number(shaker.data?.data?.variants?.[0]?.id);

const bundle = await api('/admin/offers', {
  method: 'POST', token: adminToken,
  body: {
    offer_type: 'bundle', name: `WP Bundle ${stamp}`,
    product_ids: [wheyId, shakerId],
    variant_ids: { [wheyId]: v1kC.id },
    bundle_price: 1000,
    starts_at: new Date(Date.now() - 60_000).toISOString(), is_active: true,
  },
});
check('Create bundle (Whey 1kg + Shaker, 1000 EGP)', bundle.status === 201, JSON.stringify(bundle.data));
const offers = (await api('/offers')).data?.data || [];
const bundleOffer = offers.find((o) => Number(o.id) === Number(bundle.data?.data?.id));
const wheyComponent = bundleOffer?.products?.find((p) => Number(p.id) === Number(wheyId));
check('Bundle exposes selected weight label (1 kg)', wheyComponent?.selectedWeightLabel === '1 kg', wheyComponent?.selectedWeightLabel);
check('Bundle regular total = 1400 + 123 = 1523', Number(bundleOffer?.regularTotal) === 1523, bundleOffer?.regularTotal);

const bad = await api('/cart/items', {
  method: 'POST', sessionId,
  body: { item_type: 'bundle', offer_id: bundle.data?.data?.id, quantity: 1, variant_selections: { [wheyId]: v2k.id, [shakerId]: shakerVariantId } },
});
check('Bundle with WRONG weight rejected', bad.status === 400, `${bad.status} ${JSON.stringify(bad.data)}`);
const good = await api('/cart/items', {
  method: 'POST', sessionId,
  body: { item_type: 'bundle', offer_id: bundle.data?.data?.id, quantity: 1, variant_selections: { [wheyId]: v1kV.id } },
});
check('Bundle with 1kg flavor choice accepted (flavor free, weight pinned)', good.status === 200, JSON.stringify(good.data));
const bundleCartItem = (good.data?.data?.items || []).find((i) => i.itemType === 'bundle');
check('Bundle cart item unit price = 1000 (backend)', Number(bundleCartItem?.unitPrice) === 1000, bundleCartItem?.unitPrice);

const checkout = await api('/orders/checkout', {
  method: 'POST', sessionId,
    body: { total: total + 1000, customerName: 'WP Test', customerPhone: '01000000000', customerAddress: '123 Cairo St' },
});
check('Checkout succeeds with server-authoritative prices', checkout.status === 200 || checkout.status === 201, JSON.stringify(checkout.data)?.slice(0, 200));
globalThis.__bundle = { bundle, shakerId };

// ── Order history + cleanup ──────────────────────────────────────────────
const orderId = checkout.data?.data?.id;
if (orderId) {
  const orderItem = await pool.query('SELECT item_type, price_at_purchase FROM order_items WHERE order_id = $1 ORDER BY id ASC', [orderId]);
  const bundleRow = orderItem.rows.find((r) => r.item_type === 'bundle');
  check('Order: bundle price_at_purchase = 1000', Number(bundleRow?.price_at_purchase) === 1000, bundleRow?.price_at_purchase);
  check('Order rows present (3 line items, historical prices)', orderItem.rows.length === 3, orderItem.rows.length);
}

const cleanup = await pool.connect();
try {
  await cleanup.query('BEGIN');
  if (orderId) await cleanup.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
  await cleanup.query("DELETE FROM orders WHERE customer_name = 'WP Test'");
  await cleanup.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id = $1)', [sessionId]);
  await cleanup.query('DELETE FROM carts WHERE session_id = $1', [sessionId]);
  if (bundle.data?.data?.id) await cleanup.query('DELETE FROM offers WHERE id = $1', [bundle.data.data.id]);
  if (discount.data?.data?.id) await cleanup.query('DELETE FROM offers WHERE id = $1', [discount.data.data.id]);
  await cleanup.query('DELETE FROM products WHERE id = ANY($1::int[])', [[wheyId, shakerId]]);
  await cleanup.query('COMMIT');
  console.log('Cleanup done.');
} catch (error) {
  await cleanup.query('ROLLBACK');
  console.log('Cleanup failed:', error.message);
} finally {
  cleanup.release();
  await pool.end();
}

console.log(`========== WEIGHT PRICING: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILED'} ==========`);
process.exit(failures === 0 ? 0 : 1);




