const express = require('express');
const config = require('../config');
const User = require('../models/User');
const logger = require('../utils/logger');
const { authenticateFirebase } = require('../middleware/firebaseAuth');

const router = express.Router();

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    data: {
      authMethod: 'Firebase',
      environment: config.nodeEnv
    }
  });
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private (Firebase Auth)
 */
router.get('/profile', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          isAdmin: user.isAdmin
        }
      }
    });

  } catch (error) {
    logger.error('Profile retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private (Firebase Auth)
 */
router.put('/profile', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;
    const { name, preferences } = req.body || {};

    // Validate inputs
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 50 characters'
        });
      }
      user.name = name.trim();
    }

    if (preferences !== undefined) {
      if (typeof preferences !== 'object' || preferences === null) {
        return res.status(400).json({
          success: false,
          message: 'Preferences must be an object'
        });
      }

      // Validate theme preference if provided
      if (preferences.theme !== undefined) {
        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(preferences.theme)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid theme preference'
          });
        }
      }

      // Merge preferences
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences
        }
      }
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side Firebase token removal)
 * @access  Private (Firebase Auth)
 */
router.post('/logout', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;

    // Note: Firebase tokens are managed client-side
    // Server-side logout mainly involves logging and cleanup

    logger.info(`User logged out: ${user.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout'
    });
  }
});

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify Firebase token validity
 * @access  Private (Firebase Auth)
 */
router.get('/verify-token', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name
        }
      }
    });

  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

/**
 * @route   GET /api/auth/failure
 * @desc    Handle authentication failure
 * @access  Public
 */
router.get('/failure', (req, res) => {
  const error = req.query.error || 'unknown_error';
  
  logger.warn('Authentication failure:', { error });

  res.status(401).json({
    success: false,
    message: 'Authentication failed',
    data: { error }
  });
});

module.exports = router;