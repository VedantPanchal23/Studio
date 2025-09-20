const express = require('express');
const passport = require('../config/passport');
const config = require('../config');
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
router.get('/google', (req, res, next) => {
  // Skip the authRateLimit in non-production to ease local testing
  if (config.nodeEnv === 'production') {
    return authRateLimit(req, res, (rateErr) => {
      if (rateErr) return; // express-rate-limit already handled the response
      initiateGoogleAuth(req, res, next);
    });
  }
  initiateGoogleAuth(req, res, next);
});

function initiateGoogleAuth(req, res, next) {
  logger.info('Initiating Google OAuth', {
    callbackUrl: config.auth.google.callbackUrl,
    nodeEnv: config.nodeEnv,
    driveScopeEnabled: process.env.ENABLE_DRIVE_SCOPE === 'true'
  });

  const defaultScopes = ['profile', 'email', 'openid'];
  const driveScope = 'https://www.googleapis.com/auth/drive.file';
  const scopes = (config.nodeEnv === 'production' && process.env.ENABLE_DRIVE_SCOPE === 'true')
    ? [...defaultScopes, driveScope]
    : defaultScopes;

  // Optional debug: allow ?showScopes=1 to return scopes instead of redirecting
  if (req.query.showScopes === '1') {
    return res.json({ success: true, data: { scopes, callbackUrl: config.auth.google.callbackUrl } });
  }

  passport.authenticate('google', {
    scope: scopes,
    callbackURL: config.auth.google.callbackUrl
  })(req, res, next);
}

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

// Dev-only endpoint to show configured OAuth values (do not expose in production)
router.get('/debug/oauth-config', (req, res) => {
  if (config.nodeEnv === 'production') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  res.json({
    success: true,
    data: {
      googleClientId: config.auth.google.clientId,
      googleCallbackUrl: config.auth.google.callbackUrl,
      corsOrigin: config.cors.origin
    }
  });
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
 * @route   POST /api/auth/signup
 * @desc    Create a new local (email/password) user account
 * @access  Public
 */
router.post('/signup', authRateLimit, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      isVerified: true, // Immediate verification for simple local accounts (adjust if email verification is added)
      lastLogin: Date.now()
    });
    await user.save();

    const tokens = JWTUtils.generateTokens({ id: user._id });
    await user.updateLastLogin();

    logger.info('Local signup successful', { userId: user._id, email: user.email });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Signup error', { error: error.message });
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/password
 * @access  Public
 */
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const valid = await user.correctPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is inactive.' });
    }

    await user.updateLastLogin();
    const tokens = JWTUtils.generateTokens({ id: user._id });

    logger.info('Local login successful', { userId: user._id, email: user.email });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to login.' });
  }
});

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify access token and return basic user info
 * @access  Private (Bearer token)
 */
router.get('/verify-token', authenticateJWT, async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Verify token error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify token' });
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

// (Removed duplicate /verify-token route; consolidated earlier definition retained)

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