const dockerService = require('./dockerService');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ExecutionService {
  constructor() {
    this.activeExecutions = new Map(); // Track active executions
    this.executionHistory = new Map(); // Store execution history
  }

  /**
   * Start code execution with WebSocket streaming
   */
  async startExecution(socket, { containerId, code, filename = 'main', executionId = null }) {
    const execId = executionId || crypto.randomUUID();
    
    try {
      logger.info(`Starting execution ${execId} in container ${containerId}`);

      // Verify container exists and get info
      const containerInfo = await dockerService.getContainerInfo(containerId);
      if (!containerInfo) {
        throw new Error('Container not found');
      }

      // Start execution
      const execution = await dockerService.executeCode(containerId, code, filename);
      
      // Track execution
      const executionData = {
        id: execId,
        containerId,
        code,
        filename,
        language: containerInfo.language,
        startTime: new Date(),
        status: 'running',
        output: '',
        error: null,
        socket
      };
      
      this.activeExecutions.set(execId, executionData);

      // Emit execution started event
      socket.emit('execution:started', {
        executionId: execId,
        containerId,
        language: containerInfo.language,
        startTime: executionData.startTime
      });

      // Stream output to client
      execution.stream.on('data', (chunk) => {
        const output = chunk.toString();
        executionData.output += output;
        
        socket.emit('execution:output', {
          executionId: execId,
          output,
          timestamp: new Date()
        });
      });

      execution.stream.on('end', () => {
        executionData.status = 'completed';
        executionData.endTime = new Date();
        executionData.duration = executionData.endTime - executionData.startTime;
        
        // Move to history
        this.executionHistory.set(execId, { ...executionData });
        this.activeExecutions.delete(execId);
        
        socket.emit('execution:completed', {
          executionId: execId,
          status: 'completed',
          endTime: executionData.endTime,
          duration: executionData.duration,
          output: executionData.output
        });
        
        logger.info(`Execution ${execId} completed in ${executionData.duration}ms`);
      });

      execution.stream.on('error', (error) => {
        executionData.status = 'error';
        executionData.error = error.message;
        executionData.endTime = new Date();
        executionData.duration = executionData.endTime - executionData.startTime;
        
        // Move to history
        this.executionHistory.set(execId, { ...executionData });
        this.activeExecutions.delete(execId);
        
        socket.emit('execution:error', {
          executionId: execId,
          error: error.message,
          endTime: executionData.endTime,
          duration: executionData.duration
        });
        
        logger.error(`Execution ${execId} failed:`, error);
      });

      // Handle socket disconnect
      socket.on('disconnect', () => {
        this.stopExecution(execId);
      });

      return execId;

    } catch (error) {
      logger.error('Failed to start execution:', error);
      
      socket.emit('execution:error', {
        executionId: execId,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  /**
   * Stop an active execution
   */
  async stopExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    try {
      execution.status = 'stopped';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      
      // Move to history
      this.executionHistory.set(executionId, { ...execution });
      this.activeExecutions.delete(executionId);
      
      execution.socket.emit('execution:stopped', {
        executionId,
        endTime: execution.endTime,
        duration: execution.duration
      });
      
      logger.info(`Execution ${executionId} stopped`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to stop execution ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId) {
    const active = this.activeExecutions.get(executionId);
    if (active) {
      return {
        id: executionId,
        status: active.status,
        startTime: active.startTime,
        language: active.language,
        containerId: active.containerId,
        output: active.output
      };
    }

    const historical = this.executionHistory.get(executionId);
    if (historical) {
      return {
        id: executionId,
        status: historical.status,
        startTime: historical.startTime,
        endTime: historical.endTime,
        duration: historical.duration,
        language: historical.language,
        containerId: historical.containerId,
        output: historical.output,
        error: historical.error
      };
    }

    return null;
  }

  /**
   * Get all executions for a user
   */
  getUserExecutions(userId) {
    const userExecutions = [];
    
    // Add active executions
    for (const execution of this.activeExecutions.values()) {
      if (execution.socket.userId === userId) {
        userExecutions.push({
          id: execution.id,
          status: execution.status,
          startTime: execution.startTime,
          language: execution.language,
          containerId: execution.containerId
        });
      }
    }
    
    // Add historical executions
    for (const execution of this.executionHistory.values()) {
      if (execution.socket.userId === userId) {
        userExecutions.push({
          id: execution.id,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          duration: execution.duration,
          language: execution.language,
          containerId: execution.containerId,
          error: execution.error
        });
      }
    }
    
    return userExecutions.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Clean up old execution history
   */
  cleanupHistory() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();
    
    for (const [execId, execution] of this.executionHistory.entries()) {
      if (execution.endTime && (now - execution.endTime) > maxAge) {
        this.executionHistory.delete(execId);
      }
    }
    
    logger.info(`Cleaned up old execution history. Remaining: ${this.executionHistory.size}`);
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      activeExecutions: this.activeExecutions.size,
      historicalExecutions: this.executionHistory.size,
      totalExecutions: this.activeExecutions.size + this.executionHistory.size
    };
  }
}

module.exports = new ExecutionService();