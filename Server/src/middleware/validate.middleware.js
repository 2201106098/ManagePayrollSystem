const Joi = require('joi');
const { createResponse } = require('../utils/response');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      stripUnknown: true, // Remove unknown fields to prevent mass assignment
      abortEarly: false  // Return all validation errors
    });
    
    if (error) {
      const errorMessage = error.details[0].message;
      return res.status(400).json(createResponse(false, 'Validation Error', { error: errorMessage }));
    }
    
    // Replace req.body with the validated and sanitized data
    req.body = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email()
  })
};

module.exports = {
  validate,
  schemas
};
