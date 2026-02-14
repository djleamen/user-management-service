/**
 * Response Formatter Utility
 * Provides consistent API response structure
 */

/**
 * Format success response
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @returns {Object} Formatted success response
 */
const formatSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Format error response
 * @param {String} message - Error message
 * @param {Array} errors - Array of error details
 * @param {String} stack - Error stack trace (development only)
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (message = 'An error occurred', errors = null, stack = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  if (stack && process.env.NODE_ENV === 'development') {
    response.stack = stack;
  }

  return response;
};

/**
 * Format paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {String} message - Success message
 * @returns {Object} Formatted paginated response
 */
const formatPaginatedResponse = (data, pagination, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems || pagination.totalUsers,
      itemsPerPage: data.length,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
    },
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  formatSuccessResponse,
  formatErrorResponse,
  formatPaginatedResponse,
};
