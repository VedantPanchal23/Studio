const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  path: {
    type: String,
    required: [true, 'File path is required'],
    trim: true,
    maxlength: [500, 'File path cannot exceed 500 characters']
  },
  
  content: {
    type: String,
    default: ''
  },
  
  language: {
    type: String,
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'go', 
      'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 
      'css', 'scss', 'less', 'json', 'xml', 'yaml', 'markdown', 
      'sql', 'shell', 'dockerfile', 'plaintext'
    ],
    default: 'plaintext'
  },
  
  size: {
    type: Number,
    default: 0,
    min: [0, 'File size cannot be negative']
  },
  
  lastModified: {
    type: Date,
    default: Date.now
  },
  
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    required: true,
    default: 'viewer'
  },
  
  permissions: {
    read: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
    execute: { type: Boolean, default: false },
    admin: { type: Boolean, default: false }
  },
  
  joinedAt: {
    type: Date,
    default: Date.now
  },
  
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    minlength: [1, 'Workspace name must be at least 1 character long'],
    maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    validate: {
      validator: function(name) {
        return /^[a-zA-Z0-9\s\-_]+$/.test(name);
      },
      message: 'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Workspace owner is required'],
    index: true
  },
  
  collaborators: [collaboratorSchema],
  
  files: [fileSchema],
  
  // Runtime settings
  settings: {
    runtime: {
      type: String,
      enum: ['node', 'python', 'java', 'cpp', 'go', 'rust', 'php', 'ruby'],
      default: 'node'
    },
    
    version: {
      type: String,
      default: 'latest'
    },
    
    dependencies: [{
      name: { type: String, required: true },
      version: { type: String, default: 'latest' },
      type: { type: String, enum: ['dependency', 'devDependency'], default: 'dependency' }
    }],
    
    environment: {
      type: Map,
      of: String,
      default: new Map()
    },
    
    buildCommand: {
      type: String,
      default: ''
    },
    
    runCommand: {
      type: String,
      default: ''
    }
  },
  
  // Google Drive integration
  driveSync: {
    enabled: {
      type: Boolean,
      default: false
    },
    
    folderId: {
      type: String,
      default: null
    },
    
    lastSync: {
      type: Date,
      default: null
    },
    
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'error', 'conflict'],
      default: 'idle'
    },
    
    syncError: {
      type: String,
      default: null
    }
  },
  
  // Git repository integration
  gitRepo: {
    initialized: {
      type: Boolean,
      default: false
    },
    
    url: {
      type: String,
      default: null,
      validate: {
        validator: function(url) {
          if (!url) return true; // Allow null/empty
          return /^https?:\/\/.+/.test(url) || /^git@.+/.test(url);
        },
        message: 'Invalid Git repository URL'
      }
    },
    
    branch: {
      type: String,
      default: 'main'
    },
    
    lastCommit: {
      type: String,
      default: null
    },
    
    lastCommitMessage: {
      type: String,
      default: null
    },
    
    lastCommitBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    lastPush: {
      type: Date,
      default: null
    },
    
    lastPull: {
      type: Date,
      default: null
    },
    
    initializedAt: {
      type: Date,
      default: null
    },
    
    initializedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    clonedAt: {
      type: Date,
      default: null
    },
    
    clonedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    remotes: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      addedAt: { type: Date, default: Date.now }
    }]
  },
  
  // Workspace status
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  isTemplate: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  stats: {
    totalFiles: {
      type: Number,
      default: 0
    },
    
    totalSize: {
      type: Number,
      default: 0
    },
    
    lastActivity: {
      type: Date,
      default: Date.now
    },
    
    executionCount: {
      type: Number,
      default: 0
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
workspaceSchema.index({ owner: 1, createdAt: -1 });
workspaceSchema.index({ 'collaborators.userId': 1 });
workspaceSchema.index({ name: 'text', description: 'text' });
workspaceSchema.index({ isPublic: 1, isArchived: 1 });
workspaceSchema.index({ 'stats.lastActivity': -1 });

// Virtual for total collaborator count
workspaceSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators ? this.collaborators.length : 0;
});

// Virtual for file count
workspaceSchema.virtual('fileCount').get(function() {
  return this.files ? this.files.filter(file => !file.isDeleted).length : 0;
});

// Pre-save middleware to update stats
workspaceSchema.pre('save', function(next) {
  if (this.isModified('files')) {
    const activeFiles = this.files.filter(file => !file.isDeleted);
    this.stats.totalFiles = activeFiles.length;
    this.stats.totalSize = activeFiles.reduce((total, file) => total + (file.size || 0), 0);
  }
  
  if (!this.isNew) {
    this.updatedAt = Date.now();
    this.stats.lastActivity = Date.now();
  }
  
  next();
});

// Instance method to add collaborator
workspaceSchema.methods.addCollaborator = function(userId, role = 'viewer', invitedBy = null) {
  // Check if user is already a collaborator
  const existingCollaborator = this.collaborators.find(
    collab => collab.userId.toString() === userId.toString()
  );
  
  if (existingCollaborator) {
    throw new Error('User is already a collaborator');
  }
  
  // Set permissions based on role
  const permissions = {
    read: true,
    write: role === 'editor' || role === 'owner',
    execute: role === 'editor' || role === 'owner',
    admin: role === 'owner'
  };
  
  this.collaborators.push({
    userId,
    role,
    permissions,
    invitedBy
  });
  
  return this.save();
};

// Instance method to remove collaborator
workspaceSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Instance method to update collaborator role
workspaceSchema.methods.updateCollaboratorRole = function(userId, newRole) {
  const collaborator = this.collaborators.find(
    collab => collab.userId.toString() === userId.toString()
  );
  
  if (!collaborator) {
    throw new Error('Collaborator not found');
  }
  
  collaborator.role = newRole;
  collaborator.permissions = {
    read: true,
    write: newRole === 'editor' || newRole === 'owner',
    execute: newRole === 'editor' || newRole === 'owner',
    admin: newRole === 'owner'
  };
  
  return this.save();
};

// Instance method to add or update file
workspaceSchema.methods.updateFile = function(filePath, content, language, modifiedBy) {
  const existingFileIndex = this.files.findIndex(
    file => file.path === filePath && !file.isDeleted
  );
  
  if (existingFileIndex !== -1) {
    // Update existing file
    this.files[existingFileIndex].content = content;
    this.files[existingFileIndex].language = language;
    this.files[existingFileIndex].size = Buffer.byteLength(content, 'utf8');
    this.files[existingFileIndex].lastModified = Date.now();
    this.files[existingFileIndex].modifiedBy = modifiedBy;
  } else {
    // Add new file
    this.files.push({
      path: filePath,
      content,
      language,
      size: Buffer.byteLength(content, 'utf8'),
      modifiedBy
    });
  }
  
  return this.save();
};

// Instance method to delete file
workspaceSchema.methods.deleteFile = function(filePath) {
  const file = this.files.find(file => file.path === filePath && !file.isDeleted);
  if (file) {
    file.isDeleted = true;
    return this.save();
  }
  throw new Error('File not found');
};

// Static method to find workspaces by user
workspaceSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.userId': userId }
    ],
    isArchived: false
  }).populate('owner', 'name email avatar')
    .populate('collaborators.userId', 'name email avatar')
    .sort({ 'stats.lastActivity': -1 });
};

// Static method to find public workspaces
workspaceSchema.statics.findPublic = function(limit = 20) {
  return this.find({
    isPublic: true,
    isArchived: false
  }).populate('owner', 'name email avatar')
    .sort({ 'stats.lastActivity': -1 })
    .limit(limit);
};

// Static method for workspace statistics
workspaceSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalWorkspaces: { $sum: 1 },
        publicWorkspaces: {
          $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
        },
        archivedWorkspaces: {
          $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
        },
        avgFilesPerWorkspace: { $avg: '$stats.totalFiles' },
        avgSizePerWorkspace: { $avg: '$stats.totalSize' },
        totalExecutions: { $sum: '$stats.executionCount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalWorkspaces: 0,
    publicWorkspaces: 0,
    archivedWorkspaces: 0,
    avgFilesPerWorkspace: 0,
    avgSizePerWorkspace: 0,
    totalExecutions: 0
  };
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;