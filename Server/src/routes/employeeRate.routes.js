const express = require('express');
const router = express.Router();
const employeeRateController = require('../controllers/employeeRate.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateEmployeeRate } = require('../middleware/validation.middleware');
const { dataLimiter } = require('../middleware/rate-limit');

// Apply authentication to all routes
router.use(authenticate);

// Apply data rate limiter to all employee-rates routes
router.use(dataLimiter);

// GET /api/employee-rates - Get all employee rates with pagination and filtering
router.get('/', employeeRateController.getAllEmployeeRates);

// GET /api/employee-rates/statistics - Get employee rate statistics
router.get('/statistics', authorize(['admin', 'hr']), employeeRateController.getEmployeeRateStatistics);

// GET /api/employee-rates/employee/:employeeId - Get employee rate by employee ID
router.get('/employee/:employeeId', employeeRateController.getEmployeeRateByEmployeeId);

// GET /api/employee-rates/:id - Get employee rate by ID
router.get('/:id', employeeRateController.getEmployeeRateById);

// POST /api/employee-rates - Create or update employee rate (admin/hr only)
router.post('/', 
  authorize(['admin', 'hr']), 
  validateEmployeeRate, 
  employeeRateController.createOrUpdateEmployeeRate
);

// PUT /api/employee-rates/:id - Update employee rate (admin/hr only)
router.put('/:id', 
  authorize(['admin', 'hr']), 
  validateEmployeeRate, 
  employeeRateController.createOrUpdateEmployeeRate
);

// DELETE /api/employee-rates/:id - Delete employee rate (admin only)
router.delete('/:id', 
  authorize(['admin']), 
  employeeRateController.deleteEmployeeRate
);

module.exports = router;
