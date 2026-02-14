const jwtConfig = require('../config/jwt');
const { formatErrorResponse } = require('../utils/responseFormatter');
const User = require('../models/userModel');
const logger = require('../utils/logger');

/**
 * Authentication & Authorization Middleware
 * 
 * Provides middleware functions for protecting routes and enforcing access control.
 * 
 * Authentication Flow:
 * 1. Extract token from Authorization header (Bearer scheme)
 * 2. Verify token signature and expiration
 * 3. Verify user still exists and is active
 * 4. Attach user information to request object
 * 
 * Authorization checks are role-based (student/instructor/admin).
 */
const authMiddleware = {
  /**
   * Authenticate User
   * 
   * Verifies JWT token and attaches user info to request.
   * Required for all protected routes.
   * 
   * Expected header format: Authorization: Bearer <token>
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {void} Calls next() on success, sends 401 on failure
   */
  authenticate: async (req, res, next) => {
    try {
      // Extract Authorization header
      const authHeader = req.headers.authorization;

      // Verify Bearer scheme is used
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(
          formatErrorResponse('Access denied. No token provided.')
        );
      }

      // Extract token (remove 'Bearer ' prefix)
      const token = authHeader.substring(7);

      // Verify token signature and expiration
      const decoded = jwtConfig.verifyToken(token);

      // Security check: ensure user still exists and account is active
      // (handles cases where user was deleted or deactivated after token was issued)
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json(
          formatErrorResponse('User not found or inactive')
        );
      }

      // Attach user info to request
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      return res.status(401).json(
        formatErrorResponse('Invalid or expired token')
      );
    }
  },

  /**
   * Authorize based on user roles
   * @param {...String} allowedRoles - Roles that are allowed to access the route
   */
  authorize: (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json(
          formatErrorResponse('Authentication required')
        );
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json(
          formatErrorResponse('Access denied. Insufficient permissions.')
        );
      }

      next();
    };
  },

  /**
   * Optional authentication - attaches user if token is valid but doesn't require it
   */
  optionalAuth: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwtConfig.verifyToken(token);
        
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication - token was invalid but that's ok
      next();
    }
  },

  /**
   * Check if user owns the resource or is an admin
   */
  checkOwnership: (req, res, next) => {
    const resourceUserId = req.params.userId || req.params.id;
    
    if (req.user.role === 'admin' || req.user.id.toString() === resourceUserId) {
      return next();
    }

    return res.status(403).json(
      formatErrorResponse('Access denied. You can only access your own resources.')
    );
  },
};

module.exports = authMiddleware;
