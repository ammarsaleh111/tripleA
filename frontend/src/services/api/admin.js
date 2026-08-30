import apiClient from './client.js';

export const getAdminDashboard = async () => {
  const response = await apiClient.get('/admin/dashboard');
  return response.data;
};

export const getAdminProducts = async (params = {}) => {
  const response = await apiClient.get('/admin/products', { params });
  return response.data;
};

export const createAdminProduct = async (payload) => {
  const response = await apiClient.post('/admin/products', payload);
  return response.data;
};

export const updateAdminProduct = async (productId, payload) => {
  const response = await apiClient.put(`/admin/products/${productId}`, payload);
  return response.data;
};

export const deleteAdminProduct = async (productId) => {
  const response = await apiClient.delete(`/admin/products/${productId}`);
  return response.data;
};

export const getAdminOrders = async (params = {}) => {
  const response = await apiClient.get('/admin/orders', { params });
  return response.data;
};

export const getAdminCustomers = async (params = {}) => {
  const response = await apiClient.get('/admin/customers', { params });
  return response.data;
};

export const getAdminCustomerById = async (customerId) => {
  const response = await apiClient.get(`/admin/customers/${customerId}`);
  return response.data;
};

export const getAdminOrderById = async (orderId) => {
  const response = await apiClient.get(`/admin/orders/${orderId}`);
  return response.data;
};

export const updateAdminOrderStatus = async (orderId, payload) => {
  const response = await apiClient.patch(`/admin/orders/${orderId}/status`, payload);
  return response.data;
};

export const getAdminMessages = async (params = {}) => {
  const response = await apiClient.get('/admin/messages', { params });
  return response.data;
};

export const updateAdminMessage = async (messageId, payload) => {
  const response = await apiClient.patch(`/admin/messages/${messageId}`, payload);
  return response.data;
};

export const deleteAdminMessage = async (messageId) => {
  const response = await apiClient.delete(`/admin/messages/${messageId}`);
  return response.data;
};

export const getAdminOffers = async () => {
  const response = await apiClient.get('/admin/offers');
  return response.data;
};

export const createAdminOffer = async (payload) => {
  const response = await apiClient.post('/admin/offers', payload);
  return response.data;
};

export const updateAdminOffer = async (offerId, payload) => {
  const response = await apiClient.put(`/admin/offers/${offerId}`, payload);
  return response.data;
};

export const updateAdminOfferStatus = async (offerId, payload) => {
  const response = await apiClient.patch(`/admin/offers/${offerId}/status`, payload);
  return response.data;
};

export const deleteAdminOffer = async (offerId) => {
  const response = await apiClient.delete(`/admin/offers/${offerId}`);
  return response.data;
};

