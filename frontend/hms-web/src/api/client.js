import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach Bearer token and correlation ID
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('hms_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers['X-Correlation-Id']) {
    config.headers['X-Correlation-Id'] = crypto.randomUUID().slice(0, 8);
  }
  return config;
});

// Response interceptor: auto-refresh token on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;
      const refreshToken = sessionStorage.getItem('hms_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data.accessToken;
          const newRefreshToken = res.data.refreshToken;
          sessionStorage.setItem('hms_access_token', newAccessToken);
          sessionStorage.setItem('hms_refresh_token', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          sessionStorage.clear();
          window.dispatchEvent(new Event('hms_auth_logout'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
