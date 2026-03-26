import axiosClient from './axiosClient';

export const userAPI = {
  // Get user by ID
  getUser: async (userId) => {
    return await axiosClient.get(`/users/${userId}`);
  },

  // Update user profile
  updateUser: async (userId, userData) => {
    return await axiosClient.put(`/users/${userId}`, userData);
  },

  // Delete user account
  deleteUser: async (userId) => {
    return await axiosClient.delete(`/users/${userId}`);
  },

  // Get current user profile
  getCurrentUser: async () => {
    return await axiosClient.get('/users/me');
  },

  // Update current user profile
  updateCurrentUser: async (userData) => {
    return await axiosClient.put('/users/me', userData);
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return await axiosClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    return await axiosClient.post('/users/upload-profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
