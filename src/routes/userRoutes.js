const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize, checkOwnership } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * User Routes
 * Defines all user-related API endpoints
 */

// Public routes
router.post('/register', asyncHandler(userController.register));
router.post('/login', asyncHandler(userController.login));
router.post('/refresh-token', asyncHandler(userController.refreshToken));

// Protected routes - require authentication
router.use(authenticate); // Apply authentication to all routes below

router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', asyncHandler(userController.updateProfile));
router.put('/change-password', asyncHandler(userController.changePassword));
router.delete('/profile', asyncHandler(userController.deleteAccount));
router.post('/logout', asyncHandler(userController.logout));

// Admin only routes
router.get(
  '/',
  authorize('admin'),
  asyncHandler(userController.getAllUsers)
);

router.get(
  '/:id',
  authorize('admin', 'instructor'),
  asyncHandler(userController.getUserById)
);

module.exports = router;
