import apiClient from './client.js';

export const getCart = async ({ sessionId } = {}) => {
  const response = await apiClient.get('/cart', {
    params: sessionId ? { session_id: sessionId } : {},
  });
  return response.data;
};

export const addCartItem = async ({ variantId, quantity = 1, sessionId }) => {
  const response = await apiClient.post(
    '/cart/items',
    {
      variant_id: variantId,
      quantity,
      ...(sessionId ? { session_id: sessionId } : {}),
    },
    {
      headers: sessionId ? { 'x-session-id': sessionId } : {},
    },
  );

  return response.data;
};

export const addBundleItem = async ({ offerId, quantity = 1, variantSelections = null, sessionId }) => {
  const response = await apiClient.post(
    '/cart/items',
    {
      item_type: 'bundle',
      offer_id: offerId,
      quantity,
      ...(variantSelections ? { variant_selections: variantSelections } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    },
    {
      headers: sessionId ? { 'x-session-id': sessionId } : {},
    },
  );

  return response.data;
};

export const updateCartItem = async ({ cartItemId, quantity, sessionId }) => {
  const response = await apiClient.put(
    `/cart/items/${cartItemId}`,
    {
      quantity,
      ...(sessionId ? { session_id: sessionId } : {}),
    },
    {
      headers: sessionId ? { 'x-session-id': sessionId } : {},
    },
  );

  return response.data;
};

export const removeCartItem = async ({ cartItemId, sessionId }) => {
  const response = await apiClient.delete(`/cart/items/${cartItemId}`, {
    data: sessionId ? { session_id: sessionId } : {},
    headers: sessionId ? { 'x-session-id': sessionId } : {},
  });

  return response.data;
};
