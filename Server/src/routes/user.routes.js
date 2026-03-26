const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateUser } = require('../middleware/validation.middleware');

// All user routes require authentication
router.use(authenticate);

router.get('/:id', userController.getUser);
router.put('/:id', validateUser, userController.updateUser);
router.delete('/:id', authorize('admin', 'hr'), userController.deleteUser);

module.exports = router;
