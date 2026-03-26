const Joi = require('joi');

const employeeSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s-']+$/)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.max': 'First name must be less than 50 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s-']+$/)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.max': 'Last name must be less than 50 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  middleInitial: Joi.string()
    .trim()
    .max(1)
    .pattern(/^[a-zA-Z]$/)
    .optional()
    .messages({
      'string.max': 'Middle initial must be at most 1 character',
      'string.pattern.base': 'Middle initial must be a single letter'
    }),
  
  email: Joi.string()
    .trim()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  idNumber: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.empty': 'ID number is required',
      'string.min': 'ID number must be at least 3 characters',
      'string.max': 'ID number must be less than 50 characters'
    }),
  
  designation: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Designation is required',
      'string.max': 'Designation must be less than 100 characters'
    }),
  
  department: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Department must be less than 100 characters'
    }),
  
  basicRate: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Basic rate must be a number',
      'number.min': 'Basic rate must be greater than or equal to 0'
    }),
  
  hourlyRate: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Hourly rate must be a number',
      'number.min': 'Hourly rate must be greater than or equal to 0'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive', 'terminated')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, terminated'
    })
});

const userSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.max': 'First name must be less than 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.max': 'Last name must be less than 50 characters'
    }),
  
  email: Joi.string()
    .trim()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid('admin', 'hr', 'employee')
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, hr, employee'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

const employeeRateSchema = Joi.object({
  employee: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid employee ID format',
      'any.required': 'Employee is required'
    }),
  
  billingRate: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Billing rate must be a number',
      'number.min': 'Billing rate must be greater than or equal to 0',
      'any.required': 'Billing rate is required'
    }),
  
  overtimeRate: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Overtime rate must be a number',
      'number.min': 'Overtime rate must be greater than or equal to 0',
      'any.required': 'Overtime rate is required'
    }),
  
  outOfTownRate: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Out-of-town rate must be a number',
      'number.min': 'Out-of-town rate must be greater than or equal to 0',
      'any.required': 'Out-of-town rate is required'
    }),
  
  cashAdvanceLimit: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Cash advance limit must be a number',
      'number.min': 'Cash advance limit must be greater than or equal to 0',
      'any.required': 'Cash advance limit is required'
    })
});

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req[source] = value; // Use validated and cleaned data
    next();
  };
};

module.exports = {
  validateEmployee: validate(employeeSchema),
  validateUser: validate(userSchema),
  validateLogin: validate(loginSchema),
  validateEmployeeRate: validate(employeeRateSchema),
  validate
};
