const express = require('express');
const { authenticateFirebase } = require('../middleware/firebaseAuth');
const { verifyIdToken, getFirebaseUser, createCustomToken } = require('../config/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');
const { createRateLimiter } = require('../middleware/security');

const router = express.Router();

// Rate limiter for auth endpoints
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * @route   POST /api/auth/firebase/verify
 * @desc    Verify Firebase ID token and get/create user
 * @access  Public
 */
router.post('/firebase/verify', authRateLimit, async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase ID token'
      });
    }

    // Get Firebase user details
    const firebaseUser = await getFirebaseUser(decodedToken.uid);
    
    // Create or update user in our database
    const user = await User.createFromFirebase(firebaseUser, decodedToken);
    
    logger.info('Firebase user verified and synced', {
      userId: user._id,
      firebaseUid: decodedToken.uid,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Firebase authentication successful',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
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
    logger.error('Firebase token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
        code: 'INVALID_TOKEN'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Firebase authentication failed'
    });
  }
});

/**
 * @route   GET /api/auth/user
 * @desc    Get current authenticated user info
 * @access  Private (Firebase Auth)
 */
router.get('/user', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          workspaceCount: user.workspaceCount
        }
      }
    });

  } catch (error) {
    logger.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

/**
 * @route   PUT /api/auth/user/preferences
 * @desc    Update user preferences
 * @access  Private (Firebase Auth)
 */
router.put('/user/preferences', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid preferences object is required'
      });
    }

    // Update only valid preference fields
    const validFields = ['theme', 'fontSize', 'keyBindings', 'autoSave', 'tabSize'];
    const updates = {};
    
    validFields.forEach(field => {
      if (preferences[field] !== undefined) {
        updates[`preferences.${field}`] = preferences[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid preference fields provided'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    logger.info('User preferences updated', {
      userId: user._id,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: updatedUser.preferences
      }
    });

  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

/**
 * @route   POST /api/auth/custom-token
 * @desc    Create custom Firebase token (for special use cases)
 * @access  Private (Firebase Auth)
 */
router.post('/custom-token', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;
    const { additionalClaims = {} } = req.body;
    
    if (!user.firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a Firebase UID'
      });
    }

    const customToken = await createCustomToken(user.firebaseUid, {
      userId: user._id.toString(),
      email: user.email,
      ...additionalClaims
    });

    logger.info('Custom Firebase token created', {
      userId: user._id,
      firebaseUid: user.firebaseUid
    });

    res.json({
      success: true,
      message: 'Custom token created successfully',
      data: {
        customToken
      }
    });

  } catch (error) {
    logger.error('Custom token creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client should discard Firebase token)
 * @access  Private (Firebase Auth)
 */
router.post('/logout', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;

    // Firebase tokens are stateless, so logout is primarily client-side
    // We just log the event and let the client handle token removal
    
    logger.info('User logged out', {
      userId: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email
    });

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
 * @route   DELETE /api/auth/user
 * @desc    Delete user account
 * @access  Private (Firebase Auth)
 */
router.delete('/user', authenticateFirebase, async (req, res) => {
  try {
    const user = req.user;
    
    // In a production app, you might want to:
    // 1. Delete user's workspaces
    // 2. Clean up associated data
    // 3. Delete Firebase user account
    
    await User.findByIdAndDelete(user._id);
    
    logger.info('User account deleted', {
      userId: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

// Health check for Firebase auth
router.get('/health', (req, res) => {
  try {
    // Check if Firebase is initialized
    const { getFirebaseAuth } = require('../config/firebase');
    const auth = getFirebaseAuth();
    
    res.json({
      success: true,
      message: 'Firebase Auth service is healthy',
      data: {
        firebaseInitialized: !!auth,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Firebase Auth service is unhealthy',
      error: error.message
    });
  }
});

module.exports = router;