const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const {
  generatePaySlip,
  getEmployeePaySlips,
  getPaySlipById,
  updatePaySlip,
  deletePaySlip
} = require('../controllers/paySlip.controller');

// Generate new pay slip
router.post('/generate', authenticate, generatePaySlip);

// Get pay slips (with optional filters)
router.get('/', authenticate, getEmployeePaySlips);

// Get specific pay slip by ID
router.get('/:id', authenticate, getPaySlipById);

// Update pay slip (allowances, deductions, status)
router.put('/:id', authenticate, updatePaySlip);

// Delete pay slip
router.delete('/:id', authenticate, deletePaySlip);

module.exports = router;
