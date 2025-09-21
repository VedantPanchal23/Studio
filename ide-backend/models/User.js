const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Firebase Authentication UID
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  
  // Legacy Google OAuth information (for migration purposes)
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  
  // Basic user information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    fontSize: {
      type: Number,
      min: [10, 'Font size must be at least 10px'],
      max: [24, 'Font size cannot exceed 24px'],
      default: 14
    },
    keyBindings: {
      type: String,
      enum: ['vscode', 'vim', 'emacs', 'sublime'],
      default: 'vscode'
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    tabSize: {
      type: Number,
      min: [2, 'Tab size must be at least 2'],
      max: [8, 'Tab size cannot exceed 8'],
      default: 2
    }
  },
  
  // Workspace references
  workspaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  }],
  
  // Google Drive integration
  driveToken: {
    type: String,
    select: false // Don't include token in queries by default
  },
  
  driveRefreshToken: {
    type: String,
    select: false
  },
  
  // GitHub integration
  githubToken: {
    type: String,
    select: false // Don't include token in queries by default
  },
  
  githubUsername: {
    type: String,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Additional indexes for better query performance (email and googleId already have unique indexes)
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for user's full workspace count
userSchema.virtual('workspaceCount').get(function() {
  return this.workspaces ? this.workspaces.length : 0;
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save({ validateBeforeSave: false });
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by Google ID
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// Static method to find user by Firebase UID
userSchema.statics.findByFirebaseUid = function(firebaseUid) {
  return this.findOne({ firebaseUid });
};

// Static method to create or update user from Firebase token
userSchema.statics.createFromFirebase = async function(firebaseUser, decodedToken) {
  try {
    const userData = {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || decodedToken.email,
      name: firebaseUser.displayName || decodedToken.name || firebaseUser.email?.split('@')[0] || 'User',
      avatar: firebaseUser.photoURL || decodedToken.picture,
      isVerified: firebaseUser.emailVerified || decodedToken.email_verified || false,
      lastLogin: Date.now()
    };

    // Try to find existing user by Firebase UID first
    let user = await this.findByFirebaseUid(firebaseUser.uid);
    
    if (user) {
      // Update existing user
      Object.assign(user, userData);
      await user.save();
      return user;
    }

    // Check if user exists with same email (for account linking)
    user = await this.findByEmail(userData.email);
    
    if (user) {
      // Link Firebase UID to existing account
      user.firebaseUid = firebaseUser.uid;
      user.lastLogin = Date.now();
      if (userData.avatar && !user.avatar) user.avatar = userData.avatar;
      if (userData.isVerified) user.isVerified = true;
      await user.save();
      return user;
    }

    // Create new user
    user = new this(userData);
    await user.save();
    return user;
  } catch (error) {
    throw new Error(`Failed to create/update user from Firebase: ${error.message}`);
  }
};

// Static method to get user with workspaces populated
userSchema.statics.findWithWorkspaces = function(userId) {
  return this.findById(userId).populate({
    path: 'workspaces',
    select: 'name createdAt updatedAt collaborators',
    options: { sort: { updatedAt: -1 } }
  });
};

// Static method for user statistics
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        verifiedUsers: {
          $sum: {
            $cond: [{ $eq: ['$isVerified', true] }, 1, 0]
          }
        },
        avgWorkspacesPerUser: { $avg: { $size: '$workspaces' } }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    avgWorkspacesPerUser: 0
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;