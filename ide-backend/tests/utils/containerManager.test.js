const containerManager = require('../../utils/containerManager');
const dockerService = require('../../services/dockerService');

// Mock the docker service
jest.mock('../../services/dockerService');

describe('ContainerManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    containerManager.isInitialized = false;
    containerManager.cleanupInterval = null;
  });

  afterEach(() => {
    containerManager.stopCleanupInterval();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      dockerService.initialize.mockResolvedValue(true);
      
      const result = await containerManager.initialize();
      
      expect(result).toBe(true);
      expect(containerManager.isInitialized).toBe(true);
      expect(dockerService.initialize).toHaveBeenCalled();
      expect(containerManager.cleanupInterval).toBeTruthy();
    });

    it('should throw error when Docker service fails', async () => {
      dockerService.initialize.mockRejectedValue(new Error('Docker failed'));
      
      await expect(containerManager.initialize()).rejects.toThrow('Docker failed');
      expect(containerManager.isInitialized).toBe(false);
    });
  });

  describe('cleanup interval', () => {
    it('should start cleanup interval', () => {
      containerManager.startCleanupInterval();
      expect(containerManager.cleanupInterval).toBeTruthy();
    });

    it('should stop cleanup interval', () => {
      containerManager.startCleanupInterval();
      containerManager.stopCleanupInterval();
      expect(containerManager.cleanupInterval).toBeNull();
    });

    it('should call dockerService.cleanupContainers periodically', (done) => {
      dockerService.cleanupContainers.mockResolvedValue();
      
      // Mock setInterval to call immediately
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn((callback) => {
        callback();
        return 123;
      });
      
      containerManager.startCleanupInterval();
      
      setTimeout(() => {
        expect(dockerService.cleanupContainers).toHaveBeenCalled();
        global.setInterval = originalSetInterval;
        done();
      }, 10);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      dockerService.containers = new Map([
        ['container1', {}],
        ['container2', {}]
      ]);
      dockerService.stopContainer.mockResolvedValue();
      
      containerManager.isInitialized = true;
      containerManager.startCleanupInterval();
      
      await containerManager.shutdown();
      
      expect(containerManager.isInitialized).toBe(false);
      expect(containerManager.cleanupInterval).toBeNull();
      expect(dockerService.stopContainer).toHaveBeenCalledTimes(2);
    });

    it('should handle container stop errors gracefully', async () => {
      dockerService.containers = new Map([['container1', {}]]);
      dockerService.stopContainer.mockRejectedValue(new Error('Stop failed'));
      
      containerManager.isInitialized = true;
      
      await expect(containerManager.shutdown()).resolves.not.toThrow();
      expect(containerManager.isInitialized).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when initialized', async () => {
      containerManager.isInitialized = true;
      dockerService.docker = { ping: jest.fn().mockResolvedValue() };
      dockerService.containers = new Map([['container1', {}]]);
      containerManager.cleanupInterval = 123;
      
      const health = await containerManager.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.activeContainers).toBe(1);
      expect(health.cleanupInterval).toBe('running');
    });

    it('should return unhealthy when not initialized', async () => {
      containerManager.isInitialized = false;
      
      const health = await containerManager.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toBe('Container manager not initialized');
    });

    it('should return unhealthy when Docker ping fails', async () => {
      containerManager.isInitialized = true;
      dockerService.docker = { ping: jest.fn().mockRejectedValue(new Error('Docker down')) };
      
      const health = await containerManager.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toBe('Docker down');
    });
  });

  describe('getStats', () => {
    it('should return container statistics', async () => {
      const now = new Date();
      const older = new Date(now.getTime() - 60000);
      
      dockerService.containers = new Map([
        ['container1', { 
          language: 'node', 
          workspaceId: 'ws1', 
          createdAt: older 
        }],
        ['container2', { 
          language: 'python', 
          workspaceId: 'ws1', 
          createdAt: now 
        }],
        ['container3', { 
          language: 'node', 
          workspaceId: 'ws2', 
          createdAt: now 
        }]
      ]);
      
      const stats = await containerManager.getStats();
      
      expect(stats.totalContainers).toBe(3);
      expect(stats.containersByLanguage).toEqual({ node: 2, python: 1 });
      expect(stats.containersByWorkspace).toEqual({ ws1: 2, ws2: 1 });
      expect(stats.oldestContainer.containerId).toBe('container1');
      expect(stats.newestContainer.containerId).toBe('container2');
    });

    it('should handle empty container list', async () => {
      dockerService.containers = new Map();
      
      const stats = await containerManager.getStats();
      
      expect(stats.totalContainers).toBe(0);
      expect(stats.containersByLanguage).toEqual({});
      expect(stats.containersByWorkspace).toEqual({});
      expect(stats.oldestContainer).toBeNull();
      expect(stats.newestContainer).toBeNull();
    });
  });
});