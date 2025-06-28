const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const connectToDB = require('./database/db');
const redis = require('redis');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Chat = require('./models/chat');
const User = require('./models/user');
const Room = require('./models/room');
const ServerChat = require('./routes/serverChats');

const SERVER_NAME = process.env.SERVER_NAME || 'FASTCHAT';
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();
const httpServer = http.createServer(app);

const io = socketio(httpServer, {
  cors: {
    origin: '*',
  },
});

// Redis client setup
const redisConfig = {
  socket: {
    host: 'localhost',
    port: 6379,
  },
};

const publisher = redis.createClient(redisConfig);
const subscriber1 = redis.createClient(redisConfig);
const subscriber2 = redis.createClient(redisConfig);
const subscriber3 = redis.createClient(redisConfig);

let connections = {};

async function startServer() {
  try {
    // Redis connections
    await Promise.all([
      publisher.connect(),
      subscriber1.connect(),
      subscriber2.connect(),
      subscriber3.connect(),
    ]);
    console.log('Redis clients connected');

    // MongoDB connection
    await connectToDB();
    console.log('MongoDB connected');

    // Redis channel subscriptions
    await subscriber1.subscribe('fastchat-chats', () => {
      console.log(`${SERVER_NAME} subscribed to fastchat-chats`);
    });

    await subscriber2.subscribe('fastchat-rooms', () => {
      console.log(`${SERVER_NAME} subscribed to fastchat-rooms`);
    });

    await subscriber3.subscribe('fastchat-users', () => {
      console.log(`${SERVER_NAME} subscribed to fastchat-users`);
    });

    // Middleware
    app.use(express.json());
    app.use(cors());
    app.use('/chat', ServerChat);

    // Authentication Routes
    app.post('/api/register', async (req, res) => {
      try {
        const { username, password, email } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await User.findOne({ 
          $or: [{ username }, { email }]
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
          username,
          password: hashedPassword,
          email,
          createdAt: new Date()
        });

        await user.save();
        const token = jwt.sign({ userId: user._id, username }, JWT_SECRET);

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { id: user._id, username, email }
        });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    });

    app.post('/api/login', async (req, res) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, username }, JWT_SECRET);

        res.json({
          message: 'Login successful',
          token,
          user: { id: user._id, username, email: user.email }
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Room management routes
    app.post('/api/rooms/create', authenticateToken, async (req, res) => {
      try {
        const { roomName, password, description } = req.body;
        const { username } = req.user;

        if (!roomName) {
          return res.status(400).json({ error: 'Room name is required' });
        }

        const existingRoom = await Room.findOne({ name: roomName });
        if (existingRoom) {
          return res.status(400).json({ error: 'Room name already exists' });
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        
        const room = new Room({
          name: roomName,
          password: hashedPassword,
          description,
          creator: username,
          members: [username],
          createdAt: new Date()
        });

        await room.save();
        await publisher.lPush('roomFASTCHAT', roomName);
        await publisher.publish('fastchat-rooms', '1');

        res.status(201).json({
          message: 'Room created successfully',
          room: { name: roomName, description, hasPassword: !!password }
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
        const rooms = await Room.find({}, 'name description hasPassword members createdAt creator');
        const roomsWithPasswordFlag = rooms.map(room => ({
          name: room.name,
          description: room.description,
          hasPassword: !!room.password,
          memberCount: room.members.length,
          creator: room.creator,
          createdAt: room.createdAt
        }));
        
        res.json(roomsWithPasswordFlag);
      } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Failed to get rooms' });
      }
    });

    // Authentication middleware
    function authenticateToken(req, res, next) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
      });
    }

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

    io.on('connection', async (socket) => {
      console.log(`New connection: ${socket.id} - User: ${socket.user.username}`);
      socket.emit('log', `App is connected to ${SERVER_NAME}`);

      try {
        const rooms = await publisher.lRange('roomFASTCHAT', 0, -1);
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

          data.user = socket.user.username; // Ensure user from token
          const chat = new Chat(data);
          await chat.save();
          console.log('Message saved to DB');
          await publisher.publish('fastchat-chats', JSON.stringify(data));

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

          connections[socket.user.username] = socket.id;
          socket.join(data.room);
          console.log(`${socket.user.username} joined room ${data.room}`);

          await publisher.lPush(`${data.room}_meta`, socket.user.username);
          await publisher.publish('fastchat-users', data.room);
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

    // Redis subscribers (updated channel names)
    subscriber1.on('message', async (channel, msg) => {
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
        console.error(`${SERVER_NAME}: Subscriber1 error`, err.message);
      }
    });

    subscriber2.on('message', async () => {
      try {
        const rooms = await publisher.lRange('roomFASTCHAT', 0, -1);
        io.emit('room', rooms);
      } catch (err) {
        console.error('Error emitting room data:', err.message);
      }
    });

    subscriber3.on('message', async (channel, room) => {
      try {
        const users = await publisher.lRange(`${room}_meta`, 0, -1);
        io.to(room).emit('roomusers', users);
      } catch (err) {
        console.error('Error emitting roomusers:', err.message);
      }
    });

    httpServer.listen(PORT, () => {
      console.log(`FastChat Server Running @ http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

startServer();