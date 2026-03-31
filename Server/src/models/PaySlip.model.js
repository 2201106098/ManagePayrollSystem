const mongoose = require('mongoose');

const paySlipSchema = new mongoose.Schema({
  // Employee reference
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  
  // Period information
  year: {
    type: Number,
    required: true
  },
  
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  
  periodId: {
    type: String,
    required: true // e.g., "P1", "P2"
  },
  
  periodLabel: {
    type: String,
    required: true // e.g., "First Half", "Second Half"
  },
  
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  submittedOn: {
    type: Date,
    default: Date.now
  },
  
  // Work hours breakdown
  workDays: [{
    date: Date,
    dayOfWeek: String,
    timeIn: {
      type: String,
      default: null
    },
    breakTime: {
      type: String, 
      default: null
    },
    resume: {
      type: String,
      default: null
    },
    timeOut: {
      type: String,
      default: null
    },
    hours: {
      type: Number,
      default: 0
    },
    overtime: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'halfday_morning', 'halfday_afternoon', 'weekend', 'out_of_town'],
      default: 'present'
    }
  }],
  
  // Calculations
  totalHours: {
    type: Number,
    default: 0
  },
  
  totalOvertime: {
    type: Number,
    default: 0
  },
  
  workingDays: {
    type: Number,
    default: 0
  },
  
  // Financial details
  hourlyRate: {
    type: Number,
    required: true
  },
  
  basicPay: {
    type: Number,
    default: 0
  },
  
  overtimePay: {
    type: Number,
    default: 0
  },
  
  allowances: [{
    type: {
      type: String,
      required: true // e.g., 'out_of_town', 'meal', 'transport'
    },
    amount: {
      type: Number,
      required: true
    },
    description: String
  }],
  
  deductions: [{
    type: {
      type: String,
      required: true // e.g., 'cash_advance', 'sss', 'philhealth'
    },
    amount: {
      type: Number,
      required: true
    },
    description: String
  }],
  
  grossPay: {
    type: Number,
    default: 0
  },
  
  totalDeductions: {
    type: Number,
    default: 0
  },
  
  netPay: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'paid'],
    default: 'draft'
  },
  
  // Metadata
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedOn: Date,
  
  paidOn: Date,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique payslip per employee per period
paySlipSchema.index({ employee: 1, year: 1, month: 1, periodId: 1 }, { unique: true });

// Pre-save middleware to calculate totals
paySlipSchema.pre('save', function(next) {
  // Calculate total hours and overtime
  this.totalHours = this.workDays.reduce((sum, day) => sum + (day.hours || 0), 0);
  this.totalOvertime = this.workDays.reduce((sum, day) => sum + (day.overtime || 0), 0);
  
  // Calculate working days (present + half-day)
  this.workingDays = this.workDays.filter(day => 
    day.status === 'present' || day.status.startsWith('halfday')
  ).length;
  
  // Calculate financial amounts
  this.basicPay = this.totalHours * this.hourlyRate;
  this.overtimePay = this.totalOvertime * (this.hourlyRate * 1.25); // 1.25x for overtime
  
  // Calculate allowances total
  const totalAllowances = this.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  
  // Calculate deductions total
  const totalDeductions = this.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  
  // Calculate gross and net pay
  this.grossPay = this.basicPay + this.overtimePay + totalAllowances;
  this.totalDeductions = totalDeductions;
  this.netPay = this.grossPay - totalDeductions;
  
  next();
});

const PaySlip = mongoose.model('PaySlip', paySlipSchema);

module.exports = PaySlip;
