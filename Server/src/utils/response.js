/**
 * Standard API response wrapper
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - Response message
 * @param {any} data - Response data (optional)
 * @param {object} meta - Additional metadata (optional)
 * @returns {object} Standardized response object
 */
const createResponse = (success, message, data = null, meta = {}) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
};

/**
 * Success response helper
 */
const successResponse = (message, data = null, meta = {}) => {
  return createResponse(true, message, data, meta);
};

/**
 * Error response helper
 */
const errorResponse = (message, errors = null) => {
  return createResponse(false, message, null, { errors });
};

/**
 * Paginated response helper
 */
const paginatedResponse = (message, data, pagination) => {
  return createResponse(true, message, data, {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit)
    }
  });
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  paginatedResponse
};
