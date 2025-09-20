const mongoose = require('mongoose');

/**
 * Schema for storing collaborative document states
 */
const collaborativeDocumentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  filePath: {
    type: String,
    required: true
  },
  state: {
    type: Buffer,
    required: true
  },
  version: {
    type: Number,
    default: 0
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    language: String,
    encoding: {
      type: String,
      default: 'utf8'
    },
    size: Number,
    checksum: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
collaborativeDocumentSchema.index({ workspaceId: 1, filePath: 1 });
collaborativeDocumentSchema.index({ lastModified: -1 });
collaborativeDocumentSchema.index({ 'participants.userId': 1 });

// Virtual for document size
collaborativeDocumentSchema.virtual('stateSize').get(function() {
  return this.state ? this.state.length : 0;
});

// Methods
collaborativeDocumentSchema.methods.addParticipant = function(userId) {
  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (!existingParticipant) {
    this.participants.push({
      userId: userId,
      joinedAt: new Date(),
      lastSeen: new Date()
    });
  } else {
    existingParticipant.lastSeen = new Date();
  }
  
  return this.save();
};

collaborativeDocumentSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId.toString() !== userId.toString());
  return this.save();
};

collaborativeDocumentSchema.methods.updateParticipantActivity = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (participant) {
    participant.lastSeen = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

collaborativeDocumentSchema.methods.updateState = function(newState, userId) {
  this.state = newState;
  this.version += 1;
  this.lastModified = new Date();
  this.lastModifiedBy = userId;
  
  if (newState) {
    this.metadata.size = newState.length;
  }
  
  return this.save();
};

// Static methods
collaborativeDocumentSchema.statics.findByDocumentId = function(documentId) {
  return this.findOne({ documentId })
    .populate('lastModifiedBy', 'name email avatar')
    .populate('participants.userId', 'name email avatar');
};

collaborativeDocumentSchema.statics.findByWorkspace = function(workspaceId) {
  return this.find({ workspaceId })
    .populate('lastModifiedBy', 'name email avatar')
    .populate('participants.userId', 'name email avatar')
    .sort({ lastModified: -1 });
};

collaborativeDocumentSchema.statics.createOrUpdate = function(documentId, workspaceId, filePath, state, userId) {
  return this.findOneAndUpdate(
    { documentId },
    {
      $set: {
        workspaceId,
        filePath,
        state,
        lastModified: new Date(),
        lastModifiedBy: userId
      },
      $inc: { version: 1 },
      $setOnInsert: {
        documentId,
        participants: []
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );
};

collaborativeDocumentSchema.statics.cleanupInactive = function(inactiveThreshold = 24 * 60 * 60 * 1000) {
  const cutoffDate = new Date(Date.now() - inactiveThreshold);
  
  return this.deleteMany({
    lastModified: { $lt: cutoffDate },
    'participants.0': { $exists: false } // No participants
  });
};

// Pre-save middleware
collaborativeDocumentSchema.pre('save', function(next) {
  if (this.isModified('state') && this.state) {
    // Update metadata
    this.metadata.size = this.state.length;
    
    // Generate simple checksum (you might want to use a proper hash function)
    const crypto = require('crypto');
    this.metadata.checksum = crypto.createHash('md5').update(this.state).digest('hex');
  }
  
  next();
});

// Post-save middleware for logging
collaborativeDocumentSchema.post('save', function(doc) {
  const logger = require('../utils/logger');
  logger.debug('Collaborative document saved', {
    documentId: doc.documentId,
    workspaceId: doc.workspaceId,
    filePath: doc.filePath,
    version: doc.version,
    size: doc.stateSize,
    participantCount: doc.participants.length
  });
});

const CollaborativeDocument = mongoose.model('CollaborativeDocument', collaborativeDocumentSchema);

module.exports = CollaborativeDocument;