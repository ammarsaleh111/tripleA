const OFFER_TYPES = new Set(['bundle', 'product_discount']);
const DISCOUNT_TYPES = new Set(['percentage', 'fixed']);

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseDate = (value, fieldName, required = true) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw createValidationError(`${fieldName} is required.`);
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createValidationError(`${fieldName} must be a valid date/time.`);
  }

  return date.toISOString();
};

const parseMoney = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createValidationError(`${fieldName} must be a non-negative number.`);
  }
  return Number(parsed.toFixed(2));
};

const normalizeProductIds = (value) => {
  if (!Array.isArray(value)) throw createValidationError('product_ids must be an array.');

  const ids = value.map((item) => Number(item));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw createValidationError('product_ids must contain positive integer ids.');
  }
  if (new Set(ids).size !== ids.length) {
    throw createValidationError('Bundle products cannot contain duplicates.');
  }
  return ids;
};

export const validateOfferInput = (payload = {}) => {
  const offerType = String(payload.offer_type ?? payload.offerType ?? '').trim().toLowerCase();
  if (!OFFER_TYPES.has(offerType)) throw createValidationError('offer_type must be bundle or product_discount.');

  const name = String(payload.name ?? '').trim();
  if (!name || name.length > 255) throw createValidationError('name is required and must be 255 characters or fewer.');

  const startsAt = parseDate(payload.starts_at ?? payload.startsAt, 'starts_at');
  const endsAt = parseDate(payload.ends_at ?? payload.endsAt, 'ends_at', false);
  if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw createValidationError('ends_at must be after starts_at.');
  }

    const isActive = payload.is_active ?? payload.isActive;
  const rawImageUrl = payload.image_url ?? payload.imageUrl;
  const normalized = {
    offerType: offerType,
    name,
    description: payload.description == null ? null : String(payload.description).trim() || null,
    imageUrl: rawImageUrl == null ? null : String(rawImageUrl).trim() || null,
    startsAt,
    endsAt,
    isActive: isActive === undefined ? true : Boolean(isActive),
  };

  if (offerType === 'bundle') {
    const productIds = normalizeProductIds(payload.product_ids ?? payload.productIds);
    if (productIds.length < 2) throw createValidationError('Bundles require at least two products.');

    // Optional per-product weight targeting. Accepts either an array aligned
    // with product_ids or a map of { productId: variantId }. Values may be
    // null only when the product has no weight tiers (auto-resolved later).
    const rawVariantIds = payload.variant_ids ?? payload.variantIds ?? {};
    const variantIdMap = new Map();
    if (Array.isArray(rawVariantIds)) {
      if (rawVariantIds.length > productIds.length) {
        throw createValidationError('variant_ids cannot contain more entries than product_ids.');
      }
      productIds.forEach((productId, index) => {
        const raw = rawVariantIds[index];
        if (raw !== undefined && raw !== null && raw !== '') {
          const variantId = Number(raw);
          if (!Number.isInteger(variantId) || variantId <= 0) {
            throw createValidationError('variant_ids must contain positive integer ids.');
          }
          variantIdMap.set(productId, variantId);
        }
      });
    } else if (typeof rawVariantIds === 'object') {
      for (const [key, raw] of Object.entries(rawVariantIds)) {
        const productId = Number(key);
        if (raw === undefined || raw === null || raw === '') continue;
        const variantId = Number(raw);
        if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(variantId) || variantId <= 0) {
          throw createValidationError('variant_ids must map product ids to positive integer variant ids.');
        }
        variantIdMap.set(productId, variantId);
      }
    } else {
      throw createValidationError('variant_ids must be an array or an object.');
    }

    return {
      ...normalized,
      productIds,
      variantIdMap,
      bundlePrice: parseMoney(payload.bundle_price ?? payload.bundlePrice, 'bundle_price'),
    };
  }

  const productId = Number(payload.product_id ?? payload.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw createValidationError('product_id must be a positive integer.');
  }

  const discountType = String(payload.discount_type ?? payload.discountType ?? '').trim().toLowerCase();
  if (!DISCOUNT_TYPES.has(discountType)) throw createValidationError('discount_type must be percentage or fixed.');

  const discountValue = parseMoney(payload.discount_value ?? payload.discountValue, 'discount_value');
  if (discountType === 'percentage' && discountValue > 100) {
    throw createValidationError('Percentage discount must be between 0 and 100.');
  }

  // Optional weight targeting: when set, the discount applies ONLY to the
  // target variant's weight (all flavors of that weight), never other weights.
  const rawVariantId = payload.variant_id ?? payload.variantId;
  let variantId = null;
  if (rawVariantId !== undefined && rawVariantId !== null && rawVariantId !== '') {
    variantId = Number(rawVariantId);
    if (!Number.isInteger(variantId) || variantId <= 0) {
      throw createValidationError('variant_id must be a positive integer.');
    }
  }

  return { ...normalized, productId, variantId, discountType, discountValue };
};

export { createValidationError };
