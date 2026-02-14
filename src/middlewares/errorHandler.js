const logger = require('../utils/logger');
const { formatErrorResponse } = require('../utils/responseFormatter');

/**
 * Global Error Handler Middleware
 * Catches and formats errors consistently
 */

/**
 * Handle 404 - Not Found
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * General error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Set status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Handle specific error types
  let message = err.message;
  let errors = null;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    
    return res.status(400).json(
      formatErrorResponse('Validation failed', validationErrors)
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    
    return res.status(409).json(
      formatErrorResponse(message, [
        { field, message: `This ${field} is already in use` },
      ])
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    message = 'Invalid ID format';
    return res.status(400).json(formatErrorResponse(message));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(formatErrorResponse('Invalid token'));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(formatErrorResponse('Token expired'));
  }

  // Default error response
  res.status(statusCode).json(
    formatErrorResponse(
      message,
      errors,
      process.env.NODE_ENV === 'development' ? err.stack : undefined
    )
  );
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
};
