const { UserService } = require('../../services');
const { User } = require('../../models');

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('User Creation', () => {
    test('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google123'
      };

      const user = await userService.create(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.googleId).toBe(userData.googleId);
    });

    test('should create user from Google profile', async () => {
      const googleProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'test@example.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      const user = await userService.createFromGoogleProfile(googleProfile);

      expect(user.googleId).toBe(googleProfile.id);
      expect(user.email).toBe(googleProfile.emails[0].value);
      expect(user.name).toBe(googleProfile.displayName);
      expect(user.avatar).toBe(googleProfile.photos[0].value);
      expect(user.isVerified).toBe(true);
    });
  });

  describe('User Retrieval', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await userService.create({
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google123'
      });
    });

    test('should find user by email', async () => {
      const user = await userService.findByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    test('should find user by Google ID', async () => {
      const user = await userService.findByGoogleId('google123');
      expect(user).toBeDefined();
      expect(user.googleId).toBe('google123');
    });

    test('should find user by ID', async () => {
      const user = await userService.findById(testUser._id);
      expect(user).toBeDefined();
      expect(user._id.toString()).toBe(testUser._id.toString());
    });

    test('should throw error when user not found', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      await expect(userService.findById(nonExistentId)).rejects.toThrow('User not found');
    });
  });

  describe('User Updates', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await userService.create({
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    test('should update user preferences', async () => {
      const newPreferences = {
        theme: 'light',
        fontSize: 16,
        keyBindings: 'vim'
      };

      const updatedUser = await userService.updatePreferences(testUser._id, newPreferences);

      expect(updatedUser.preferences.theme).toBe('light');
      expect(updatedUser.preferences.fontSize).toBe(16);
      expect(updatedUser.preferences.keyBindings).toBe('vim');
    });

    test('should update last login', async () => {
      const originalLastLogin = testUser.lastLogin;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedUser = await userService.updateLastLogin(testUser._id);
      expect(updatedUser.lastLogin.getTime()).toBeGreaterThan(originalLastLogin.getTime());
    });

    test('should deactivate user', async () => {
      const deactivatedUser = await userService.deactivate(testUser._id);
      expect(deactivatedUser.isActive).toBe(false);
    });

    test('should reactivate user', async () => {
      await userService.deactivate(testUser._id);
      const reactivatedUser = await userService.reactivate(testUser._id);
      expect(reactivatedUser.isActive).toBe(true);
    });
  });

  describe('User Search', () => {
    beforeEach(async () => {
      await userService.bulkCreate([
        {
          email: 'john.doe@example.com',
          name: 'John Doe',
          isActive: true
        },
        {
          email: 'jane.smith@example.com',
          name: 'Jane Smith',
          isActive: true
        },
        {
          email: 'inactive@example.com',
          name: 'Inactive User',
          isActive: false
        }
      ]);
    });

    test('should search users by name', async () => {
      const users = await userService.search('John');
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('John Doe');
    });

    test('should search users by email', async () => {
      const users = await userService.search('jane.smith');
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('jane.smith@example.com');
    });

    test('should only return active users in search', async () => {
      const users = await userService.search('User');
      expect(users).toHaveLength(0); // Inactive user should not be returned
    });
  });

  describe('User Statistics', () => {
    beforeEach(async () => {
      await userService.bulkCreate([
        {
          email: 'user1@example.com',
          name: 'User One',
          isActive: true,
          isVerified: true
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          isActive: true,
          isVerified: false
        },
        {
          email: 'user3@example.com',
          name: 'User Three',
          isActive: false,
          isVerified: true
        }
      ]);
    });

    test('should get user statistics', async () => {
      const stats = await userService.getStats();
      
      expect(stats.totalUsers).toBe(3);
      expect(stats.activeUsers).toBe(2);
      expect(stats.verifiedUsers).toBe(2);
    });
  });
});