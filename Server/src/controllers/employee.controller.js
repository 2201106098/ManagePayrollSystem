const employeeService = require('../services/employee.service');
const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const getAllEmployees = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      showArchived = false,
      status = 'active'
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      showArchived: showArchived === 'true',
      status
    };

    const result = await employeeService.getAllEmployees(filters);
    
    res.json(createResponse(true, 'Employees retrieved successfully', result));
  } catch (error) {
    logger.error('Get all employees error:', error);
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const employee = await employeeService.getEmployeeById(id);
    
    res.json(createResponse(true, 'Employee retrieved successfully', employee));
  } catch (error) {
    logger.error('Get employee by ID error:', error);
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;
    const userId = req.user.userId; // Get userId from auth middleware
    
    const employee = await employeeService.createEmployee(employeeData, userId);
    
    res.status(201).json(createResponse(true, 'Employee created successfully', employee));
  } catch (error) {
    logger.error('Create employee error:', error);
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const employee = await employeeService.updateEmployee(id, updateData);
    
    res.json(createResponse(true, 'Employee updated successfully', employee));
  } catch (error) {
    logger.error('Update employee error:', error);
    next(error);
  }
};

const archiveEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const employee = await employeeService.archiveEmployee(id);
    
    res.json(createResponse(true, `Employee ${employee.isArchived ? 'archived' : 'unarchived'} successfully`, employee));
  } catch (error) {
    logger.error('Archive employee error:', error);
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await employeeService.deleteEmployee(id);
    
    res.json(createResponse(true, 'Employee deleted successfully', result));
  } catch (error) {
    logger.error('Delete employee error:', error);
    next(error);
  }
};

const getEmployeeStats = async (req, res, next) => {
  try {
    const stats = await employeeService.getEmployeeStats();
    
    res.json(createResponse(true, 'Employee statistics retrieved successfully', stats));
  } catch (error) {
    logger.error('Get employee stats error:', error);
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  archiveEmployee,
  deleteEmployee,
  getEmployeeStats
};
