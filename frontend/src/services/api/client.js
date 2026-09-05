import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// In production, fail fast if the API URL is missing so issues are caught
// early rather than silently hitting a dead localhost endpoint.
if (!apiBaseUrl && import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.warn(
    'VITE_API_BASE_URL is not set in production. The API client will not function correctly.',
  );
}

const apiClient = axios.create({
  baseURL: apiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : ''),
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('triplea_auth_token');

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;

