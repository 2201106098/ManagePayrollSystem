const User = require('../models/User.model');
const logger = require('../utils/logger');

const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.toJSON();
  } catch (error) {
    logger.error('Get user by ID service error:', error);
    throw error;
  }
};

const updateUser = async (userId, updateData) => {
  try {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, refreshTokens, ...allowedUpdates } = updateData;
    
    const user = await User.findByIdAndUpdate(
      userId,
      allowedUpdates,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toJSON();
  } catch (error) {
    logger.error('Update user service error:', error);
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    logger.info(`User deleted: ${user.email}`);
  } catch (error) {
    logger.error('Delete user service error:', error);
    throw error;
  }
};

const getAllUsers = async (filters = {}) => {
  try {
    const { page = 1, limit = 10, role, isActive } = filters;
    
    const query = {};
    if (role) query.role = role;
    if (typeof isActive === 'boolean') query.isActive = isActive;
    
    const users = await User.find(query)
      .select('-password -refreshTokens')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Get all users service error:', error);
    throw error;
  }
};

module.exports = {
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers
};
