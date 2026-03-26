const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  middleInitial: {
    type: String,
    trim: true,
    maxlength: 1,
    uppercase: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  idNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  designation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  basicRate: {
    type: Number,
    min: 0,
    default: 0
  },
  hourlyRate: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
employeeSchema.index({ idNumber: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ isArchived: 1 });
employeeSchema.index({ status: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  const parts = [this.firstName];
  if (this.middleInitial) parts.push(this.middleInitial + '.');
  parts.push(this.lastName);
  return parts.join(' ');
});

// Virtual for display name (same as fullName for now)
employeeSchema.virtual('displayName').get(function() {
  return this.fullName;
});


// Transform for JSON output
employeeSchema.methods.toJSON = function() {
  const employeeObject = this.toObject();
  employeeObject.name = employeeObject.fullName; // Add name field for frontend compatibility
  return employeeObject;
};

module.exports = mongoose.model('Employee', employeeSchema);
