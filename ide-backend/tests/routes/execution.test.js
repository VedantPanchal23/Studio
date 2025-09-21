const request = require('supertest');
const app = require('../../server');
const dockerService = require('../../services/dockerService');
const admin = require('firebase-admin');

// Mock dependencies
jest.mock('../../services/dockerService');
jest.mock('firebase-admin');

describe('Execution Routes', () => {
  let authToken;
  let mockUser;

  beforeEach(() => {
    mockUser = {
      uid: 'test-firebase-uid',
      email: 'test@example.com',
      name: 'Test User'
    };

    authToken = 'firebase-test-token-test-firebase-uid';
    
    // Mock Firebase Admin Auth
    const mockAuth = {
      verifyIdToken: jest.fn().mockResolvedValue(mockUser)
    };
    admin.auth.mockReturnValue(mockAuth);

    jest.clearAllMocks();
  });

  describe('POST /api/execution/containers', () => {
    it('should create container successfully', async () => {
      const mockContainer = {
        containerId: 'container-123',
        name: 'test-container',
        language: 'node',
        status: 'running'
      };

      dockerService.createContainer.mockResolvedValue(mockContainer);

      const response = await request(app)
        .post('/api/execution/containers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'node',
          workspaceId: 'workspace-123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.container).toEqual(mockContainer);
      expect(dockerService.createContainer).toHaveBeenCalledWith('node', 'workspace-123', 'test-user-id');
    });

    it('should return 400 for invalid language', async () => {
      const response = await request(app)
        .post('/api/execution/containers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'invalid-language',
          workspaceId: 'workspace-123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing workspaceId', async () => {
      const response = await request(app)
        .post('/api/execution/containers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'node'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 500 when container creation fails', async () => {
      dockerService.createContainer.mockRejectedValue(new Error('Container creation failed'));

      const response = await request(app)
        .post('/api/execution/containers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'node',
          workspaceId: 'workspace-123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Container creation failed');
    });
  });

  describe('GET /api/execution/containers/:containerId', () => {
    it('should return container info successfully', async () => {
      const mockContainerInfo = {
        id: 'container-123',
        userId: 'test-user-id',
        language: 'node',
        status: 'running',
        createdAt: new Date()
      };

      dockerService.getContainerInfo.mockResolvedValue(mockContainerInfo);

      const response = await request(app)
        .get('/api/execution/containers/container-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.container).toEqual(mockContainerInfo);
    });

    it('should return 404 for non-existent container', async () => {
      dockerService.getContainerInfo.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/execution/containers/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Container not found');
    });

    it('should return 403 for container belonging to different user', async () => {
      const mockContainerInfo = {
        id: 'container-123',
        userId: 'other-user-id',
        language: 'node',
        status: 'running'
      };

      dockerService.getContainerInfo.mockResolvedValue(mockContainerInfo);

      const response = await request(app)
        .get('/api/execution/containers/container-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/execution/containers/:containerId', () => {
    it('should stop container successfully', async () => {
      const mockContainerInfo = {
        id: 'container-123',
        userId: 'test-user-id',
        language: 'node',
        status: 'running'
      };

      dockerService.getContainerInfo.mockResolvedValue(mockContainerInfo);
      dockerService.stopContainer.mockResolvedValue();

      const response = await request(app)
        .delete('/api/execution/containers/container-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Container stopped successfully');
      expect(dockerService.stopContainer).toHaveBeenCalledWith('container-123');
    });

    it('should return 403 for container belonging to different user', async () => {
      const mockContainerInfo = {
        id: 'container-123',
        userId: 'other-user-id',
        language: 'node',
        status: 'running'
      };

      dockerService.getContainerInfo.mockResolvedValue(mockContainerInfo);

      const response = await request(app)
        .delete('/api/execution/containers/container-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/execution/workspaces/:workspaceId/containers', () => {
    it('should list workspace containers for user', async () => {
      const mockContainers = [
        {
          id: 'container-1',
          userId: 'test-user-id',
          workspaceId: 'workspace-123',
          language: 'node'
        },
        {
          id: 'container-2',
          userId: 'other-user-id',
          workspaceId: 'workspace-123',
          language: 'python'
        },
        {
          id: 'container-3',
          userId: 'test-user-id',
          workspaceId: 'workspace-123',
          language: 'java'
        }
      ];

      dockerService.listWorkspaceContainers.mockResolvedValue(mockContainers);

      const response = await request(app)
        .get('/api/execution/workspaces/workspace-123/containers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.containers).toHaveLength(2); // Only user's containers
      expect(response.body.containers.every(c => c.userId === 'test-user-id')).toBe(true);
    });
  });

  describe('GET /api/execution/stats', () => {
    it('should return execution statistics', async () => {
      // Mock the containers map
      dockerService.containers = new Map([
        ['container-1', {
          userId: 'test-user-id',
          language: 'node',
          workspaceId: 'workspace-1',
          containerId: 'container-1'
        }],
        ['container-2', {
          userId: 'other-user-id',
          language: 'python',
          workspaceId: 'workspace-2',
          containerId: 'container-2'
        }],
        ['container-3', {
          userId: 'test-user-id',
          language: 'java',
          workspaceId: 'workspace-1',
          containerId: 'container-3'
        }]
      ]);

      dockerService.getContainerInfo
        .mockResolvedValueOnce({ running: true })
        .mockResolvedValueOnce({ running: false });

      const response = await request(app)
        .get('/api/execution/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toMatchObject({
        totalContainers: 2,
        containersByLanguage: {
          node: 1,
          java: 1
        },
        containersByWorkspace: {
          'workspace-1': 2
        },
        activeContainers: 1
      });
    });
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/execution/containers')
        .send({
          language: 'node',
          workspaceId: 'workspace-123'
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid auth token', async () => {
      admin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/execution/containers')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          language: 'node',
          workspaceId: 'workspace-123'
        });

      expect(response.status).toBe(401);
    });
  });
});