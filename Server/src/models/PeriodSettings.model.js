const mongoose = require('mongoose');

const periodSettingsSchema = new mongoose.Schema({
  // Company/organization identifier
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the user who created these settings
    required: true
  },
  
  // Year and month these settings apply to
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
  
  // Array of pay periods for this month
  periods: [{
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    startDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31
    },
    endDay: {
      type: Number,
      required: true,
      min: 0,
      max: 31 // 0 means end of month
    },
    payday: {
      type: Number,
      required: true,
      min: 0,
      max: 31 // 0 means end of period
    },
    color: {
      type: String,
      required: true
    },
    // Additional settings for each period
    payNextMonth: {
      type: Boolean,
      default: false
    },
    workingDays: {
      type: Number,
      default: 0 // Will be calculated
    }
  }],
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique settings per company per month/year
periodSettingsSchema.index({ company: 1, year: 1, month: 1 }, { unique: true });

// Pre-save middleware to calculate working days
periodSettingsSchema.pre('save', function(next) {
  // Calculate working days for each period
  this.periods.forEach(period => {
    const start = new Date(this.year, this.month, period.startDay);
    const end = period.endDay === 0 
      ? new Date(this.year, this.month + 1, 0) // End of month
      : new Date(this.year, this.month, period.endDay);
    
    // Simple working days calculation (Mon-Fri)
    let workingDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    period.workingDays = workingDays;
  });
  
  next();
});

const PeriodSettings = mongoose.model('PeriodSettings', periodSettingsSchema);

module.exports = PeriodSettings;
