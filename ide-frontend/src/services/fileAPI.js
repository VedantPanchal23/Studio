import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * File API service for managing workspace files
 */
export class FileAPI {
  /**
   * List files in workspace directory
   * @param {string} workspaceId - Workspace ID
   * @param {string} path - Directory path (optional)
   * @returns {Promise<Object>} Files and stats
   */
  static async listFiles(workspaceId, path = '') {
    try {
      const response = await apiClient.get(`/files/${workspaceId}`, {
        params: path ? { path } : {}
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to list files');
    }
  }

  /**
   * Get file content
   * @param {string} workspaceId - Workspace ID
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File content and metadata
   */
  static async getFile(workspaceId, filePath) {
    try {
      const response = await apiClient.get(`/files/${workspaceId}/${filePath}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get file');
    }
  }

  /**
   * Create or update file
   * @param {string} workspaceId - Workspace ID
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {string} language - Programming language (optional)
   * @returns {Promise<Object>} Save result
   */
  static async saveFile(workspaceId, filePath, content, language = null) {
    try {
      const response = await apiClient.put(`/files/${workspaceId}/${filePath}`, {
        content,
        language
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to save file');
    }
  }

  /**
   * Create new file or directory
   * @param {string} workspaceId - Workspace ID
   * @param {string} path - Item path
   * @param {string} type - 'file' or 'directory'
   * @param {string} content - File content (for files only)
   * @returns {Promise<Object>} Creation result
   */
  static async createItem(workspaceId, path, type, content = '') {
    try {
      const response = await apiClient.post(`/files/${workspaceId}/create`, {
        path,
        type,
        content
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create item');
    }
  }

  /**
   * Delete file or directory
   * @param {string} workspaceId - Workspace ID
   * @param {string} filePath - File/directory path
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteItem(workspaceId, filePath) {
    try {
      const response = await apiClient.delete(`/files/${workspaceId}/${filePath}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete item');
    }
  }

  /**
   * Move/rename file or directory
   * @param {string} workspaceId - Workspace ID
   * @param {string} from - Source path
   * @param {string} to - Destination path
   * @returns {Promise<Object>} Move result
   */
  static async moveItem(workspaceId, from, to) {
    try {
      const response = await apiClient.post(`/files/${workspaceId}/move`, {
        from,
        to
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to move item');
    }
  }

  /**
   * Copy file or directory
   * @param {string} workspaceId - Workspace ID
   * @param {string} from - Source path
   * @param {string} to - Destination path
   * @returns {Promise<Object>} Copy result
   */
  static async copyItem(workspaceId, from, to) {
    try {
      const response = await apiClient.post(`/files/${workspaceId}/copy`, {
        from,
        to
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to copy item');
    }
  }

  /**
   * Upload files
   * @param {string} workspaceId - Workspace ID
   * @param {FileList} files - Files to upload
   * @param {string} path - Upload path (optional)
   * @returns {Promise<Object>} Upload result
   */
  static async uploadFiles(workspaceId, files, path = '') {
    try {
      const formData = new FormData();

      // Add files to form data
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      // Add path if specified
      if (path) {
        formData.append('path', path);
      }

      const response = await apiClient.post(`/files/${workspaceId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to upload files');
    }
  }

  /**
   * Download file
   * @param {string} workspaceId - Workspace ID
   * @param {string} filePath - File path
   * @returns {Promise<Blob>} File blob
   */
  static async downloadFile(workspaceId, filePath) {
    try {
      const response = await apiClient.get(`/files/${workspaceId}/download/${filePath}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to download file');
    }
  }

  /**
   * Search files in workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  static async searchFiles(workspaceId, query, options = {}) {
    // This would be implemented when search functionality is added to backend
    // For now, we'll do client-side filtering
    try {
      const { files } = await this.listFiles(workspaceId);
      return this.filterFiles(files, query, options);
    } catch {
      throw new Error('Failed to search files');
    }
  }

  /**
   * Client-side file filtering
   * @param {Array} files - Files array
   * @param {string} query - Search query
   * @param {Object} options - Filter options
   * @returns {Array} Filtered files
   */
  static filterFiles(files, query, options = {}) {
    if (!query) return files;

    const { caseSensitive = false } = options;
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return files.filter(file => {
      const fileName = caseSensitive ? file.name : file.name.toLowerCase();
      const filePath = caseSensitive ? file.path : file.path.toLowerCase();

      // Search in file name and path
      if (fileName.includes(searchQuery) || filePath.includes(searchQuery)) {
        return true;
      }

      // Search in file extension
      if (file.extension && file.extension.toLowerCase().includes(searchQuery)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get file icon based on extension
   * @param {string} fileName - File name
   * @param {string} type - File type ('file' or 'directory')
   * @returns {string} Icon emoji or class
   */
  static getFileIcon(fileName, type = 'file') {
    if (type === 'directory') {
      return '📁';
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      // Programming languages
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'cxx': '⚙️',
      'cc': '⚙️',
      'c': '⚙️',
      'h': '📄',
      'hpp': '📄',
      'go': '🐹',
      'rs': '🦀',
      'php': '🐘',
      'rb': '💎',
      'swift': '🦉',
      'kt': '📱',
      'scala': '📊',

      // Web technologies
      'html': '🌐',
      'htm': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'less': '🎨',

      // Data formats
      'json': '📋',
      'xml': '📄',
      'yaml': '📄',
      'yml': '📄',
      'csv': '📊',
      'sql': '🗃️',

      // Documentation
      'md': '📝',
      'markdown': '📝',
      'txt': '📄',
      'rtf': '📄',
      'pdf': '📕',

      // Scripts
      'sh': '🐚',
      'bash': '🐚',
      'zsh': '🐚',
      'fish': '🐚',
      'bat': '⚙️',
      'cmd': '⚙️',
      'ps1': '💙',

      // Config files
      'env': '⚙️',
      'config': '⚙️',
      'conf': '⚙️',
      'ini': '⚙️',
      'toml': '⚙️',

      // Images
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'svg': '🎨',
      'ico': '🖼️',
      'bmp': '🖼️',

      // Archives
      'zip': '📦',
      'tar': '📦',
      'gz': '📦',
      'rar': '📦',
      '7z': '📦',

      // Git
      'gitignore': '🚫',
      'gitattributes': '⚙️',

      // Package managers
      'package': '📦',
      'lock': '🔒',
      'yarn': '📦',

      // Docker
      'dockerfile': '🐳',
      'dockerignore': '🐳'
    };

    return iconMap[extension] || '📄';
  }

  /**
   * Validate file name
   * @param {string} fileName - File name to validate
   * @returns {Object} Validation result
   */
  static validateFileName(fileName) {
    const errors = [];

    if (!fileName || fileName.trim().length === 0) {
      errors.push('File name cannot be empty');
    }

    if (fileName.length > 255) {
      errors.push('File name too long (max 255 characters)');
    }

    // Check for invalid characters
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\u0000-\u001F]/;
    if (invalidChars.test(fileName)) {
      errors.push('File name contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      errors.push('File name is reserved and cannot be used');
    }

    // Check for leading/trailing spaces or dots
    if (fileName !== fileName.trim()) {
      errors.push('File name cannot start or end with spaces');
    }

    if (fileName.endsWith('.')) {
      errors.push('File name cannot end with a dot');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Sort files by various criteria
   * @param {Array} files - Files array
   * @param {string} sortBy - Sort criteria ('name', 'type', 'size', 'modified')
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted files
   */
  static sortFiles(files, sortBy = 'name', order = 'asc') {
    const sorted = [...files].sort((a, b) => {
      let comparison = 0;

      // Always put directories first
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'modified':
          comparison = new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
          break;
        case 'type': {
          const aExt = a.extension || '';
          const bExt = b.extension || '';
          comparison = aExt.localeCompare(bExt);
          break;
        }
        default:
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }
}

export default FileAPI;