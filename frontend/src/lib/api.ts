import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/staff/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Customers
export const customersApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
  adjustPoints: (id: string, points: number, reason: string) =>
    api.post(`/customers/${id}/adjust-points`, { points, reason }),
  getTransactions: (id: string, params?: any) =>
    api.get(`/customers/${id}/transactions`, { params }),
  getStats: () => api.get('/customers/stats'),
};

// Loyalty
export const loyaltyApi = {
  earnPoints: (data: any) => api.post('/loyalty/earn', data),
  redeemPoints: (data: any) => api.post('/loyalty/redeem', data),
  verifyMembership: (membershipNumber: string) =>
    api.get(`/loyalty/verify/${membershipNumber}`),
  getRewards: (tier?: string) => api.get('/loyalty/rewards', { params: { tier } }),
  getRules: () => api.get('/loyalty/rules'),
  createRule: (data: any) => api.post('/loyalty/rules', data),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getMemberGrowth: (period?: string) => api.get('/analytics/member-growth', { params: { period } }),
  getPointsActivity: (days?: number) => api.get('/analytics/points-activity', { params: { days } }),
  getRetention: () => api.get('/analytics/retention'),
  getCampaignPerformance: (campaignId?: string) =>
    api.get('/analytics/campaigns', { params: { campaignId } }),
  getVisitFrequency: () => api.get('/analytics/visit-frequency'),
  getCustomerLtv: () => api.get('/analytics/customer-ltv'),
};

// Campaigns
export const campaignsApi = {
  list: (params?: any) => api.get('/campaigns', { params }),
  get: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: string, data: any) => api.patch(`/campaigns/${id}`, data),
  activate: (id: string) => api.post(`/campaigns/${id}/activate`),
  pause: (id: string) => api.post(`/campaigns/${id}/pause`),
  cancel: (id: string) => api.post(`/campaigns/${id}/cancel`),
};

// Branches
export const branchesApi = {
  list: () => api.get('/branches'),
  get: (id: string) => api.get(`/branches/${id}`),
  create: (data: any) => api.post('/branches', data),
  update: (id: string, data: any) => api.patch(`/branches/${id}`, data),
  updateGeofence: (id: string, data: any) => api.patch(`/branches/${id}/geofence`, data),
};

// Rewards
export const rewardsApi = {
  list: () => api.get('/rewards'),
  get: (id: string) => api.get(`/rewards/${id}`),
  create: (data: any) => api.post('/rewards', data),
  update: (id: string, data: any) => api.patch(`/rewards/${id}`, data),
};

// Staff
export const staffApi = {
  list: () => api.get('/staff'),
  get: (id: string) => api.get(`/staff/${id}`),
  create: (data: any) => api.post('/staff', data),
  update: (id: string, data: any) => api.patch(`/staff/${id}`, data),
};

// Wallet
export const walletApi = {
  generateApple: (customerId: string) =>
    api.get(`/wallet/apple/${customerId}`, { responseType: 'blob' }),
  generateGoogle: (customerId: string) =>
    api.get(`/wallet/google/${customerId}`),
  updatePass: (customerId: string) =>
    api.post(`/wallet/update/${customerId}`),
};
