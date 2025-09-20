const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const User = require('../models/User');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Configure Passport strategies for authentication
 */

// Google OAuth Strategy
if (!config.auth.google.clientId || !config.auth.google.clientSecret) {
  // Log a warning but don't crash; actual route will fail gracefully when invoked
  logger.warn('Google OAuth environment variables missing: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
}

passport.use(new GoogleStrategy({
  clientID: config.auth.google.clientId || 'missing-client-id',
  clientSecret: config.auth.google.clientSecret || 'missing-client-secret',
  callbackURL: config.auth.google.callbackUrl,
  // Keep scope minimal here; route handler may add drive scope conditionally
  scope: ['profile', 'email', 'openid']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    logger.info(`Google OAuth callback for user: ${profile.id}`);

    // Check if user already exists with this Google ID
    let user = await User.findByGoogleId(profile.id);

    if (user) {
      // Update user's last login and Google Drive tokens if needed
      user.lastLogin = new Date();
      if (refreshToken) {
        user.driveRefreshToken = refreshToken;
      }
      await user.save();

      logger.info(`Existing user logged in: ${user.email}`);
      return done(null, user);
    }

    // Check if user exists with the same email (link accounts)
    user = await User.findByEmail(profile.emails[0].value);

    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.avatar = profile.photos[0]?.value || user.avatar;
      user.lastLogin = new Date();
      if (refreshToken) {
        user.driveRefreshToken = refreshToken;
      }
      await user.save();

      logger.info(`Linked Google account to existing user: ${user.email}`);
      return done(null, user);
    }

    // Create new user
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0]?.value,
      isVerified: true, // Google accounts are pre-verified
      driveRefreshToken: refreshToken,
      lastLogin: new Date()
    });

    await newUser.save();
    logger.info(`New user created via Google OAuth: ${newUser.email}`);

    return done(null, newUser);

  } catch (error) {
    logger.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// JWT Strategy for API authentication
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
  issuer: 'ide-backend',
  audience: 'ide-frontend'
}, async (payload, done) => {
  try {
    // Find user by ID from JWT payload
    const user = await User.findById(payload.id).select('-password -driveToken -driveRefreshToken');

    if (!user) {
      logger.warn(`JWT authentication failed: User not found for ID ${payload.id}`);
      return done(null, false);
    }

    if (!user.isActive) {
      logger.warn(`JWT authentication failed: User account is inactive for ${user.email}`);
      return done(null, false);
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(payload.iat)) {
      logger.warn(`JWT authentication failed: Password changed after token issued for ${user.email}`);
      return done(null, false);
    }

    return done(null, user);

  } catch (error) {
    logger.error('Error in JWT strategy:', error);
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password -driveToken -driveRefreshToken');
    done(null, user);
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error, null);
  }
});

module.exports = passport;