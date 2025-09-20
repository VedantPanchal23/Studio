const GoogleDriveService = require('../services/googleDriveService');

describe('GoogleDriveService', () => {
  let driveService;

  beforeEach(() => {
    driveService = new GoogleDriveService();
  });

  describe('constructor', () => {
    it('should initialize with OAuth2 client', () => {
      expect(driveService.oauth2Client).toBeDefined();
      expect(driveService.drive).toBeDefined();
    });
  });

  describe('getAuthUrl', () => {
    it('should generate authorization URL', () => {
      const userId = 'test-user-id';
      const authUrl = driveService.getAuthUrl(userId);
      
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=' + userId);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types for different file extensions', () => {
      expect(driveService.getMimeType('test.js', 'javascript')).toBe('application/javascript');
      expect(driveService.getMimeType('test.py', 'python')).toBe('text/x-python');
      expect(driveService.getMimeType('test.txt', 'plaintext')).toBe('text/plain');
      expect(driveService.getMimeType('test.unknown', 'unknown')).toBe('text/plain');
    });
  });

  describe('getLanguageFromPath', () => {
    it('should return correct language for different file extensions', () => {
      expect(driveService.getLanguageFromPath('test.js')).toBe('javascript');
      expect(driveService.getLanguageFromPath('test.py')).toBe('python');
      expect(driveService.getLanguageFromPath('test.java')).toBe('java');
      expect(driveService.getLanguageFromPath('test.unknown')).toBe('plaintext');
    });
  });

  describe('shouldExcludeFile', () => {
    it('should exclude files based on patterns', () => {
      const excludePatterns = ['.git', 'node_modules', '*.log'];
      
      expect(driveService.shouldExcludeFile('.git/config', excludePatterns)).toBe(true);
      expect(driveService.shouldExcludeFile('node_modules/package.json', excludePatterns)).toBe(true);
      expect(driveService.shouldExcludeFile('app.log', excludePatterns)).toBe(true);
      expect(driveService.shouldExcludeFile('src/index.js', excludePatterns)).toBe(false);
    });
  });
});

// Note: Integration tests with actual Google Drive API would require
// valid credentials and should be run separately from unit tests