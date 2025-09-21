const admin = require('firebase-admin');

class FirebaseTestAuth {
  constructor() {
    // For testing, we'll just use mock credentials to avoid initialization issues
    this.auth = null;
  }

  /**
   * Generate a custom Firebase ID token for testing
   * @param {Object} payload - The payload to include in the token (userId, etc.)
   * @param {Object} options - Additional options like expiresIn
   * @returns {string} Firebase ID token
   */
  async generateTestToken(payload, options = {}) {
    try {
      // Create a custom token first
      const customToken = await this.auth.createCustomToken(payload.uid || payload.id, {
        ...payload,
        // Add test-specific claims
        test: true,
        // Convert MongoDB ObjectId to string if present
        userId: payload.id ? payload.id.toString() : payload.uid
      });

      return customToken;
    } catch (error) {
      console.error('Error generating Firebase test token:', error);
      throw error;
    }
  }

  /**
   * Generate an ID token for testing (simulates what frontend would send)
   * Note: In real tests, you'd typically mock the Firebase token verification
   * @param {Object} userPayload - User data
   * @returns {string} Mock ID token for testing
   */
  generateMockIdToken(userPayload) {
    // For testing, we'll use a predictable format that our middleware can recognize
    // In real implementation, this would be a proper Firebase ID token
    const mockToken = `firebase-test-token-${userPayload.uid}`;
    return mockToken;
  }

  /**
   * Mock Firebase token verification for tests
   * @param {string} token - The token to verify
   * @returns {Object} Decoded token data
   */
  mockVerifyIdToken(token) {
    if (token.startsWith('firebase-test-token-')) {
      const firebaseUid = token.replace('firebase-test-token-', '');
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
    throw new Error('Invalid test token');
  }

  /**
   * Setup test authentication helpers
   * @returns {Object} Helper functions for testing
   */
  getTestHelpers() {
    return {
      generateToken: this.generateMockIdToken.bind(this),
      verifyToken: this.mockVerifyIdToken.bind(this),
      createCustomToken: this.generateTestToken.bind(this)
    };
  }
}

module.exports = new FirebaseTestAuth();