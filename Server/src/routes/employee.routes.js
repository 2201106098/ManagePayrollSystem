const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateEmployee } = require('../middleware/validation.middleware');
const { dataLimiter } = require('../middleware/rate-limit');

// Apply authentication to all routes
router.use(authenticate);

// Apply data rate limiter to all employee routes
router.use(dataLimiter);

// GET /api/employees - Get all employees with pagination and filtering
router.get('/', employeeController.getAllEmployees);

// GET /api/employees/stats - Get employee statistics
router.get('/stats', employeeController.getEmployeeStats);

// GET /api/employees/:id - Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// POST /api/employees - Create new employee (admin/hr only)
router.post('/', 
  authorize(['admin', 'hr']), 
  validateEmployee, 
  employeeController.createEmployee
);

// PUT /api/employees/:id - Update employee (admin/hr only)
router.put('/:id', 
  authorize(['admin', 'hr']), 
  validateEmployee, 
  employeeController.updateEmployee
);

// PATCH /api/employees/:id/archive - Archive/unarchive employee (admin/hr only)
router.patch('/:id/archive', 
  authorize(['admin', 'hr']), 
  employeeController.archiveEmployee
);

// DELETE /api/employees/:id - Delete employee (admin only)
router.delete('/:id', 
  authorize(['admin']), 
  employeeController.deleteEmployee
);

module.exports = router;
