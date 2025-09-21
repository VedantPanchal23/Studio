const { User } = require('../../models');
const mongoose = require('mongoose');

describe('User Model', () => {
  describe('User Creation', () => {
    test('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.googleId).toBe(userData.googleId);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.preferences.theme).toBe('dark');
    });

    test('should fail to create user without required fields', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow();
    });

    test('should fail to create user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('should fail to create user with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      await new User(userData).save();
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('User Validation', () => {
    test('should validate email format', async () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'test@',
        'test.example.com'
      ];

      for (const email of invalidEmails) {
        const user = new User({ email, name: 'Test User' });
        await expect(user.save()).rejects.toThrow();
      }
    });

    test('should validate name length', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'A' // Too short
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('should validate preferences', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          theme: 'invalid-theme',
          fontSize: 5 // Too small
        }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(async () => {
      user = await new User({
        email: 'test@example.com',
        name: 'Test User',
        firebaseUid: 'test-firebase-uid'
      }).save();
    });

    test('should update last login', async () => {
      const originalLastLogin = user.lastLogin;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await user.updateLastLogin();
      expect(user.lastLogin.getTime()).toBeGreaterThan(originalLastLogin.getTime());
    });
  });

  describe('User Statics', () => {
    beforeEach(async () => {
      // Create test users
      await User.create([
        {
          email: 'user1@example.com',
          name: 'User One',
          isActive: true,
          isVerified: true,
          workspaces: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          isActive: true,
          isVerified: false,
          workspaces: [new mongoose.Types.ObjectId()]
        },
        {
          email: 'user3@example.com',
          name: 'User Three',
          isActive: false,
          isVerified: true,
          workspaces: []
        }
      ]);
    });

    test('should find user by email', async () => {
      const user = await User.findByEmail('user1@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('user1@example.com');
    });

    test('should find user by Google ID', async () => {
      const userData = {
        email: 'google@example.com',
        name: 'Google User',
        googleId: 'google123'
      };
      
      await new User(userData).save();
      
      const user = await User.findByGoogleId('google123');
      expect(user).toBeDefined();
      expect(user.googleId).toBe('google123');
    });

    test('should get user statistics', async () => {
      const stats = await User.getStats();
      
      expect(stats.totalUsers).toBe(3);
      expect(stats.activeUsers).toBe(2);
      expect(stats.verifiedUsers).toBe(2);
      expect(stats.avgWorkspacesPerUser).toBeCloseTo(1, 1);
    });
  });

  describe('User Virtuals', () => {
    test('should calculate workspace count', async () => {
      const user = await new User({
        email: 'test@example.com',
        name: 'Test User',
        workspaces: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId()
        ]
      }).save();

      expect(user.workspaceCount).toBe(3);
    });
  });

  describe('User Indexes', () => {
    test('should have proper indexes', async () => {
      const indexes = await User.collection.getIndexes();
      
      // Check for email index
      expect(indexes).toHaveProperty('email_1');
      
      // Check for googleId index (sparse)
      expect(indexes).toHaveProperty('googleId_1');
    });
  });
});