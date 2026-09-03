import { getDatabase } from '../config/db.js';

const MAX_LIMIT = 48;
const activeDiscountSubquery = `
  SELECT od.discount_type, od.discount_value
  FROM offers od
  WHERE od.offer_type = 'product_discount'
    AND od.product_id = p.id
    AND od.variant_id IS NULL
    AND od.is_active = TRUE
    AND now() >= od.starts_at
    AND (od.ends_at IS NULL OR now() < od.ends_at)
  ORDER BY od.created_at DESC, od.id DESC
  LIMIT 1
`;

// Any active discount for the product, including weight-targeted ones.
// Used to compute per-variant effective prices (a weight-targeted discount
// applies to every flavor of that weight, never to other weights).
const anyDiscountSubquery = `
  SELECT od.discount_type, od.discount_value, od.variant_id
  FROM offers od
  WHERE od.offer_type = 'product_discount'
    AND od.product_id = p.id
    AND od.is_active = TRUE
    AND now() >= od.starts_at
    AND (od.ends_at IS NULL OR now() < od.ends_at)
  ORDER BY od.created_at DESC, od.id DESC
  LIMIT 1
`;

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// @desc    Get all products (with pagination, filters, sort)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      size,
      color,
      price_min,
      price_max,
      stock_status,
      search,
      sort_by = 'featured',
      page = 1,
      limit = 12,
    } = req.query;

    const parsedPage = Math.max(1, toFiniteNumber(page, 1));
    const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, toFiniteNumber(limit, 12)));
    const parsedMinPrice = toFiniteNumber(price_min);
    const parsedMaxPrice = toFiniteNumber(price_max);
    const stockStatus = String(stock_status || '').trim().toLowerCase();
    const searchTerm = String(search || '').trim();

    if (parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice) {
      return res.status(400).json({
        success: false,
        message: 'Invalid price range. price_min must be less than or equal to price_max.',
      });
    }

    const allowedSorts = new Set(['featured', 'newest', 'price_asc', 'price_desc', 'name_asc']);
    if (!allowedSorts.has(sort_by)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort_by value.',
      });
    }

    if (stockStatus && !['in_stock', 'out_of_stock'].includes(stockStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid stock_status value.' });
    }

    const db = getDatabase();

    let fromAndWhere = `
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories cp ON cp.id = c.parent_id
      LEFT JOIN LATERAL (${activeDiscountSubquery}) ad ON TRUE
      WHERE 1=1
    `;
    const filterParams = [];

    if (category) {
      fromAndWhere += `
        AND (
          c.slug = ?
          OR EXISTS (
            SELECT 1
            FROM categories c_parent
            WHERE c_parent.id = c.parent_id
              AND c_parent.slug = ?
          )
        )
      `;
      filterParams.push(category, category);
    }

    if (parsedMinPrice !== null) {
      fromAndWhere += ' AND p.base_price >= ?';
      filterParams.push(parsedMinPrice);
    }

    if (parsedMaxPrice !== null) {
      fromAndWhere += ' AND p.base_price <= ?';
      filterParams.push(parsedMaxPrice);
    }

    if (searchTerm) {
      fromAndWhere += `
                AND (
          p.name ILIKE ?
          OR c.name ILIKE ?
          OR cp.name ILIKE ?
        )
      `;
      const searchToken = `%${searchTerm}%`;
      filterParams.push(searchToken, searchToken, searchToken);
    }

    if (size) {
      fromAndWhere += `
        AND EXISTS (
          SELECT 1
          FROM product_variants pv_size
          WHERE pv_size.product_id = p.id
            AND pv_size.size = ?
        )
      `;
      filterParams.push(size);
    }

    if (color) {
      fromAndWhere += `
        AND EXISTS (
          SELECT 1
          FROM product_variants pv_color
          WHERE pv_color.product_id = p.id
            AND pv_color.color = ?
        )
      `;
      filterParams.push(color);
    }

    if (stockStatus === 'in_stock') {
      fromAndWhere += `
        AND EXISTS (
          SELECT 1 FROM product_variants pv_stock
          WHERE pv_stock.product_id = p.id AND pv_stock.stock_quantity > 0
        )
      `;
    }

    if (stockStatus === 'out_of_stock') {
      fromAndWhere += `
        AND NOT EXISTS (
          SELECT 1 FROM product_variants pv_stock
          WHERE pv_stock.product_id = p.id AND pv_stock.stock_quantity > 0
        )
      `;
    }

    let orderClause = ' ORDER BY p.is_featured DESC, p.created_at DESC';
    if (sort_by === 'newest') {
      orderClause = ' ORDER BY p.created_at DESC';
    }
    if (sort_by === 'price_asc') {
      orderClause = ' ORDER BY p.base_price ASC, p.created_at DESC';
    }
    if (sort_by === 'price_desc') {
      orderClause = ' ORDER BY p.base_price DESC, p.created_at DESC';
    }
    if (sort_by === 'name_asc') {
      orderClause = ' ORDER BY p.name ASC';
    }

    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.base_price,
        p.has_flavor,
        p.has_weight,
        p.is_featured,
        ad.discount_type,
        ad.discount_value,
        CASE
          WHEN ad.discount_type = 'percentage' THEN ROUND(p.base_price * (1 - ad.discount_value / 100), 2)
          WHEN ad.discount_type = 'fixed' THEN GREATEST(0, ROUND(p.base_price - ad.discount_value, 2))
          ELSE p.base_price
        END AS effective_price,
        (
          SELECT MIN(pv.price_modifier)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS min_price_modifier,
        (
          SELECT MAX(pv.price_modifier)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS max_price_modifier,
        c.name AS category_name,
        c.slug AS category_slug,
        cp.name AS parent_category_name,
        cp.slug AS parent_category_slug,
        (
          SELECT pv.id
          FROM product_variants pv
          WHERE pv.product_id = p.id
          ORDER BY pv.stock_quantity DESC, pv.id ASC
          LIMIT 1
        ) AS default_variant_id,
        COALESCE(
          (
            SELECT pv.stock_quantity
            FROM product_variants pv
            WHERE pv.product_id = p.id
            ORDER BY pv.stock_quantity DESC, pv.id ASC
            LIMIT 1
          ),
          0
        ) AS default_variant_stock,
        COALESCE(
          (
            SELECT SUM(pv.stock_quantity)
            FROM product_variants pv
            WHERE pv.product_id = p.id
          ),
          0
        ) AS total_stock,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM product_variants pv
            WHERE pv.product_id = p.id
          ),
          0
        ) AS variant_count,
        COALESCE(
          (
            SELECT pi.image_url
            FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
            LIMIT 1
          ),
          ''
        ) AS primary_image,
        COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id), 0) AS review_count,
        COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id), 0) AS avg_rating
      ${fromAndWhere}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      ${fromAndWhere}
    `;

    const offset = (parsedPage - 1) * parsedLimit;
    const [products] = await db.query(productsQuery, [...filterParams, parsedLimit, offset]);
    const [countRows] = await db.query(countQuery, filterParams);
    const totalCount = Number(countRows[0]?.total || 0);

    res.status(200).json({
      success: true,
      data: products.map((product) => {
        const basePrice = Number(product.base_price || 0);
        const minPrice = basePrice + Number(product.min_price_modifier ?? 0);
        const maxPrice = basePrice + Number(product.max_price_modifier ?? 0);
        return {
          ...product,
          base_price: basePrice,
          effective_price: Number(product.effective_price || basePrice || 0),
          discount_value: product.discount_value === null ? null : Number(product.discount_value),
          // Weight-tier aware price range (only meaningful when has_weight).
          min_price: Number(minPrice.toFixed(2)),
          max_price: Number(maxPrice.toFixed(2)),
        };
      }),
      meta: {
        count: products.length,
        totalCount,
        totalPages: Math.ceil(totalCount / parsedLimit),
        currentPage: parsedPage,
        limit: parsedLimit,
        filters: {
          category: category || null,
          size: size || null,
          color: color || null,
          price_min: parsedMinPrice,
          price_max: parsedMaxPrice,
          search: searchTerm || null,
          sort_by,
          stock_status: stockStatus || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/:slug
// @access  Public
export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug = '' } = req.params;

    if (!slug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product slug is required.',
      });
    }

    const db = getDatabase();

    const query = `
      SELECT 
        p.id, p.name, p.slug, p.materials_care, p.base_price,
        p.has_flavor, p.has_weight,
        ad.discount_type,
        ad.discount_value,
        pd.discount_type AS variant_discount_type,
        pd.discount_value AS variant_discount_value,
        pd.variant_id AS variant_discount_variant_id,
        CASE
          WHEN ad.discount_type = 'percentage' THEN ROUND(p.base_price * (1 - ad.discount_value / 100), 2)
          WHEN ad.discount_type = 'fixed' THEN GREATEST(0, ROUND(p.base_price - ad.discount_value, 2))
          ELSE p.base_price
        END AS effective_price,
        c.name as category_name,
        c.slug as category_slug,
        cp.name as parent_category_name,
        cp.slug as parent_category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories cp ON cp.id = c.parent_id
      LEFT JOIN LATERAL (${activeDiscountSubquery}) ad ON TRUE
      LEFT JOIN LATERAL (${anyDiscountSubquery}) pd ON TRUE
      WHERE p.slug = ?
    `;

    const [products] = await db.query(query, [slug.trim()]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];

    // Fetch images
    const [images] = await db.query(
      'SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC, id ASC',
      [product.id],
    );
    
    // Fetch variants (Sizes, Colors, Stock)
    const [variants] = await db.query(
      'SELECT id, sku, size, color, color_hex, flavor, weight_value, weight_unit, price_modifier, stock_quantity FROM product_variants WHERE product_id = ? ORDER BY id ASC',
      [product.id],
    );
    
    // Fetch reviews summary
    const [reviews] = await db.query(
      'SELECT COUNT(*) as total_reviews, ROUND(AVG(rating), 1) as avg_rating FROM reviews WHERE product_id = ?',
      [product.id],
    );

    const availableWeights = [
      ...new Map(
        variants
          .filter((variant) => variant.weight_value && variant.weight_unit)
          .map((variant) => [
            `${variant.weight_value}-${variant.weight_unit}`,
            {
              value: Number(variant.weight_value),
              unit: variant.weight_unit,
              label: `${Number(variant.weight_value).toString()} ${variant.weight_unit}`,
            },
          ]),
      ).values(),
    ];
    const availableFlavors = [
      ...new Map(
        variants
          .filter((variant) => variant.flavor || variant.color)
          .map((variant) => [
            variant.flavor || variant.color,
            { name: variant.flavor || variant.color, hex: variant.color_hex || null },
          ]),
      ).values(),
    ];
    const availableSizes = product.has_weight ? availableWeights.map((weight) => weight.label) : [];
    const availableColors = product.has_flavor ? availableFlavors : [];

    res.status(200).json({
      success: true,
      data: {
        ...product,
        base_price: Number(product.base_price || 0),
        effective_price: Number(product.effective_price || product.base_price || 0),
        discount_value: product.discount_value === null ? null : Number(product.discount_value),
        discount: product.variant_discount_type ? {
          type: product.variant_discount_type,
          value: Number(product.variant_discount_value),
          variantId: product.variant_discount_variant_id ? Number(product.variant_discount_variant_id) : null,
        } : null,
        images,
        variants: variants.map((variant) => {
          const originalPrice = Number(product.base_price || 0) + Number(variant.price_modifier || 0);
          // Server-computed effective price: a weight-targeted discount applies
          // to every flavor of the target weight, never to other weights.
          const discountTarget = product.variant_discount_variant_id
            ? variants.find((candidate) => Number(candidate.id) === Number(product.variant_discount_variant_id))
            : null;
          const weightMatches = !discountTarget || (
            Number(discountTarget.weight_value) === Number(variant.weight_value) &&
            (discountTarget.weight_unit || 'g') === (variant.weight_unit || 'g')
          );
          const discountedPrice = product.variant_discount_type === 'percentage'
            ? originalPrice * (1 - Number(product.variant_discount_value) / 100)
            : Math.max(0, originalPrice - Number(product.variant_discount_value || 0));
          const effectivePrice = product.variant_discount_type && weightMatches ? discountedPrice : originalPrice;
          return {
            ...variant,
            flavor: variant.flavor || variant.color,
            weight_label:
              variant.weight_value && variant.weight_unit
                ? `${Number(variant.weight_value).toString()} ${variant.weight_unit}`
                : variant.size,
            price: Number(originalPrice.toFixed(2)),
            effective_price: Number(effectivePrice.toFixed(2)),
          };
        }),
        availableFlavors,
        availableWeights,
        availableSizes,
        availableColors,
        reviews: {
          count: Number(reviews[0]?.total_reviews || 0),
          rating: Number(reviews[0]?.avg_rating || 0),
        },
      },
    });

  } catch (error) {
    next(error);
  }
};

