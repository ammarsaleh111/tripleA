import { getDatabase } from '../config/db.js';

const MAX_ITEM_QUANTITY = 20;
const MIN_ITEM_QUANTITY = 1;
const activeOfferClause = (alias = 'o') => `
  ${alias}.is_active = TRUE
  AND now() >= ${alias}.starts_at
  AND (${alias}.ends_at IS NULL OR now() < ${alias}.ends_at)
`;

const buildCartWhereClause = ({ userId, sessionId }) => {
  if (userId) {
    return {
      clause: 'user_id = ?',
      params: [userId],
    };
  }

  return {
    clause: 'session_id = ?',
    params: [sessionId],
  };
};

const resolveActor = (req) => {
  const userId = req.user?.id || null;
  const sessionId = String(
    req.headers['x-session-id'] || req.query.session_id || req.body?.session_id || '',
  ).trim();

  if (!userId && !sessionId) {
    return {
      error: {
        statusCode: 400,
        message: 'Guest cart operations require a valid session_id.',
      },
    };
  }

  return {
    userId,
    sessionId: userId ? null : sessionId,
  };
};

const getCartByActor = async (db, actor) => {
  const { clause, params } = buildCartWhereClause(actor);
  const [rows] = await db.query(`SELECT id, user_id, session_id FROM carts WHERE ${clause} LIMIT 1`, params);
  return rows[0] || null;
};

const getOrCreateCart = async (db, actor) => {
  const existingCart = await getCartByActor(db, actor);

  if (existingCart) {
    return existingCart;
  }

  const [result] = await db.query(
    'INSERT INTO carts (user_id, session_id) VALUES (?, ?) RETURNING id',
    [actor.userId || null, actor.sessionId || null],
  );

  return {
    id: result.insertId,
    user_id: actor.userId || null,
    session_id: actor.sessionId || null,
  };
};

const getCartItemsWithTotals = async (db, cartId) => {
  const [items] = await db.query(
    `
    SELECT
      ci.id AS cart_item_id,
      ci.item_type,
      ci.quantity,
      pv.id AS variant_id,
      pv.sku,
      pv.size,
      pv.color,
      pv.color_hex,
      pv.flavor,
      pv.weight_value,
      pv.weight_unit,
      pv.price_modifier,
      pv.stock_quantity,
      p.id AS product_id,
      p.name,
      p.slug,
      p.base_price,
      ad.discount_type,
      ad.discount_value,
      CASE
        WHEN ad.discount_type = 'percentage' THEN ROUND((p.base_price + pv.price_modifier) * (1 - ad.discount_value / 100), 2)
        WHEN ad.discount_type = 'fixed' THEN GREATEST(0, ROUND((p.base_price + pv.price_modifier) - ad.discount_value, 2))
        ELSE p.base_price + pv.price_modifier
      END AS effective_price,
      COALESCE(
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
          LIMIT 1
        ),
        ''
      ) AS image_url
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN LATERAL (
      SELECT o.discount_type, o.discount_value
      FROM offers o
      WHERE o.offer_type = 'product_discount'
        AND o.product_id = p.id
        AND ${activeOfferClause('o')}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) ad ON TRUE
    WHERE ci.cart_id = ?
      AND ci.item_type = 'product'
    ORDER BY ci.id DESC
    `,
    [cartId],
  );

  let subtotal = 0;
  let totalQuantity = 0;

  const formattedItems = items.map((item) => {
    const originalPrice = Number(item.base_price || 0) + Number(item.price_modifier || 0);
    const unitPrice = Number(item.effective_price || originalPrice);
    const lineTotal = unitPrice * Number(item.quantity || 0);
    subtotal += lineTotal;
    totalQuantity += Number(item.quantity || 0);

    return {
      id: item.cart_item_id,
      cartItemId: item.cart_item_id,
      variantId: item.variant_id,
      productId: item.product_id,
      slug: item.slug,
      sku: item.sku,
      name: item.name,
      variant: [item.flavor || item.color, item.weight_value && item.weight_unit ? `${Number(item.weight_value).toString()} ${item.weight_unit}` : item.size]
        .filter(Boolean)
        .join(' / ') || 'Standard',
      color: item.flavor || item.color,
      colorHex: item.color_hex,
      size: item.weight_value && item.weight_unit ? `${Number(item.weight_value).toString()} ${item.weight_unit}` : item.size,
      flavor: item.flavor || item.color,
      weightValue: item.weight_value === null || item.weight_value === undefined ? null : Number(item.weight_value),
      weightUnit: item.weight_unit,
      unitPrice,
      originalPrice: originalPrice > unitPrice ? Number(originalPrice.toFixed(2)) : null,
      discountType: item.discount_type,
      discountValue: item.discount_value === null ? null : Number(item.discount_value),
      lineTotal,
      quantity: Number(item.quantity || 0),
      stockQuantity: Number(item.stock_quantity || 0),
      imageUrl: item.image_url,
    };
  });

  const [bundles] = await db.query(
    `
    SELECT ci.id AS cart_item_id, ci.quantity, ci.offer_id, ci.variant_selections, o.name, o.bundle_price,
      (${activeOfferClause('o')}) AS is_currently_active,
      NOT EXISTS (
        SELECT 1
        FROM bundle_offer_products bop
        JOIN products p ON p.id = bop.product_id
        WHERE bop.offer_id = o.id
          AND NOT EXISTS (
            SELECT 1 FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.stock_quantity >= ci.quantity
          )
      ) AS is_available,
      COALESCE((
        SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'slug', p.slug))
        FROM bundle_offer_products bop
        JOIN products p ON p.id = bop.product_id
        WHERE bop.offer_id = o.id
      ), '[]'::json) AS products
    FROM cart_items ci
    JOIN offers o ON o.id = ci.offer_id
    WHERE ci.cart_id = ?
      AND ci.item_type = 'bundle'
    ORDER BY ci.id DESC
    `,
    [cartId],
  );

  const formattedBundles = bundles.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.bundle_price || 0);
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;
    totalQuantity += quantity;

    const selections = item.variant_selections && typeof item.variant_selections === 'object'
      ? item.variant_selections
      : {};
    const selectionIds = Object.values(selections).map((value) => Number(value)).filter(Number.isInteger);

    let selectionLabel = 'Bundle offer';
    if (selectionIds.length) {
      selectionLabel = `Bundle offer (${selectionIds.length} selected option${selectionIds.length === 1 ? '' : 's'})`;
    }

    return {
      id: item.cart_item_id,
      cartItemId: item.cart_item_id,
      itemType: 'bundle',
      offerId: item.offer_id,
      name: item.name,
      variant: selectionLabel,
      variantSelections: selections,
      unitPrice,
      lineTotal,
      quantity,
      products: item.products || [],
      isAvailable: Boolean(item.is_currently_active) && Boolean(item.is_available),
      imageUrl: '',
    };
  });

  return {
    items: [...formattedBundles, ...formattedItems],
    subtotal: Number(subtotal.toFixed(2)),
    itemCount: totalQuantity,
  };
};

const buildCartResponse = async (db, cart) => {
  const { items, subtotal, itemCount } = await getCartItemsWithTotals(db, cart.id);

  return {
    id: cart.id,
    userId: cart.user_id,
    sessionId: cart.session_id,
    items,
    itemCount,
    subtotal,
  };
};

const assertQuantity = (quantity) => {
  const parsed = Number(quantity);

  if (!Number.isInteger(parsed) || parsed < MIN_ITEM_QUANTITY || parsed > MAX_ITEM_QUANTITY) {
    const error = new Error(`Quantity must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const getVariant = async (db, variantId) => {
  const [rows] = await db.query('SELECT id, stock_quantity FROM product_variants WHERE id = ? LIMIT 1', [variantId]);
  return rows[0] || null;
};

// Validates the customer's per-component variant selections against the bundle
// definition. Returns a normalized { productId: variantId } object or null when
// the bundle has no selectable variants. Every selection must belong to a product
// that is actually part of the bundle.
const resolveBundleSelections = async (db, offerId, rawSelections) => {
  const [componentRows] = await db.query(
    `
    SELECT bop.product_id, p.has_flavor, p.has_weight,
      (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = bop.product_id) AS variant_count
    FROM bundle_offer_products bop
    JOIN products p ON p.id = bop.product_id
    WHERE bop.offer_id = ?
    ORDER BY bop.product_id ASC
    `,
    [offerId],
  );

  if (!componentRows.length) {
    return { error: 'Bundle offer has no products.' };
  }

  const selections = rawSelections && typeof rawSelections === 'object' && !Array.isArray(rawSelections)
    ? rawSelections
    : {};
  const resolved = {};

  for (const component of componentRows) {
    const productId = Number(component.product_id);
    const needsSelection = Boolean(component.has_flavor || component.has_weight) && Number(component.variant_count) > 1;
    const rawVariantId = Number(selections[String(productId)] ?? selections[productId]);

    if (!Number.isInteger(rawVariantId) || rawVariantId <= 0) {
      if (needsSelection) {
        return { error: 'Select a flavor/weight for every product in this bundle.' };
      }
      continue;
    }

    const [variantRows] = await db.query(
      'SELECT id, product_id, stock_quantity FROM product_variants WHERE id = ? LIMIT 1',
      [rawVariantId],
    );

    if (!variantRows.length || Number(variantRows[0].product_id) !== productId) {
      return { error: 'The selected option does not belong to a product in this bundle.' };
    }

    resolved[productId] = rawVariantId;
  }

  return { selections: resolved };
};

const getActiveBundle = async (db, offerId, quantity) => {
  const [rows] = await db.query(
    `
    SELECT o.id,
      (${activeOfferClause('o')}) AS is_currently_active,
      NOT EXISTS (
        SELECT 1
        FROM bundle_offer_products bop
        JOIN products p ON p.id = bop.product_id
        WHERE bop.offer_id = o.id
          AND NOT EXISTS (
            SELECT 1 FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.stock_quantity >= ?
          )
      ) AS is_available
    FROM offers o
    WHERE o.id = ?
      AND o.offer_type = 'bundle'
    LIMIT 1
    `,
    [quantity, offerId],
  );
  return rows[0] || null;
};

// @desc    Get current cart
// @route   GET /api/cart
// @access  Public (guest via session_id) / Private (JWT)
export const getCart = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const db = getDatabase();
    const cart = await getCartByActor(db, actor);

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          id: null,
          userId: actor.userId,
          sessionId: actor.sessionId,
          items: [],
          itemCount: 0,
          subtotal: 0,
        },
      });
    }

    const payload = await buildCartResponse(db, cart);
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Public (guest via session_id) / Private (JWT)
export const addToCart = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const itemType = String(req.body.item_type || req.body.itemType || 'product').trim();
    const variantId = Number(req.body.variant_id);
    const offerId = Number(req.body.offer_id || req.body.offerId);
    const quantity = assertQuantity(req.body.quantity ?? 1);

    if (itemType === 'bundle') {
      if (!Number.isInteger(offerId) || offerId <= 0) {
        return res.status(400).json({ success: false, message: 'A valid offer_id is required.' });
      }

      const db = getDatabase();
      const bundle = await getActiveBundle(db, offerId, quantity);
      if (!bundle || !bundle.is_currently_active) {
        return res.status(400).json({ success: false, message: 'Bundle offer is not currently active.' });
      }
      if (!bundle.is_available) {
        return res.status(400).json({ success: false, message: 'Bundle offer is out of stock.' });
      }

      const selectionResult = await resolveBundleSelections(db, offerId, req.body.variant_selections ?? req.body.variantSelections);
      if (selectionResult.error) {
        return res.status(400).json({ success: false, message: selectionResult.error });
      }
      const selections = selectionResult.selections || {};
      const selectionsJson = JSON.stringify(selections);

      const cart = await getOrCreateCart(db, actor);
      // Same bundle + identical variant selections merge into one cart item.
      // Different selections stay as separate cart items.
      const [existingItems] = await db.query(
        `
        SELECT id, quantity FROM cart_items
        WHERE cart_id = ?
          AND item_type = 'bundle'
          AND offer_id = ?
          AND COALESCE(variant_selections, '{}'::jsonb) = ?::jsonb
        LIMIT 1
        `,
        [cart.id, offerId, selectionsJson],
      );
      const existingItem = existingItems[0] || null;
      const nextQuantity = existingItem ? Number(existingItem.quantity) + quantity : quantity;
      const nextBundle = await getActiveBundle(db, offerId, nextQuantity);

      if (!nextBundle?.is_available) {
        return res.status(400).json({ success: false, message: 'Not enough stock for this bundle quantity.' });
      }

      if (existingItem) {
        await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [nextQuantity, existingItem.id]);
      } else {
        await db.query(
          "INSERT INTO cart_items (cart_id, item_type, offer_id, variant_selections, quantity) VALUES (?, 'bundle', ?, ?::jsonb, ?)",
          [cart.id, offerId, selectionsJson, quantity],
        );
      }

      const payload = await buildCartResponse(db, cart);
      return res.status(200).json({ success: true, message: 'Bundle added to cart.', data: payload });
    }

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid variant_id is required.' });
    }

    const db = getDatabase();
    const variant = await getVariant(db, variantId);

    if (!variant) {
      return res.status(404).json({ success: false, message: 'Product variant was not found.' });
    }

    const cart = await getOrCreateCart(db, actor);

    const [existingItems] = await db.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND item_type = 'product' AND variant_id = ? LIMIT 1",
      [cart.id, variantId],
    );

    const existingItem = existingItems[0] || null;
    const nextQuantity = existingItem ? Number(existingItem.quantity) + quantity : quantity;

    if (variant.stock_quantity < nextQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.stock_quantity} units available for this variant.`,
      });
    }

    if (existingItem) {
      await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [nextQuantity, existingItem.id]);
    } else {
      await db.query("INSERT INTO cart_items (cart_id, item_type, variant_id, quantity) VALUES (?, 'product', ?, ?)", [
        cart.id,
        variantId,
        quantity,
      ]);
    }

    const payload = await buildCartResponse(db, cart);

    return res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:id
// @access  Public (guest via session_id) / Private (JWT)
export const updateCartItem = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const cartItemId = Number(req.params.id);
    const requestedQuantity = Number(req.body.quantity);

    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid cart item id is required.' });
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 0 || requestedQuantity > MAX_ITEM_QUANTITY) {
      return res.status(400).json({
        success: false,
        message: `Quantity must be between 0 and ${MAX_ITEM_QUANTITY}.`,
      });
    }

    const db = getDatabase();
    const cart = await getCartByActor(db, actor);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const [bundleRows] = await db.query(
      "SELECT id, offer_id FROM cart_items WHERE id = ? AND cart_id = ? AND item_type = 'bundle' LIMIT 1",
      [cartItemId, cart.id],
    );

    if (bundleRows[0]) {
      if (requestedQuantity === 0) {
        await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [cartItemId, cart.id]);
      } else {
        const bundle = await getActiveBundle(db, Number(bundleRows[0].offer_id), requestedQuantity);
        if (!bundle?.is_currently_active || !bundle?.is_available) {
          return res.status(400).json({ success: false, message: 'Bundle offer is not available in this quantity.' });
        }
        await db.query('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?', [
          requestedQuantity,
          cartItemId,
          cart.id,
        ]);
      }

      const payload = await buildCartResponse(db, cart);
      return res.status(200).json({ success: true, message: 'Cart item updated.', data: payload });
    }

    const [rows] = await db.query(
      `
      SELECT ci.id, ci.quantity, ci.variant_id, pv.stock_quantity
      FROM cart_items ci
      JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.id = ? AND ci.cart_id = ?
      LIMIT 1
      `,
      [cartItemId, cart.id],
    );

    const cartItem = rows[0];

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    if (requestedQuantity === 0) {
      await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [cartItemId, cart.id]);
    } else {
      if (requestedQuantity > Number(cartItem.stock_quantity || 0)) {
        return res.status(400).json({
          success: false,
          message: `Only ${cartItem.stock_quantity} units available for this variant.`,
        });
      }

      await db.query('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?', [
        requestedQuantity,
        cartItemId,
        cart.id,
      ]);
    }

    const payload = await buildCartResponse(db, cart);

    return res.status(200).json({
      success: true,
      message: 'Cart item updated.',
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:id
// @access  Public (guest via session_id) / Private (JWT)
export const removeCartItem = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const cartItemId = Number(req.params.id);

    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid cart item id is required.' });
    }

    const db = getDatabase();
    const cart = await getCartByActor(db, actor);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const [result] = await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [cartItemId, cart.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    const payload = await buildCartResponse(db, cart);

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};
