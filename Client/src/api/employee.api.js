import axiosClient from './axiosClient';

export const employeeAPI = {
  // Get all employees with pagination and filtering
  getAllEmployees: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.showArchived !== undefined) queryParams.append('showArchived', params.showArchived);
    if (params.status) queryParams.append('status', params.status);
    
    const url = `/employees${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await axiosClient.get(url);
  },

  // Get employee by ID
  getEmployeeById: async (employeeId) => {
    return await axiosClient.get(`/employees/${employeeId}`);
  },

  // Create new employee
  createEmployee: async (employeeData) => {
    return await axiosClient.post('/employees', employeeData);
  },

  // Update employee
  updateEmployee: async (employeeId, employeeData) => {
    return await axiosClient.put(`/employees/${employeeId}`, employeeData);
  },

  // Archive/unarchive employee
  archiveEmployee: async (employeeId) => {
    return await axiosClient.patch(`/employees/${employeeId}/archive`);
  },

  // Delete employee
  deleteEmployee: async (employeeId) => {
    return await axiosClient.delete(`/employees/${employeeId}`);
  },

  // Get employee statistics
  getEmployeeStats: async () => {
    return await axiosClient.get('/employees/stats');
  }
};
