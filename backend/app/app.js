const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const connectToDB = require('./database/db');
const redis = require('redis');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Chat = require('./models/chat');
const User = require('./models/user');
const Room = require('./models/room');
const ServerChat = require('./routes/serverChats');
const LoginRegister = require('./routes/loginRegister');
const ImageUpload = require('./routes/imageUpload');
const authenticateToken = require('./middleware/authentication');
require('dotenv').config(); 

const SERVER_NAME = process.env.SERVER_NAME || 'FASTCHAT';
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();
const httpServer = http.createServer(app);

const io = socketio(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  },
});



const redisUrl = process.env.REDIS_URL;

const clients = {
  publisher: redis.createClient({ url: redisUrl }),
  subscriber1: redis.createClient({ url: redisUrl }),
  subscriber2: redis.createClient({ url: redisUrl }),
  subscriber3: redis.createClient({ url: redisUrl }),
};

const connectClient = async (client, name) => {
  client.on('error', (err) => {
    console.error(`${name} Redis Error:`, err.message);
  });

  await client.connect();
  console.log(`${name} connected to Redis`);
};

async function startServer() {
  try {
    await Promise.all([
      connectClient(clients.publisher, 'Publisher'),
      connectClient(clients.subscriber1, 'Subscriber1'),
      connectClient(clients.subscriber2, 'Subscriber2'),
      connectClient(clients.subscriber3, 'Subscriber3'),
    ]);

    console.log('All Redis clients connected');

    // MongoDB connection
    await connectToDB();
    console.log('MongoDB connected');

    // Redis channel subscriptions
    await clients.subscriber1.subscribe('fastchat-chats', () => {
      console.log(`${SERVER_NAME} subscribed to fastchat-chats`);
    });

    await clients.subscriber2.subscribe('fastchat-rooms', () => {
      console.log(`${SERVER_NAME} subscribed to fastchat-rooms`);
    });

    await clients.subscriber3.subscribe('fastchat-users', () => {
      console.log(`${SERVER_NAME} subscribed to fastchat-users`);
    });

    // Middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cors());
    
    // Serve static files (images)
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    app.use('/chat', ServerChat);

    app.use('/api', LoginRegister);

    app.use('/api', ImageUpload);


    // Room management routes
    app.post('/api/rooms/create', authenticateToken, async (req, res) => {
      try {
        const { roomName, password, description } = req.body;
        const { username } = req.user;

        if (!roomName || roomName.trim().length === 0) {
          return res.status(400).json({ error: 'Room name is required' });
        }

        const trimmedRoomName = roomName.trim();

        const existingRoom = await Room.findOne({ 
          name: { $regex: new RegExp(`^${trimmedRoomName}$`, 'i') }
        });
        
        if (existingRoom) {
          return res.status(400).json({ error: 'Room name already exists' });
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        
        const room = new Room({
          name: trimmedRoomName,
          password: hashedPassword,
          description: description ? description.trim() : '',
          creator: username,
          members: [username],
          moderators: [username],
          createdAt: new Date(),
          lastActivity: new Date()
        });

        await room.save();
        await clients.publisher.lPush('roomFASTCHAT', trimmedRoomName);
        await clients.publisher.publish('fastchat-rooms', '1');

        res.status(201).json({
          message: 'Room created successfully',
          room: { name: trimmedRoomName, description: room.description, hasPassword: !!password }
        });
      } catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json({ error: 'Failed to create room' });
      }
    });

    app.post('/api/rooms/join', authenticateToken, async (req, res) => {
      try {
        const { roomName, password } = req.body;
        const { username } = req.user;

        if (!roomName) {
          return res.status(400).json({ error: 'Room name is required' });
        }

        const room = await Room.findOne({ name: roomName });
        if (!room) {
          return res.status(404).json({ error: 'Room not found' });
        }

        if (room.password) {
          if (!password) {
            return res.status(400).json({ error: 'Password required for this room' });
          }
          
          const isValidPassword = await bcrypt.compare(password, room.password);
          if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid room password' });
          }
        }

        if (!room.members.includes(username)) {
          room.members.push(username);
          room.lastActivity = new Date();
          await room.save();
        }

        res.json({
          message: 'Successfully joined room',
          room: { name: roomName, description: room.description }
        });
      } catch (error) {
        console.error('Room join error:', error);
        res.status(500).json({ error: 'Failed to join room' });
      }
    });

    app.get('/api/rooms', authenticateToken, async (req, res) => {
      try {
        const rooms = await Room.find({}, 'name description members createdAt creator lastActivity');
        const roomsWithPasswordFlag = rooms.map(room => ({
          name: room.name,
          description: room.description,
          hasPassword: !!room.password,
          memberCount: room.members.length,
          creator: room.creator,
          createdAt: room.createdAt,
          lastActivity: room.lastActivity
        }));
        
        res.json(roomsWithPasswordFlag);
      } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Failed to get rooms' });
      }
    });

    app.get('/', (req, res) => {
      res.send(`<h1>FastChat Backend ${SERVER_NAME}</h1>`);
    });

    // Socket.IO handling with authentication
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return next(new Error('Authentication error'));
        }
        socket.user = user;
        next();
      });
    });

    const connections = {};

    io.on('connection', async (socket) => {
      console.log(`New connection: ${socket.id} - User: ${socket.user.username}`);
      socket.emit('log', `App is connected to ${SERVER_NAME}`);

      try {
        const rooms = await clients.publisher.lRange('roomFASTCHAT', 0, -1);
        socket.emit('room', rooms);
      } catch (err) {
        console.error('Error fetching rooms:', err.message);
      }

      socket.on('message', async (msg) => {
        try {
          console.log('Received msg:', msg);
          let data = typeof msg === 'string' ? JSON.parse(msg) : msg;

          if (!data || !data.room) {
            throw new Error('Invalid message data');
          }

          // Verify user is member of the room
          const room = await Room.findOne({ name: data.room });
          if (room && !room.members.includes(socket.user.username)) {
            socket.emit('error', 'You are not a member of this room');
            return;
          }

          // Ensure user from token and add timestamp
          data.user = socket.user.username;
          data.time = new Date();
          
          // Handle different message types
         if (data.type === 'image') {
  // Ensure it's a valid base64 string — but don’t rename or move it
  if (!data.data.startsWith('data:image')) {
    throw new Error('Invalid image format');
  }
}

          const chat = new Chat(data);
          await chat.save();
          console.log('Message saved to DB');
          
          // Update room's last activity
          if (room) {
            room.lastActivity = new Date();
            await room.save();
          }
          
          await clients.publisher.publish('fastchat-chats', JSON.stringify(data));

          if (data.unicast) {
            socket.emit('message', data);
          }
        } catch (error) {
          console.error('Message event error:', error.message);
          socket.emit('error', 'Failed to send message');
        }
      });

      socket.on('join', async (msg) => {
        try {
          let data = typeof msg === 'string' ? JSON.parse(msg) : msg;

          if (!data?.room || typeof data.room !== 'string') {
            console.error('Invalid join data:', data);
            socket.emit('error', 'Invalid room data');
            return;
          }

          // Verify room membership
          const room = await Room.findOne({ name: data.room });
          if (!room || !room.members.includes(socket.user.username)) {
            socket.emit('error', 'You are not authorized to join this room');
            return;
          }

          // Remove user from any existing rooms
          const userRooms = Object.keys(socket.rooms).filter(room => room !== socket.id);
          userRooms.forEach(room => socket.leave(room));

          connections[socket.user.username] = socket.id;
          socket.join(data.room);
          console.log(`${socket.user.username} joined room ${data.room}`);

          await clients.publisher.lPush(`${data.room}_meta`, socket.user.username);
          await clients.publisher.publish('fastchat-users', data.room);
          socket.emit('log', `Connected to ${data.room} at ${SERVER_NAME}`);
        } catch (err) {
          console.error('Join room error:', err.message);
          socket.emit('error', 'Failed to join room');
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id} - User: ${socket.user.username}`);
        // Remove from connections
        delete connections[socket.user.username];
      });
    });

    // Redis clients.subscribers
    clients.subscriber1.on('message', async (channel, msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.broadcast) {
          io.emit('message', data);
        } else if (data.unicast && data.toUser in connections) {
          io.to(connections[data.toUser]).emit('message', data);
        } else {
          io.to(data.room).emit('message', data);
        }
      } catch (err) {
        console.error(`${SERVER_NAME}: clients.subscriber1 error`, err.message);
      }
    });

    clients.subscriber2.on('message', async () => {
      try {
        const rooms = await clients.publisher.lRange('roomFASTCHAT', 0, -1);
        io.emit('room', rooms);
      } catch (err) {
        console.error('Error emitting room data:', err.message);
      }
    });

    clients.subscriber3.on('message', async (channel, room) => {
      try {
        const users = await clients.publisher.lRange(`${room}_meta`, 0, -1);
        io.to(room).emit('roomusers', users);
      } catch (err) {
        console.error('Error emitting roomusers:', err.message);
      }
    });

    httpServer.listen(PORT, () => {
     console.log(`FastChat Server Running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

startServer();