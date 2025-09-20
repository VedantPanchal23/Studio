const express = require('express');
const passport = require('../config/passport');
const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  googleAuth,
  googleCallback,
  authenticateJWT,
  authRateLimit,
  validateRefreshToken
} = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth authentication
 * @access  Public
 */
router.get('/google', authRateLimit, googleAuth);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', googleCallback, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      logger.error('Google OAuth callback: No user found');
      return res.redirect(`${process.env.CORS_ORIGIN}/auth/failure?error=oauth_failed`);
    }
    
    // Generate JWT tokens
    const tokens = JWTUtils.generateTokens({ id: user._id });
    
    // Update user's last login
    await user.updateLastLogin();
    
    logger.info(`User successfully authenticated via Google: ${user.email}`);
    
    // Redirect to frontend with tokens
    // In production, you might want to use secure cookies instead
    const redirectUrl = `${process.env.CORS_ORIGIN}/auth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
    res.redirect(redirectUrl);
    
  } catch (error) {
    logger.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.CORS_ORIGIN}/auth/failure?error=server_error`);
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authRateLimit, validateRefreshToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Generate new access token
    const accessToken = JWTUtils.generateAccessToken({ id: user._id });
    
    logger.info(`Access token refreshed for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences
        }
      }
    });
    
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    
    // In a more sophisticated setup, you might want to:
    // 1. Blacklist the token
    // 2. Clear server-side sessions
    // 3. Revoke Google OAuth tokens
    
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
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    
    // Get user with populated workspaces
    const userWithWorkspaces = await User.findWithWorkspaces(user._id);
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: userWithWorkspaces._id,
          email: userWithWorkspaces.email,
          name: userWithWorkspaces.name,
          avatar: userWithWorkspaces.avatar,
          preferences: userWithWorkspaces.preferences,
          workspaces: userWithWorkspaces.workspaces,
          workspaceCount: userWithWorkspaces.workspaceCount,
          isVerified: userWithWorkspaces.isVerified,
          lastLogin: userWithWorkspaces.lastLogin,
          createdAt: userWithWorkspaces.createdAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    const { name, preferences } = req.body;
    
    // Validate input
    if (name && (name.length < 2 || name.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters'
      });
    }
    
    // Update user
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (preferences) {
      // Validate preferences
      const validThemes = ['light', 'dark', 'auto'];
      const validKeyBindings = ['vscode', 'vim', 'emacs', 'sublime'];
      
      if (preferences.theme && !validThemes.includes(preferences.theme)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid theme preference'
        });
      }
      
      if (preferences.keyBindings && !validKeyBindings.includes(preferences.keyBindings)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid key bindings preference'
        });
      }
      
      if (preferences.fontSize && (preferences.fontSize < 10 || preferences.fontSize > 24)) {
        return res.status(400).json({
          success: false,
          message: 'Font size must be between 10 and 24'
        });
      }
      
      if (preferences.tabSize && (preferences.tabSize < 2 || preferences.tabSize > 8)) {
        return res.status(400).json({
          success: false,
          message: 'Tab size must be between 2 and 8'
        });
      }
      
      updateData.preferences = { ...user.preferences, ...preferences };
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -driveToken -driveRefreshToken');
    
    logger.info(`Profile updated for user: ${updatedUser.email}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          preferences: updatedUser.preferences,
          isVerified: updatedUser.isVerified,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify if current token is valid
 * @access  Private
 */
router.get('/verify-token', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar
      }
    }
  });
});

/**
 * @route   GET /api/auth/failure
 * @desc    Authentication failure endpoint
 * @access  Public
 */
router.get('/failure', (req, res) => {
  const error = req.query.error || 'unknown_error';
  
  logger.warn(`Authentication failure: ${error}`);
  
  res.status(401).json({
    success: false,
    message: 'Authentication failed',
    error: error
  });
});

module.exports = router;