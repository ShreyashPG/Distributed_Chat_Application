const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Chat = require('../models/chat');
const Room = require('../models/room');
const authenticateToken = require('../middleware/authentication');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware

// Get room messages
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { room } = req.body;
    const { username } = req.user;

    if (!room) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Verify user is member of the room
    const roomDoc = await Room.findOne({ name: room });
    if (!roomDoc) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!roomDoc.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    // Get messages for the room and global broadcasts
    const filter = {
      $or: [
        { $and: [{ room: room }, { unicast: false }] },
        { broadcast: 1 }
      ]
    };

    const data = await Chat.find(filter, { _id: 0 })
      .sort({ time: 1 })
      .limit(100); // Limit to last 100 messages

    res.status(200).json(data);
  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get direct messages
router.post('/dm', authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;

    // Get all direct messages for the user
    const filter = {
      $or: [
        { $and: [{ unicast: true }, { user: username }] },
        { $and: [{ unicast: true }, { toUser: username }] }
      ]
    };

    const data = await Chat.find(filter, { _id: 0 })
      .sort({ time: 1 })
      .limit(100); // Limit to last 100 messages

    res.status(200).json(data);
  } catch (error) {
    console.error('Get direct messages error:', error);
    res.status(500).json({ error: 'Failed to get direct messages' });
  }
});

// Get room info
router.get('/room/:roomName', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.params;
    const { username } = req.user;

    const room = await Room.findOne({ name: roomName }, {
      password: 0 // Don't send password hash
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is member
    const isMember = room.members.includes(username);
    const isModerator = room.moderators.includes(username);
    const isCreator = room.creator === username;

    res.json({
      ...room.toObject(),
      isMember,
      isModerator,
      isCreator,
      hasPassword: !!room.password,
      memberCount: room.members.length
    });
  } catch (error) {
    console.error('Get room info error:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

// Search messages
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, room, type = 'text' } = req.body;
    const { username } = req.user;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let filter = {
      $and: [
        { type: type },
        { data: { $regex: query, $options: 'i' } }
      ]
    };

    if (room) {
      // Verify user is member of the room
      const roomDoc = await Room.findOne({ name: room });
      if (!roomDoc || !roomDoc.members.includes(username)) {
        return res.status(403).json({ error: 'You are not authorized to search in this room' });
      }
      
      filter.$and.push({ room: room });
    } else {
      // Search in user's accessible rooms and DMs
      const userRooms = await Room.find({ members: username }, 'name');
      const roomNames = userRooms.map(r => r.name);
      
      filter = {
        $and: [
          { type: type },
          { data: { $regex: query, $options: 'i' } },
          {
            $or: [
              { room: { $in: roomNames } },
              { user: username },
              { toUser: username },
              { broadcast: 1 }
            ]
          }
        ]
      };
    }

    const results = await Chat.find(filter, { _id: 0 })
      .sort({ time: -1 })
      .limit(50);

    res.json(results);
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user's joined rooms
router.get('/my-rooms', authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;

    const rooms = await Room.find(
      { members: username },
      'name description category memberCount lastActivity creator'
    ).sort({ lastActivity: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ error: 'Failed to get user rooms' });
  }
});

module.exports = router;