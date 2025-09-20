const BaseService = require('./BaseService');
const { ExecutionJob } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ExecutionJobService extends BaseService {
  constructor() {
    super(ExecutionJob);
  }

  // Create execution job with unique job ID
  async createJob(jobData) {
    try {
      const jobId = this.generateJobId();
      
      const job = await this.create({
        ...jobData,
        jobId,
        status: 'pending'
      });

      logger.info('Execution job created', { 
        jobId: job.jobId, 
        workspaceId: job.workspaceId,
        userId: job.userId,
        runtime: job.runtime
      });
      
      return job;
    } catch (error) {
      logger.error('Error creating execution job:', error);
      throw error;
    }
  }

  // Generate unique job ID
  generateJobId() {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(6).toString('hex');
    return `job_${timestamp}_${randomBytes}`;
  }

  // Find job by job ID
  async findByJobId(jobId) {
    try {
      const job = await this.findOne({ jobId });
      if (!job) {
        throw new AppError('Execution job not found', 404);
      }
      return job;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error finding job by job ID:', error);
      throw new AppError('Failed to find execution job', 500);
    }
  }

  // Find jobs by user
  async findByUser(userId, options = {}) {
    try {
      const { limit = 50, status = null } = options;
      
      const filter = { userId };
      if (status) {
        filter.status = status;
      }

      const jobs = await ExecutionJob.findByUser(userId, limit);
      return jobs;
    } catch (error) {
      logger.error('Error finding jobs by user:', error);
      throw new AppError('Failed to find user jobs', 500);
    }
  }

  // Find jobs by workspace
  async findByWorkspace(workspaceId, options = {}) {
    try {
      const { limit = 50, status = null } = options;
      
      const filter = { workspaceId };
      if (status) {
        filter.status = status;
      }

      const jobs = await ExecutionJob.findByWorkspace(workspaceId, limit);
      return jobs;
    } catch (error) {
      logger.error('Error finding jobs by workspace:', error);
      throw new AppError('Failed to find workspace jobs', 500);
    }
  }

  // Find running jobs
  async findRunning() {
    try {
      const jobs = await ExecutionJob.findRunning();
      return jobs;
    } catch (error) {
      logger.error('Error finding running jobs:', error);
      throw new AppError('Failed to find running jobs', 500);
    }
  }

  // Update job status
  async updateStatus(jobId, status, error = null) {
    try {
      const job = await this.findByJobId(jobId);
      await job.updateStatus(status, error);
      
      logger.info('Job status updated', { jobId, status });
      return job;
    } catch (error) {
      logger.error('Error updating job status:', error);
      throw error;
    }
  }

  // Add log entry to job
  async addLog(jobId, level, message, source = 'system') {
    try {
      const job = await this.findByJobId(jobId);
      await job.addLog(level, message, source);
      
      return job;
    } catch (error) {
      logger.error('Error adding job log:', error);
      throw error;
    }
  }

  // Update job output
  async updateOutput(jobId, outputData) {
    try {
      const job = await this.findByJobId(jobId);
      
      const updateData = {};
      if (outputData.stdout !== undefined) {
        updateData['output.stdout'] = outputData.stdout;
      }
      if (outputData.stderr !== undefined) {
        updateData['output.stderr'] = outputData.stderr;
      }
      if (outputData.combined !== undefined) {
        updateData['output.combined'] = outputData.combined;
      }

      const updatedJob = await this.updateById(job._id, updateData);
      return updatedJob;
    } catch (error) {
      logger.error('Error updating job output:', error);
      throw error;
    }
  }

  // Update resource usage
  async updateResourceUsage(jobId, usage) {
    try {
      const job = await this.findByJobId(jobId);
      await job.updateResourceUsage(usage);
      
      return job;
    } catch (error) {
      logger.error('Error updating resource usage:', error);
      throw error;
    }
  }

  // Set container ID for job
  async setContainerId(jobId, containerId) {
    try {
      const job = await this.updateById(
        (await this.findByJobId(jobId))._id,
        { containerId }
      );
      
      logger.info('Container ID set for job', { jobId, containerId });
      return job;
    } catch (error) {
      logger.error('Error setting container ID:', error);
      throw error;
    }
  }

  // Complete job with results
  async completeJob(jobId, results) {
    try {
      const job = await this.findByJobId(jobId);
      
      const updateData = {
        status: results.success ? 'completed' : 'failed',
        'timing.completedAt': Date.now(),
        exitCode: results.exitCode || null,
        signal: results.signal || null
      };

      if (results.output) {
        Object.assign(updateData, {
          'output.stdout': results.output.stdout || '',
          'output.stderr': results.output.stderr || '',
          'output.combined': results.output.combined || ''
        });
      }

      if (results.error) {
        Object.assign(updateData, {
          'error.message': results.error.message,
          'error.code': results.error.code,
          'error.stack': results.error.stack,
          'error.type': results.error.type || 'runtime'
        });
      }

      if (results.resourceUsage) {
        Object.assign(updateData, {
          'resourceUsage.maxMemoryUsage': results.resourceUsage.maxMemoryUsage,
          'resourceUsage.avgCpuUsage': results.resourceUsage.avgCpuUsage,
          'resourceUsage.networkBytesIn': results.resourceUsage.networkBytesIn,
          'resourceUsage.networkBytesOut': results.resourceUsage.networkBytesOut,
          'resourceUsage.diskBytesRead': results.resourceUsage.diskBytesRead,
          'resourceUsage.diskBytesWrite': results.resourceUsage.diskBytesWrite
        });
      }

      const updatedJob = await this.updateById(job._id, updateData);
      
      logger.info('Job completed', { 
        jobId, 
        success: results.success,
        exitCode: results.exitCode
      });
      
      return updatedJob;
    } catch (error) {
      logger.error('Error completing job:', error);
      throw error;
    }
  }

  // Cancel job
  async cancelJob(jobId, reason = 'User cancelled') {
    try {
      const job = await this.findByJobId(jobId);
      
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        throw new AppError('Job cannot be cancelled in current status', 400);
      }

      await job.updateStatus('cancelled', { message: reason, type: 'system' });
      await job.addLog('info', `Job cancelled: ${reason}`, 'system');
      
      logger.info('Job cancelled', { jobId, reason });
      return job;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error cancelling job:', error);
      throw new AppError('Failed to cancel job', 500);
    }
  }

  // Mark job for cleanup
  async markForCleanup(jobId) {
    try {
      const job = await this.findByJobId(jobId);
      await job.markForCleanup();
      
      logger.info('Job marked for cleanup', { jobId });
      return job;
    } catch (error) {
      logger.error('Error marking job for cleanup:', error);
      throw error;
    }
  }

  // Find jobs that need cleanup
  async findForCleanup() {
    try {
      const jobs = await ExecutionJob.findForCleanup();
      return jobs;
    } catch (error) {
      logger.error('Error finding jobs for cleanup:', error);
      throw new AppError('Failed to find jobs for cleanup', 500);
    }
  }

  // Update cleanup status
  async updateCleanupStatus(jobId, cleanupData) {
    try {
      const job = await this.findByJobId(jobId);
      
      const updateData = {};
      if (cleanupData.containerRemoved !== undefined) {
        updateData['cleanup.containerRemoved'] = cleanupData.containerRemoved;
      }
      if (cleanupData.filesRemoved !== undefined) {
        updateData['cleanup.filesRemoved'] = cleanupData.filesRemoved;
      }
      if (cleanupData.cleanupError !== undefined) {
        updateData['cleanup.cleanupError'] = cleanupData.cleanupError;
      }

      const updatedJob = await this.updateById(job._id, updateData);
      
      logger.info('Job cleanup status updated', { jobId, cleanupData });
      return updatedJob;
    } catch (error) {
      logger.error('Error updating cleanup status:', error);
      throw error;
    }
  }

  // Get job statistics
  async getStats(timeRange = 24) {
    try {
      const stats = await ExecutionJob.getStats(timeRange);
      return stats;
    } catch (error) {
      logger.error('Error getting job statistics:', error);
      throw new AppError('Failed to get job statistics', 500);
    }
  }

  // Get job logs
  async getLogs(jobId, options = {}) {
    try {
      const { level = null, source = null, limit = 100 } = options;
      
      const job = await this.findByJobId(jobId);
      
      let logs = job.logs;
      
      if (level) {
        logs = logs.filter(log => log.level === level);
      }
      
      if (source) {
        logs = logs.filter(log => log.source === source);
      }
      
      // Sort by timestamp (newest first) and limit
      logs = logs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      
      return logs;
    } catch (error) {
      logger.error('Error getting job logs:', error);
      throw error;
    }
  }

  // Clean up old completed jobs
  async cleanupOldJobs(daysOld = 7) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await this.bulkDelete({
        status: { $in: ['completed', 'failed', 'cancelled'] },
        'timing.completedAt': { $lt: cutoffDate },
        'cleanup.containerRemoved': true,
        'cleanup.filesRemoved': true
      });
      
      logger.info(`Cleaned up ${result.deletedCount} old jobs`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up old jobs:', error);
      throw new AppError('Failed to cleanup old jobs', 500);
    }
  }
}

module.exports = ExecutionJobService;