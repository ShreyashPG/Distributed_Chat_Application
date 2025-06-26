const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const connectToDB = require('./database/db');
const redis = require('redis');
const cors = require('cors');
const Chat = require('./models/chat'); // Chat model sahi se import
const ServerChat = require('./routes/serverChats');

const SERVER_NAME = process.env.SERVER_NAME || 'APP';
const PORT = process.env.PORT || 8080;

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
    await subscriber1.subscribe('bchat-chats', () => {
      console.log(`${SERVER_NAME} subscribed to bchat-chats`);
    });

    await subscriber2.subscribe('bchat-rooms', () => {
      console.log(`${SERVER_NAME} subscribed to bchat-rooms`);
    });

    await subscriber3.subscribe('bchat-users', () => {
      console.log(`${SERVER_NAME} subscribed to bchat-users`);
    });

    // Middleware
    app.use(express.json());
    app.use(cors());
    app.use('/chat', ServerChat);

    app.get('/', (req, res) => {
      res.send(`<h1>BChat Backend ${SERVER_NAME}</h1>`);
    });

    // Socket.IO handling
    io.on('connection', async (socket) => {
      console.log(`New connection: ${socket.id}`);
      socket.emit('log', `App is connected to ${SERVER_NAME}`);

      try {
        const rooms = await publisher.lRange('roomBCHAT', 0, -1);
        socket.emit('room', rooms);
      } catch (err) {
        console.error('Error fetching rooms:', err.message);
      }

      socket.on('message', async (msg) => {
        try {
          console.log('Received msg:', msg, typeof msg);
          let data = typeof msg === 'string' ? JSON.parse(msg) : msg;

          // Validate data
          if (!data || !data.room || !data.user) {
            throw new Error('Invalid message data');
          }

          const chat = new Chat(data);
          await chat.save();
          console.log('Message saved to DB');
          await publisher.publish('bchat-chats', JSON.stringify(data));

          if (data.unicast) {
            socket.emit('message', data);
          }
        } catch (error) {
          console.error('Message event error:', error.message);
        }
      });

      socket.on('join', async (msg) => {
        try {
          let data = typeof msg === 'string' ? JSON.parse(msg) : msg;

          // Validation
          if (!data?.room || typeof data.room !== 'string' || !data?.user || typeof data.user !== 'string') {
            console.error('Invalid join data:', data);
            socket.emit('error', 'Invalid room or user data');
            return;
          }

          connections[data.user] = socket.id;
          socket.join(data.room);
          console.log(`${data.user} joined room ${data.room}`);

          const exists = await publisher.get(data.room);
          if (!exists) {
            await publisher.set(data.room, '1');
            await publisher.lPush('roomBCHAT', data.room);
            await publisher.publish('bchat-rooms', '1');
          }
          await publisher.lPush(`${data.room}_meta`, data.user);
          await publisher.publish('bchat-users', data.room);
          socket.emit('log', `App is connected at ${SERVER_NAME}`);
        } catch (err) {
          console.error('Join room error:', err.message);
          socket.emit('error', 'Failed to join room');
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    // Redis subscribers
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
        const rooms = await publisher.lRange('roomBCHAT', 0, -1);
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
      console.log(`Server Running @ http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

startServer();