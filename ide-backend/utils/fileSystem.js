const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * File system utilities for workspace management
 */
class FileSystemUtils {
  constructor() {
    this.workspaceBasePath = process.env.WORKSPACE_BASE_PATH || './workspaces';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
    this.allowedExtensions = new Set([
      '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.scss', '.less',
      '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.go', '.rs', '.php', '.rb',
      '.swift', '.kt', '.scala', '.sql', '.md', '.txt', '.xml', '.yaml', '.yml',
      '.dockerfile', '.sh', '.bat', '.ps1', '.gitignore', '.env'
    ]);
  }

  /**
   * Initialize workspace directory structure
   */
  async initializeWorkspaceDirectory() {
    try {
      await fs.mkdir(this.workspaceBasePath, { recursive: true });
      logger.info(`Workspace base directory initialized: ${this.workspaceBasePath}`);
    } catch (error) {
      logger.error('Failed to initialize workspace directory:', error);
      throw error;
    }
  }

  /**
   * Get workspace directory path
   */
  getWorkspacePath(workspaceId) {
    return path.join(this.workspaceBasePath, workspaceId.toString());
  }

  /**
   * Get full file path within workspace
   */
  getFilePath(workspaceId, filePath) {
    const workspacePath = this.getWorkspacePath(workspaceId);
    const fullPath = path.join(workspacePath, filePath);
    
    // Security check: ensure file is within workspace
    if (!fullPath.startsWith(workspacePath)) {
      throw new Error('Invalid file path: Path traversal detected');
    }
    
    return fullPath;
  }

  /**
   * Validate file path and extension
   */
  validateFilePath(filePath) {
    // Check for invalid characters
    if (/[<>:"|?*\x00-\x1f]/.test(filePath)) {
      throw new Error('Invalid characters in file path');
    }

    // Check for path traversal
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\..\\')) {
      throw new Error('Path traversal not allowed');
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext && !this.allowedExtensions.has(ext)) {
      throw new Error(`File extension '${ext}' is not allowed`);
    }

    // Check path length
    if (filePath.length > 500) {
      throw new Error('File path too long (max 500 characters)');
    }

    return true;
  }

  /**
   * Validate file content size
   */
  validateFileSize(content) {
    const size = Buffer.byteLength(content, 'utf8');
    if (size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size (${this.maxFileSize} bytes)`);
    }
    return size;
  }

  /**
   * Create workspace directory
   */
  async createWorkspaceDirectory(workspaceId) {
    const workspacePath = this.getWorkspacePath(workspaceId);
    
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      logger.info(`Created workspace directory: ${workspacePath}`);
      return workspacePath;
    } catch (error) {
      logger.error(`Failed to create workspace directory ${workspacePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete workspace directory
   */
  async deleteWorkspaceDirectory(workspaceId) {
    const workspacePath = this.getWorkspacePath(workspaceId);
    
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      logger.info(`Deleted workspace directory: ${workspacePath}`);
    } catch (error) {
      logger.error(`Failed to delete workspace directory ${workspacePath}:`, error);
      throw error;
    }
  }

  /**
   * Read file content
   */
  async readFile(workspaceId, filePath) {
    this.validateFilePath(filePath);
    const fullPath = this.getFilePath(workspaceId, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      logger.error(`Failed to read file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Write file content
   */
  async writeFile(workspaceId, filePath, content) {
    this.validateFilePath(filePath);
    const size = this.validateFileSize(content);
    const fullPath = this.getFilePath(workspaceId, filePath);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf8');
      logger.info(`File written: ${fullPath} (${size} bytes)`);
      return size;
    } catch (error) {
      logger.error(`Failed to write file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(workspaceId, filePath) {
    this.validateFilePath(filePath);
    const fullPath = this.getFilePath(workspaceId, filePath);
    
    try {
      await fs.unlink(fullPath);
      logger.info(`File deleted: ${fullPath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      logger.error(`Failed to delete file ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Create directory
   */
  async createDirectory(workspaceId, dirPath) {
    this.validateFilePath(dirPath);
    const fullPath = this.getFilePath(workspaceId, dirPath);
    
    try {
      await fs.mkdir(fullPath, { recursive: true });
      logger.info(`Directory created: ${fullPath}`);
    } catch (error) {
      logger.error(`Failed to create directory ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Delete directory
   */
  async deleteDirectory(workspaceId, dirPath) {
    this.validateFilePath(dirPath);
    const fullPath = this.getFilePath(workspaceId, dirPath);
    
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
      logger.info(`Directory deleted: ${fullPath}`);
    } catch (error) {
      logger.error(`Failed to delete directory ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(workspaceId, dirPath = '') {
    if (dirPath) {
      this.validateFilePath(dirPath);
    }
    const fullPath = this.getFilePath(workspaceId, dirPath);
    
    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const result = [];
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const stats = await fs.stat(path.join(fullPath, item.name));
        
        result.push({
          name: item.name,
          path: itemPath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: item.isFile() ? stats.size : 0,
          lastModified: stats.mtime,
          extension: item.isFile() ? path.extname(item.name) : null
        });
      }
      
      return result.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        // Alphabetical order
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Directory not found');
      }
      logger.error(`Failed to list directory ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Move/rename file or directory
   */
  async moveItem(workspaceId, oldPath, newPath) {
    this.validateFilePath(oldPath);
    this.validateFilePath(newPath);
    
    const oldFullPath = this.getFilePath(workspaceId, oldPath);
    const newFullPath = this.getFilePath(workspaceId, newPath);
    
    try {
      // Ensure destination directory exists
      const newDir = path.dirname(newFullPath);
      await fs.mkdir(newDir, { recursive: true });
      
      await fs.rename(oldFullPath, newFullPath);
      logger.info(`Item moved: ${oldFullPath} -> ${newFullPath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Source file or directory not found');
      }
      logger.error(`Failed to move item ${oldFullPath} to ${newFullPath}:`, error);
      throw error;
    }
  }

  /**
   * Copy file or directory
   */
  async copyItem(workspaceId, sourcePath, destPath) {
    this.validateFilePath(sourcePath);
    this.validateFilePath(destPath);
    
    const sourceFullPath = this.getFilePath(workspaceId, sourcePath);
    const destFullPath = this.getFilePath(workspaceId, destPath);
    
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destFullPath);
      await fs.mkdir(destDir, { recursive: true });
      
      const stats = await fs.stat(sourceFullPath);
      
      if (stats.isDirectory()) {
        await fs.cp(sourceFullPath, destFullPath, { recursive: true });
      } else {
        await fs.copyFile(sourceFullPath, destFullPath);
      }
      
      logger.info(`Item copied: ${sourceFullPath} -> ${destFullPath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Source file or directory not found');
      }
      logger.error(`Failed to copy item ${sourceFullPath} to ${destFullPath}:`, error);
      throw error;
    }
  }

  /**
   * Get file/directory stats
   */
  async getItemStats(workspaceId, itemPath) {
    this.validateFilePath(itemPath);
    const fullPath = this.getFilePath(workspaceId, itemPath);
    
    try {
      const stats = await fs.stat(fullPath);
      return {
        path: itemPath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File or directory not found');
      }
      logger.error(`Failed to get stats for ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Check if file or directory exists
   */
  async exists(workspaceId, itemPath) {
    try {
      this.validateFilePath(itemPath);
      const fullPath = this.getFilePath(workspaceId, itemPath);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get workspace size and file count
   */
  async getWorkspaceStats(workspaceId) {
    const workspacePath = this.getWorkspacePath(workspaceId);
    
    try {
      const stats = { totalSize: 0, fileCount: 0, directoryCount: 0 };
      
      const calculateSize = async (dirPath) => {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item.name);
          
          if (item.isDirectory()) {
            stats.directoryCount++;
            await calculateSize(itemPath);
          } else {
            stats.fileCount++;
            const itemStats = await fs.stat(itemPath);
            stats.totalSize += itemStats.size;
          }
        }
      };
      
      await calculateSize(workspacePath);
      return stats;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { totalSize: 0, fileCount: 0, directoryCount: 0 };
      }
      logger.error(`Failed to calculate workspace stats for ${workspacePath}:`, error);
      throw error;
    }
  }

  /**
   * Initialize workspace with default structure
   */
  async initializeWorkspace(workspaceId) {
    const workspacePath = this.getWorkspacePath(workspaceId);
    
    try {
      // Create workspace directory
      await fs.mkdir(workspacePath, { recursive: true });
      
      // Create default files and directories
      const defaultStructure = [
        { type: 'file', path: 'README.md', content: '# New Workspace\n\nWelcome to your new workspace!\n' },
        { type: 'file', path: 'main.js', content: '// Welcome to your new workspace\nconsole.log("Hello, World!");\n' },
        { type: 'directory', path: 'src' },
        { type: 'directory', path: 'tests' }
      ];
      
      for (const item of defaultStructure) {
        if (item.type === 'file') {
          await this.writeFile(workspaceId, item.path, item.content);
        } else if (item.type === 'directory') {
          await this.createDirectory(workspaceId, item.path);
        }
      }
      
      logger.info(`Initialized workspace with default structure: ${workspacePath}`);
    } catch (error) {
      logger.error(`Failed to initialize workspace ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Delete entire workspace
   */
  async deleteWorkspace(workspaceId) {
    return this.deleteWorkspaceDirectory(workspaceId);
  }

  /**
   * Copy all files from one workspace to another
   */
  async copyWorkspaceFiles(sourceWorkspaceId, destWorkspaceId) {
    const sourcePath = this.getWorkspacePath(sourceWorkspaceId);
    const destPath = this.getWorkspacePath(destWorkspaceId);
    
    try {
      // Ensure destination workspace exists
      await fs.mkdir(destPath, { recursive: true });
      
      // Copy all files recursively
      await fs.cp(sourcePath, destPath, { recursive: true });
      
      logger.info(`Copied workspace files from ${sourceWorkspaceId} to ${destWorkspaceId}`);
    } catch (error) {
      logger.error(`Failed to copy workspace files from ${sourceWorkspaceId} to ${destWorkspaceId}:`, error);
      throw error;
    }
  }
}

module.exports = new FileSystemUtils();