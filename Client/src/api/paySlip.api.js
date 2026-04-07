import axiosClient from './axiosClient';

const paySlipAPI = {
  generatePaySlip: async (data, config = {}) => {
    try {
      const merged = { timeout: 30000, ...config };
      const response = await axiosClient.post('/pay-slips/generate', data, merged);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        throw error;
      }
      throw error.response?.data || { message: 'Failed to generate pay slip' };
    }
  },

  // Get pay slips (with optional filters)
  getPaySlips: async (params = {}) => {
    try {
      const response = await axiosClient.get('/pay-slips', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch pay slips' };
    }
  },

  // Get specific pay slip by ID
  getPaySlipById: async (id) => {
    try {
      const response = await axiosClient.get(`/pay-slips/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch pay slip' };
    }
  },

  // Update pay slip (allowances, deductions, status)
  updatePaySlip: async (id, data) => {
    try {
      const response = await axiosClient.put(`/pay-slips/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update pay slip' };
    }
  },

  // Delete pay slip
  deletePaySlip: async (id) => {
    try {
      const response = await axiosClient.delete(`/pay-slips/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete pay slip' };
    }
  }
};

export default paySlipAPI;
