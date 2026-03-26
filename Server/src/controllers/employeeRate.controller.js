const employeeRateService = require('../services/employeeRate.service');
const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const getAllEmployeeRates = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      showInactive = false
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      showInactive: showInactive === 'true'
    };

    const result = await employeeRateService.getAllEmployeeRates(filters);
    
    res.json(createResponse(true, 'Employee rates retrieved successfully', result));
  } catch (error) {
    logger.error('Get all employee rates error:', error);
    next(error);
  }
};

const getEmployeeRateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const rate = await employeeRateService.getEmployeeRateById(id);
    
    res.json(createResponse(true, 'Employee rate retrieved successfully', rate));
  } catch (error) {
    logger.error('Get employee rate by ID error:', error);
    next(error);
  }
};

const getEmployeeRateByEmployeeId = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    
    const rate = await employeeRateService.getEmployeeRateByEmployeeId(employeeId);
    
    res.json(createResponse(true, 'Employee rate retrieved successfully', rate));
  } catch (error) {
    logger.error('Get employee rate by employee ID error:', error);
    next(error);
  }
};

const createOrUpdateEmployeeRate = async (req, res, next) => {
  try {
    const rateData = req.body;
    const userId = req.user.userId;
    
    const rate = await employeeRateService.createOrUpdateEmployeeRate(rateData, userId);
    
    res.status(201).json(createResponse(true, 'Employee rate saved successfully', rate));
  } catch (error) {
    logger.error('Create/update employee rate error:', error);
    next(error);
  }
};

const deleteEmployeeRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const rate = await employeeRateService.deleteEmployeeRate(id);
    
    res.json(createResponse(true, 'Employee rate deleted successfully', rate));
  } catch (error) {
    logger.error('Delete employee rate error:', error);
    next(error);
  }
};

const getEmployeeRateStatistics = async (req, res, next) => {
  try {
    const stats = await employeeRateService.getEmployeeRateStatistics();
    
    res.json(createResponse(true, 'Employee rate statistics retrieved successfully', stats));
  } catch (error) {
    logger.error('Get employee rate statistics error:', error);
    next(error);
  }
};

module.exports = {
  getAllEmployeeRates,
  getEmployeeRateById,
  getEmployeeRateByEmployeeId,
  createOrUpdateEmployeeRate,
  deleteEmployeeRate,
  getEmployeeRateStatistics
};
