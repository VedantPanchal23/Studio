const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Firebase Admin SDK Configuration
 */

let firebaseApp = null;

const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      return firebaseApp;
    }

    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    // Validate required environment variables
    const requiredFields = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];

    const missingFields = requiredFields.filter(field => !process.env[field]);
    
    if (missingFields.length > 0) {
      logger.warn(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
      logger.info('Firebase Auth will be disabled. Add environment variables to enable.');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseApp;

  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
};

/**
 * Get Firebase Auth instance
 */
const getFirebaseAuth = () => {
  const app = initializeFirebase();
  return app ? admin.auth() : null;
};

/**
 * Verify Firebase ID Token
 */
const verifyIdToken = async (idToken) => {
  try {
    // Handle test tokens in test environment
    if (process.env.NODE_ENV === 'test' && idToken.startsWith('firebase-test-token-')) {
      const firebaseUid = idToken.replace('firebase-test-token-', '');
      return {
        uid: firebaseUid,
        test: true,
        iss: 'https://securetoken.google.com/test-project',
        aud: 'test-project',
        auth_time: Math.floor(Date.now() / 1000),
        user_id: firebaseUid,
        sub: firebaseUid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: `test-${firebaseUid}@example.com`,
        firebase: {
          identities: {},
          sign_in_provider: 'custom'
        }
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('Firebase token verification failed:', error);
    throw error;
  }
};

/**
 * Get user by UID from Firebase
 */
const getFirebaseUser = async (uid) => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    logger.error('Failed to get Firebase user:', error);
    throw error;
  }
};

/**
 * Create custom token for a user
 */
const createCustomToken = async (uid, additionalClaims = {}) => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    const customToken = await auth.createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    logger.error('Failed to create custom token:', error);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseAuth,
  verifyIdToken,
  getFirebaseUser,
  createCustomToken
};