const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const employeeRoutes = require('./employee.routes');
const employeeRateRoutes = require('./employeeRate.routes');
const workHourRoutes = require('./workHour.routes');
const periodSettingsRoutes = require('./periodSettings.routes');
const paySlipRoutes = require('./paySlip.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/employee-rates', employeeRateRoutes);
router.use('/work-hours', workHourRoutes);
router.use('/period-settings', periodSettingsRoutes);
router.use('/pay-slips', paySlipRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
