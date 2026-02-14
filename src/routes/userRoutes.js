const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize, checkOwnership } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * User Routes
 * 
 * Defines all user-related API endpoints with proper authentication
 * and authorization middleware.
 * 
 * Route Organization:
 * 1. Public routes (no authentication required)
 * 2. Protected routes (requires authentication)
 * 3. Admin routes (requires authentication + admin role)
 * 
 * All routes are wrapped with asyncHandler to catch async errors
 * and pass them to the global error handler.
 */

// ===== Public Routes =====
// No authentication required

router.post('/register', asyncHandler(userController.register));           // Create new account
router.post('/login', asyncHandler(userController.login));                 // Authenticate user
router.post('/refresh-token', asyncHandler(userController.refreshToken));  // Get new access token

// ===== Protected Routes =====
// All routes below require valid JWT token (authenticate middleware)

router.use(authenticate); // Middleware: verify JWT for all routes below

router.get('/profile', asyncHandler(userController.getProfile));              // Get own profile
router.put('/profile', asyncHandler(userController.updateProfile));           // Update own profile
router.put('/change-password', asyncHandler(userController.changePassword));  // Change password
router.delete('/profile', asyncHandler(userController.deleteAccount));        // Delete account (soft delete)
router.post('/logout', asyncHandler(userController.logout));                  // Logout (clear tokens)

// ===== Admin Routes =====
// Require authentication + specific roles

// Get all users - Admin only
router.get(
  '/',
  authorize('admin'),  // Only admin role can access
  asyncHandler(userController.getAllUsers)
);

// Get user by ID - Admin and Instructor
router.get(
  '/:id',
  authorize('admin', 'instructor'),  // Multiple roles allowed
  asyncHandler(userController.getUserById)
);

module.exports = router;
