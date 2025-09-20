// Mock child_process before importing lspService
jest.mock('child_process');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const lspService = require('../services/lspService');

describe('LSPService - Basic Functionality', () => {
  afterEach(async () => {
    // Clean up any running servers
    await lspService.shutdown();
  });

  describe('Server Configuration', () => {
    test('should have configurations for supported languages', () => {
      const supportedLanguages = lspService.getSupportedLanguages();
      
      expect(supportedLanguages).toContain('typescript');
      expect(supportedLanguages).toContain('javascript');
      expect(supportedLanguages).toContain('python');
      expect(supportedLanguages).toContain('java');
      expect(supportedLanguages).toContain('go');
      expect(supportedLanguages).toContain('rust');
      expect(supportedLanguages).toContain('c');
      expect(supportedLanguages).toContain('cpp');
    });

    test('should get server config for supported language', () => {
      const config = lspService.getServerConfig('typescript');
      
      expect(config).toBeDefined();
      expect(config.name).toBe('typescript-language-server');
      expect(config.command).toBe('typescript-language-server');
      expect(config.languages).toContain('typescript');
      expect(config.languages).toContain('javascript');
    });

    test('should return null for unsupported language', () => {
      const config = lspService.getServerConfig('unsupported-language');
      expect(config).toBeNull();
    });

    test('should find config by language in supported languages array', () => {
      const config = lspService.getServerConfig('javascriptreact');
      
      expect(config).toBeDefined();
      expect(config.name).toBe('typescript-language-server');
      expect(config.languages).toContain('javascriptreact');
    });
  });

  describe('Server Information', () => {
    test('should return empty array when no servers are active', () => {
      const servers = lspService.getActiveServers();
      expect(servers).toEqual([]);
    });

    test('should return supported languages list', () => {
      const languages = lspService.getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should fail to start server for unsupported language', async () => {
      const language = 'unsupported-language';
      const workspaceRoot = '/test/workspace';
      
      await expect(lspService.startServer(language, workspaceRoot))
        .rejects.toThrow('No LSP server configuration found for language: unsupported-language');
    });

    test('should return false when stopping non-existent server', async () => {
      const stopped = await lspService.stopServer('non-existent-server');
      expect(stopped).toBe(false);
    });

    test('should return false when removing non-existent connection', () => {
      const removed = lspService.removeConnection('non-existent-connection');
      expect(removed).toBe(false);
    });

    test('should throw error when creating connection for non-existent server', () => {
      const mockSocket = { id: 'test-socket-id' };
      const workspaceRoot = '/test/workspace';
      
      expect(() => {
        lspService.createConnection('non-existent-server', mockSocket, workspaceRoot);
      }).toThrow('LSP server not found: non-existent-server');
    });
  });

  describe('Configuration Validation', () => {
    test('should have valid configuration for each supported language', () => {
      const supportedLanguages = lspService.getSupportedLanguages();
      
      supportedLanguages.forEach(language => {
        const config = lspService.getServerConfig(language);
        expect(config).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.command).toBeDefined();
        expect(Array.isArray(config.languages)).toBe(true);
        expect(config.languages.length).toBeGreaterThan(0);
        expect(typeof config.initializationOptions).toBe('object');
        expect(typeof config.settings).toBe('object');
      });
    });

    test('should have TypeScript server config with correct properties', () => {
      const config = lspService.getServerConfig('typescript');
      
      expect(config.name).toBe('typescript-language-server');
      expect(config.command).toBe('typescript-language-server');
      expect(config.args).toEqual(['--stdio']);
      expect(config.languages).toContain('typescript');
      expect(config.languages).toContain('javascript');
      expect(config.languages).toContain('typescriptreact');
      expect(config.languages).toContain('javascriptreact');
    });

    test('should have Python server config with correct properties', () => {
      const config = lspService.getServerConfig('python');
      
      expect(config.name).toBe('python-lsp-server');
      expect(config.command).toBe('pylsp');
      expect(config.languages).toContain('python');
      expect(config.settings.pylsp).toBeDefined();
    });
  });
});