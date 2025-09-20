const BaseService = require('./BaseService');
const { User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  // Find user by email
  async findByEmail(email) {
    try {
      const user = await User.findByEmail(email);
      return user;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw new AppError('Failed to find user by email', 500);
    }
  }

  // Find user by Google ID
  async findByGoogleId(googleId) {
    try {
      const user = await User.findByGoogleId(googleId);
      return user;
    } catch (error) {
      logger.error('Error finding user by Google ID:', error);
      throw new AppError('Failed to find user by Google ID', 500);
    }
  }

  // Create user from Google OAuth data
  async createFromGoogleProfile(profile) {
    try {
      const userData = {
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value || null,
        isVerified: true // Google accounts are pre-verified
      };

      const user = await this.create(userData);
      logger.info('User created from Google profile', { userId: user._id, email: user.email });
      return user;
    } catch (error) {
      logger.error('Error creating user from Google profile:', error);
      throw error;
    }
  }

  // Update user preferences
  async updatePreferences(userId, preferences) {
    try {
      const user = await this.updateById(userId, { preferences }, { new: true });
      logger.info('User preferences updated', { userId });
      return user;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Add workspace to user
  async addWorkspace(userId, workspaceId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.workspaces.includes(workspaceId)) {
        user.workspaces.push(workspaceId);
        await user.save();
        logger.info('Workspace added to user', { userId, workspaceId });
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error adding workspace to user:', error);
      throw new AppError('Failed to add workspace to user', 500);
    }
  }

  // Remove workspace from user
  async removeWorkspace(userId, workspaceId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      user.workspaces = user.workspaces.filter(
        id => id.toString() !== workspaceId.toString()
      );
      await user.save();
      
      logger.info('Workspace removed from user', { userId, workspaceId });
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing workspace from user:', error);
      throw new AppError('Failed to remove workspace from user', 500);
    }
  }

  // Get user with populated workspaces
  async findWithWorkspaces(userId) {
    try {
      const user = await User.findWithWorkspaces(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error finding user with workspaces:', error);
      throw new AppError('Failed to find user with workspaces', 500);
    }
  }

  // Update last login
  async updateLastLogin(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      await user.updateLastLogin();
      logger.info('User last login updated', { userId });
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating last login:', error);
      throw new AppError('Failed to update last login', 500);
    }
  }

  // Update Google Drive tokens
  async updateDriveTokens(userId, accessToken, refreshToken) {
    try {
      const updateData = {
        driveToken: accessToken
      };
      
      if (refreshToken) {
        updateData.driveRefreshToken = refreshToken;
      }

      const user = await this.updateById(userId, updateData);
      logger.info('Google Drive tokens updated', { userId });
      return user;
    } catch (error) {
      logger.error('Error updating Drive tokens:', error);
      throw error;
    }
  }

  // Get user statistics
  async getStats() {
    try {
      const stats = await User.getStats();
      return stats;
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw new AppError('Failed to get user statistics', 500);
    }
  }

  // Search users by name or email
  async search(query, options = {}) {
    try {
      const { limit = 10, skip = 0 } = options;
      
      const searchFilter = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ],
        isActive: true
      };

      const users = await this.findAll(searchFilter, {
        limit,
        skip,
        select: 'name email avatar createdAt'
      });

      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new AppError('Failed to search users', 500);
    }
  }

  // Deactivate user account
  async deactivate(userId) {
    try {
      const user = await this.updateById(userId, { isActive: false });
      logger.info('User account deactivated', { userId });
      return user;
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Reactivate user account
  async reactivate(userId) {
    try {
      const user = await this.updateById(userId, { isActive: true });
      logger.info('User account reactivated', { userId });
      return user;
    } catch (error) {
      logger.error('Error reactivating user:', error);
      throw error;
    }
  }
}

module.exports = UserService;