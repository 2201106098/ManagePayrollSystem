const PeriodSettings = require('../models/PeriodSettings.model');
const { createResponse } = require('../utils/response');

// Get period settings for a specific month/year
const getPeriodSettings = async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.user?.userId;
    
    if (!year || !month) {
      return res.status(400).json(createResponse(false, 'Year and month are required'));
    }
    
    const settings = await PeriodSettings.findOne({
      company: userId,
      year: parseInt(year),
      month: parseInt(month),
      isActive: true
    }).populate('createdBy', 'firstName lastName');
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = {
        year: parseInt(year),
        month: parseInt(month),
        periods: [
          {
            id: "P1",
            label: "First Half",
            startDay: 1,
            endDay: 15,
            payday: 15,
            color: "#A72703",
            payNextMonth: false,
            workingDays: 0
          },
          {
            id: "P2",
            label: "Second Half",
            startDay: 16,
            endDay: 0,
            payday: 0,
            color: "#132440",
            payNextMonth: false,
            workingDays: 0
          }
        ]
      };
      
      return res.status(200).json(createResponse(true, 'Default settings returned', defaultSettings));
    }
    
    res.status(200).json(createResponse(true, 'Period settings retrieved', settings));
  } catch (error) {
    console.error('Error fetching period settings:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch period settings', error.message));
  }
};

// Save or update period settings
const savePeriodSettings = async (req, res) => {
  try {
    const { year, month, periods } = req.body;
    const userId = req.user?.userId;
    
    if (!year || !month || !periods) {
      return res.status(400).json(createResponse(false, 'Year, month, and periods are required'));
    }
    
    if (!Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json(createResponse(false, 'Periods must be a non-empty array'));
    }
    
    // Validate each period
    for (const period of periods) {
      if (!period.id || !period.label || period.startDay === undefined || period.endDay === undefined || period.payday === undefined) {
        return res.status(400).json(createResponse(false, 'Each period must have id, label, startDay, endDay, and payday'));
      }
      
      if (period.startDay < 1 || period.startDay > 31) {
        return res.status(400).json(createResponse(false, 'startDay must be between 1 and 31'));
      }
      
      if (period.endDay < 0 || period.endDay > 31) {
        return res.status(400).json(createResponse(false, 'endDay must be between 0 and 31'));
      }
      
      if (period.payday < 0 || period.payday > 31) {
        return res.status(400).json(createResponse(false, 'payday must be between 0 and 31'));
      }
    }
    
    // Upsert the settings
    const settings = await PeriodSettings.findOneAndUpdate(
      {
        company: userId,
        year: parseInt(year),
        month: parseInt(month)
      },
      {
        company: userId,
        year: parseInt(year),
        month: parseInt(month),
        periods: periods,
        createdBy: userId,
        isActive: true
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'firstName lastName');
    
    res.status(201).json(createResponse(true, 'Period settings saved successfully', settings));
  } catch (error) {
    console.error('Error saving period settings:', error);
    
    if (error.code === 11000) {
      return res.status(400).json(createResponse(false, 'Period settings for this month already exist'));
    }
    
    res.status(500).json(createResponse(false, 'Failed to save period settings', error.message));
  }
};

// Get all period settings for a user (for overview)
const getAllPeriodSettings = async (req, res) => {
  try {
    const { year } = req.query;
    const userId = req.user?.userId;
    
    const query = { company: userId, isActive: true };
    if (year) {
      query.year = parseInt(year);
    }
    
    const settings = await PeriodSettings.find(query)
      .sort({ year: -1, month: -1 })
      .populate('createdBy', 'firstName lastName');
    
    res.status(200).json(createResponse(true, 'All period settings retrieved', settings));
  } catch (error) {
    console.error('Error fetching all period settings:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch period settings', error.message));
  }
};

// Delete period settings for a specific month/year
const deletePeriodSettings = async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user?.userId;
    
    if (!year || !month) {
      return res.status(400).json(createResponse(false, 'Year and month are required'));
    }
    
    const result = await PeriodSettings.findOneAndUpdate(
      {
        company: userId,
        year: parseInt(year),
        month: parseInt(month)
      },
      {
        isActive: false
      },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json(createResponse(false, 'Period settings not found'));
    }
    
    res.status(200).json(createResponse(true, 'Period settings deleted successfully'));
  } catch (error) {
    console.error('Error deleting period settings:', error);
    res.status(500).json(createResponse(false, 'Failed to delete period settings', error.message));
  }
};

module.exports = {
  getPeriodSettings,
  savePeriodSettings,
  getAllPeriodSettings,
  deletePeriodSettings
};
