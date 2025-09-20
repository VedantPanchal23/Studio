const BaseService = require('./BaseService');
const { Workspace } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class WorkspaceService extends BaseService {
  constructor() {
    super(Workspace);
  }

  // Create workspace with owner
  async createWorkspace(ownerId, workspaceData) {
    try {
      const workspace = await this.create({
        ...workspaceData,
        owner: ownerId,
        collaborators: [{
          userId: ownerId,
          role: 'owner',
          permissions: {
            read: true,
            write: true,
            execute: true,
            admin: true
          }
        }]
      });

      logger.info('Workspace created', { workspaceId: workspace._id, ownerId });
      return workspace;
    } catch (error) {
      logger.error('Error creating workspace:', error);
      throw error;
    }
  }

  // Find workspaces by user (owner or collaborator)
  async findByUser(userId, options = {}) {
    try {
      const { includeArchived = false } = options;
      
      const workspaces = await Workspace.findByUser(userId);
      
      if (!includeArchived) {
        return workspaces.filter(workspace => !workspace.isArchived);
      }
      
      return workspaces;
    } catch (error) {
      logger.error('Error finding workspaces by user:', error);
      throw new AppError('Failed to find user workspaces', 500);
    }
  }

  // Find public workspaces
  async findPublic(limit = 20) {
    try {
      const workspaces = await Workspace.findPublic(limit);
      return workspaces;
    } catch (error) {
      logger.error('Error finding public workspaces:', error);
      throw new AppError('Failed to find public workspaces', 500);
    }
  }

  // Add collaborator to workspace
  async addCollaborator(workspaceId, userId, role = 'viewer', invitedBy = null) {
    try {
      const workspace = await this.findById(workspaceId);
      await workspace.addCollaborator(userId, role, invitedBy);
      
      logger.info('Collaborator added to workspace', { 
        workspaceId, 
        userId, 
        role, 
        invitedBy 
      });
      
      return workspace;
    } catch (error) {
      if (error.message === 'User is already a collaborator') {
        throw new AppError('User is already a collaborator', 409);
      }
      logger.error('Error adding collaborator:', error);
      throw new AppError('Failed to add collaborator', 500);
    }
  }

  // Remove collaborator from workspace
  async removeCollaborator(workspaceId, userId) {
    try {
      const workspace = await this.findById(workspaceId);
      
      // Check if user is the owner
      if (workspace.owner.toString() === userId.toString()) {
        throw new AppError('Cannot remove workspace owner', 400);
      }
      
      await workspace.removeCollaborator(userId);
      
      logger.info('Collaborator removed from workspace', { workspaceId, userId });
      return workspace;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing collaborator:', error);
      throw new AppError('Failed to remove collaborator', 500);
    }
  }

  // Update collaborator role
  async updateCollaboratorRole(workspaceId, userId, newRole) {
    try {
      const workspace = await this.findById(workspaceId);
      await workspace.updateCollaboratorRole(userId, newRole);
      
      logger.info('Collaborator role updated', { workspaceId, userId, newRole });
      return workspace;
    } catch (error) {
      if (error.message === 'Collaborator not found') {
        throw new AppError('Collaborator not found', 404);
      }
      logger.error('Error updating collaborator role:', error);
      throw new AppError('Failed to update collaborator role', 500);
    }
  }

  // Update or add file to workspace
  async updateFile(workspaceId, filePath, content, language, modifiedBy) {
    try {
      const workspace = await this.findById(workspaceId);
      await workspace.updateFile(filePath, content, language, modifiedBy);
      
      logger.info('File updated in workspace', { 
        workspaceId, 
        filePath, 
        language, 
        modifiedBy 
      });
      
      return workspace;
    } catch (error) {
      logger.error('Error updating file:', error);
      throw new AppError('Failed to update file', 500);
    }
  }

  // Delete file from workspace
  async deleteFile(workspaceId, filePath) {
    try {
      const workspace = await this.findById(workspaceId);
      await workspace.deleteFile(filePath);
      
      logger.info('File deleted from workspace', { workspaceId, filePath });
      return workspace;
    } catch (error) {
      if (error.message === 'File not found') {
        throw new AppError('File not found', 404);
      }
      logger.error('Error deleting file:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  // Get file content
  async getFile(workspaceId, filePath) {
    try {
      const workspace = await this.findById(workspaceId);
      const file = workspace.files.find(
        f => f.path === filePath && !f.isDeleted
      );
      
      if (!file) {
        throw new AppError('File not found', 404);
      }
      
      return file;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting file:', error);
      throw new AppError('Failed to get file', 500);
    }
  }

  // List files in workspace
  async listFiles(workspaceId, options = {}) {
    try {
      const { includeDeleted = false, pathPrefix = '' } = options;
      
      const workspace = await this.findById(workspaceId, 'files');
      
      let files = workspace.files;
      
      if (!includeDeleted) {
        files = files.filter(file => !file.isDeleted);
      }
      
      if (pathPrefix) {
        files = files.filter(file => file.path.startsWith(pathPrefix));
      }
      
      return files.sort((a, b) => a.path.localeCompare(b.path));
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new AppError('Failed to list files', 500);
    }
  }

  // Update workspace settings
  async updateSettings(workspaceId, settings) {
    try {
      const workspace = await this.updateById(workspaceId, { settings });
      logger.info('Workspace settings updated', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error updating workspace settings:', error);
      throw error;
    }
  }

  // Archive workspace
  async archive(workspaceId) {
    try {
      const workspace = await this.updateById(workspaceId, { isArchived: true });
      logger.info('Workspace archived', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error archiving workspace:', error);
      throw error;
    }
  }

  // Unarchive workspace
  async unarchive(workspaceId) {
    try {
      const workspace = await this.updateById(workspaceId, { isArchived: false });
      logger.info('Workspace unarchived', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error unarchiving workspace:', error);
      throw error;
    }
  }

  // Make workspace public
  async makePublic(workspaceId) {
    try {
      const workspace = await this.updateById(workspaceId, { isPublic: true });
      logger.info('Workspace made public', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error making workspace public:', error);
      throw error;
    }
  }

  // Make workspace private
  async makePrivate(workspaceId) {
    try {
      const workspace = await this.updateById(workspaceId, { isPublic: false });
      logger.info('Workspace made private', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error making workspace private:', error);
      throw error;
    }
  }

  // Update Drive sync settings
  async updateDriveSync(workspaceId, driveSyncData) {
    try {
      const workspace = await this.updateById(workspaceId, { 
        driveSync: driveSyncData 
      });
      logger.info('Workspace Drive sync updated', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error updating Drive sync:', error);
      throw error;
    }
  }

  // Update Git repository settings
  async updateGitRepo(workspaceId, gitRepoData) {
    try {
      const workspace = await this.updateById(workspaceId, { 
        gitRepo: gitRepoData 
      });
      logger.info('Workspace Git repo updated', { workspaceId });
      return workspace;
    } catch (error) {
      logger.error('Error updating Git repo:', error);
      throw error;
    }
  }

  // Check user permissions for workspace
  async checkPermissions(workspaceId, userId) {
    try {
      const workspace = await this.findById(workspaceId);
      
      // Owner has all permissions
      if (workspace.owner.toString() === userId.toString()) {
        return {
          read: true,
          write: true,
          execute: true,
          admin: true,
          role: 'owner'
        };
      }
      
      // Check collaborator permissions
      const collaborator = workspace.collaborators.find(
        collab => collab.userId.toString() === userId.toString()
      );
      
      if (!collaborator) {
        // Check if workspace is public for read access
        if (workspace.isPublic) {
          return {
            read: true,
            write: false,
            execute: false,
            admin: false,
            role: 'viewer'
          };
        }
        
        throw new AppError('Access denied', 403);
      }
      
      return {
        ...collaborator.permissions,
        role: collaborator.role
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error checking permissions:', error);
      throw new AppError('Failed to check permissions', 500);
    }
  }

  // Get workspace statistics
  async getStats() {
    try {
      const stats = await Workspace.getStats();
      return stats;
    } catch (error) {
      logger.error('Error getting workspace statistics:', error);
      throw new AppError('Failed to get workspace statistics', 500);
    }
  }

  // Search workspaces
  async search(query, options = {}) {
    try {
      const { limit = 10, skip = 0, publicOnly = false } = options;
      
      const searchFilter = {
        $text: { $search: query },
        isArchived: false
      };
      
      if (publicOnly) {
        searchFilter.isPublic = true;
      }

      const workspaces = await this.findAll(searchFilter, {
        limit,
        skip,
        populate: 'owner',
        select: 'name description owner isPublic createdAt stats'
      });

      return workspaces;
    } catch (error) {
      logger.error('Error searching workspaces:', error);
      throw new AppError('Failed to search workspaces', 500);
    }
  }
}

module.exports = WorkspaceService;