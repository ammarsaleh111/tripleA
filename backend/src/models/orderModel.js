import { getDatabase } from '../config/db.js';

const buildActorWhereClause = ({ userId, sessionId }) => {
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

export const resolveActor = (req) => {
  const userId = req.user?.id || null;
  const sessionId = String(
    req.headers['x-session-id'] || req.query.session_id || req.body?.session_id || '',
  ).trim();

  if (!userId && !sessionId) {
    return {
      error: {
        statusCode: 400,
        message: 'Guest checkout requires a valid session_id.',
      },
    };
  }

  return {
    userId,
    sessionId: userId ? null : sessionId,
  };
};

export const getCartByActor = async (db, actor) => {
  const { clause, params } = buildActorWhereClause(actor);
  const [rows] = await db.query(`SELECT id, user_id, session_id FROM carts WHERE ${clause} LIMIT 1`, params);
  return rows[0] || null;
};

export const getCartItemsForCheckout = async (db, cartId) => {
  const [items] = await db.query(
    `
    SELECT
      ci.id AS cart_item_id,
      ci.item_type,
      ci.quantity,
      pv.id AS variant_id,
      pv.sku,
      pv.flavor,
      pv.weight_value,
      pv.weight_unit,
      pv.stock_quantity,
      pv.price_modifier,
      p.id AS product_id,
      p.name AS product_name,
      p.base_price,
      ad.discount_type,
      ad.discount_value,
      CASE
        WHEN ad.discount_type = 'percentage' THEN ROUND((p.base_price + pv.price_modifier) * (1 - ad.discount_value / 100), 2)
        WHEN ad.discount_type = 'fixed' THEN GREATEST(0, ROUND((p.base_price + pv.price_modifier) - ad.discount_value, 2))
        ELSE p.base_price + pv.price_modifier
      END AS effective_price
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN LATERAL (
      SELECT o.discount_type, o.discount_value
      FROM offers o
      WHERE o.offer_type = 'product_discount'
        AND o.product_id = p.id
        AND (
          o.variant_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM product_variants ov
            WHERE ov.id = o.variant_id
              AND ov.product_id = p.id
              AND ov.weight_value IS NOT DISTINCT FROM pv.weight_value
              AND ov.weight_unit IS NOT DISTINCT FROM pv.weight_unit
          )
        )
        AND o.is_active = TRUE
        AND now() >= o.starts_at
        AND (o.ends_at IS NULL OR now() < o.ends_at)
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) ad ON TRUE
    WHERE ci.cart_id = ?
      AND ci.item_type = 'product'
    ORDER BY ci.id ASC
    `,
    [cartId],
  );

  const mappedItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const priceAtPurchase = Number(item.effective_price || (Number(item.base_price || 0) + Number(item.price_modifier || 0)));

    return {
      cartItemId: item.cart_item_id,
      itemType: 'product',
      productId: item.product_id,
      variantId: item.variant_id,
      sku: item.sku,
      productName: item.product_name,
      variantName: [item.flavor, item.weight_value && item.weight_unit ? `${Number(item.weight_value).toString()} ${item.weight_unit}` : null]
        .filter(Boolean)
        .join(' / ') || 'Standard',
      stockQuantity: Number(item.stock_quantity || 0),
      quantity,
      priceAtPurchase: Number(priceAtPurchase.toFixed(2)),
      lineTotal: Number((priceAtPurchase * quantity).toFixed(2)),
    };
  });

  const [bundles] = await db.query(
    `
    SELECT ci.id AS cart_item_id, ci.quantity, ci.offer_id, ci.variant_selections,
      o.name, o.bundle_price, o.is_active, o.starts_at, o.ends_at,
      COALESCE((
        SELECT json_agg(json_build_object('productId', p.id, 'name', p.name))
        FROM bundle_offer_products bop
        JOIN products p ON p.id = bop.product_id
        WHERE bop.offer_id = o.id
      ), '[]'::json) AS components
    FROM cart_items ci
    JOIN offers o ON o.id = ci.offer_id
    WHERE ci.cart_id = ?
      AND ci.item_type = 'bundle'
    ORDER BY ci.id ASC
    `,
    [cartId],
  );

  // Resolve the exact variant per bundle component from the customer's stored
  // selections. Every selection is re-verified against bundle_offer_products so
  // a tampered cart cannot purchase a variant outside the bundle.
  const bundleItems = [];
  for (const item of bundles) {
    const selections = item.variant_selections && typeof item.variant_selections === 'object'
      ? item.variant_selections
      : {};

    const [componentRows] = await db.query(
      `
      SELECT bop.product_id, bop.variant_id AS bundle_variant_id, p.name AS product_name
      FROM bundle_offer_products bop
      JOIN products p ON p.id = bop.product_id
      WHERE bop.offer_id = ?
      ORDER BY bop.product_id ASC
      `,
      [item.offer_id],
    );

    if (!componentRows.length) {
      const error = new Error('Bundle offer has no products.');
      error.statusCode = 400;
      throw error;
    }

    const components = [];
    for (const component of componentRows) {
      const productId = Number(component.product_id);
      const selectedVariantId = Number(selections[String(productId)] ?? selections[productId] ?? 0);

      let variantId = null;
      let sku = null;

      if (Number.isInteger(selectedVariantId) && selectedVariantId > 0) {
        const [variantRows] = await db.query(
          `
          SELECT pv.id, pv.sku, pv.weight_value, pv.weight_unit
          FROM product_variants pv
          JOIN bundle_offer_products bop
            ON bop.product_id = pv.product_id AND bop.offer_id = ?
          WHERE pv.id = ?
          LIMIT 1
          `,
          [item.offer_id, selectedVariantId],
        );

        if (!variantRows.length) {
          const error = new Error('A selected bundle option is no longer valid. Please rebuild the bundle in your cart.');
          error.statusCode = 400;
          throw error;
        }

        // Server-side revalidation: the picked variant must stay within the
        // weight pinned by the bundle definition (flavor may vary, weight may
        // not — the bundle price is based on that exact weight).
        if (component.bundle_variant_id) {
          const [targetRows] = await db.query(
            'SELECT weight_value, weight_unit FROM product_variants WHERE id = ? LIMIT 1',
            [Number(component.bundle_variant_id)],
          );
          const target = targetRows[0] || null;
          const picked = variantRows[0];
          const sameWeight = target
            && Number(target.weight_value) === Number(picked.weight_value)
            && (target.weight_unit || 'g') === (picked.weight_unit || 'g');
          if (!sameWeight) {
            const error = new Error(`The selected weight for ${component.product_name} is not part of this bundle.`);
            error.statusCode = 400;
            throw error;
          }
        }

        variantId = variantRows[0].id;
        sku = variantRows[0].sku;
      } else {
        // No explicit selection: use the variant pinned by the bundle
        // definition, otherwise the component's single (first) variant.
        const [variantRows] = await db.query(
          `
          SELECT pv.id, pv.sku
          FROM product_variants pv
          WHERE pv.product_id = ?
            AND (?::int IS NULL OR pv.id = ?::int)
          ORDER BY pv.id ASC
          LIMIT 1
          `,
          [productId, component.bundle_variant_id, component.bundle_variant_id],
        );

        if (!variantRows.length) {
          const error = new Error(`A product in this bundle has no purchasable variant: ${component.product_name}.`);
          error.statusCode = 400;
          throw error;
        }

        variantId = variantRows[0].id;
        sku = variantRows[0].sku;
      }

      components.push({ productId, variantId, sku });
    }

    bundleItems.push({
      cartItemId: item.cart_item_id,
      itemType: 'bundle',
      offerId: item.offer_id,
      productName: item.name,
      sku: `BUNDLE-${item.offer_id}`,
      variantId: null,
      quantity: Number(item.quantity || 0),
      priceAtPurchase: Number(item.bundle_price || 0),
      lineTotal: Number((Number(item.bundle_price || 0) * Number(item.quantity || 0)).toFixed(2)),
      components,
    });
  }

  return [...mappedItems, ...bundleItems];
};

export const getDefaultAddressId = async (db, userId) => {
  if (!userId) {
    return null;
  }

  const [rows] = await db.query(
    `
    SELECT id
    FROM addresses
    WHERE user_id = ?
    ORDER BY is_default DESC, id DESC
    LIMIT 1
    `,
    [userId],
  );

  return rows[0]?.id || null;
};

export const insertOrder = async (connection, orderPayload) => {
  const [result] = await connection.query(
    `
    INSERT INTO orders (
      order_number,
      user_id,
      shipping_address_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      subtotal,
      tax,
      shipping_cost,
      total_amount,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id
    `,
    [
      orderPayload.orderNumber,
      orderPayload.userId || null,
      orderPayload.shippingAddressId || null,
      orderPayload.customerName || null,
      orderPayload.customerPhone || null,
      orderPayload.customerEmail || null,
      orderPayload.customerAddress || null,
      orderPayload.subtotal,
      orderPayload.tax,
      orderPayload.shippingCost,
      orderPayload.totalAmount,
      orderPayload.status || 'Pending',
    ],
  );

  return {
    id: result.insertId,
    orderNumber: orderPayload.orderNumber,
  };
};

export const insertOrderItems = async (connection, orderId, items) => {
  for (const item of items) {
    if (item.itemType === 'bundle') {
      const [offerRows] = await connection.query(
        `
        SELECT id, bundle_price
        FROM offers
        WHERE id = ?
          AND offer_type = 'bundle'
          AND is_active = TRUE
          AND now() >= starts_at
          AND (ends_at IS NULL OR now() < ends_at)
        FOR UPDATE
        `,
        [item.offerId],
      );

      if (!offerRows.length || Number(offerRows[0].bundle_price) !== Number(item.priceAtPurchase)) {
        const error = new Error('Bundle offer is no longer available at the expected price.');
        error.statusCode = 400;
        throw error;
      }

      // Lock the exact variants the customer selected (or the single variant of
      // an unambiguous component) and verify stock for every component before
      // any write. Any failure rolls back the whole order transaction.
      const componentVariantIds = (item.components || []).map((component) => Number(component.variantId));

      if (!componentVariantIds.length) {
        const error = new Error('Bundle offer has no products.');
        error.statusCode = 400;
        throw error;
      }

      const placeholders = componentVariantIds.map(() => '?').join(', ');
      const [componentRows] = await connection.query(
        `
        SELECT pv.id AS variant_id, pv.sku, pv.stock_quantity, p.name
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id IN (${placeholders})
        FOR UPDATE
        `,
        componentVariantIds,
      );

      if (componentRows.length !== componentVariantIds.length) {
        const error = new Error('A bundle component is no longer available.');
        error.statusCode = 400;
        throw error;
      }

      for (const component of componentRows) {
        const availableStock = Number(component.stock_quantity || 0);
        if (availableStock < item.quantity) {
          const error = new Error(`Only ${availableStock} units available for ${component.name}.`);
          error.statusCode = 400;
          throw error;
        }
      }

      await connection.query(
        `
        INSERT INTO order_items (
          order_id, variant_id, offer_id, item_type, product_name, sku, quantity, price_at_purchase, metadata
        )
        VALUES (?, NULL, ?, 'bundle', ?, ?, ?, ?, ?::jsonb)
        `,
        [
          orderId,
          item.offerId,
          item.productName,
          item.sku,
          item.quantity,
          item.priceAtPurchase,
          JSON.stringify({ components: item.components || [] }),
        ],
      );

      for (const component of componentRows) {
        const [updateResult] = await connection.query(
          'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
          [item.quantity, component.variant_id, item.quantity],
        );
        if (!updateResult.affectedRows) {
          const error = new Error(`Insufficient stock for ${component.name}. Order rolled back.`);
          error.statusCode = 400;
          throw error;
        }
      }
      continue;
    }

    const [stockRows] = await connection.query(
      'SELECT stock_quantity FROM product_variants WHERE id = ? FOR UPDATE',
      [item.variantId],
    );
    const availableStock = Number(stockRows[0]?.stock_quantity || 0);

    if (availableStock < item.quantity) {
      const error = new Error(`Only ${availableStock} units available for ${item.productName}.`);
      error.statusCode = 400;
      throw error;
    }

    await connection.query(
      `
      INSERT INTO order_items (
        order_id,
        variant_id,
        offer_id,
        item_type,
        product_name,
        sku,
        quantity,
        price_at_purchase
      )
      VALUES (?, ?, NULL, 'product', ?, ?, ?, ?)
      `,
      [
        orderId,
        item.variantId,
        item.productName,
        item.sku,
        item.quantity,
        item.priceAtPurchase,
      ],
    );

    const [updateResult] = await connection.query(
      'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
      [item.quantity, item.variantId, item.quantity],
    );
    if (!updateResult.affectedRows) {
      const error = new Error(`Insufficient stock for ${item.productName}. Order rolled back.`);
      error.statusCode = 400;
      throw error;
    }
  }
};

export const getOrdersByUserId = async (userId) => {
  const db = getDatabase();

  const [orders] = await db.query(
    `
    SELECT
      id,
      order_number,
      user_id,
      shipping_address_id,
      subtotal,
      tax,
      shipping_cost,
      total_amount,
      status,
      tracking_number,
      created_at,
      updated_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId],
  );

  return orders;
};

export const getOrderItemsByOrderIds = async (orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return [];
  }

  const db = getDatabase();
  const placeholders = orderIds.map(() => '?').join(', ');
  const [items] = await db.query(
    `
    SELECT
      id,
      order_id,
      variant_id,
      product_name,
      sku,
      quantity,
      price_at_purchase
    FROM order_items
    WHERE order_id IN (${placeholders})
    ORDER BY id ASC
    `,
    orderIds,
  );

  return items;
};
