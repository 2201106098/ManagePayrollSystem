const logger = require('../utils/logger');
const { createResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(createResponse(false, 'Validation Error', { errors }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json(createResponse(false, `${field} already exists`));
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(createResponse(false, 'Invalid token'));
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(createResponse(false, message));
};

module.exports = errorHandler;
