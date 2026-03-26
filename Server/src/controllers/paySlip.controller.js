const PaySlip = require('../models/PaySlip.model');
const Employee = require('../models/Employee.model');
const EmployeeRate = require('../models/EmployeeRate.model');
const WorkHour = require('../models/WorkHour.model');
const PeriodSettings = require('../models/PeriodSettings.model');
const { createResponse } = require('../utils/response');

// Generate pay slip for an employee for a specific period
const generatePaySlip = async (req, res) => {
  try {
    const { employeeId, year, month, periodId } = req.body;
    const userId = req.user?.userId;
    
    console.log('Generating payslip with:', { employeeId, year, month, periodId, userId });
    
    if (!employeeId || !year || !month || !periodId) {
      console.log('Missing required fields:', { employeeId, year, month, periodId });
      return res.status(400).json(createResponse(false, 'Employee ID, year, month, and period ID are required'));
    }
    
    // Get employee details
    console.log('Fetching employee:', employeeId);
    const employee = await Employee.findById(employeeId);
    console.log('Found employee:', employee);
    if (!employee) {
      return res.status(404).json(createResponse(false, 'Employee not found'));
    }

    // Get employee billing rate from HourlyRates (EmployeeRate collection)
    const employeeRateDoc = await EmployeeRate.findOne({ employee: employeeId });
    // billingRate from HourlyRates page, fallback to employee fields, then to default
    const billingRate = employeeRateDoc?.billingRate
      || employee.hourlyRate
      || (employee.basicRate ? employee.basicRate / 160 : 0);
    const overtimeRatePerHr = employeeRateDoc?.overtimeRate || (billingRate * 1.25);
    const outOfTownRate = employeeRateDoc?.outOfTownRate || 0;
    console.log('Resolved hourly rate:', billingRate, '| Overtime rate:', overtimeRatePerHr, '| Out of town rate:', outOfTownRate);
    
    // Get period settings
    console.log('Fetching period settings for:', { userId, year: parseInt(year), month: parseInt(month) });
    const periodSettings = await PeriodSettings.findOne({
      company: userId,
      year: parseInt(year),
      month: parseInt(month),
      isActive: true
    });
    console.log('Found period settings:', periodSettings);
    
    if (!periodSettings) {
      console.log('No period settings found, using default period for periodId:', periodId);
      
      // Create default period object for fallback
      const defaultPeriods = {
        'P1': { id: 'P1', label: 'First Half', startDay: 1, endDay: 15, payday: 15, color: '#A72703' },
        'P2': { id: 'P2', label: 'Second Half', startDay: 16, endDay: 0, payday: 0, color: '#132440' }
      };
      
      const period = defaultPeriods[periodId];
      if (!period) {
        return res.status(404).json(createResponse(false, 'Period not found'));
      }
      
      // Calculate start and end dates for the period (UTC to avoid timezone shift)
      const startDate = new Date(Date.UTC(parseInt(year), parseInt(month), period.startDay));
      const endDate = period.endDay === 0
        ? new Date(Date.UTC(parseInt(year), parseInt(month) + 1, 1) - 1) // UTC end of month
        : new Date(Date.UTC(parseInt(year), parseInt(month), period.endDay, 23, 59, 59, 999));
      
      console.log('Using default period:', { period, startDate, endDate });
      
      // Continue with work hours fetching using default period
      // Get work hours for this period
      console.log('Fetching work hours for:', { employeeId, startDate, endDate });
      const workHours = await WorkHour.find({
        employee: employeeId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
      console.log('Found work hours:', workHours.length, 'records');
      console.log('Work hours details:', workHours.map(wh => ({
        date: wh.date,
        timeIn: wh.timeIn,
        timeOut: wh.timeOut,
        totalHours: wh.totalHours,
        status: wh.status
      })));
      
      // Process work days (same logic as before)
      const workDays = [];
      let currentDate = new Date(startDate);
      console.log('Processing work days from', startDate, 'to', endDate);
      
      while (currentDate <= endDate) {
        // Use UTC date string to avoid timezone mismatch
        const dayOfWeek = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const workHour = workHours.find(wh =>
          wh.date.toISOString().split('T')[0] === dateStr
        );
        
        if (workHour) {
          console.log(`Found work hour for ${dateStr}:`, {
            timeIn: workHour.timeIn,
            timeOut: workHour.timeOut,
            totalHours: workHour.totalHours,
            status: workHour.status
          });
        }
        
        let status = 'present';
        let hours = 0;
        let overtime = 0;
        let timeIn = null;
        let breakTime = null;
        let resume = null;
        let timeOut = null;
        
        if (workHour) {
          status = workHour.status || 'present';
          hours = workHour.totalHours || 0;
          overtime = workHour.overtime || 0;
          timeIn = workHour.timeIn || null;
          breakTime = workHour.breakTime || null;
          resume = workHour.resume || null;
          timeOut = workHour.timeOut || null;
        } else {
          // Check if it's a weekend (use UTC day to stay consistent with UTC dates)
          const day = currentDate.getUTCDay();
          if (day === 0 || day === 6) {
            status = 'weekend';
          }
        }
        
        workDays.push({
          date: new Date(currentDate),
          dayOfWeek,
          timeIn,
          breakTime,
          resume,
          timeOut,
          hours,
          overtime,
          status
        });
        
        // Advance by 1 day in UTC
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Use billingRate resolved from EmployeeRate collection (set via HourlyRates page)
      const hourlyRate = billingRate;
      
      // Default allowances and deductions (can be customized)
      const allowances = [];
      const deductions = [];

      // Manually compute totals (findOneAndUpdate bypasses pre-save middleware)
      const totalHours = workDays.reduce((sum, d) => sum + (d.hours || 0), 0);
      const totalOvertime = workDays.reduce((sum, d) => sum + (d.overtime || 0), 0);
      const workingDays = workDays.filter(d => d.status === 'present' || (d.status && d.status.startsWith('halfday'))).length;
      const basicPay = totalHours * hourlyRate;
      const overtimePay = totalOvertime * overtimeRatePerHr;
      const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const grossPay = basicPay + overtimePay + totalAllowances;
      const netPay = grossPay - totalDeductions;
      
      // Create payslip data (with pre-computed totals)
      const payslipData = {
        employee: employeeId,
        year: parseInt(year),
        month: parseInt(month),
        periodId,
        periodLabel: period.label,
        startDate,
        endDate,
        workDays,
        hourlyRate,
        totalHours,
        totalOvertime,
        workingDays,
        basicPay,
        overtimePay,
        grossPay,
        totalDeductions,
        netPay,
        allowances,
        deductions,
        company: userId,
        createdBy: userId,
        status: 'draft'
      };
      
      console.log('Creating payslip data with default period:', payslipData);
      
      const payslip = await PaySlip.findOneAndUpdate(
        {
          employee: employeeId,
          year: parseInt(year),
          month: parseInt(month),
          periodId
        },
        payslipData,
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      ).populate([
        { path: 'employee', select: 'firstName middleInitial lastName idNumber designation' },
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'company', select: 'firstName lastName' }
      ]);
      
      console.log('Payslip created successfully with default period:', payslip);
      res.status(201).json(createResponse(true, 'Pay slip generated successfully', payslip));
      return; // Exit early
    }
    
    const period = periodSettings.periods.find(p => p.id === periodId);
    if (!period) {
      return res.status(404).json(createResponse(false, 'Period not found'));
    }
    
    // Calculate start and end dates for the period (UTC to avoid timezone shift)
    const startDate = new Date(Date.UTC(parseInt(year), parseInt(month), period.startDay));
    const endDate = period.endDay === 0
      ? new Date(Date.UTC(parseInt(year), parseInt(month) + 1, 1) - 1) // UTC end of month
      : new Date(Date.UTC(parseInt(year), parseInt(month), period.endDay, 23, 59, 59, 999));
    
    // Get work hours for this period
    console.log('Fetching work hours for:', { employeeId, startDate, endDate });
    const workHours = await WorkHour.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    console.log('Found work hours:', workHours.length, 'records');
    console.log('Work hours details:', workHours.map(wh => ({
      date: wh.date,
      timeIn: wh.timeIn,
      timeOut: wh.timeOut,
      totalHours: wh.totalHours,
      status: wh.status
    })));
    
    // Process work days
    const workDays = [];
    let currentDate = new Date(startDate);
    console.log('Processing work days from', startDate, 'to', endDate);
    
    while (currentDate <= endDate) {
      // Use UTC to avoid timezone-induced day shift
      const dayOfWeek = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const dateStr = currentDate.toISOString().split('T')[0];

      const workHour = workHours.find(wh =>
        wh.date.toISOString().split('T')[0] === dateStr
      );
      
      if (workHour) {
        console.log(`Found work hour for ${dateStr}:`, {
          timeIn: workHour.timeIn,
          timeOut: workHour.timeOut,
          totalHours: workHour.totalHours,
          status: workHour.status
        });
      }
      
      let status = 'present';
      let hours = 0;
      let overtime = 0;
      let timeIn = null;
      let breakTime = null;
      let resume = null;
      let timeOut = null;
      
      if (workHour) {
        status = workHour.status || 'present';
        hours = workHour.totalHours || 0;
        overtime = workHour.overtime || 0;
        timeIn = workHour.timeIn || null;
        breakTime = workHour.breakTime || null;
        resume = workHour.resume || null;
        timeOut = workHour.timeOut || null;
      } else {
        // Check if it's a weekend (use UTC day to stay consistent with UTC dates)
        const day = currentDate.getUTCDay();
        if (day === 0 || day === 6) {
          status = 'weekend';
        }
      }
      
      workDays.push({
        date: new Date(currentDate),
        dayOfWeek,
        timeIn,
        breakTime,
        resume,
        timeOut,
        hours,
        overtime,
        status
      });
      
      // Advance by 1 day in UTC
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // Use billingRate resolved from EmployeeRate collection (set via HourlyRates page)
    const hourlyRate = billingRate;
    
    // Build allowances/deductions arrays BEFORE computing totals
    const allowances = [];
    const deductions = [];

    // Add period allowances first so they're included in totals
    if (period.allowances && period.allowances.length > 0) {
      allowances.push(...period.allowances);
    }

    // Add out-of-town allowance if employee has one and worked out-of-town days
    if (outOfTownRate > 0) {
      // Count out-of-town days in the work period
      const outOfTownDays = workDays.filter(d => d.status === 'out_of_town').length;
      const totalOutOfTownAllowance = outOfTownDays * outOfTownRate;
      
      if (totalOutOfTownAllowance > 0) {
        allowances.push({
          name: 'Out of Town Allowance',
          amount: totalOutOfTownAllowance,
          type: 'allowance',
          days: outOfTownDays,
          ratePerDay: outOfTownRate
        });
        console.log(`Added out-of-town allowance: ${outOfTownDays} days × ₱${outOfTownRate} = ₱${totalOutOfTownAllowance}`);
      }
    }

    // Manually compute totals (findOneAndUpdate bypasses pre-save middleware)
    const totalHours = workDays.reduce((sum, d) => sum + (d.hours || 0), 0);
    const totalOvertime = workDays.reduce((sum, d) => sum + (d.overtime || 0), 0);
    const workingDays = workDays.filter(d => d.status === 'present' || (d.status && d.status.startsWith('halfday'))).length;
    const basicPay = totalHours * hourlyRate;
    const overtimePay = totalOvertime * overtimeRatePerHr;
    const totalAllowanceAmt = allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductionAmt = deductions.reduce((sum, d) => sum + d.amount, 0);
    const grossPay = basicPay + overtimePay + totalAllowanceAmt;
    const netPay = grossPay - totalDeductionAmt;
    
    // Create or update payslip (with pre-computed totals)
    const payslipData = {
      employee: employeeId,
      year: parseInt(year),
      month: parseInt(month),
      periodId,
      periodLabel: period.label,
      startDate,
      endDate,
      workDays,
      hourlyRate,
      totalHours,
      totalOvertime,
      workingDays,
      basicPay,
      overtimePay,
      grossPay,
      totalDeductions: totalDeductionAmt,
      netPay,
      allowances,
      deductions,
      company: userId,
      createdBy: userId,
      status: 'draft'
    };
    
    console.log('Creating payslip data:', payslipData);
    
    const payslip = await PaySlip.findOneAndUpdate(
      {
        employee: employeeId,
        year: parseInt(year),
        month: parseInt(month),
        periodId
      },
      payslipData,
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    ).populate([
      { path: 'employee', select: 'firstName middleInitial lastName idNumber designation' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'company', select: 'firstName lastName' }
    ]);
    
    console.log('Payslip created successfully:', payslip);
    res.status(201).json(createResponse(true, 'Pay slip generated successfully', payslip));
  } catch (error) {
    console.error('Error generating pay slip:', error);
    // Pass error to central error handler instead of sending raw error message
    next(error);
  }
};

// Get pay slips for an employee
const getEmployeePaySlips = async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;
    const userId = req.user?.userId;
    
    const query = { company: userId };
    
    if (employeeId) query.employee = employeeId;
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);
    
    const paySlips = await PaySlip.find(query)
      .populate('employee', 'firstName middleInitial lastName idNumber designation')
      .sort({ year: -1, month: -1, periodId: 1 });
    
    res.status(200).json(createResponse(true, 'Pay slips retrieved', paySlips));
  } catch (error) {
    console.error('Error fetching pay slips:', error);
    next(error);
  }
};

// Get specific pay slip by ID
const getPaySlipById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const paySlip = await PaySlip.findOne({
      _id: id,
      company: userId
    }).populate([
      { path: 'employee', select: 'firstName middleInitial lastName idNumber designation' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'approvedBy', select: 'firstName lastName' }
    ]);
    
    if (!paySlip) {
      return res.status(404).json(createResponse(false, 'Pay slip not found'));
    }
    
    res.status(200).json(createResponse(true, 'Pay slip retrieved', paySlip));
  } catch (error) {
    console.error('Error fetching pay slip:', error);
    next(error);
  }
};

// Update pay slip (add allowances, deductions, etc.)
const updatePaySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowances, deductions, status } = req.body;
    const userId = req.user?.userId;
    
    const updateData = {};
    if (allowances) updateData.allowances = allowances;
    if (deductions) updateData.deductions = deductions;
    if (status) {
      updateData.status = status;
      if (status === 'approved') {
        updateData.approvedBy = userId;
        updateData.approvedOn = new Date();
      }
      if (status === 'paid') {
        updateData.paidOn = new Date();
      }
    }
    
    const paySlip = await PaySlip.findOneAndUpdate(
      {
        _id: id,
        company: userId
      },
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('employee', 'firstName middleInitial lastName idNumber designation');
    
    if (!paySlip) {
      return res.status(404).json(createResponse(false, 'Pay slip not found'));
    }
    
    res.status(200).json(createResponse(true, 'Pay slip updated successfully', paySlip));
  } catch (error) {
    console.error('Error updating pay slip:', error);
    next(error);
  }
};

// Delete pay slip
const deletePaySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const paySlip = await PaySlip.findOneAndDelete({
      _id: id,
      company: userId
    });
    
    if (!paySlip) {
      return res.status(404).json(createResponse(false, 'Pay slip not found'));
    }
    
    res.status(200).json(createResponse(true, 'Pay slip deleted successfully'));
  } catch (error) {
    console.error('Error deleting pay slip:', error);
    next(error);
  }
};

module.exports = {
  generatePaySlip,
  getEmployeePaySlips,
  getPaySlipById,
  updatePaySlip,
  deletePaySlip
};
