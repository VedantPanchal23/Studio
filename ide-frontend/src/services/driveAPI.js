import api from './api';

class DriveAPI {
  /**
   * Get Google Drive authorization URL
   * @returns {Promise<Object>} Authorization URL response
   */
  async getAuthUrl() {
    try {
      const response = await api.get('/drive/auth-url');
      return response.data;
    } catch (error) {
      console.error('Error getting Drive auth URL:', error);
      throw error;
    }
  }

  /**
   * Handle Google Drive OAuth callback
   * @param {string} code - Authorization code from Google
   * @param {string} state - State parameter
   * @returns {Promise<Object>} Callback response
   */
  async handleCallback(code, state) {
    try {
      const response = await api.post('/drive/callback', { code, state });
      return response.data;
    } catch (error) {
      console.error('Error handling Drive callback:', error);
      throw error;
    }
  }

  /**
   * Check Google Drive connection status
   * @returns {Promise<Object>} Connection status
   */
  async getStatus() {
    try {
      const response = await api.get('/drive/status');
      return response.data;
    } catch (error) {
      console.error('Error getting Drive status:', error);
      throw error;
    }
  }

  /**
   * List files in Google Drive
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Files list response
   */
  async listFiles(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.folderId) params.append('folderId', options.folderId);
      if (options.pageSize) params.append('pageSize', options.pageSize);
      if (options.pageToken) params.append('pageToken', options.pageToken);
      if (options.query) params.append('query', options.query);
      if (options.orderBy) params.append('orderBy', options.orderBy);

      const response = await api.get(`/drive/files?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error listing Drive files:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileId) {
    try {
      const response = await api.get(`/drive/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Download file content from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<Object>} File content
   */
  async downloadFile(fileId) {
    try {
      const response = await api.get(`/drive/files/${fileId}/download`);
      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive
   * @param {Object} fileData - File data
   * @returns {Promise<Object>} Upload response
   */
  async uploadFile(fileData) {
    try {
      const response = await api.post('/drive/files', fileData);
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Update file content in Google Drive
   * @param {string} fileId - Google Drive file ID
   * @param {Object} fileData - Updated file data
   * @returns {Promise<Object>} Update response
   */
  async updateFile(fileId, fileData) {
    try {
      const response = await api.put(`/drive/files/${fileId}`, fileData);
      return response.data;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  /**
   * Create folder in Google Drive
   * @param {Object} folderData - Folder data
   * @returns {Promise<Object>} Create folder response
   */
  async createFolder(folderData) {
    try {
      const response = await api.post('/drive/folders', folderData);
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<Object>} Delete response
   */
  async deleteFile(fileId) {
    try {
      const response = await api.delete(`/drive/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Search files in Google Drive
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchFiles(query, options = {}) {
    try {
      const params = new URLSearchParams({ q: query });
      
      if (options.pageSize) params.append('pageSize', options.pageSize);
      if (options.pageToken) params.append('pageToken', options.pageToken);

      const response = await api.get(`/drive/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  /**
   * Get Google Drive storage information
   * @returns {Promise<Object>} Storage information
   */
  async getStorageInfo() {
    try {
      const response = await api.get('/drive/storage');
      return response.data;
    } catch (error) {
      console.error('Error getting storage info:', error);
      throw error;
    }
  }

  /**
   * Sync workspace to Google Drive
   * @param {string} workspaceId - Workspace ID
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async syncWorkspace(workspaceId, options = {}) {
    try {
      const response = await api.post(`/drive/sync/${workspaceId}`, options);
      return response.data;
    } catch (error) {
      console.error('Error syncing workspace:', error);
      throw error;
    }
  }

  /**
   * Import files from Google Drive to workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} folderId - Drive folder ID
   * @returns {Promise<Object>} Import result
   */
  async importFromDrive(workspaceId, folderId) {
    try {
      const response = await api.post(`/drive/import/${workspaceId}`, { folderId });
      return response.data;
    } catch (error) {
      console.error('Error importing from Drive:', error);
      throw error;
    }
  }

  /**
   * Get workspace sync status
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<Object>} Sync status
   */
  async getSyncStatus(workspaceId) {
    try {
      const response = await api.get(`/drive/sync/${workspaceId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Disconnect Google Drive integration
   * @returns {Promise<Object>} Disconnect response
   */
  async disconnect() {
    try {
      const response = await api.post('/drive/disconnect');
      return response.data;
    } catch (error) {
      console.error('Error disconnecting Drive:', error);
      throw error;
    }
  }
}

export default new DriveAPI();