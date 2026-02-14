const jwtConfig = require('../config/jwt');
const { formatErrorResponse } = require('../utils/responseFormatter');
const User = require('../models/userModel');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Verifies JWT tokens and authorizes users based on roles
 */
const authMiddleware = {
  /**
   * Verify JWT token and attach user to request
   */
  authenticate: async (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(
          formatErrorResponse('Access denied. No token provided.')
        );
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = jwtConfig.verifyToken(token);

      // Check if user still exists and is active
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
