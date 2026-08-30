import apiClient from './client.js';

export const getActiveOffers = async () => {
  const response = await apiClient.get('/offers');
  return response.data;
};
