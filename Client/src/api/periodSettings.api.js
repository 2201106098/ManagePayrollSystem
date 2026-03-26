import axiosClient from './axiosClient';

const periodSettingsAPI = {
  // Get period settings for specific month/year
  getPeriodSettings: async (year, month) => {
    try {
      const response = await axiosClient.get('/period-settings', { 
        params: { year, month } 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch period settings' };
    }
  },

  // Get all period settings for a user
  getAllPeriodSettings: async (year) => {
    try {
      const response = await axiosClient.get('/period-settings/all', { 
        params: { year } 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch all period settings' };
    }
  },

  // Save or update period settings
  savePeriodSettings: async (data) => {
    try {
      const response = await axiosClient.post('/period-settings', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to save period settings' };
    }
  },

  // Delete period settings for specific month/year
  deletePeriodSettings: async (year, month) => {
    try {
      const response = await axiosClient.delete(`/period-settings/${year}/${month}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete period settings' };
    }
  }
};

export default periodSettingsAPI;
