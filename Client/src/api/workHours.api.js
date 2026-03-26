import axiosClient from './axiosClient';

const workHoursAPI = {
  // Get work hours for a specific date with optional employee filter
  getWorkHours: async (params = {}) => {
    try {
      const response = await axiosClient.get('/work-hours', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch work hours' };
    }
  },

  // Get work hours for all employees on a specific date
  getWorkHoursByDate: async (date) => {
    try {
      const response = await axiosClient.get(`/work-hours/date/${date}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch work hours for date' };
    }
  },

  // Create or update work hour for an employee
  createOrUpdateWorkHour: async (workHourData) => {
    try {
      const response = await axiosClient.post('/work-hours', workHourData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to save work hour' };
    }
  },

  // Bulk update work hours for multiple employees
  bulkUpdateWorkHours: async (date, updates) => {
    try {
      const response = await axiosClient.put('/work-hours/bulk', { date, updates });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to bulk update work hours' };
    }
  },

  // Mark employee as absent
  markAbsent: async (employeeId, date) => {
    try {
      const response = await axiosClient.post('/work-hours/absent', { employeeId, date });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark employee as absent' };
    }
  },

  // Mark employee as half day
  markHalfDay: async (employeeId, date, type) => {
    try {
      const response = await axiosClient.post('/work-hours/halfday', { employeeId, date, type });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark employee as half day' };
    }
  },

  // Get work hour templates
  getTemplates: async (params = {}) => {
    try {
      const response = await axiosClient.get('/work-hours/templates', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch work hour templates' };
    }
  },

  // Save work hour template
  saveTemplate: async (templateData) => {
    try {
      const response = await axiosClient.post('/work-hours/templates', templateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to save work hour template' };
    }
  },

  updateTemplate: async (templateId, templateData) => {
    try {
      const response = await axiosClient.put(`/work-hours/templates/${templateId}`, templateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update work hour template' };
    }
  },

  deleteTemplate: async (templateId) => {
    try {
      const response = await axiosClient.delete(`/work-hours/templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete work hour template' };
    }
  },

  // Update single work hour field (for inline editing)
  updateWorkHourField: async (employeeId, date, field, value) => {
    try {
      const workHourData = { employeeId, date, [field]: value };
      const response = await axiosClient.post('/work-hours', workHourData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update work hour field' };
    }
  }
};

export default workHoursAPI;
