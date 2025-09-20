const { google } = require('googleapis');
const logger = require('../utils/logger');
const config = require('../config');

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.auth.google.clientId,
      config.auth.google.clientSecret,
      config.auth.google.callbackUrl
    );
    
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Set credentials for the OAuth2 client
   * @param {Object} tokens - Access and refresh tokens
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Get authorization URL for Google Drive access
   * @param {string} userId - User ID for state parameter
   * @returns {string} Authorization URL
   */
  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from Google
   * @returns {Object} Token information
   */
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error('Error getting tokens from Google:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New token information
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * List files in Google Drive
   * @param {Object} options - Query options
   * @returns {Array} List of files
   */
  async listFiles(options = {}) {
    try {
      const {
        folderId = null,
        pageSize = 100,
        pageToken = null,
        query = null,
        orderBy = 'modifiedTime desc'
      } = options;

      let q = "trashed = false";
      
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }
      
      if (query) {
        q += ` and name contains '${query}'`;
      }

      const response = await this.drive.files.list({
        q,
        pageSize,
        pageToken,
        orderBy,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, iconLink)'
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      logger.error('Error listing Drive files:', error);
      throw new Error('Failed to list Drive files');
    }
  }

  /**
   * Get file metadata
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} File metadata
   */
  async getFileMetadata(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, iconLink, description'
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * Download file content from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Buffer} File content
   */
  async downloadFile(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        const chunks = [];
        response.data.on('data', chunk => chunks.push(chunk));
        response.data.on('end', () => resolve(Buffer.concat(chunks)));
        response.data.on('error', reject);
      });
    } catch (error) {
      logger.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Upload file to Google Drive
   * @param {Object} fileData - File information
   * @returns {Object} Uploaded file metadata
   */
  async uploadFile(fileData) {
    try {
      const { name, content, mimeType, parentId = null } = fileData;

      const fileMetadata = {
        name,
        parents: parentId ? [parentId] : undefined
      };

      const media = {
        mimeType: mimeType || 'text/plain',
        body: content
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink'
      });

      return response.data;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Update file content in Google Drive
   * @param {string} fileId - Google Drive file ID
   * @param {string|Buffer} content - New file content
   * @param {string} mimeType - File MIME type
   * @returns {Object} Updated file metadata
   */
  async updateFile(fileId, content, mimeType = 'text/plain') {
    try {
      const media = {
        mimeType,
        body: content
      };

      const response = await this.drive.files.update({
        fileId,
        media,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink'
      });

      return response.data;
    } catch (error) {
      logger.error('Error updating file:', error);
      throw new Error('Failed to update file');
    }
  }

  /**
   * Create folder in Google Drive
   * @param {string} name - Folder name
   * @param {string} parentId - Parent folder ID (optional)
   * @returns {Object} Created folder metadata
   */
  async createFolder(name, parentId = null) {
    try {
      const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name, mimeType, createdTime, parents'
      });

      return response.data;
    } catch (error) {
      logger.error('Error creating folder:', error);
      throw new Error('Failed to create folder');
    }
  }

  /**
   * Delete file from Google Drive
   * @param {string} fileId - Google Drive file ID
   */
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Search files in Google Drive
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchFiles(query, options = {}) {
    try {
      const {
        pageSize = 50,
        pageToken = null,
        orderBy = 'relevance'
      } = options;

      const q = `name contains '${query}' and trashed = false`;

      const response = await this.drive.files.list({
        q,
        pageSize,
        pageToken,
        orderBy,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, iconLink)'
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      logger.error('Error searching files:', error);
      throw new Error('Failed to search files');
    }
  }

  /**
   * Get user's Drive storage info
   * @returns {Object} Storage information
   */
  async getStorageInfo() {
    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota, user'
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting storage info:', error);
      throw new Error('Failed to get storage information');
    }
  }

  /**
   * Check if user has valid Drive access
   * @returns {boolean} True if access is valid
   */
  async checkAccess() {
    try {
      await this.drive.about.get({
        fields: 'user'
      });
      return true;
    } catch (error) {
      logger.error('Drive access check failed:', error);
      return false;
    }
  }
}

module.exports = GoogleDriveService;