const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { createResponse } = require('../utils/response');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: createResponse(false, message),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(createResponse(false, message));
    }
  });
};

// General API rate limiter
const apiLimiter = createRateLimiter(
  env.rateLimitWindowMs,
  env.rateLimitMaxRequests,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for auth endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later.'
);

module.exports = {
  apiLimiter,
  authLimiter
};
