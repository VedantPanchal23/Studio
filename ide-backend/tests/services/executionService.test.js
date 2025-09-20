const executionService = require('../../services/executionService');
const dockerService = require('../../services/dockerService');

// Mock the docker service
jest.mock('../../services/dockerService');

describe('ExecutionService', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      userId: 'test-user-id'
    };

    // Reset service state
    executionService.activeExecutions.clear();
    executionService.executionHistory.clear();

    jest.clearAllMocks();
  });

  describe('startExecution', () => {
    it('should start execution successfully', async () => {
      const mockStream = {
        on: jest.fn()
      };

      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node',
        status: 'running'
      });

      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      const executionId = await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");',
        filename: 'test.js'
      });

      expect(executionId).toBeDefined();
      expect(dockerService.getContainerInfo).toHaveBeenCalledWith('container-1');
      expect(dockerService.executeCode).toHaveBeenCalledWith('container-1', 'console.log("hello");', 'test.js');
      expect(mockSocket.emit).toHaveBeenCalledWith('execution:started', expect.objectContaining({
        executionId,
        containerId: 'container-1',
        language: 'node'
      }));
      expect(executionService.activeExecutions.has(executionId)).toBe(true);
    });

    it('should throw error for non-existent container', async () => {
      dockerService.getContainerInfo.mockResolvedValue(null);

      await expect(executionService.startExecution(mockSocket, {
        containerId: 'non-existent',
        code: 'console.log("hello");'
      })).rejects.toThrow('Container not found');

      expect(mockSocket.emit).toHaveBeenCalledWith('execution:error', expect.objectContaining({
        error: 'Container not found'
      }));
    });

    it('should handle stream data events', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate data event
            setTimeout(() => callback(Buffer.from('output data')), 10);
          }
        })
      };

      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });

      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      const executionId = await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      // Wait for async stream events
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockSocket.emit).toHaveBeenCalledWith('execution:output', expect.objectContaining({
        executionId,
        output: 'output data'
      }));
    });

    it('should handle stream end events', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        })
      };

      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });

      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      const executionId = await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      // Wait for async stream events
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockSocket.emit).toHaveBeenCalledWith('execution:completed', expect.objectContaining({
        executionId,
        status: 'completed'
      }));
      expect(executionService.activeExecutions.has(executionId)).toBe(false);
      expect(executionService.executionHistory.has(executionId)).toBe(true);
    });

    it('should handle stream error events', async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Stream error')), 10);
          }
        })
      };

      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });

      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      const executionId = await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      // Wait for async stream events
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockSocket.emit).toHaveBeenCalledWith('execution:error', expect.objectContaining({
        executionId,
        error: 'Stream error'
      }));
      expect(executionService.activeExecutions.has(executionId)).toBe(false);
      expect(executionService.executionHistory.has(executionId)).toBe(true);
    });
  });

  describe('stopExecution', () => {
    it('should stop active execution', async () => {
      // First start an execution
      const mockStream = { on: jest.fn() };
      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });
      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      const executionId = await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      // Now stop it
      const stopped = await executionService.stopExecution(executionId);

      expect(stopped).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('execution:stopped', expect.objectContaining({
        executionId
      }));
      expect(executionService.activeExecutions.has(executionId)).toBe(false);
      expect(executionService.executionHistory.has(executionId)).toBe(true);
    });

    it('should return false for non-existent execution', async () => {
      const stopped = await executionService.stopExecution('non-existent');
      expect(stopped).toBe(false);
    });
  });

  describe('getExecutionStatus', () => {
    it('should return status for active execution', async () => {
      const mockStream = { on: jest.fn() };
      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });
      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      const executionId = await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      const status = executionService.getExecutionStatus(executionId);

      expect(status).toMatchObject({
        id: executionId,
        status: 'running',
        language: 'node',
        containerId: 'container-1'
      });
    });

    it('should return status for historical execution', async () => {
      // Add a historical execution
      executionService.executionHistory.set('historical-1', {
        id: 'historical-1',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        language: 'python',
        containerId: 'container-2',
        output: 'Hello World',
        error: null
      });

      const status = executionService.getExecutionStatus('historical-1');

      expect(status).toMatchObject({
        id: 'historical-1',
        status: 'completed',
        language: 'python',
        containerId: 'container-2',
        output: 'Hello World'
      });
    });

    it('should return null for non-existent execution', () => {
      const status = executionService.getExecutionStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('getUserExecutions', () => {
    it('should return user executions', async () => {
      // Add some executions
      const mockStream = { on: jest.fn() };
      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });
      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      const executions = executionService.getUserExecutions('test-user-id');

      expect(executions).toHaveLength(1);
      expect(executions[0]).toMatchObject({
        status: 'running',
        language: 'node',
        containerId: 'container-1'
      });
    });

    it('should return empty array for user with no executions', () => {
      const executions = executionService.getUserExecutions('other-user');
      expect(executions).toEqual([]);
    });
  });

  describe('cleanupHistory', () => {
    it('should remove old executions', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      executionService.executionHistory.set('old-1', {
        endTime: oldDate
      });
      executionService.executionHistory.set('recent-1', {
        endTime: recentDate
      });

      executionService.cleanupHistory();

      expect(executionService.executionHistory.has('old-1')).toBe(false);
      expect(executionService.executionHistory.has('recent-1')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', async () => {
      // Add some executions
      const mockStream = { on: jest.fn() };
      dockerService.getContainerInfo.mockResolvedValue({
        id: 'container-1',
        userId: 'test-user-id',
        language: 'node'
      });
      dockerService.executeCode.mockResolvedValue({
        stream: mockStream,
        containerId: 'container-1',
        language: 'node'
      });

      await executionService.startExecution(mockSocket, {
        containerId: 'container-1',
        code: 'console.log("hello");'
      });

      executionService.executionHistory.set('historical-1', {
        endTime: new Date()
      });

      const stats = executionService.getStats();

      expect(stats).toEqual({
        activeExecutions: 1,
        historicalExecutions: 1,
        totalExecutions: 2
      });
    });
  });
});