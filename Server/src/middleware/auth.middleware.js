const jwt = require('jsonwebtoken');
const { createResponse } = require('../utils/response');
const env = require('../config/env');
const User = require('../models/User.model');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createResponse(false, 'Access token required'));
  }

  jwt.verify(token, env.jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(403).json(createResponse(false, 'Invalid or expired token'));
    }
    
    // Ensure it's an access token
    if (decoded.type !== 'access') {
      return res.status(403).json(createResponse(false, 'Invalid token type'));
    }
    
    try {
      // Fetch user from database to get current role and other info
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (!user || !user.isActive) {
        return res.status(403).json(createResponse(false, 'User not found or inactive'));
      }
      
      // Set user info with role for authorization
      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };
      
      next();
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return res.status(500).json(createResponse(false, 'Authentication error'));
    }
  });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Handle the case where roles might be nested in an array
    const requiredRoles = roles.length === 1 && Array.isArray(roles[0]) ? roles[0] : roles;
    
    if (!req.user) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }

    if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
      return res.status(403).json(createResponse(false, 'Insufficient permissions'));
    }

    next();
  };
};

module.exports = {
  authenticate: authenticateToken,
  authorize
};
