const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Room name can only contain letters, numbers, underscores, and hyphens'
    }
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  password: {
    type: String,
    default: null
  },
  creator: {
    type: String,
    required: true
  },
  members: [{
    type: String,
    required: true
  }],
  maxMembers: {
    type: Number,
    default: 100
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['general', 'gaming', 'tech', 'music', 'sports', 'other'],
    default: 'general'
  },
  rules: {
    type: String,
    maxlength: 500,
    default: ''
  },
  settings: {
    allowImages: {
      type: Boolean,
      default: true
    },
    allowFiles: {
      type: Boolean,
      default: true
    },
    muteAll: {
      type: Boolean,
      default: false
    }
  },
  moderators: [{
    type: String
  }],
  bannedUsers: [{
    username: String,
    bannedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  messageCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
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
});

// Update the updatedAt field before saving
roomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
// roomSchema.index({ name: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ category: 1 });

// Virtual for member count
roomSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Method to check if room has password
roomSchema.methods.hasPassword = function() {
  return !!this.password;
};

// Method to add member
roomSchema.methods.addMember = function(username) {
  if (!this.members.includes(username)) {
    this.members.push(username);
  }
};

// Method to remove member
roomSchema.methods.removeMember = function(username) {
  this.members = this.members.filter(member => member !== username);
};

module.exports = mongoose.model('Room', roomSchema);