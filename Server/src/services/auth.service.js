const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const env = require('../config/env');
const logger = require('../utils/logger');

const generateAccessToken = (userId) => {
  return jwt.sign({ userId, type: 'access' }, env.jwtSecret, {
    expiresIn: env.jwtExpire || '7d' // Use environment variable or default to 7 days
  });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const getRefreshTokenExpiry = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
};

// Helper function to convert environment variable to seconds
const getExpiresInSeconds = () => {
  const expireValue = env.jwtExpire || '7d';
  
  // Parse the time value (e.g., '7d', '24h', '60m')
  const match = expireValue.match(/^(\d+)([dhm])$/);
  if (!match) {
    // Default to 7 days if format is invalid
    return 7 * 24 * 60 * 60;
  }
  
  const [, amount, unit] = match;
  switch (unit) {
    case 'd': return parseInt(amount) * 24 * 60 * 60; // days to seconds
    case 'h': return parseInt(amount) * 60 * 60;      // hours to seconds  
    case 'm': return parseInt(amount) * 60;           // minutes to seconds
    default: return 7 * 24 * 60 * 60;                 // default to 7 days
  }
};

const register = async ({ email, password, firstName, lastName }) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logger.info(`New user registered: ${email}`);

    return {
      user: user.toJSON(),
      token
    };
  } catch (error) {
    logger.error('Registration service error:', error);
    throw error;
  }
};

const login = async ({ email, password }) => {
  try {
    logger.info('Auth service login attempt:', { email });
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.info('User not found:', { email });
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    logger.info('Password validation:', { email, isValid: isPasswordValid });
    if (!isPasswordValid) {
      logger.info('Password validation failed:', { email });
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Add refresh token to user (token rotation)
    await user.addRefreshToken(refreshToken, refreshTokenExpiry);

    logger.info(`User logged in: ${email}`);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      expiresIn: getExpiresInSeconds() // Dynamic based on environment variable
    };
  } catch (error) {
    logger.error('Login service error:', error);
    throw error;
  }
};

const refreshToken = async (refreshToken) => {
  try {
    // Find user with this refresh token
    const users = await User.find({ 'refreshTokens.token': refreshToken });
    const user = users.find(u => u.findValidRefreshToken(refreshToken));
    
    if (!user) {
      throw new Error('Invalid refresh token');
    }

    // Remove old refresh token (token rotation)
    await user.removeRefreshToken(refreshToken);

    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Add new refresh token
    await user.addRefreshToken(newRefreshToken, refreshTokenExpiry);

    logger.info(`Token refreshed for user: ${user.email}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: getExpiresInSeconds() // Dynamic based on environment variable
    };
  } catch (error) {
    logger.error('Token refresh service error:', error);
    throw error;
  }
};

const logout = async (refreshToken) => {
  try {
    // Find user and remove the specific refresh token
    const users = await User.find({ 'refreshTokens.token': refreshToken });
    const user = users.find(u => u.findValidRefreshToken(refreshToken));
    
    if (user) {
      await user.removeRefreshToken(refreshToken);
      logger.info(`User logged out: ${user.email}`);
    }
  } catch (error) {
    logger.error('Logout service error:', error);
    throw error;
  }
};

const logoutAll = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      await user.revokeAllRefreshTokens();
      logger.info(`User logged out from all devices: ${user.email}`);
    }
  } catch (error) {
    logger.error('Logout all service error:', error);
    throw error;
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  generateAccessToken,
  generateRefreshToken
};
