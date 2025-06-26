const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const connectToDB = require('./database/db');
const redis = require('redis');
const cors = require('cors');
const ChatSchema = require('./models/chat');
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
    host: 'localhost', // or '127.0.0.1'
    port: 6379,
  },
};


const publisher = redis.createClient(redisConfig);
const subscriber1 = redis.createClient(redisConfig);
const subscriber2 = redis.createClient(redisConfig);
const subscriber3 = redis.createClient(redisConfig);

let connections = {};

async function startServer() {
  // Redis connect
  await publisher.connect();
  await subscriber1.connect();
  await subscriber2.connect();
  await subscriber3.connect();

  // MongoDB connect
  await connectToDB();

  // Subscribe to Redis channels
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
    socket.emit('log', `App is connected to ${SERVER_NAME}`);

    try {
      const rooms = await publisher.lRange('roomBCHAT', 0, -1);
      socket.emit('room', JSON.stringify(rooms));
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }

    socket.on('message', async (msg) => {
      publisher.publish('bchat-chats', msg);

      const data = JSON.parse(msg);
      const Chat = new ChatSchema(data);
      await Chat.save();

      if (data.unicast) {
        socket.emit('message', msg);
      }
    });

    socket.on('join', async (msg) => {
      const data = JSON.parse(msg);
      connections[data.user] = socket.id;
      socket.join(data.room);

      try {
        const exists = await publisher.get(data.room);
        if (!exists) {
          await publisher.set(data.room, '1');
          await publisher.lPush('roomBCHAT', data.room);
          publisher.publish('bchat-rooms', '1');
        }

        await publisher.lPush(`${data.room}_meta`, data.user);
        publisher.publish('bchat-users', data.room);

        socket.emit('log', `App is connected at ${SERVER_NAME}`);
      } catch (err) {
        console.error('Join room error:', err);
      }
    });
  });

  // Redis subscribers
  subscriber1.on('message', async (channel, msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.broadcast) {
        io.emit('message', msg);
      } else if (data.unicast && data.toUser in connections) {
        io.to(connections[data.toUser]).emit('message', msg);
      } else {
        io.to(data.room).emit('message', msg);
      }
    } catch (err) {
      console.error(`${SERVER_NAME}: Error in subscriber1 message`, err);
    }
  });

  subscriber2.on('message', async () => {
    try {
      const rooms = await publisher.lRange('roomBCHAT', 0, -1);
      io.emit('room', JSON.stringify(rooms));
    } catch (err) {
      console.error('Error emitting room data:', err);
    }
  });

  subscriber3.on('message', async (channel, room) => {
    try {
      const users = await publisher.lRange(`${room}_meta`, 0, -1);
      io.to(room).emit('roomusers', JSON.stringify(users));
    } catch (err) {
      console.error('Error emitting roomusers:', err);
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`Server Running @ http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
