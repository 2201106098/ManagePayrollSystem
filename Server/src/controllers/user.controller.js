const userService = require('../services/user.service');
const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    
    res.json(createResponse(true, 'User retrieved successfully', user));
  } catch (error) {
    logger.error('Get user error:', error);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await userService.updateUser(id, updateData);
    
    res.json(createResponse(true, 'User updated successfully', user));
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await userService.deleteUser(id);
    
    res.json(createResponse(true, 'User deleted successfully'));
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

module.exports = {
  getUser,
  updateUser,
  deleteUser
};
