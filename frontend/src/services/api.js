// API Service - Handles all backend communications
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Session Management
export const sessionAPI = {
  login: (data) => api.post('/api/v1/sessions/login', data),
  getAll: (userId = 1) => api.get('/api/v1/sessions', { params: { user_id: userId } }),
  refresh: (id) => api.post(`/api/v1/sessions/${id}/refresh`),
  delete: (id) => api.delete(`/api/v1/sessions/${id}`)
};

// Configuration
export const configAPI = {
  getAll: (userId = 1) => api.get('/api/v1/config', { params: { user_id: userId } }),
  updateTiers: (data) => api.post('/api/v1/config/tiers', data),
  updateProfit: (data) => api.post('/api/v1/config/profit', data),
  getSystem: (userId = 1) => api.get('/api/v1/config/system', { params: { user_id: userId } }),
  setSystem: (data) => api.post('/api/v1/config/system', data)
};

// Scanner
export const scannerAPI = {
  getOpportunities: (params) => api.get('/api/v1/scanner/opportunities', { params }),
  createOpportunity: (data) => api.post('/api/v1/scanner/opportunities', data),
  getStats: () => api.get('/api/v1/scanner/stats')
};

// History
export const historyAPI = {
  getBets: (params) => api.get('/api/v1/history/bets', { params }),
  getTodayBets: () => api.get('/api/v1/history/bets/today'),
  getPendingBets: () => api.get('/api/v1/history/bets/pending'),
  getLogs: (params) => api.get('/api/v1/history/logs', { params }),
  getSummary: (date, userId = 1) => api.get('/api/v1/history/summary', { params: { date, user_id: userId } }),
  getProfit: (period = '7d', userId = 1) => api.get('/api/v1/history/profit', { params: { period, user_id: userId } })
};

// System
export const systemAPI = {
  getHealth: () => api.get('/api/v1/system/health'),
  getStats: () => api.get('/api/v1/system/stats'),
  workerHeartbeat: (data) => api.post('/api/v1/system/worker/heartbeat', data),
  getAutoStatus: (userId = 1) => api.get('/api/v1/system/auto-status', { params: { user_id: userId } }),
  toggleAuto: (enabled, userId = 1) => api.post('/api/v1/system/auto-toggle', { enabled, user_id: userId })
};

export default api;
