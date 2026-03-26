const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateUser, validateLogin } = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rate-limit');

router.post('/register', authLimiter, validateUser, authController.register);
router.post('/login', authLimiter, validateLogin, (req, res, next) => {
  console.log('Login request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  next();
}, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);

module.exports = router;
