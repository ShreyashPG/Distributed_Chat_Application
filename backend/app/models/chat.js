

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  time: {
    type: Date,
    default: Date.now
  },
  broadcast: {
    type: Number,
    default: 0
  },
  unicast: {
    type: Boolean,
    default: false
  },
  toUser: {
    type: String,
    default: ''
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  reactions: [{
    user: String,
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    type: String
  }],
  attachments: [{
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
    url: String
  }],
  metadata: {
    ip: String,
    userAgent: String,
    clientVersion: String
  }
});

// Index for better performance
chatSchema.index({ room: 1, time: 1 });
chatSchema.index({ user: 1, time: 1 });
chatSchema.index({ toUser: 1, time: 1 });
chatSchema.index({ broadcast: 1, time: 1 });
chatSchema.index({ unicast: 1, time: 1 });

// Text search index
chatSchema.index({ data: 'text' });

// Compound indexes for common queries
chatSchema.index({ room: 1, unicast: 1, time: 1 });
chatSchema.index({ user: 1, unicast: 1, time: 1 });

// Virtual for formatted time
chatSchema.virtual('formattedTime').get(function() {
  return this.time.toLocaleString();
});

// Virtual for message preview (first 100 chars)
chatSchema.virtual('preview').get(function() {
  if (this.type === 'text' && this.data) {
    return this.data.length > 100 ? this.data.substring(0, 100) + '...' : this.data;
  }
  return `[${this.type.toUpperCase()}]`;
});

// Virtual for reaction count
chatSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Method to check if message is a direct message
chatSchema.methods.isDirectMessage = function() {
  return this.unicast && this.toUser;
};

// Method to check if message is a broadcast
chatSchema.methods.isBroadcast = function() {
  return this.broadcast === 1;
};

// Method to check if message is a group message
chatSchema.methods.isGroupMessage = function() {
  return !this.unicast && this.broadcast === 0;
};

// Method to add reaction
chatSchema.methods.addReaction = function(user, emoji) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(r => r.user !== user);
  
  // Add new reaction
  this.reactions.push({
    user: user,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
chatSchema.methods.removeReaction = function(user, emoji) {
  this.reactions = this.reactions.filter(r => 
    !(r.user === user && r.emoji === emoji)
  );
  return this.save();
};

// Method to edit message
chatSchema.methods.editMessage = function(newData) {
  this.data = newData;
  this.edited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to add mention
chatSchema.methods.addMention = function(username) {
  if (!this.mentions.includes(username)) {
    this.mentions.push(username);
  }
  return this.save();
};

// Method to check if user is mentioned
chatSchema.methods.isMentioned = function(username) {
  return this.mentions.includes(username);
};

// Static method to get room messages
chatSchema.statics.getRoomMessages = function(roomName, limit = 100, skip = 0) {
  return this.find({
    $or: [
      { $and: [{ room: roomName }, { unicast: false }] },
      { broadcast: 1 }
    ]
  })
  .sort({ time: -1 })
  .limit(limit)
  .skip(skip)
  .populate('replyTo', 'user data type time');
};

// Static method to get direct messages for a user
chatSchema.statics.getDirectMessages = function(username, limit = 100, skip = 0) {
  return this.find({
    $or: [
      { $and: [{ unicast: true }, { user: username }] },
      { $and: [{ unicast: true }, { toUser: username }] }
    ]
  })
  .sort({ time: -1 })
  .limit(limit)
  .skip(skip)
  .populate('replyTo', 'user data type time');
};

// Static method to get conversation between two users
chatSchema.statics.getConversation = function(user1, user2, limit = 100, skip = 0) {
  return this.find({
    $and: [
      { unicast: true },
      {
        $or: [
          { $and: [{ user: user1 }, { toUser: user2 }] },
          { $and: [{ user: user2 }, { toUser: user1 }] }
        ]
      }
    ]
  })
  .sort({ time: -1 })
  .limit(limit)
  .skip(skip)
  .populate('replyTo', 'user data type time');
};

// Static method to get broadcast messages
chatSchema.statics.getBroadcastMessages = function(limit = 100, skip = 0) {
  return this.find({ broadcast: 1 })
    .sort({ time: -1 })
    .limit(limit)
    .skip(skip)
    .populate('replyTo', 'user data type time');
};

// Static method to get user's messages
chatSchema.statics.getUserMessages = function(username, limit = 100, skip = 0) {
  return this.find({ user: username })
    .sort({ time: -1 })
    .limit(limit)
    .skip(skip)
    .populate('replyTo', 'user data type time');
};

// Static method to search messages
chatSchema.statics.searchMessages = function(query, options = {}) {
  const {
    room = null,
    user = null,
    type = null,
    limit = 50,
    skip = 0
  } = options;

  let searchQuery = {
    $text: { $search: query }
  };

  if (room) {
    searchQuery.room = room;
  }

  if (user) {
    searchQuery.user = user;
  }

  if (type) {
    searchQuery.type = type;
  }

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, time: -1 })
    .limit(limit)
    .skip(skip)
    .populate('replyTo', 'user data type time');
};

// Static method to get messages with mentions for a user
chatSchema.statics.getMentionsForUser = function(username, limit = 100, skip = 0) {
  return this.find({ mentions: username })
    .sort({ time: -1 })
    .limit(limit)
    .skip(skip)
    .populate('replyTo', 'user data type time');
};

// Static method to get messages by date range
chatSchema.statics.getMessagesByDateRange = function(startDate, endDate, options = {}) {
  const {
    room = null,
    user = null,
    limit = 100,
    skip = 0
  } = options;

  let query = {
    time: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (room) {
    query.room = room;
  }

  if (user) {
    query.user = user;
  }

  return this.find(query)
    .sort({ time: -1 })
    .limit(limit)
    .skip(skip)
    .populate('replyTo', 'user data type time');
};

// Static method to get message statistics
chatSchema.statics.getMessageStats = function(options = {}) {
  const {
    room = null,
    user = null,
    startDate = null,
    endDate = null
  } = options;

  let matchQuery = {};

  if (room) {
    matchQuery.room = room;
  }

  if (user) {
    matchQuery.user = user;
  }

  if (startDate && endDate) {
    matchQuery.time = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        textMessages: { $sum: { $cond: [{ $eq: ['$type', 'text'] }, 1, 0] } },
        imageMessages: { $sum: { $cond: [{ $eq: ['$type', 'image'] }, 1, 0] } },
        fileMessages: { $sum: { $cond: [{ $eq: ['$type', 'file'] }, 1, 0] } },
        systemMessages: { $sum: { $cond: [{ $eq: ['$type', 'system'] }, 1, 0] } },
        broadcastMessages: { $sum: { $cond: [{ $eq: ['$broadcast', 1] }, 1, 0] } },
        directMessages: { $sum: { $cond: ['$unicast', 1, 0] } },
        groupMessages: { $sum: { $cond: [{ $and: [{ $eq: ['$unicast', false] }, { $eq: ['$broadcast', 0] }] }, 1, 0] } },
        editedMessages: { $sum: { $cond: ['$edited', 1, 0] } },
        messagesWithReactions: { $sum: { $cond: [{ $gt: [{ $size: '$reactions' }, 0] }, 1, 0] } },
        messagesWithMentions: { $sum: { $cond: [{ $gt: [{ $size: '$mentions' }, 0] }, 1, 0] } },
        messagesWithAttachments: { $sum: { $cond: [{ $gt: [{ $size: '$attachments' }, 0] }, 1, 0] } }
      }
    }
  ]);
};

// Static method to get active users in a room
chatSchema.statics.getActiveUsersInRoom = function(roomName, hoursAgo = 24) {
  const timeThreshold = new Date();
  timeThreshold.setHours(timeThreshold.getHours() - hoursAgo);

  return this.aggregate([
    {
      $match: {
        room: roomName,
        time: { $gte: timeThreshold },
        unicast: false
      }
    },
    {
      $group: {
        _id: '$user',
        messageCount: { $sum: 1 },
        lastMessage: { $max: '$time' }
      }
    },
    {
      $sort: { messageCount: -1 }
    }
  ]);
};

// Static method to delete old messages
chatSchema.statics.deleteOldMessages = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    time: { $lt: cutoffDate }
  });
};

// Pre-save middleware to extract mentions
chatSchema.pre('save', function(next) {
  if (this.type === 'text' && this.data) {
    // Extract mentions from message data (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(this.data)) !== null) {
      const username = match[1];
      if (!mentions.includes(username)) {
        mentions.push(username);
      }
    }
    
    this.mentions = mentions;
  }
  next();
});

// Pre-save middleware to validate direct messages
chatSchema.pre('save', function(next) {
  if (this.unicast && !this.toUser) {
    next(new Error('Direct messages must have a toUser specified'));
  } else {
    next();
  }
});

// Instance method to check if message can be edited by user
chatSchema.methods.canBeEditedBy = function(username) {
  return this.user === username && this.type === 'text';
};

// Instance method to check if message can be deleted by user
chatSchema.methods.canBeDeletedBy = function(username) {
  return this.user === username;
};

// Instance method to get message age in minutes
chatSchema.methods.getAgeInMinutes = function() {
  const now = new Date();
  const diffMs = now - this.time;
  return Math.floor(diffMs / (1000 * 60));
};

// Instance method to check if message is recent (within last 5 minutes)
chatSchema.methods.isRecent = function() {
  return this.getAgeInMinutes() <= 5;
};

// Export the model
module.exports = mongoose.model('Chat', chatSchema);