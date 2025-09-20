const GoogleDriveService = require('./googleDriveService');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class WorkspaceSyncService {
  constructor() {
    this.driveService = new GoogleDriveService();
    this.syncInProgress = new Map(); // Track ongoing sync operations
  }

  /**
   * Initialize Drive credentials for a user
   * @param {string} userId - User ID
   * @returns {boolean} True if credentials are valid
   */
  async initializeDriveCredentials(userId) {
    try {
      const user = await User.findById(userId).select('+driveToken +driveRefreshToken');
      
      if (!user.driveToken) {
        return false;
      }

      this.driveService.setCredentials({
        access_token: user.driveToken,
        refresh_token: user.driveRefreshToken
      });

      return await this.driveService.checkAccess();
    } catch (error) {
      logger.error('Error initializing Drive credentials:', error);
      return false;
    }
  }

  /**
   * Create or get workspace folder in Google Drive
   * @param {string} workspaceName - Name of the workspace
   * @param {string} parentFolderId - Parent folder ID (optional)
   * @returns {Object} Drive folder metadata
   */
  async createWorkspaceFolder(workspaceName, parentFolderId = null) {
    try {
      // Check if folder already exists
      const searchResult = await this.driveService.searchFiles(workspaceName);
      const existingFolder = searchResult.files.find(
        file => file.mimeType === 'application/vnd.google-apps.folder' && 
                file.name === workspaceName
      );

      if (existingFolder) {
        return existingFolder;
      }

      // Create new folder
      return await this.driveService.createFolder(workspaceName, parentFolderId);
    } catch (error) {
      logger.error('Error creating workspace folder:', error);
      throw new Error('Failed to create workspace folder in Drive');
    }
  }

  /**
   * Sync workspace files to Google Drive
   * @param {string} workspaceId - Workspace ID
   * @param {string} userId - User ID
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  async syncWorkspaceToDrive(workspaceId, userId, options = {}) {
    const syncKey = `${workspaceId}-${userId}`;
    
    if (this.syncInProgress.get(syncKey)) {
      throw new Error('Sync already in progress for this workspace');
    }

    this.syncInProgress.set(syncKey, true);

    try {
      const { 
        createFolder = true, 
        overwriteExisting = false,
        excludePatterns = ['.git', 'node_modules', '.env']
      } = options;

      // Initialize Drive credentials
      const hasAccess = await this.initializeDriveCredentials(userId);
      if (!hasAccess) {
        throw new Error('Google Drive access not available');
      }

      // Get workspace
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      let driveFolderId = workspace.driveSync?.folderId;

      // Create Drive folder if needed
      if (createFolder && !driveFolderId) {
        const driveFolder = await this.createWorkspaceFolder(workspace.name);
        driveFolderId = driveFolder.id;

        // Update workspace with Drive folder ID
        await Workspace.findByIdAndUpdate(workspaceId, {
          'driveSync.folderId': driveFolderId,
          'driveSync.enabled': true
        });
      }

      const syncResults = {
        uploaded: [],
        updated: [],
        skipped: [],
        errors: []
      };

      // Sync each file in the workspace
      for (const file of workspace.files) {
        try {
          // Skip excluded files
          if (this.shouldExcludeFile(file.path, excludePatterns)) {
            syncResults.skipped.push({
              path: file.path,
              reason: 'excluded'
            });
            continue;
          }

          // Check if file exists in Drive
          const existingFile = await this.findFileInDrive(file.path, driveFolderId);

          if (existingFile && !overwriteExisting) {
            // Compare modification times
            const driveModified = new Date(existingFile.modifiedTime);
            const localModified = new Date(file.lastModified);

            if (driveModified >= localModified) {
              syncResults.skipped.push({
                path: file.path,
                reason: 'up-to-date'
              });
              continue;
            }
          }

          // Determine MIME type
          const mimeType = this.getMimeType(file.path, file.language);

          if (existingFile) {
            // Update existing file
            await this.driveService.updateFile(
              existingFile.id,
              file.content,
              mimeType
            );
            syncResults.updated.push({
              path: file.path,
              driveId: existingFile.id
            });
          } else {
            // Upload new file
            const uploadedFile = await this.driveService.uploadFile({
              name: path.basename(file.path),
              content: file.content,
              mimeType,
              parentId: await this.getOrCreateFolderPath(
                path.dirname(file.path),
                driveFolderId
              )
            });
            syncResults.uploaded.push({
              path: file.path,
              driveId: uploadedFile.id
            });
          }

        } catch (error) {
          logger.error(`Error syncing file ${file.path}:`, error);
          syncResults.errors.push({
            path: file.path,
            error: error.message
          });
        }
      }

      // Update workspace sync timestamp
      await Workspace.findByIdAndUpdate(workspaceId, {
        'driveSync.lastSync': new Date()
      });

      logger.info(`Workspace sync completed for ${workspaceId}:`, syncResults);
      return syncResults;

    } catch (error) {
      logger.error('Error syncing workspace to Drive:', error);
      throw error;
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * Sync files from Google Drive to workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} userId - User ID
   * @param {string} driveFolderId - Drive folder ID
   * @returns {Object} Sync result
   */
  async syncDriveToWorkspace(workspaceId, userId, driveFolderId) {
    const syncKey = `${workspaceId}-${userId}-import`;
    
    if (this.syncInProgress.get(syncKey)) {
      throw new Error('Import already in progress for this workspace');
    }

    this.syncInProgress.set(syncKey, true);

    try {
      // Initialize Drive credentials
      const hasAccess = await this.initializeDriveCredentials(userId);
      if (!hasAccess) {
        throw new Error('Google Drive access not available');
      }

      // Get workspace
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const syncResults = {
        imported: [],
        updated: [],
        skipped: [],
        errors: []
      };

      // Get all files from Drive folder recursively
      const driveFiles = await this.getAllFilesFromFolder(driveFolderId);

      for (const driveFile of driveFiles) {
        try {
          // Skip Google Workspace files
          if (driveFile.mimeType.startsWith('application/vnd.google-apps.')) {
            syncResults.skipped.push({
              name: driveFile.name,
              reason: 'google-workspace-file'
            });
            continue;
          }

          // Download file content
          const fileContent = await this.driveService.downloadFile(driveFile.id);
          const relativePath = await this.getRelativePathFromDrive(driveFile, driveFolderId);

          // Check if file exists in workspace
          const existingFile = workspace.files.find(f => f.path === relativePath);

          if (existingFile) {
            // Update existing file
            existingFile.content = fileContent.toString('utf8');
            existingFile.lastModified = new Date(driveFile.modifiedTime);
            existingFile.modifiedBy = workspace.owner;

            syncResults.updated.push({
              path: relativePath,
              driveId: driveFile.id
            });
          } else {
            // Add new file
            workspace.files.push({
              path: relativePath,
              content: fileContent.toString('utf8'),
              language: this.getLanguageFromPath(relativePath),
              lastModified: new Date(driveFile.modifiedTime),
              modifiedBy: workspace.owner
            });

            syncResults.imported.push({
              path: relativePath,
              driveId: driveFile.id
            });
          }

        } catch (error) {
          logger.error(`Error importing file ${driveFile.name}:`, error);
          syncResults.errors.push({
            name: driveFile.name,
            error: error.message
          });
        }
      }

      // Save workspace
      await workspace.save();

      // Update workspace sync info
      await Workspace.findByIdAndUpdate(workspaceId, {
        'driveSync.folderId': driveFolderId,
        'driveSync.enabled': true,
        'driveSync.lastSync': new Date()
      });

      logger.info(`Drive import completed for ${workspaceId}:`, syncResults);
      return syncResults;

    } catch (error) {
      logger.error('Error syncing Drive to workspace:', error);
      throw error;
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * Get sync status for a workspace
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Sync status
   */
  async getSyncStatus(workspaceId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const syncKey = `${workspaceId}-${workspace.owner}`;
      const isInProgress = this.syncInProgress.get(syncKey) || false;

      return {
        enabled: workspace.driveSync?.enabled || false,
        folderId: workspace.driveSync?.folderId || null,
        lastSync: workspace.driveSync?.lastSync || null,
        inProgress: isInProgress
      };
    } catch (error) {
      logger.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Check if file should be excluded from sync
   * @param {string} filePath - File path
   * @param {Array} excludePatterns - Patterns to exclude
   * @returns {boolean} True if should be excluded
   */
  shouldExcludeFile(filePath, excludePatterns) {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Find file in Drive folder by path
   * @param {string} filePath - Local file path
   * @param {string} folderId - Drive folder ID
   * @returns {Object|null} Drive file or null
   */
  async findFileInDrive(filePath, folderId) {
    try {
      const fileName = path.basename(filePath);
      const result = await this.driveService.listFiles({
        folderId,
        query: fileName
      });

      return result.files.find(file => file.name === fileName) || null;
    } catch (error) {
      logger.error('Error finding file in Drive:', error);
      return null;
    }
  }

  /**
   * Get or create folder path in Drive
   * @param {string} folderPath - Local folder path
   * @param {string} rootFolderId - Root Drive folder ID
   * @returns {string} Drive folder ID
   */
  async getOrCreateFolderPath(folderPath, rootFolderId) {
    if (!folderPath || folderPath === '.' || folderPath === '/') {
      return rootFolderId;
    }

    const pathParts = folderPath.split('/').filter(part => part);
    let currentFolderId = rootFolderId;

    for (const folderName of pathParts) {
      const result = await this.driveService.listFiles({
        folderId: currentFolderId,
        query: folderName
      });

      let folder = result.files.find(
        file => file.name === folderName && 
                file.mimeType === 'application/vnd.google-apps.folder'
      );

      if (!folder) {
        folder = await this.driveService.createFolder(folderName, currentFolderId);
      }

      currentFolderId = folder.id;
    }

    return currentFolderId;
  }

  /**
   * Get all files from Drive folder recursively
   * @param {string} folderId - Drive folder ID
   * @returns {Array} Array of Drive files
   */
  async getAllFilesFromFolder(folderId) {
    const allFiles = [];
    let pageToken = null;

    do {
      const result = await this.driveService.listFiles({
        folderId,
        pageSize: 1000,
        pageToken
      });

      allFiles.push(...result.files);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Get relative path from Drive file structure
   * @param {Object} driveFile - Drive file object
   * @param {string} rootFolderId - Root folder ID
   * @returns {string} Relative path
   */
  async getRelativePathFromDrive(driveFile, rootFolderId) {
    // For now, just return the file name
    // In a more complex implementation, you'd traverse the parent hierarchy
    return driveFile.name;
  }

  /**
   * Get MIME type for file
   * @param {string} filePath - File path
   * @param {string} language - Programming language
   * @returns {string} MIME type
   */
  getMimeType(filePath, language) {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.h': 'text/x-chdr',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.yml': 'application/x-yaml',
      '.yaml': 'application/x-yaml'
    };

    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * Get programming language from file path
   * @param {string} filePath - File path
   * @returns {string} Programming language
   */
  getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    const languages = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.css': 'css',
      '.html': 'html',
      '.json': 'json',
      '.xml': 'xml',
      '.md': 'markdown',
      '.txt': 'plaintext',
      '.yml': 'yaml',
      '.yaml': 'yaml'
    };

    return languages[ext] || 'plaintext';
  }
}

module.exports = WorkspaceSyncService;