const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const JWTUtils = require('../utils/jwt');

describe('Authentication Routes', () => {
  let testUser;
  let accessToken;

  beforeAll(async () => {
    // Create a test user
    testUser = new User({
      googleId: 'test-google-id',
      email: 'test@example.com',
      name: 'Test User',
      isVerified: true
    });
    await testUser.save();

    // Generate access token for authenticated tests
    accessToken = JWTUtils.generateAccessToken({ id: testUser._id });
  });

  afterAll(async () => {
    // Clean up test user
    await User.findByIdAndDelete(testUser._id);
  });

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token is required');
    });

    it('should return 401 when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const refreshToken = JWTUtils.generateRefreshToken({ id: testUser._id });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update user profile with valid token', async () => {
      const updateData = {
        name: 'Updated Test User',
        preferences: {
          theme: 'light',
          fontSize: 16
        }
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.preferences.theme).toBe(updateData.preferences.theme);
      expect(response.body.data.user.preferences.fontSize).toBe(updateData.preferences.fontSize);
    });

    it('should return 400 for invalid name length', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'A' }) // Too short
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Name must be between 2 and 50 characters');
    });

    it('should return 400 for invalid theme preference', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ preferences: { theme: 'invalid-theme' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid theme preference');
    });
  });

  describe('GET /api/auth/verify-token', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token is valid');
      expect(response.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/auth/failure', () => {
    it('should return authentication failure response', async () => {
      const response = await request(app)
        .get('/api/auth/failure?error=oauth_failed')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication failed');
      expect(response.body.error).toBe('oauth_failed');
    });
  });
});

describe('JWT Utils', () => {
  const testPayload = { id: 'test-user-id' };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTUtils.generateAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = JWTUtils.generateTokens(testPayload);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = JWTUtils.generateAccessToken(testPayload);
      const decoded = await JWTUtils.verifyToken(token);
      expect(decoded.id).toBe(testPayload.id);
    });

    it('should throw error for invalid token', async () => {
      await expect(JWTUtils.verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'test-token';
      const header = `Bearer ${token}`;
      const extracted = JWTUtils.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Invalid header');
      expect(extracted).toBeNull();
    });

    it('should return null for missing header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = JWTUtils.generateAccessToken(testPayload);
      const decoded = JWTUtils.decodeToken(token);
      expect(decoded.payload.id).toBe(testPayload.id);
    });
  });
});