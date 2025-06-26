const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  time: { type: Date, default: Date.now },
  user: { type: String, required: true },
  room: { type: String, required: true },
  data: String,
  broadcast: Number,
  unicast: Boolean,
  toUser: String,
});

module.exports = mongoose.model('Chat', ChatSchema, 'chats');