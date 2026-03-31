const WorkHour = require('../models/WorkHour.model');
const WorkHourTemplate = require('../models/WorkHourTemplate.model');
const Employee = require('../models/Employee.model');
const mongoose = require('mongoose');

// Get work hours for a specific date with optional employee filter
const getWorkHours = async (req, res) => {
  try {
    const { date, employeeId, page = 1, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (employeeId) {
      query.employee = mongoose.Types.ObjectId(employeeId);
    }

    // Get work hours with pagination
    const skip = (page - 1) * limit;
    const workHours = await WorkHour.find(query)
      .populate('employee', 'firstName middleInitial lastName idNumber designation')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ date: -1, 'employee.lastName': 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WorkHour.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        workHours,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching work hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work hours',
      error: error.message
    });
  }
};

// Get work hours for multiple employees on a specific date
const getWorkHoursByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get all active employees
    const activeEmployees = await Employee.find({ 
      status: 'active', 
      isArchived: false 
    }).select('_id firstName middleInitial lastName idNumber designation');

    // Get existing work hours for the date
    const existingWorkHours = await WorkHour.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('employee', 'firstName middleInitial lastName idNumber designation');

    // Create a map for quick lookup
    const workHoursMap = new Map();
    existingWorkHours.forEach(wh => {
      workHoursMap.set(wh.employee._id.toString(), wh);
    });

    // Combine employees with their work hours (or create default entries)
    const result = activeEmployees.map(employee => {
      const existingWorkHour = workHoursMap.get(employee._id.toString());
      if (existingWorkHour) {
        return existingWorkHour;
      } else {
        // Return default structure for employees without work hours
        return {
          employee: {
            _id: employee._id,
            firstName: employee.firstName,
            middleInitial: employee.middleInitial,
            lastName: employee.lastName,
            idNumber: employee.idNumber,
            designation: employee.designation,
            name: `${employee.firstName}${employee.middleInitial ? ' ' + employee.middleInitial + '.' : ''} ${employee.lastName}`
          },
          date: targetDate,
          timeIn: '',
          breakTime: '',
          resume: '',
          timeOut: '',
          overtime: 0,
          totalHours: 0,
          status: 'present',
          notes: ''
        };
      }
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching work hours by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work hours',
      error: error.message
    });
  }
};

// Create or update work hour for an employee
const createOrUpdateWorkHour = async (req, res) => {
  try {
    const { employeeId, date, timeIn, breakTime, resume, timeOut, overtime, status, notes } = req.body;
    const userId = req.user?.userId;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and date are required'
      });
    }

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const actorUserId = userId || employee.createdBy || employee._id;
    const workHourData = {
      timeIn: timeIn || '',
      breakTime: breakTime || '',
      resume: resume || '',
      timeOut: timeOut || '',
      overtime: parseFloat(overtime) || 0,
      status: status || 'present',
      notes: notes || '',
      lastModifiedBy: actorUserId
    };

    let workHour;
    try {
      workHour = await WorkHour.findOneAndUpdate(
        {
          employee: employeeId,
          date: { $gte: startOfDay, $lte: endOfDay }
        },
        {
          $set: workHourData,
          $setOnInsert: {
            employee: employeeId,
            date: startOfDay,
            createdBy: actorUserId
          }
        },
        { new: true, upsert: true, runValidators: true }
      ).populate('employee', 'firstName middleInitial lastName idNumber designation');
    } catch (e) {
      if (e && e.code === 11000) {
        workHour = await WorkHour.findOneAndUpdate(
          {
            employee: employeeId,
            date: { $gte: startOfDay, $lte: endOfDay }
          },
          {
            $set: workHourData
          },
          { new: true, runValidators: true }
        ).populate('employee', 'firstName middleInitial lastName idNumber designation');
      } else {
        throw e;
      }
    }

    res.status(200).json({
      success: true,
      data: workHour,
      message: 'Work hour saved successfully'
    });
  } catch (error) {
    console.error('Error creating/updating work hour:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save work hour',
      error: error.message
    });
  }
};

// Bulk update work hours for multiple employees
const bulkUpdateWorkHours = async (req, res) => {
  try {
    const { date, updates } = req.body; // updates: [{ employeeId, timeIn, breakTime, resume, timeOut, status }]
    const userId = req.user?.userId;

    if (!date || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Date and updates array are required'
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { employeeId, ...workHourData } = update;

        // Validate employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          errors.push({ employeeId, error: 'Employee not found' });
          continue;
        }

        const existingWorkHour = await WorkHour.findOne({
          employee: employeeId,
          date: { $gte: startOfDay, $lte: endOfDay }
        });

        const data = {
          employee: employeeId,
          date: targetDate,
          ...workHourData,
          lastModifiedBy: userId
        };

        let savedWorkHour;
        if (existingWorkHour) {
          savedWorkHour = await WorkHour.findByIdAndUpdate(
            existingWorkHour._id,
            data,
            { new: true, runValidators: true }
          ).populate('employee', 'firstName middleInitial lastName idNumber designation');
        } else {
          data.createdBy = userId;
          savedWorkHour = new WorkHour(data);
          await savedWorkHour.save();
          await savedWorkHour.populate('employee', 'firstName middleInitial lastName idNumber designation');
        }

        results.push(savedWorkHour);
      } catch (error) {
        errors.push({ employeeId: update.employeeId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        updated: results,
        errors: errors,
        totalAttempted: updates.length,
        successful: results.length,
        failed: errors.length
      },
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`
    });
  } catch (error) {
    console.error('Error in bulk update work hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update',
      error: error.message
    });
  }
};

// Mark employee as absent
const markAbsent = async (req, res) => {
  try {
    const { employeeId, date } = req.body;
    const userId = req.user?.userId;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and date are required'
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const workHourData = {
      employee: employeeId,
      date: targetDate,
      timeIn: '',
      breakTime: '',
      resume: '',
      timeOut: '',
      overtime: 0,
      status: 'absent',
      lastModifiedBy: userId
    };

    const workHour = await WorkHour.findOneAndUpdate(
      { employee: employeeId, date: { $gte: startOfDay, $lte: endOfDay } },
      workHourData,
      { upsert: true, new: true, runValidators: true }
    ).populate('employee', 'firstName middleInitial lastName idNumber designation');

    res.status(200).json({
      success: true,
      data: workHour,
      message: 'Employee marked as absent successfully'
    });
  } catch (error) {
    console.error('Error marking absent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark employee as absent',
      error: error.message
    });
  }
};

// Mark employee as half day
const markHalfDay = async (req, res) => {
  try {
    const { employeeId, date, type } = req.body; // type: 'morning' or 'afternoon'
    const userId = req.user?.userId;

    if (!employeeId || !date || !type) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, date, and type are required'
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const workHourData = {
      employee: employeeId,
      date: targetDate,
      status: type === 'morning' ? 'halfday_morning' : 'halfday_afternoon',
      timeIn: type === 'morning' ? '08:30' : '13:00',
      breakTime: '',
      resume: '',
      timeOut: type === 'morning' ? '12:30' : '17:30',
      overtime: 0,
      lastModifiedBy: userId
    };

    const workHour = await WorkHour.findOneAndUpdate(
      { employee: employeeId, date: { $gte: startOfDay, $lte: endOfDay } },
      workHourData,
      { upsert: true, new: true, runValidators: true }
    ).populate('employee', 'firstName middleInitial lastName idNumber designation');

    res.status(200).json({
      success: true,
      data: workHour,
      message: `Employee marked as half day (${type}) successfully`
    });
  } catch (error) {
    console.error('Error marking half day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark employee as half day',
      error: error.message
    });
  }
};

// Get work hour templates
const getWorkHourTemplates = async (req, res) => {
  try {
    const { employeeId, isGlobal } = req.query;
    
    const query = { isActive: true };
    
    if (employeeId) {
      query.employee = mongoose.Types.ObjectId(employeeId);
    } else if (isGlobal === 'true') {
      query.isGlobal = true;
      query.employee = null;
    }

    const templates = await WorkHourTemplate.find(query)
      .populate('employee', 'firstName middleInitial lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ isGlobal: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching work hour templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work hour templates',
      error: error.message
    });
  }
};

// Save work hour template
const saveWorkHourTemplate = async (req, res) => {
  try {
    console.log('=== TEMPLATE SAVE DEBUG ===');
    console.log('Request body:', req.body);
    console.log('User from auth:', req.user);
    
    const { 
      id, // Template ID for updates
      name, 
      employeeId, 
      timeIn, 
      breakTime, 
      resume, 
      timeOut, 
      isGlobal, 
      applicableDays 
    } = req.body;
    const userId = req.user?.userId;

    console.log('Extracted data:', { id, name, employeeId, timeIn, breakTime, resume, timeOut, isGlobal, applicableDays, userId });

    if (!name || !timeIn || !timeOut) {
      return res.status(400).json({
        success: false,
        message: 'Name, time in, and time out are required'
      });
    }

    let template;

    if (id) {
      // Update existing template
      console.log('Updating existing template with ID:', id);
      template = await WorkHourTemplate.findById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Update template fields
      template.name = name;
      template.employee = isGlobal ? null : employeeId;
      template.timeIn = timeIn;
      template.breakTime = breakTime;
      template.resume = resume;
      template.timeOut = timeOut;
      template.isGlobal = isGlobal || false;
      template.applicableDays = applicableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      console.log('Template updated before save:', template);
      
    } else {
      // Check for existing template of same type (global or individual)
      console.log('Checking for existing template of same type...');
      
      const existingTemplate = await WorkHourTemplate.findOne({
        isGlobal: isGlobal || false,
        employee: isGlobal ? null : employeeId,
        isActive: true
      });
      
      if (existingTemplate) {
        console.log('Found existing template, updating it instead:', existingTemplate._id);
        template = existingTemplate;
        
        // Update existing template
        template.name = name;
        template.timeIn = timeIn;
        template.breakTime = breakTime;
        template.resume = resume;
        template.timeOut = timeOut;
        template.applicableDays = applicableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
      } else {
        // Create new template
        console.log('No existing template found, creating new one');
        const templateData = {
          name,
          employee: isGlobal ? null : employeeId,
          timeIn,
          breakTime,
          resume,
          timeOut,
          isGlobal: isGlobal || false,
          applicableDays: applicableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          createdBy: userId
        };

        template = new WorkHourTemplate(templateData);
        console.log('New template created:', template);
      }
    }
    
    await template.save();
    console.log('Template saved successfully:', template);
    
    await template.populate('employee', 'firstName middleInitial lastName');
    await template.populate('createdBy', 'firstName lastName');

    res.status(id ? 200 : 201).json({
      success: true,
      data: template,
      message: id ? 'Work hour template updated successfully' : 'Work hour template saved successfully'
    });
  } catch (error) {
    console.error('Error saving work hour template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save work hour template',
      error: error.message
    });
  }
};

module.exports = {
  getWorkHours,
  getWorkHoursByDate,
  createOrUpdateWorkHour,
  bulkUpdateWorkHours,
  markAbsent,
  markHalfDay,
  getWorkHourTemplates,
  saveWorkHourTemplate
};
