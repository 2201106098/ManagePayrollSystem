const mongoose = require('mongoose');

const employeeRateSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  billingRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  overtimeRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  outOfTownRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  cashAdvanceLimit: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
employeeRateSchema.index({ employee: 1 });
employeeRateSchema.index({ lastUpdated: -1 });

// Pre-save middleware to update lastUpdated
employeeRateSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Transform for JSON output
employeeRateSchema.methods.toJSON = function() {
  const rateObject = this.toObject();
  return rateObject;
};

module.exports = mongoose.model('EmployeeRate', employeeRateSchema);
