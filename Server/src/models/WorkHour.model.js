const mongoose = require('mongoose');

const workHourSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeIn: {
    type: String,
    default: ''
  },
  breakTime: {
    type: String,
    default: ''
  },
  resume: {
    type: String,
    default: ''
  },
  timeOut: {
    type: String,
    default: ''
  },
  overtime: {
    type: Number,
    default: 0.00,
    min: 0
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'halfday_morning', 'halfday_afternoon', 'out_of_town'],
    default: 'present'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
workHourSchema.index({ employee: 1, date: 1 }, { unique: true });
workHourSchema.index({ date: 1 });
workHourSchema.index({ status: 1 });

// Virtual for formatted date
workHourSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Method to calculate total hours
workHourSchema.methods.calculateTotalHours = function() {
  if (!this.timeIn || !this.timeOut) {
    this.totalHours = 0;
    return 0;
  }

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  let totalMinutes = timeToMinutes(this.timeOut) - timeToMinutes(this.timeIn);
  
  // Subtract break time if exists
  if (this.breakTime && this.resume) {
    totalMinutes -= timeToMinutes(this.resume) - timeToMinutes(this.breakTime);
  }

  this.totalHours = Math.max(0, totalMinutes / 60);
  return this.totalHours;
};

// Pre-save middleware to calculate total hours
workHourSchema.pre('save', function(next) {
  this.calculateTotalHours();
  next();
});

// Transform for JSON output
workHourSchema.methods.toJSON = function() {
  const workHourObject = this.toObject();
  workHourObject.id = workHourObject._id;
  delete workHourObject._id;
  delete workHourObject.__v;
  return workHourObject;
};

module.exports = mongoose.model('WorkHour', workHourSchema);
