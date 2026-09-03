/**
 * Verifies the bundle image_url flow end-to-end:
 * Admin sets image_url -> API saves it -> /offers returns it.
 * Also verifies weight selection in the bundle admin form.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const BASE = 'http://localhost:5000/api';
const stamp = Date.now();
let failures = 0;

const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` - ${extra}`}`);
  if (!ok) failures += 1;
};

const api = async (pathStr, { method = 'GET', token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${pathStr}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
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

// 1. Create whey product (weight + flavor)
const whey = await api('/admin/products', {
  method: 'POST', token: adminToken,
  body: {
    name: `BIW Whey ${stamp}`, base_price: 700,
    category_name: 'Supplements', category_slug: 'supplements',
    subcategory_name: 'Protein', subcategory_slug: 'protein',
    has_flavor: true, has_weight: true,
    images: [{ image_url: 'https://example.com/whey.jpg', is_primary: true }],
    variants: [
      { flavor: 'Chocolate', weight_value: 1, weight_unit: 'kg', size: '1 kg', price_modifier: 700, stock_quantity: 10 },
      { flavor: 'Vanilla', weight_value: 1, weight_unit: 'kg', size: '1 kg', price_modifier: 700, stock_quantity: 5 },
      { flavor: 'Chocolate', weight_value: 2, weight_unit: 'kg', size: '2 kg', price_modifier: 1800, stock_quantity: 3 },
    ],
  },
});
check('Create whey product', whey.status === 201, JSON.stringify(whey.data));
const wheyId = whey.data?.data?.id;
const wheyVariants = whey.data?.data?.variants || [];
const whey1kgVariant = wheyVariants.find((v) => Number(v.weightValue) === 1 && v.flavor === 'Chocolate');
check('Whey 1kg Chocolate variant exists', Boolean(whey1kgVariant), JSON.stringify(wheyVariants));

// 2. Create shaker product (no weight)
const shaker = await api('/admin/products', {
  method: 'POST', token: adminToken,
  body: {
    name: `BIW Shaker ${stamp}`, base_price: 123,
    category_name: null, category_slug: 'gym-accessories',
    subcategory_name: null, subcategory_slug: null,
    has_flavor: false, has_weight: false,
    images: [{ image_url: 'https://example.com/shaker.jpg', is_primary: true }],
    variants: [{ sku: 'BIW-SHAKER-001', color: 'Black', priceModifier: 0, stockQuantity: 20 }],
  },
});
check('Create shaker product', shaker.status === 201, JSON.stringify(shaker.data));
const shakerId = shaker.data?.data?.id;

// 3. Create bundle WITH image_url and weight selection
const bundleImageUrl = 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80';
const bundle = await api('/admin/offers', {
  method: 'POST', token: adminToken,
  body: {
    offer_type: 'bundle',
    name: `BIW Bundle ${stamp}`,
    description: 'whey 1kg + shaker with image',
    image_url: bundleImageUrl,
    product_ids: [wheyId, shakerId],
    variant_ids: { [wheyId]: whey1kgVariant.id },
    bundle_price: 1000,
    starts_at: new Date(Date.now() - 60000).toISOString(),
    is_active: true,
  },
});
check('Create bundle with image_url + weight', bundle.status === 201, JSON.stringify(bundle.data));
const bundleId = bundle.data?.data?.id;
const savedBundle = bundle.data?.data;
check('Bundle saved with image_url', savedBundle?.imageUrl === bundleImageUrl, savedBundle?.imageUrl);
check('Bundle saved with selected weight label', savedBundle?.products?.find((p) => Number(p.id) === wheyId)?.selectedWeightLabel === '1 kg',
  savedBundle?.products?.find((p) => Number(p.id) === wheyId)?.selectedWeightLabel);

// 4. Verify image_url in database
const dbResult = await pool.query('SELECT image_url FROM offers WHERE id = $1', [bundleId]);
check('DB: image_url stored correctly', dbResult.rows[0]?.image_url === bundleImageUrl, dbResult.rows[0]?.image_url);

// 5. Verify /offers returns image_url
const offers = await api('/offers');
const publicBundle = offers.data?.data?.find((o) => Number(o.id) === Number(bundleId));
check('Public /offers returns image_url', publicBundle?.imageUrl === bundleImageUrl, publicBundle?.imageUrl);

// 6. Edit bundle - change image and verify weight preserved
const updatedImageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=85';
const editRes = await api(`/admin/offers/${bundleId}`, {
  method: 'PUT', token: adminToken,
  body: {
    offer_type: 'bundle',
    name: `BIW Bundle ${stamp}`,
    description: 'whey 1kg + shaker with image',
    image_url: updatedImageUrl,
    product_ids: [wheyId, shakerId],
    variant_ids: { [wheyId]: whey1kgVariant.id },
    bundle_price: 900,
    starts_at: new Date(Date.now() - 60000).toISOString(),
    is_active: true,
  },
});
check('Edit bundle with new image', editRes.status === 200, JSON.stringify(editRes.data));
check('Edited bundle image_url updated', editRes.data?.data?.imageUrl === updatedImageUrl, editRes.data?.data?.imageUrl);
check('Edited bundle PRESERVES selected weight',
  editRes.data?.data?.products?.find((p) => Number(p.id) === wheyId)?.selectedWeightLabel === '1 kg',
  editRes.data?.data?.products?.find((p) => Number(p.id) === wheyId)?.selectedWeightLabel);

// 7. Verify updated image in DB
const dbResult2 = await pool.query('SELECT image_url FROM offers WHERE id = $1', [bundleId]);
check('DB: image_url updated after edit', dbResult2.rows[0]?.image_url === updatedImageUrl, dbResult2.rows[0]?.image_url);

// 8. Verify /offers returns updated image
const offers2 = await api('/offers');
const publicBundle2 = offers2.data?.data?.find((o) => Number(o.id) === Number(bundleId));
check('Public /offers returns UPDATED image_url', publicBundle2?.imageUrl === updatedImageUrl, publicBundle2?.imageUrl);

// Cleanup
if (bundleId) await api(`/admin/offers/${bundleId}`, { method: 'DELETE', token: adminToken });
if (wheyId) await api(`/admin/products/${wheyId}`, { method: 'DELETE', token: adminToken });
if (shakerId) await api(`/admin/products/${shakerId}`, { method: 'DELETE', token: adminToken });
await pool.end();

console.log(`\n========== BUNDLE IMAGE: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILED'} ==========`);
process.exit(failures === 0 ? 0 : 1);