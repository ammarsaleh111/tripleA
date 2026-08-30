import { getDatabase } from '../config/db.js';
import { validateOfferInput } from '../validators/offerValidator.js';

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const activeClause = `
  o.is_active = TRUE
  AND now() >= o.starts_at
  AND (o.ends_at IS NULL OR now() < o.ends_at)
`;

const ensureProductsExist = async (connection, productIds) => {
  const placeholders = productIds.map(() => '?').join(', ');
  const [rows] = await connection.query(`SELECT id FROM products WHERE id IN (${placeholders})`, productIds);
  const found = new Set(rows.map((row) => Number(row.id)));
  const missing = productIds.filter((id) => !found.has(id));
  if (missing.length) throw createHttpError(400, `Product(s) do not exist: ${missing.join(', ')}.`);
};

const ensureFixedDiscountAllowed = async (connection, offer) => {
  if (offer.offerType !== 'product_discount' || offer.discountType !== 'fixed') return;
  const [rows] = await connection.query('SELECT base_price FROM products WHERE id = ? LIMIT 1', [offer.productId]);
  if (!rows.length) throw createHttpError(400, 'The specified product does not exist.');
  if (offer.discountValue > Number(rows[0].base_price)) {
    throw createHttpError(400, 'Fixed discount cannot produce a negative product price.');
  }
};

const validateAndPersistOffer = async (connection, payload, offerId = null) => {
  const offer = validateOfferInput(payload);
  const productIds = offer.offerType === 'bundle' ? offer.productIds : [offer.productId];
  await ensureProductsExist(connection, productIds);
  await ensureFixedDiscountAllowed(connection, offer);

  const values = [
    offer.offerType,
    offer.offerType === 'product_discount' ? offer.productId : null,
    offer.name,
    offer.description,
    offer.offerType === 'bundle' ? offer.bundlePrice : null,
    offer.offerType === 'product_discount' ? offer.discountType : null,
    offer.offerType === 'product_discount' ? offer.discountValue : null,
    offer.startsAt,
    offer.endsAt,
    offer.isActive,
  ];

  let savedId;
  if (offerId) {
    const [result] = await connection.query(
      `UPDATE offers
       SET offer_type = ?, product_id = ?, name = ?, description = ?, bundle_price = ?,
           discount_type = ?, discount_value = ?, starts_at = ?, ends_at = ?,
           is_active = ?, updated_at = now()
       WHERE id = ?`,
      [...values, offerId],
    );
    if (!result.affectedRows) throw createHttpError(404, 'Offer not found.');
    savedId = offerId;
    await connection.query('DELETE FROM bundle_offer_products WHERE offer_id = ?', [offerId]);
  } else {
    const [result] = await connection.query(
      `INSERT INTO offers
       (offer_type, product_id, name, description, bundle_price, discount_type, discount_value,
        starts_at, ends_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      values,
    );
    savedId = result.insertId;
  }

  if (offer.offerType === 'bundle') {
    for (const productId of offer.productIds) {
      await connection.query(
        'INSERT INTO bundle_offer_products (offer_id, product_id) VALUES (?, ?)',
        [savedId, productId],
      );
    }
  }

  return savedId;
};

const mapOffer = (row, products = []) => ({
  id: row.id,
  offerType: row.offer_type,
  name: row.name,
  description: row.description,
  bundlePrice: row.bundle_price === null ? null : Number(row.bundle_price),
  discountType: row.discount_type,
  discountValue: row.discount_value === null ? null : Number(row.discount_value),
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  isActive: row.is_active,
  isCurrentlyActive: Boolean(row.is_currently_active),
  product: row.product_id ? {
    id: row.product_id,
    name: row.product_name,
    slug: row.product_slug,
    basePrice: Number(row.base_price),
    effectivePrice: row.discount_type === 'percentage'
      ? Number((Number(row.base_price) * (1 - Number(row.discount_value) / 100)).toFixed(2))
      : Number(Math.max(0, Number(row.base_price) - Number(row.discount_value)).toFixed(2)),
  } : null,
  products,
  isAvailable: row.offer_type === 'bundle' ? Boolean(row.is_available) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getOffers = async ({ activeOnly = false }) => {
  const db = getDatabase();
  const where = activeOnly ? `WHERE ${activeClause}` : '';
  const [rows] = await db.query(`
    SELECT o.*, p.name AS product_name, p.slug AS product_slug, p.base_price,
      (o.offer_type <> 'bundle' OR NOT EXISTS (
        SELECT 1
        FROM bundle_offer_products bop
        JOIN products bp ON bp.id = bop.product_id
        WHERE bop.offer_id = o.id
          AND NOT EXISTS (
            SELECT 1 FROM product_variants bpv
            WHERE bpv.product_id = bp.id AND bpv.stock_quantity > 0
          )
      )) AS is_available,
      (${activeClause}) AS is_currently_active
    FROM offers o
    LEFT JOIN products p ON p.id = o.product_id
    ${where}
    ORDER BY o.created_at DESC, o.id DESC
  `);

  const bundleIds = rows.filter((row) => row.offer_type === 'bundle').map((row) => row.id);
  let bundleProducts = [];
  if (bundleIds.length) {
    const placeholders = bundleIds.map(() => '?').join(', ');
    const [productRows] = await db.query(
      `SELECT bop.offer_id, p.id, p.name, p.slug, p.base_price, p.has_flavor, p.has_weight,
        COALESCE(
          (
            SELECT pi.image_url
            FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
            LIMIT 1
          ),
          ''
        ) AS primary_image
       FROM bundle_offer_products bop
       JOIN products p ON p.id = bop.product_id
       WHERE bop.offer_id IN (${placeholders})
       ORDER BY bop.offer_id, bop.product_id`,
      bundleIds,
    );

    const [variantRows] = await db.query(
      `SELECT pv.product_id, pv.id, pv.sku, pv.flavor, pv.color, pv.weight_value, pv.weight_unit,
        pv.price_modifier, pv.stock_quantity
       FROM product_variants pv
       WHERE pv.product_id IN (
         SELECT DISTINCT product_id FROM bundle_offer_products WHERE offer_id IN (${placeholders})
       )
       ORDER BY pv.product_id, pv.id`,
      bundleIds,
    );

    const variantsByProduct = new Map();
    for (const variant of variantRows) {
      if (!variantsByProduct.has(variant.product_id)) {
        variantsByProduct.set(variant.product_id, []);
      }
      variantsByProduct.get(variant.product_id).push({
        id: variant.id,
        sku: variant.sku,
        flavor: variant.flavor || variant.color || null,
        weightLabel:
          variant.weight_value && variant.weight_unit
            ? `${Number(variant.weight_value).toString()} ${variant.weight_unit}`
            : null,
        priceModifier: Number(variant.price_modifier || 0),
        stockQuantity: Number(variant.stock_quantity || 0),
      });
    }

    bundleProducts = productRows.map((row) => ({
      ...row,
      variants: variantsByProduct.get(row.id) || [],
    }));
  }

  return rows.map((row) => mapOffer(
    row,
    bundleProducts.filter((product) => product.offer_id === row.id).map(({ offer_id, ...product }) => ({
      ...product,
      basePrice: Number(product.base_price),
      hasFlavor: Boolean(product.has_flavor),
      hasWeight: Boolean(product.has_weight),
      primaryImage: product.primary_image || '',
      variants: (product.variants || []).map((variant) => ({
        ...variant,
        weightLabel: variant.weightLabel || null,
      })),
      base_price: undefined,
      primary_image: undefined,
    })),
  ));
};

export const getActiveOffers = async (_request, response, next) => {
  try {
    const offers = await getOffers({ activeOnly: true });
    return response.status(200).json({ success: true, data: offers.filter((offer) => offer.isAvailable !== false) });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOffers = async (_request, response, next) => {
  try {
    return response.status(200).json({ success: true, data: await getOffers({ activeOnly: false }) });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOfferById = async (request, response, next) => {
  try {
    const offers = await getOffers({ activeOnly: false });
    const offer = offers.find((item) => item.id === Number(request.params.id));
    if (!offer) throw createHttpError(404, 'Offer not found.');
    return response.status(200).json({ success: true, data: offer });
  } catch (error) {
    return next(error);
  }
};

export const createAdminOffer = async (request, response, next) => {
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const id = await validateAndPersistOffer(connection, request.body);
    await connection.commit();
    return response.status(201).json({ success: true, data: (await getOffers({ activeOnly: false })).find((offer) => offer.id === id) });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
};

export const updateAdminOffer = async (request, response, next) => {
  const connection = await getDatabase().getConnection();
  try {
    await connection.beginTransaction();
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) throw createHttpError(400, 'Offer id must be a valid positive integer.');
    await validateAndPersistOffer(connection, request.body, id);
    await connection.commit();
    return response.status(200).json({ success: true, data: (await getOffers({ activeOnly: false })).find((offer) => offer.id === id) });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
};

export const updateAdminOfferStatus = async (request, response, next) => {
  try {
    const isActive = request.body.is_active ?? request.body.isActive;
    if (typeof isActive !== 'boolean') throw createHttpError(400, 'is_active must be a boolean.');
    const db = getDatabase();
    const [result] = await db.query('UPDATE offers SET is_active = ?, updated_at = now() WHERE id = ?', [isActive, request.params.id]);
    if (!result.affectedRows) throw createHttpError(404, 'Offer not found.');
    return response.status(200).json({ success: true, data: (await getOffers({ activeOnly: false })).find((offer) => offer.id === Number(request.params.id)) });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminOffer = async (request, response, next) => {
  try {
    const [result] = await getDatabase().query('DELETE FROM offers WHERE id = ?', [request.params.id]);
    if (!result.affectedRows) throw createHttpError(404, 'Offer not found.');
    return response.status(200).json({ success: true, message: 'Offer deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};
