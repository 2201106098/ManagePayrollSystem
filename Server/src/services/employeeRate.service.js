const EmployeeRate = require('../models/EmployeeRate.model');
const Employee = require('../models/Employee.model');
const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const getAllEmployeeRates = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      showInactive = false
    } = filters;

    // Build query
    let query = {};
    
    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        ...query,
        $or: [
          { 'employee.firstName': searchRegex },
          { 'employee.lastName': searchRegex },
          { 'employee.designation': searchRegex },
          { 'employee.idNumber': searchRegex }
        ]
      };
    }

    const skip = (page - 1) * limit;
    
    const [rates, total] = await Promise.all([
      EmployeeRate.find(query)
        .populate({
          path: 'employee',
          match: showInactive ? {} : { isActive: true, isArchived: false }
        })
        .populate('updatedBy', 'firstName lastName email')
        .sort({ lastUpdated: -1 })
        .skip(skip)
        .limit(limit),
      EmployeeRate.countDocuments(query)
    ]);

    // Filter out null employees (from populate match)
    const filteredRates = rates.filter(rate => rate.employee);

    return {
      rates: filteredRates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredRates.length,
        pages: Math.ceil(filteredRates.length / limit)
      }
    };
  } catch (error) {
    logger.error('Get all employee rates error:', error);
    throw error;
  }
};

const getEmployeeRateById = async (id) => {
  try {
    const rate = await EmployeeRate.findById(id)
      .populate('employee', 'firstName lastName designation idNumber')
      .populate('updatedBy', 'firstName lastName email');
    
    if (!rate) {
      throw new Error('Employee rate not found');
    }

    return rate;
  } catch (error) {
    logger.error('Get employee rate by ID error:', error);
    throw error;
  }
};

const getEmployeeRateByEmployeeId = async (employeeId) => {
  try {
    const rate = await EmployeeRate.findOne({ employee: employeeId })
      .populate('employee', 'firstName lastName designation idNumber')
      .populate('updatedBy', 'firstName lastName email');
    
    return rate;
  } catch (error) {
    logger.error('Get employee rate by employee ID error:', error);
    throw error;
  }
};

const createOrUpdateEmployeeRate = async (rateData, userId) => {
  try {
    const { employee, billingRate, overtimeRate, outOfTownRate, cashAdvanceLimit } = rateData;
    
    // Check if employee exists and is active
    const employeeDoc = await Employee.findById(employee);
    if (!employeeDoc || !employeeDoc.isActive || employeeDoc.isArchived) {
      throw new Error('Employee not found or inactive');
    }

    // Update or create rate
    const rate = await EmployeeRate.findOneAndUpdate(
      { employee },
      {
        employee,
        billingRate: parseFloat(billingRate),
        overtimeRate: parseFloat(overtimeRate),
        outOfTownRate: parseFloat(outOfTownRate),
        cashAdvanceLimit: parseFloat(cashAdvanceLimit),
        updatedBy: userId,
        lastUpdated: new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    ).populate('employee', 'firstName lastName designation idNumber')
     .populate('updatedBy', 'firstName lastName email');

    return rate;
  } catch (error) {
    logger.error('Create/update employee rate error:', error);
    throw error;
  }
};

const deleteEmployeeRate = async (id) => {
  try {
    const rate = await EmployeeRate.findByIdAndDelete(id);
    
    if (!rate) {
      throw new Error('Employee rate not found');
    }

    return rate;
  } catch (error) {
    logger.error('Delete employee rate error:', error);
    throw error;
  }
};

const getEmployeeRateStatistics = async () => {
  try {
    const stats = await EmployeeRate.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $match: {
          'employee.isActive': true,
          'employee.isArchived': false
        }
      },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          averageBillingRate: { $avg: '$billingRate' },
          averageOvertimeRate: { $avg: '$overtimeRate' },
          averageOutOfTownRate: { $avg: '$outOfTownRate' },
          averageCashAdvanceLimit: { $avg: '$cashAdvanceLimit' },
          totalCashAdvanceLimit: { $sum: '$cashAdvanceLimit' }
        }
      }
    ]);

    return stats[0] || {
      totalEmployees: 0,
      averageBillingRate: 0,
      averageOvertimeRate: 0,
      averageOutOfTownRate: 0,
      averageCashAdvanceLimit: 0,
      totalCashAdvanceLimit: 0
    };
  } catch (error) {
    logger.error('Get employee rate statistics error:', error);
    throw error;
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
