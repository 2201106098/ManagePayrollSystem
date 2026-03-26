const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rate-limit');
const logger = require('./utils/logger');
const env = require('./config/env');

// Create Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting
app.use(apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware
app.use(cookieParser());

// Request logging with sensitive data redaction
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = [
    'password', 'token', 'authorization', 'cookie', 'session',
    'secret', 'key', 'accessToken', 'refreshToken', 'jwt',
    'bearer', 'auth', 'credentials', 'x-auth-token',
    'x-access-token', 'x-api-key'
  ];
  
  const redacted = { ...obj };
  
  const redactValue = (value) => {
    if (typeof value === 'string' && value.length > 0) {
      return '[REDACTED]';
    }
    return '[REDACTED]';
  };
  
  // Redact sensitive fields in the object
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = redactValue(redacted[field]);
    }
  }
  
  // Redact nested objects that might contain sensitive data
  if (redacted.headers) {
    redacted.headers = redactSensitiveData(redacted.headers);
  }
  
  return redacted;
};

app.use((req, res, next) => {
  // Create safe copies for logging
  const safeHeaders = redactSensitiveData(req.headers);
  const safeBody = redactSensitiveData(req.body);
  
  console.log('=== REQUEST LOG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', safeHeaders);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Body:', safeBody);
  console.log('==================');
  
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    body: safeBody,
    headers: safeHeaders
  });
  next();
});

// API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
