const dockerService = require('../../services/dockerService');

// Mock dockerode
jest.mock('dockerode');
const Docker = require('dockerode');

describe('DockerService', () => {
  let mockDocker;
  let mockContainer;

  beforeEach(() => {
    mockContainer = {
      id: 'test-container-id',
      start: jest.fn().mockResolvedValue({}),
      stop: jest.fn().mockResolvedValue({}),
      inspect: jest.fn().mockResolvedValue({
        State: {
          Status: 'running',
          Running: true,
          StartedAt: '2023-01-01T00:00:00Z',
          FinishedAt: null,
          ExitCode: 0
        }
      }),
      exec: jest.fn().mockResolvedValue({
        start: jest.fn().mockResolvedValue({})
      }),
      putArchive: jest.fn().mockResolvedValue({})
    };

    mockDocker = {
      ping: jest.fn().mockResolvedValue({}),
      listImages: jest.fn().mockResolvedValue([{ Id: 'existing-image' }]),
      pull: jest.fn().mockResolvedValue({}),
      createContainer: jest.fn().mockResolvedValue(mockContainer),
      modem: {
        followProgress: jest.fn((stream, callback) => callback(null, []))
      }
    };

    Docker.mockImplementation(() => mockDocker);
    
    // Reset the service state
    dockerService.containers.clear();
    dockerService.docker = mockDocker;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully when Docker is available', async () => {
      const result = await dockerService.initialize();
      
      expect(result).toBe(true);
      expect(mockDocker.ping).toHaveBeenCalled();
    });

    it('should throw error when Docker is not available', async () => {
      mockDocker.ping.mockRejectedValue(new Error('Docker not available'));
      
      await expect(dockerService.initialize()).rejects.toThrow('Docker service initialization failed');
    });
  });

  describe('createContainer', () => {
    beforeEach(async () => {
      await dockerService.initialize();
    });

    it('should create container for supported language', async () => {
      const result = await dockerService.createContainer('node', 'workspace-1', 'user-1');
      
      expect(result).toMatchObject({
        containerId: 'test-container-id',
        language: 'node',
        status: 'running'
      });
      expect(mockDocker.createContainer).toHaveBeenCalled();
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should throw error for unsupported language', async () => {
      await expect(dockerService.createContainer('unsupported', 'workspace-1', 'user-1'))
        .rejects.toThrow('Unsupported language: unsupported');
    });

    it('should apply security configurations', async () => {
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
      
      const createCall = mockDocker.createContainer.mock.calls[0][0];
      expect(createCall.HostConfig.SecurityOpt).toContain('no-new-privileges:true');
      expect(createCall.HostConfig.CapDrop).toContain('ALL');
      expect(createCall.HostConfig.NetworkMode).toBe('none');
    });

    it('should apply resource limits', async () => {
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
      
      const createCall = mockDocker.createContainer.mock.calls[0][0];
      expect(createCall.HostConfig.Memory).toBe(512 * 1024 * 1024);
      expect(createCall.HostConfig.CpuQuota).toBe(50000);
    });
  });

  describe('executeCode', () => {
    beforeEach(async () => {
      await dockerService.initialize();
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
    });

    it('should execute code in container', async () => {
      const result = await dockerService.executeCode('test-container-id', 'console.log("hello");');
      
      expect(result).toMatchObject({
        containerId: 'test-container-id',
        language: 'node'
      });
      expect(mockContainer.putArchive).toHaveBeenCalled();
      expect(mockContainer.exec).toHaveBeenCalled();
    });

    it('should throw error for non-existent container', async () => {
      await expect(dockerService.executeCode('non-existent', 'code'))
        .rejects.toThrow('Container not found');
    });
  });

  describe('stopContainer', () => {
    beforeEach(async () => {
      await dockerService.initialize();
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
    });

    it('should stop container successfully', async () => {
      await dockerService.stopContainer('test-container-id');
      
      expect(mockContainer.stop).toHaveBeenCalledWith({ t: 5 });
      expect(dockerService.containers.has('test-container-id')).toBe(false);
    });

    it('should handle already stopped container', async () => {
      const error = new Error('Container already stopped');
      error.statusCode = 304;
      mockContainer.stop.mockRejectedValue(error);
      
      await expect(dockerService.stopContainer('test-container-id')).resolves.not.toThrow();
    });
  });

  describe('getContainerInfo', () => {
    beforeEach(async () => {
      await dockerService.initialize();
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
    });

    it('should return container information', async () => {
      const info = await dockerService.getContainerInfo('test-container-id');
      
      expect(info).toMatchObject({
        id: 'test-container-id',
        language: 'node',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        status: 'running',
        running: true
      });
    });

    it('should return null for non-existent container', async () => {
      const info = await dockerService.getContainerInfo('non-existent');
      expect(info).toBeNull();
    });
  });

  describe('cleanupContainers', () => {
    beforeEach(async () => {
      await dockerService.initialize();
    });

    it('should cleanup old containers', async () => {
      // Create a container with old timestamp
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
      const containerInfo = dockerService.containers.get('test-container-id');
      containerInfo.createdAt = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      
      await dockerService.cleanupContainers();
      
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(dockerService.containers.has('test-container-id')).toBe(false);
    });

    it('should not cleanup recent containers', async () => {
      await dockerService.createContainer('node', 'workspace-1', 'user-1');
      
      await dockerService.cleanupContainers();
      
      expect(mockContainer.stop).not.toHaveBeenCalled();
      expect(dockerService.containers.has('test-container-id')).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should return correct execution commands', () => {
      expect(dockerService.getExecutionCommand('node', 'main.js')).toEqual(['node', 'main.js']);
      expect(dockerService.getExecutionCommand('python', 'main.py')).toEqual(['python', 'main.py']);
      expect(dockerService.getExecutionCommand('java', 'Main.java')).toEqual(['sh', '-c', 'javac Main.java && java Main']);
    });

    it('should return correct file extensions', () => {
      expect(dockerService.getCodeFilename('main', 'node')).toBe('main.js');
      expect(dockerService.getCodeFilename('main', 'python')).toBe('main.py');
      expect(dockerService.getCodeFilename('main', 'java')).toBe('main.java');
    });
  });
});