import axiosClient from './axiosClient';

export const authAPI = {
  // Register new user
  register: async (userData) => {
    return await axiosClient.post('/auth/register', userData);
  },

  // Login user
  login: async (credentials) => {
    return await axiosClient.post('/auth/login', credentials);
  },

  // Logout user
  logout: async () => {
    return await axiosClient.post('/auth/logout');
  },

  // Logout from all devices
  logoutAll: async () => {
    return await axiosClient.post('/auth/logout-all');
  },

  // Refresh access token
  refreshToken: async () => {
    return await axiosClient.post('/auth/refresh');
  },

  // Request password reset
  forgotPassword: async (email) => {
    return await axiosClient.post('/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    return await axiosClient.post('/auth/reset-password', { token, password: newPassword });
  },
};
