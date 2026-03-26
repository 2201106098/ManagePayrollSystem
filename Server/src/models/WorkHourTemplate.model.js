const mongoose = require('mongoose');

const workHourTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // null means global template
  },
  timeIn: {
    type: String,
    required: true,
    default: '08:30'
  },
  breakTime: {
    type: String,
    default: '12:00'
  },
  resume: {
    type: String,
    default: '13:00'
  },
  timeOut: {
    type: String,
    required: true,
    default: '17:30'
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableDays: {
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null // null means no end date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
workHourTemplateSchema.index({ employee: 1, isActive: 1 });
workHourTemplateSchema.index({ isGlobal: 1, isActive: 1 });
workHourTemplateSchema.index({ createdBy: 1 });

// Virtual to check if template is currently valid
workHourTemplateSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return this.isActive;
});

// Method to check if template applies to a specific date
workHourTemplateSchema.methods.appliesToDate = function(date) {
  const dayOfWeek = date.toLocaleLowerCase('en-US', { weekday: 'long' });
  
  if (!this.applicableDays.includes(dayOfWeek)) {
    return false;
  }
  
  if (this.startDate && date < this.startDate) {
    return false;
  }
  
  if (this.endDate && date > this.endDate) {
    return false;
  }
  
  return this.isActive;
};

// Transform for JSON output
workHourTemplateSchema.methods.toJSON = function() {
  const templateObject = this.toObject();
  templateObject.id = templateObject._id;
  delete templateObject._id;
  delete templateObject.__v;
  return templateObject;
};

module.exports = mongoose.model('WorkHourTemplate', workHourTemplateSchema);
