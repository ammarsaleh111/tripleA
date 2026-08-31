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
  if (offer.variantId) {
    const [rows] = await connection.query(
      `SELECT (p.base_price + pv.price_modifier) AS variant_price
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = ? AND pv.product_id = ?
       LIMIT 1`,
      [offer.variantId, offer.productId],
    );
    if (!rows.length) throw createHttpError(400, 'The specified variant does not belong to the product.');
    if (offer.discountValue > Number(rows[0].variant_price)) {
      throw createHttpError(400, 'Fixed discount cannot produce a negative product price.');
    }
    return;
  }
  const [rows] = await connection.query('SELECT base_price FROM products WHERE id = ? LIMIT 1', [offer.productId]);
  if (!rows.length) throw createHttpError(400, 'The specified product does not exist.');
  if (offer.discountValue > Number(rows[0].base_price)) {
    throw createHttpError(400, 'Fixed discount cannot produce a negative product price.');
  }
};

// Resolves the exact purchasable variant for every bundle component and
// computes the regular (undiscounted) combined value from those variants.
const resolveBundleVariants = async (connection, offer) => {
  const placeholders = offer.productIds.map(() => '?').join(', ');
  const [productRows] = await connection.query(
    `SELECT p.id, p.name, p.base_price FROM products p WHERE p.id IN (${placeholders})`,
    offer.productIds,
  );
  const [variantRows] = await connection.query(
    `SELECT pv.id, pv.product_id, pv.flavor, pv.weight_value, pv.weight_unit, pv.price_modifier
     FROM product_variants pv
     WHERE pv.product_id IN (${placeholders})
     ORDER BY pv.product_id, pv.id`,
    offer.productIds,
  );

  const variantsByProduct = new Map();
  for (const variant of variantRows) {
    if (!variantsByProduct.has(variant.product_id)) {
      variantsByProduct.set(variant.product_id, []);
    }
    variantsByProduct.get(variant.product_id).push(variant);
  }

  const resolved = [];
  let regularTotal = 0;
  for (const product of productRows) {
    const variants = variantsByProduct.get(product.id) || [];
    const weightTiers = [
      ...new Set(
        variants
          .filter((variant) => variant.weight_value !== null && variant.weight_value !== undefined)
          .map((variant) => `${Number(variant.weight_value)}|${variant.weight_unit || 'g'}`),
      ),
    ];

    let selected = null;
    const requestedId = offer.variantIdMap?.get(Number(product.id));
    if (requestedId) {
      selected = variants.find((variant) => Number(variant.id) === Number(requestedId));
      if (!selected) {
        throw createHttpError(400, `Selected weight for "${product.name}" does not belong to that product.`);
      }
    } else if (weightTiers.length > 1) {
      // A multi-weight product MUST be pinned to an explicit weight: never
      // fall back to the cheapest or first variant silently.
      throw createHttpError(400, `Select the weight to include for "${product.name}".`);
    } else if (weightTiers.length === 1) {
      const [weightValue, weightUnit] = weightTiers[0].split('|');
      selected = variants.find(
        (variant) =>
          Number(variant.weight_value) === Number(weightValue) && (variant.weight_unit || 'g') === weightUnit,
      );
    } else {
      // No weight tiers: legacy/standard product, first variant (or none).
      selected = variants[0] || null;
    }

    if (selected) {
      regularTotal += Number(product.base_price) + Number(selected.price_modifier || 0);
    }
    resolved.push({ productId: Number(product.id), variantId: selected ? Number(selected.id) : null });
  }

  return { resolved, regularTotal: Number(regularTotal.toFixed(2)) };
};

const validateAndPersistOffer = async (connection, payload, offerId = null) => {
  const offer = validateOfferInput(payload);
  const productIds = offer.offerType === 'bundle' ? offer.productIds : [offer.productId];
  await ensureProductsExist(connection, productIds);
  await ensureFixedDiscountAllowed(connection, offer);

  let bundleResolution = null;
  if (offer.offerType === 'bundle') {
    bundleResolution = await resolveBundleVariants(connection, offer);
    // Bundle price must be a real saving against the exact selected variants,
    // but never negative — validated server-side, never trusted from the UI.
    if (offer.bundlePrice > bundleResolution.regularTotal) {
      throw createHttpError(
        400,
        `Bundle price (${offer.bundlePrice}) cannot exceed the regular combined value (${bundleResolution.regularTotal}).`,
      );
    }
  }

  const discountVariantId = offer.offerType === 'product_discount' ? offer.variantId : null;

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
    offer.imageUrl || null,
    discountVariantId,
  ];

  let savedId;
  if (offerId) {
    const [result] = await connection.query(
      `UPDATE offers
       SET offer_type = ?, product_id = ?, name = ?, description = ?, bundle_price = ?,
           discount_type = ?, discount_value = ?, starts_at = ?, ends_at = ?,
           is_active = ?, image_url = ?, variant_id = ?, updated_at = now()
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
        starts_at, ends_at, is_active, image_url, variant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      values,
    );
    savedId = result.insertId;
  }

  if (offer.offerType === 'bundle') {
    for (const component of bundleResolution.resolved) {
      await connection.query(
        'INSERT INTO bundle_offer_products (offer_id, product_id, variant_id) VALUES (?, ?, ?)',
        [savedId, component.productId, component.variantId],
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
  imageUrl: row.image_url || null,
  regularTotal: row.offer_type === 'bundle'
    ? Number(products.reduce((sum, product) => sum + Number(product.selectedVariantPrice || product.basePrice || 0), 0).toFixed(2))
    : undefined,
  product: row.product_id ? {
    id: row.product_id,
    name: row.product_name,
    slug: row.product_slug,
    basePrice: Number(row.base_price),
    variantId: row.discount_variant_id ? Number(row.discount_variant_id) : null,
    variantWeightLabel: row.discount_variant_weight_label || null,
    // Product-level effective price only reflects whole-product discounts;
    // weight-targeted discounts are applied per-variant in cart/checkout.
    effectivePrice: row.discount_variant_id ? Number(row.base_price) : (row.discount_type === 'percentage'
      ? Number((Number(row.base_price) * (1 - Number(row.discount_value) / 100)).toFixed(2))
      : Number(Math.max(0, Number(row.base_price) - Number(row.discount_value)).toFixed(2))),
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
      ov.id AS discount_variant_id,
      CASE
        WHEN ov.weight_value IS NOT NULL AND ov.weight_unit IS NOT NULL
          THEN CONCAT(rtrim(CAST(ov.weight_value AS text), '.0'), ' ', ov.weight_unit)
        ELSE NULL
      END AS discount_variant_weight_label,
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
    LEFT JOIN product_variants ov ON ov.id = o.variant_id
    ${where}
    ORDER BY o.created_at DESC, o.id DESC
  `);

  const bundleIds = rows.filter((row) => row.offer_type === 'bundle').map((row) => row.id);
  let bundleProducts = [];
  if (bundleIds.length) {
    const placeholders = bundleIds.map(() => '?').join(', ');
    const [productRows] = await db.query(
      `SELECT bop.offer_id, p.id, p.name, p.slug, p.base_price, p.has_flavor, p.has_weight,
        bop.variant_id AS bundle_variant_id,
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
    bundleProducts.filter((product) => product.offer_id === row.id).map(({ offer_id, ...product }) => {
      const bundleVariantId = product.bundle_variant_id ? Number(product.bundle_variant_id) : null;
      const selectedVariant = bundleVariantId
        ? (product.variants || []).find((variant) => Number(variant.id) === bundleVariantId) || null
        : null;
      return {
        ...product,
        basePrice: Number(product.base_price),
        hasFlavor: Boolean(product.has_flavor),
        hasWeight: Boolean(product.has_weight),
        primaryImage: product.primary_image || '',
        selectedVariantId: selectedVariant ? Number(selectedVariant.id) : null,
        selectedWeightLabel: selectedVariant?.weightLabel || null,
        selectedVariantPrice: selectedVariant
          ? Number((Number(product.base_price) + Number(selectedVariant.priceModifier || 0)).toFixed(2))
          : Number(product.base_price),
        variants: (product.variants || []).map((variant) => ({
          ...variant,
          weightLabel: variant.weightLabel || null,
          price: Number((Number(product.base_price) + Number(variant.priceModifier || 0)).toFixed(2)),
        })),
        base_price: undefined,
        primary_image: undefined,
      };
    }),
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