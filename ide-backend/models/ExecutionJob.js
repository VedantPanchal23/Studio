const mongoose = require('mongoose');

const executionJobSchema = new mongoose.Schema({
  // Job identification
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Associated workspace and user
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required'],
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Container information
  containerId: {
    type: String,
    default: null,
    index: true
  },
  
  containerImage: {
    type: String,
    required: true
  },
  
  // Execution details
  runtime: {
    type: String,
    required: [true, 'Runtime is required'],
    enum: ['node', 'python', 'java', 'cpp', 'go', 'rust', 'php', 'ruby', 'shell'],
    index: true
  },
  
  runtimeVersion: {
    type: String,
    default: 'latest'
  },
  
  // Code and files
  code: {
    type: String,
    required: [true, 'Code is required']
  },
  
  entryFile: {
    type: String,
    required: true,
    default: 'main'
  },
  
  files: [{
    path: { type: String, required: true },
    content: { type: String, required: true },
    language: { type: String, default: 'plaintext' }
  }],
  
  // Execution configuration
  config: {
    timeout: {
      type: Number,
      default: 30000, // 30 seconds
      min: [1000, 'Timeout must be at least 1 second'],
      max: [300000, 'Timeout cannot exceed 5 minutes']
    },
    
    memoryLimit: {
      type: String,
      default: '128m',
      validate: {
        validator: function(limit) {
          return /^\d+[kmg]?$/i.test(limit);
        },
        message: 'Invalid memory limit format'
      }
    },
    
    cpuLimit: {
      type: String,
      default: '0.5',
      validate: {
        validator: function(limit) {
          return /^\d*\.?\d+$/.test(limit) && parseFloat(limit) <= 2.0;
        },
        message: 'CPU limit must be a number between 0 and 2.0'
      }
    },
    
    networkAccess: {
      type: Boolean,
      default: false
    },
    
    environment: {
      type: Map,
      of: String,
      default: new Map()
    },
    
    arguments: [{
      type: String
    }],
    
    workingDirectory: {
      type: String,
      default: '/workspace'
    }
  },
  
  // Execution status
  status: {
    type: String,
    enum: ['pending', 'queued', 'starting', 'running', 'completed', 'failed', 'timeout', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Execution results
  output: {
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    combined: { type: String, default: '' }
  },
  
  error: {
    message: { type: String, default: null },
    code: { type: Number, default: null },
    stack: { type: String, default: null },
    type: { 
      type: String, 
      enum: ['runtime', 'timeout', 'memory', 'system', 'network', 'security'],
      default: null 
    }
  },
  
  // Timing information
  timing: {
    queuedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    duration: { type: Number, default: null }, // in milliseconds
    cpuTime: { type: Number, default: null }, // in milliseconds
  },
  
  // Resource usage
  resourceUsage: {
    maxMemoryUsage: { type: Number, default: 0 }, // in bytes
    avgCpuUsage: { type: Number, default: 0 }, // percentage
    networkBytesIn: { type: Number, default: 0 },
    networkBytesOut: { type: Number, default: 0 },
    diskBytesRead: { type: Number, default: 0 },
    diskBytesWrite: { type: Number, default: 0 }
  },
  
  // Exit information
  exitCode: {
    type: Number,
    default: null
  },
  
  signal: {
    type: String,
    default: null
  },
  
  // Metadata
  metadata: {
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
    sessionId: { type: String, default: null },
    requestId: { type: String, default: null }
  },
  
  // Logs and debugging
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { 
      type: String, 
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info' 
    },
    message: { type: String, required: true },
    source: { 
      type: String, 
      enum: ['system', 'container', 'runtime', 'user'],
      default: 'system' 
    }
  }],
  
  // Cleanup information
  cleanup: {
    containerRemoved: { type: Boolean, default: false },
    filesRemoved: { type: Boolean, default: false },
    cleanupAt: { type: Date, default: null },
    cleanupError: { type: String, default: null }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
executionJobSchema.index({ workspaceId: 1, createdAt: -1 });
executionJobSchema.index({ userId: 1, createdAt: -1 });
executionJobSchema.index({ status: 1, createdAt: -1 });
executionJobSchema.index({ runtime: 1, createdAt: -1 });
executionJobSchema.index({ 'timing.startedAt': -1 });
executionJobSchema.index({ 'timing.completedAt': -1 });

// Virtual for execution duration in human readable format
executionJobSchema.virtual('durationFormatted').get(function() {
  if (!this.timing.duration) return null;
  
  const duration = this.timing.duration;
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
  return `${(duration / 60000).toFixed(2)}m`;
});

// Virtual for memory usage in human readable format
executionJobSchema.virtual('memoryUsageFormatted').get(function() {
  if (!this.resourceUsage.maxMemoryUsage) return null;
  
  const bytes = this.resourceUsage.maxMemoryUsage;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
});

// Pre-save middleware to update timing
executionJobSchema.pre('save', function(next) {
  // Calculate duration if both start and completion times are available
  if (this.timing.startedAt && this.timing.completedAt && !this.timing.duration) {
    this.timing.duration = this.timing.completedAt.getTime() - this.timing.startedAt.getTime();
  }
  
  // Set queued time if status changes to queued
  if (this.isModified('status') && this.status === 'queued' && !this.timing.queuedAt) {
    this.timing.queuedAt = Date.now();
  }
  
  // Set started time if status changes to running
  if (this.isModified('status') && this.status === 'running' && !this.timing.startedAt) {
    this.timing.startedAt = Date.now();
  }
  
  // Set completed time if status changes to completed/failed/timeout/cancelled
  if (this.isModified('status') && 
      ['completed', 'failed', 'timeout', 'cancelled'].includes(this.status) && 
      !this.timing.completedAt) {
    this.timing.completedAt = Date.now();
  }
  
  next();
});

// Instance method to add log entry
executionJobSchema.methods.addLog = function(level, message, source = 'system') {
  this.logs.push({
    level,
    message,
    source,
    timestamp: Date.now()
  });
  return this.save({ validateBeforeSave: false });
};

// Instance method to update status
executionJobSchema.methods.updateStatus = function(newStatus, error = null) {
  this.status = newStatus;
  
  if (error) {
    this.error = {
      message: error.message || error,
      code: error.code || null,
      stack: error.stack || null,
      type: error.type || 'runtime'
    };
  }
  
  return this.save();
};

// Instance method to update resource usage
executionJobSchema.methods.updateResourceUsage = function(usage) {
  Object.assign(this.resourceUsage, usage);
  return this.save({ validateBeforeSave: false });
};

// Instance method to mark for cleanup
executionJobSchema.methods.markForCleanup = function() {
  this.cleanup.cleanupAt = Date.now();
  return this.save({ validateBeforeSave: false });
};

// Static method to find jobs by user
executionJobSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('workspaceId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find jobs by workspace
executionJobSchema.statics.findByWorkspace = function(workspaceId, limit = 50) {
  return this.find({ workspaceId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find running jobs
executionJobSchema.statics.findRunning = function() {
  return this.find({
    status: { $in: ['queued', 'starting', 'running'] }
  }).sort({ 'timing.startedAt': 1 });
};

// Static method to find jobs that need cleanup
executionJobSchema.statics.findForCleanup = function() {
  return this.find({
    $or: [
      { 'cleanup.containerRemoved': false, containerId: { $ne: null } },
      { 
        status: { $in: ['completed', 'failed', 'timeout', 'cancelled'] },
        'cleanup.cleanupAt': { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours old
      }
    ]
  });
};

// Static method for execution statistics
executionJobSchema.statics.getStats = async function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    { $match: { createdAt: { $gte: startTime } } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        completedJobs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedJobs: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        timeoutJobs: {
          $sum: { $cond: [{ $eq: ['$status', 'timeout'] }, 1, 0] }
        },
        avgDuration: { $avg: '$timing.duration' },
        avgMemoryUsage: { $avg: '$resourceUsage.maxMemoryUsage' },
        totalCpuTime: { $sum: '$timing.cpuTime' }
      }
    }
  ]);
  
  const runtimeStats = await this.aggregate([
    { $match: { createdAt: { $gte: startTime } } },
    {
      $group: {
        _id: '$runtime',
        count: { $sum: 1 },
        avgDuration: { $avg: '$timing.duration' },
        successRate: {
          $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  return {
    overall: stats[0] || {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      timeoutJobs: 0,
      avgDuration: 0,
      avgMemoryUsage: 0,
      totalCpuTime: 0
    },
    byRuntime: runtimeStats
  };
};

const ExecutionJob = mongoose.model('ExecutionJob', executionJobSchema);

module.exports = ExecutionJob;