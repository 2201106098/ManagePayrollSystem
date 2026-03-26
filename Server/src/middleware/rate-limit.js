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

// General API rate limiter (more lenient for development)
const apiLimiter = createRateLimiter(
  env.rateLimitWindowMs,
  env.rateLimitMaxRequests,
  'Too many requests from this IP, please try again later.'
);

// Less strict rate limiter for data endpoints (employees, rates, etc.)
const dataLimiter = createRateLimiter(
  60000, // 1 minute
  2000, // 2000 requests per minute
  'Too many data requests, please try again later.'
);

// Strict rate limiter for auth endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts (increased from 5)
  'Too many authentication attempts, please try again later.'
);

module.exports = {
  apiLimiter,
  authLimiter,
  dataLimiter
};
