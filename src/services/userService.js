const User = require('../models/userModel');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

/**
 * User Service Layer
 * 
 * Contains all business logic for user management operations.
 * Separates business logic from HTTP concerns (handled by controllers).
 * 
 * Responsibilities:
 * - Database operations (CRUD)
 * - Business rule enforcement
 * - Token generation and validation
 * - Password management
 * - User authentication logic
 * 
 * All methods throw errors that are caught and formatted by controllers.
 */
const userService = {
  /**
   * Register a New User
   * 
   * Creates a new user account with proper validation and token generation.
   * 
   * Process:
   * 1. Check for existing email/username (prevent duplicates)
   * 2. Create user document (password auto-hashed by pre-save hook)
   * 3. Generate access and refresh tokens
   * 4. Save refresh token to user document
   * 5. Return sanitized user data with tokens
   * 
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Unique username
   * @param {string} userData.email - Unique email address
   * @param {string} userData.password - Plain text password (will be hashed)
   * @param {string} [userData.role] - User role (defaults to 'student')
   * @returns {Promise<Object>} User data and authentication tokens
   * @throws {Error} If email or username already exists
   */
  registerUser: async (userData) => {
    try {
      // Check for duplicate email or username in a single query
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, { username: userData.username }],
      });

      // Provide specific error messages for better UX
      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new Error('Email already registered');
        }
        if (existingUser.username === userData.username) {
          throw new Error('Username already taken');
        }
      }

      // Create new user (password will be hashed by pre-save middleware)
      const user = new User(userData);
      await user.save();

      // Generate JWT tokens for immediate login
      const accessToken = jwtConfig.generateAccessToken({
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = jwtConfig.generateRefreshToken({
        userId: user._id,
      });

      // Save refresh token to user
      user.refreshToken = refreshToken;
      await user.save();

      return {
        user: user.toAuthJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`User registration error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Login user
   * @param {String} email - User email
   * @param {String} password - User password
   * @returns {Object} User data and tokens
   */
  loginUser: async (email, password) => {
    try {
      // Find user by credentials
      const user = await User.findByCredentials(email, password);

      // Update last login
      user.lastLogin = new Date();

      // Generate tokens
      const accessToken = jwtConfig.generateAccessToken({
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = jwtConfig.generateRefreshToken({
        userId: user._id,
      });

      // Save refresh token
      user.refreshToken = refreshToken;
      await user.save();

      return {
        user: user.toAuthJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`User login error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get user by ID
   * @param {String} userId - User ID
   * @returns {Object} User data
   */
  getUserById: async (userId) => {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error(`Get user error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update user
   * @param {String} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated user data
   */
  updateUser: async (userId, updates) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error(`Update user error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Change user password
   * @param {String} userId - User ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   */
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return true;
    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete user (soft delete - set isActive to false)
   * @param {String} userId - User ID
   */
  deleteUser: async (userId) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false, refreshToken: null },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return true;
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get all users with pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Pagination options
   * @returns {Object} Users list and pagination data
   */
  getAllUsers: async (filters = {}, options = { page: 1, limit: 10 }) => {
    try {
      const { page, limit } = options;
      const skip = (page - 1) * limit;

      const users = await User.find(filters)
        .select('-refreshToken')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(filters);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Refresh access token
   * @param {String} refreshToken - Refresh token
   * @returns {Object} New access token
   */
  refreshAccessToken: async (refreshToken) => {
    try {
      // Verify refresh token
      const decoded = jwtConfig.verifyToken(refreshToken);

      // Find user with this refresh token
      const user = await User.findOne({
        _id: decoded.userId,
        refreshToken: refreshToken,
        isActive: true,
      });

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = jwtConfig.generateAccessToken({
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      return {
        accessToken,
      };
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Logout user
   * @param {String} userId - User ID
   */
  logoutUser: async (userId) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { refreshToken: null },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return true;
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      throw error;
    }
  },
};

module.exports = userService;
