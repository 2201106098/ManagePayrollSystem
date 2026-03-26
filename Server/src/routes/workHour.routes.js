const express = require('express');
const router = express.Router();
const workHourController = require('../controllers/workHour.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get work hours with filtering and pagination
router.get('/', workHourController.getWorkHours);

// Get work hours for all employees on a specific date
router.get('/date/:date', workHourController.getWorkHoursByDate);

// Create or update single work hour
router.post('/', workHourController.createOrUpdateWorkHour);

// Bulk update work hours for multiple employees
router.put('/bulk', workHourController.bulkUpdateWorkHours);

// Mark employee as absent
router.post('/absent', workHourController.markAbsent);

// Mark employee as half day
router.post('/halfday', workHourController.markHalfDay);

// Get work hour templates
router.get('/templates', workHourController.getWorkHourTemplates);

// Save work hour template
router.post('/templates', workHourController.saveWorkHourTemplate);

module.exports = router;
