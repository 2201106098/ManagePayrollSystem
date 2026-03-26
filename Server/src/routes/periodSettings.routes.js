const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const {
  getPeriodSettings,
  savePeriodSettings,
  getAllPeriodSettings,
  deletePeriodSettings
} = require('../controllers/periodSettings.controller');

// Get period settings for specific month/year
router.get('/', authenticate, getPeriodSettings);

// Get all period settings for a user
router.get('/all', authenticate, getAllPeriodSettings);

// Save or update period settings
router.post('/', authenticate, savePeriodSettings);

// Delete period settings for specific month/year
router.delete('/:year/:month', authenticate, deletePeriodSettings);

module.exports = router;
