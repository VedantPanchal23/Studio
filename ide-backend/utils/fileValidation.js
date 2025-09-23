const path = require('path');

/**
 * File validation utilities
 */
class FileValidation {
  constructor() {
    // Language detection based on file extensions
    this.languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.cxx': 'cpp',
      '.cc': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.fish': 'shell',
      '.bat': 'shell',
      '.cmd': 'shell',
      '.ps1': 'shell',
      '.dockerfile': 'dockerfile',
      '.txt': 'plaintext',
      '.log': 'plaintext',
      '.env': 'plaintext',
      '.gitignore': 'plaintext',
      '.gitattributes': 'plaintext',
      '.editorconfig': 'plaintext'
    };

    // Binary file extensions that should not be processed
    this.binaryExtensions = new Set([
      '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
      '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.class', '.jar', '.war', '.ear',
      '.o', '.obj', '.lib', '.a'
    ]);

    // Dangerous file extensions that should be blocked (removed .js, .bat, .cmd, .ps1 for development)
    this.dangerousExtensions = new Set([
      '.exe', '.com', '.pif', '.scr', '.vbs', '.vbe',
      '.jse', '.ws', '.wsf', '.wsc', '.wsh', '.ps1xml',
      '.ps2', '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1', '.msh2',
      '.mshxml', '.msh1xml', '.msh2xml', '.scf', '.lnk', '.inf',
      '.reg', '.dll', '.cpl', '.msc', '.msi', '.msp', '.mst'
    ]);

    // Maximum file sizes by type (in bytes)
    this.maxFileSizes = {
      text: 10 * 1024 * 1024, // 10MB for text files
      binary: 50 * 1024 * 1024, // 50MB for binary files
      image: 20 * 1024 * 1024, // 20MB for images
      default: 10 * 1024 * 1024 // 10MB default
    };
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.languageMap[ext] || 'plaintext';
  }

  /**
   * Check if file extension is allowed
   */
  isAllowedExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    // Allow files without extensions
    if (!ext) return true;
    
    // Block dangerous extensions
    if (this.dangerousExtensions.has(ext)) {
      return false;
    }
    
    // Allow known text/code extensions
    if (this.languageMap[ext]) {
      return true;
    }
    
    // Block binary extensions
    if (this.binaryExtensions.has(ext)) {
      return false;
    }
    
    // Allow other extensions (with caution)
    return true;
  }

  /**
   * Check if file is binary based on extension
   */
  isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.binaryExtensions.has(ext);
  }

  /**
   * Validate file name
   */
  validateFileName(fileName) {
    const errors = [];

    // Check for empty name
    if (!fileName || fileName.trim().length === 0) {
      errors.push('File name cannot be empty');
    }

    // Check length
    if (fileName.length > 255) {
      errors.push('File name too long (max 255 characters)');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
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
   * Validate file path
   */
  validateFilePath(filePath) {
    const errors = [];

    // Check for empty path
    if (!filePath || filePath.trim().length === 0) {
      errors.push('File path cannot be empty');
    }

    // Check length
    if (filePath.length > 500) {
      errors.push('File path too long (max 500 characters)');
    }

    // Check for path traversal
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\..\\')) {
      errors.push('Path traversal not allowed');
    }

    // Check for invalid characters in path
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(filePath)) {
      errors.push('File path contains invalid characters');
    }

    // Validate each path segment
    const segments = filePath.split(/[/\\]/);
    for (const segment of segments) {
      if (segment) {
        const nameValidation = this.validateFileName(segment);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors.map(err => `Path segment "${segment}": ${err}`));
        }
      }
    }

    // Check file extension
    if (!this.isAllowedExtension(filePath)) {
      const ext = path.extname(filePath);
      errors.push(`File extension '${ext}' is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file content
   */
  validateFileContent(content, filePath) {
    const errors = [];
    const warnings = [];

    // Check content size
    const size = Buffer.byteLength(content, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    let maxSize = this.maxFileSizes.default;
    if (this.isBinaryFile(filePath)) {
      maxSize = this.maxFileSizes.binary;
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext)) {
      maxSize = this.maxFileSizes.image;
    } else {
      maxSize = this.maxFileSizes.text;
    }

    if (size > maxSize) {
      errors.push(`File size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    // Check for potentially dangerous content patterns
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /<script[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        warnings.push(`Potentially dangerous content detected: ${pattern.source}`);
      }
    }

    // Check for very long lines (potential minified code or data)
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 1000);
    if (longLines.length > 0) {
      warnings.push(`File contains ${longLines.length} very long lines (>1000 characters)`);
    }

    // Check for binary content in text files
    if (!this.isBinaryFile(filePath)) {
      const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F]/;
      if (binaryPattern.test(content)) {
        warnings.push('File appears to contain binary data but has a text extension');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      size,
      language: this.detectLanguage(filePath)
    };
  }

  /**
   * Sanitize file name
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Replace invalid characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize file path
   */
  sanitizeFilePath(filePath) {
    return filePath
      .replace(/\\/g, '/') // Normalize path separators
      .replace(/\/+/g, '/') // Remove duplicate slashes
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, '') // Remove trailing slashes
      .split('/')
      .map(segment => this.sanitizeFileName(segment))
      .filter(segment => segment && segment !== '.' && segment !== '..')
      .join('/');
  }

  /**
   * Get file type category
   */
  getFileCategory(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb'].includes(ext)) {
      return 'code';
    }
    
    if (['.html', '.htm', '.css', '.scss', '.less'].includes(ext)) {
      return 'web';
    }
    
    if (['.json', '.xml', '.yaml', '.yml'].includes(ext)) {
      return 'data';
    }
    
    if (['.md', '.markdown', '.txt'].includes(ext)) {
      return 'text';
    }
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext)) {
      return 'image';
    }
    
    if (['.sh', '.bat', '.cmd', '.ps1'].includes(ext)) {
      return 'script';
    }
    
    if (this.binaryExtensions.has(ext)) {
      return 'binary';
    }
    
    return 'other';
  }

  /**
   * Check if file should be syntax highlighted
   */
  shouldHighlight(filePath) {
    const category = this.getFileCategory(filePath);
    return ['code', 'web', 'data', 'text', 'script'].includes(category);
  }

  /**
   * Get recommended file encoding
   */
  getRecommendedEncoding(filePath) {
    const category = this.getFileCategory(filePath);
    
    if (category === 'binary') {
      return 'binary';
    }
    
    return 'utf8';
  }
}

module.exports = new FileValidation();