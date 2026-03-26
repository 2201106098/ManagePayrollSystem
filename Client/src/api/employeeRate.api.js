import axiosClient from './axiosClient';

const employeeRateAPI = {
  // Get all employee rates
  getAllEmployeeRates: async (params = {}) => {
    const response = await axiosClient.get('/employee-rates', { params });
    return response.data;
  },

  // Get employee rate by ID
  getEmployeeRateById: async (id) => {
    const response = await axiosClient.get(`/employee-rates/${id}`);
    return response.data;
  },

  // Get employee rate by employee ID
  getEmployeeRateByEmployeeId: async (employeeId) => {
    const response = await axiosClient.get(`/employee-rates/employee/${employeeId}`);
    return response.data;
  },

  // Create or update employee rate
  createOrUpdateEmployeeRate: async (rateData) => {
    const response = await axiosClient.post('/employee-rates', rateData);
    return response.data;
  },

  // Update employee rate
  updateEmployeeRate: async (id, rateData) => {
    const response = await axiosClient.put(`/employee-rates/${id}`, rateData);
    return response.data;
  },

  // Delete employee rate
  deleteEmployeeRate: async (id) => {
    const response = await axiosClient.delete(`/employee-rates/${id}`);
    return response.data;
  },

  // Get employee rate statistics
  getEmployeeRateStatistics: async () => {
    const response = await axiosClient.get('/employee-rates/statistics');
    return response.data;
  }
};

export default employeeRateAPI;
