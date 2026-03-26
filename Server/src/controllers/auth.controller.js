const authService = require('../services/auth.service');
const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    const result = await authService.register({ email, password, firstName, lastName });
    
    res.status(201).json(createResponse(true, 'User registered successfully', result));
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    logger.info('Login attempt:', { email, body: req.body });
    
    const result = await authService.login({ email, password });
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Remove refresh token from response body for security
    const { refreshToken, ...responseWithoutRefreshToken } = result;
    
    res.json(createResponse(true, 'Login successful', responseWithoutRefreshToken));
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json(createResponse(false, 'No refresh token provided'));
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    // Set new refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Remove refresh token from response body for security
    const { refreshToken: newRefreshToken, ...responseWithoutRefreshToken } = result;
    
    res.json(createResponse(true, 'Token refreshed successfully', responseWithoutRefreshToken));
  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json(createResponse(true, 'Logout successful'));
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (userId) {
      await authService.logoutAll(userId);
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json(createResponse(true, 'Logged out from all devices successfully'));
  } catch (error) {
    logger.error('Logout all error:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll
};
