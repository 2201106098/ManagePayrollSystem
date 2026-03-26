const Employee = require('../models/Employee.model');
const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const getAllEmployees = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      showArchived = false,
      status = 'active'
    } = filters;

    const query = {
      isArchived: showArchived,
      ...(status && { status })
    };

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
        { idNumber: searchRegex }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [employees, total] = await Promise.all([
      Employee.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email'),
      Employee.countDocuments(query)
    ]);

    return {
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Get all employees error:', error);
    throw error;
  }
};

const getEmployeeById = async (id) => {
  try {
    const employee = await Employee.findById(id).populate('createdBy', 'firstName lastName email');
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    return employee;
  } catch (error) {
    logger.error('Get employee by ID error:', error);
    throw error;
  }
};

const getEmployeeByEmployeeId = async (employeeId) => {
  try {
    const employee = await Employee.findOne({ employeeId }).populate('createdBy', 'firstName lastName email');
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    return employee;
  } catch (error) {
    logger.error('Get employee by employee ID error:', error);
    throw error;
  }
};

const createEmployee = async (employeeData, userId) => {
  try {
    // Check if ID number or email already exists
    const existingEmployee = await Employee.findOne({
      $or: [
        { idNumber: employeeData.idNumber },
        ...(employeeData.email ? [{ email: employeeData.email }] : [])
      ]
    });

    if (existingEmployee) {
      if (existingEmployee.idNumber === employeeData.idNumber) {
        throw new Error('ID Number already exists');
      }
      if (employeeData.email && existingEmployee.email === employeeData.email) {
        throw new Error('Email already exists');
      }
    }

    const employee = new Employee({
      ...employeeData,
      createdBy: userId
    });

    await employee.save();
    await employee.populate('createdBy', 'firstName lastName email');
    
    return employee;
  } catch (error) {
    logger.error('Create employee error:', error);
    throw error;
  }
};

const updateEmployee = async (id, updateData) => {
  try {
    const employee = await Employee.findById(id);
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if employee ID or ID number already exists (excluding current employee)
    if (updateData.employeeId || updateData.idNumber || updateData.email) {
      const existingEmployee = await Employee.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateData.employeeId ? [{ employeeId: updateData.employeeId }] : []),
          ...(updateData.idNumber ? [{ idNumber: updateData.idNumber }] : []),
          ...(updateData.email ? [{ email: updateData.email }] : [])
        ]
      });

      if (existingEmployee) {
        if (updateData.employeeId && existingEmployee.employeeId === updateData.employeeId) {
          throw new Error('Employee ID already exists');
        }
        if (updateData.idNumber && existingEmployee.idNumber === updateData.idNumber) {
          throw new Error('ID Number already exists');
        }
        if (updateData.email && existingEmployee.email === updateData.email) {
          throw new Error('Email already exists');
        }
      }
    }

    Object.assign(employee, updateData);
    await employee.save();
    await employee.populate('createdBy', 'firstName lastName email');
    
    return employee;
  } catch (error) {
    logger.error('Update employee error:', error);
    throw error;
  }
};

const archiveEmployee = async (id) => {
  try {
    const employee = await Employee.findById(id);
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    employee.isArchived = !employee.isArchived;
    await employee.save();
    await employee.populate('createdBy', 'firstName lastName email');
    
    return employee;
  } catch (error) {
    logger.error('Archive employee error:', error);
    throw error;
  }
};

const deleteEmployee = async (id) => {
  try {
    const employee = await Employee.findById(id);
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    await Employee.findByIdAndDelete(id);
    
    return { message: 'Employee deleted successfully' };
  } catch (error) {
    logger.error('Delete employee error:', error);
    throw error;
  }
};

const getEmployeeStats = async () => {
  try {
    const stats = await Promise.all([
      Employee.countDocuments({ isArchived: false, status: 'active' }),
      Employee.countDocuments({ isArchived: false, status: 'inactive' }),
      Employee.countDocuments({ isArchived: true }),
      Employee.countDocuments()
    ]);

    return {
      active: stats[0],
      inactive: stats[1],
      archived: stats[2],
      total: stats[3]
    };
  } catch (error) {
    logger.error('Get employee stats error:', error);
    throw error;
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeeByEmployeeId,
  createEmployee,
  updateEmployee,
  archiveEmployee,
  deleteEmployee,
  getEmployeeStats
};
