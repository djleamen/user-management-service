const userService = require('../services/userService');
const { formatSuccessResponse, formatErrorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * User Controller
 * Handles HTTP requests for user-related operations
 */
const userController = {
  /**
   * Register a new user
   * @route POST /api/users/register
   */
  register: async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, role } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json(
          formatErrorResponse('Username, email, and password are required')
        );
      }

      const result = await userService.registerUser({
        username,
        email,
        password,
        firstName,
        lastName,
        role,
      });

      logger.info(`User registered successfully: ${email}`);
      return res.status(201).json(
        formatSuccessResponse(result, 'User registered successfully')
      );
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      return res.status(400).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Login user
   * @route POST /api/users/login
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json(
          formatErrorResponse('Email and password are required')
        );
      }

      const result = await userService.loginUser(email, password);

      logger.info(`User logged in: ${email}`);
      return res.status(200).json(
        formatSuccessResponse(result, 'Login successful')
      );
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      return res.status(401).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Get user profile
   * @route GET /api/users/profile
   */
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json(formatErrorResponse('User not found'));
      }

      return res.status(200).json(
        formatSuccessResponse(user, 'Profile retrieved successfully')
      );
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`);
      return res.status(500).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Update user profile
   * @route PUT /api/users/profile
   */
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Prevent updating sensitive fields
      delete updates.password;
      delete updates.email;
      delete updates.role;
      delete updates.refreshToken;

      const updatedUser = await userService.updateUser(userId, updates);

      logger.info(`User profile updated: ${userId}`);
      return res.status(200).json(
        formatSuccessResponse(updatedUser, 'Profile updated successfully')
      );
    } catch (error) {
      logger.error(`Update profile error: ${error.message}`);
      return res.status(400).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Change password
   * @route PUT /api/users/change-password
   */
  changePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json(
          formatErrorResponse('Current password and new password are required')
        );
      }

      await userService.changePassword(userId, currentPassword, newPassword);

      logger.info(`Password changed for user: ${userId}`);
      return res.status(200).json(
        formatSuccessResponse(null, 'Password changed successfully')
      );
    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      return res.status(400).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Delete user account
   * @route DELETE /api/users/profile
   */
  deleteAccount: async (req, res) => {
    try {
      const userId = req.user.id;
      await userService.deleteUser(userId);

      logger.info(`User account deleted: ${userId}`);
      return res.status(200).json(
        formatSuccessResponse(null, 'Account deleted successfully')
      );
    } catch (error) {
      logger.error(`Delete account error: ${error.message}`);
      return res.status(400).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Get all users (admin only)
   * @route GET /api/users
   */
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, role, isActive } = req.query;
      
      const filters = {};
      if (role) filters.role = role;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const result = await userService.getAllUsers(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json(
        formatSuccessResponse(result, 'Users retrieved successfully')
      );
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`);
      return res.status(500).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Get user by ID (admin only)
   * @route GET /api/users/:id
   */
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      if (!user) {
        return res.status(404).json(formatErrorResponse('User not found'));
      }

      return res.status(200).json(
        formatSuccessResponse(user, 'User retrieved successfully')
      );
    } catch (error) {
      logger.error(`Get user by ID error: ${error.message}`);
      return res.status(500).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Refresh access token
   * @route POST /api/users/refresh-token
   */
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json(
          formatErrorResponse('Refresh token is required')
        );
      }

      const result = await userService.refreshAccessToken(refreshToken);

      return res.status(200).json(
        formatSuccessResponse(result, 'Token refreshed successfully')
      );
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);
      return res.status(401).json(formatErrorResponse(error.message));
    }
  },

  /**
   * Logout user
   * @route POST /api/users/logout
   */
  logout: async (req, res) => {
    try {
      const userId = req.user.id;
      await userService.logoutUser(userId);

      logger.info(`User logged out: ${userId}`);
      return res.status(200).json(
        formatSuccessResponse(null, 'Logout successful')
      );
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      return res.status(500).json(formatErrorResponse(error.message));
    }
  },
};

module.exports = userController;
