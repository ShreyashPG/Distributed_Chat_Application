

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Users, Settings, LogOut, Lock, Plus, Search, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:8080';

const FastChat = () => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fastchat_token'));
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  
  // Auth form states
  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Chat states
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [room, setRoom] = useState('');
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [img, setImg] = useState(null);
  
  // Room creation states
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [createRoomForm, setCreateRoomForm] = useState({
    name: '',
    description: '',
    password: '',
    hasPassword: false
  });
  
  // Room join states
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [joinRoomForm, setJoinRoomForm] = useState({
    name: '',
    password: ''
  });
  
  // Message type states
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [toUser, setToUser] = useState('');
  const [messageFilter, setMessageFilter] = useState('all'); // 'all', 'dm', 'group'
  
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Initialize authentication
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token validity
      verifyToken();
    }
  }, [token]);
  
  const verifyToken = async () => {
    try {
      // You could add a token verification endpoint
      // For now, we'll assume the token is valid if it exists
      const userData = JSON.parse(localStorage.getItem('fastchat_user') || '{}');
      if (userData.username) {
        setCurrentUser(userData);
        setIsAuthenticated(true);
        initializeSocket();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      handleLogout();
    }
  };
  
  const initializeSocket = () => {
    const newSocket = socketIOClient(ENDPOINT, {
      transports: ['websocket'],
      auth: {
        token: token
      }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to FastChat server');
    });
    
    newSocket.on('message', (msg) => {
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
      setMessages(prev => [...prev, data]);
    });
    
    newSocket.on('roomusers', (msg) => {
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
      const uniqueUsers = [...new Set(data)];
      setUsers(uniqueUsers);
    });
    
    newSocket.on('room', (msg) => {
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
      setRooms(data);
    });
    
    newSocket.on('log', (msg) => console.log(msg));
    
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      alert(error);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  };
  
  // Authentication handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const response = await axios.post(`${ENDPOINT}${endpoint}`, authForm);
      
      const { token, user } = response.data;
      
      localStorage.setItem('fastchat_token', token);
      localStorage.setItem('fastchat_user', JSON.stringify(user));
      
      setToken(token);
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      initializeSocket();
      
    } catch (error) {
      setAuthError(error.response?.data?.error || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('fastchat_token');
    localStorage.removeItem('fastchat_user');
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setConnected(false);
    setRoom('');
    setMessages([]);
    if (socket) {
      socket.close();
      setSocket(null);
    }
    delete axios.defaults.headers.common['Authorization'];
  };
  
  // Room management
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const roomData = {
        roomName: createRoomForm.name,
        description: createRoomForm.description,
        password: createRoomForm.hasPassword ? createRoomForm.password : undefined
      };
      
      await axios.post(`${ENDPOINT}/api/rooms/create`, roomData);
      
      setShowCreateRoom(false);
      setCreateRoomForm({ name: '', description: '', password: '', hasPassword: false });
      alert('Room created successfully!');
      
      // Refresh rooms list
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create room');
    }
  };
  
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${ENDPOINT}/api/rooms/join`, {
        roomName: joinRoomForm.name,
        password: joinRoomForm.password
      });
      
      setRoom(joinRoomForm.name);
      setConnected(true);
      setShowJoinRoom(false);
      setJoinRoomForm({ name: '', password: '' });
      
      // Join socket room
      socket.emit('join', JSON.stringify({
        room: joinRoomForm.name,
        user: currentUser.username
      }));
      
      // Load room messages
      loadRoomMessages(joinRoomForm.name);
      
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to join room');
    }
  };
  
  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${ENDPOINT}/api/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };
  
  const loadRoomMessages = async (roomName) => {
    try {
      const response = await axios.post(`${ENDPOINT}/chat`, { room: roomName });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };
  
  // Message handling
 const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const sendMessage = async () => {
  const isUnicast = !isBroadcast && toUser !== '';

  if (room === '' && !isBroadcast && !isUnicast) {
    alert('Either join a chatroom, broadcast, or use direct messaging');
    return;
  }

  try {
    if (img) {
      const base64 = await readFileAsDataURL(img);

      const data = {
        time: new Date(),
        user: currentUser.username,
        room,
        data: base64,
        type: 'image',
        broadcast: Number(isBroadcast),
        unicast: isUnicast,
        toUser,
      };

      socket.emit('message', JSON.stringify(data));
      setImg(null);
      return; // important!
    }

    if (input !== '') {
      const data = {
        time: new Date(),
        user: currentUser.username,
        room,
        data: input,
        type: 'text',
        broadcast: Number(isBroadcast),
        unicast: isUnicast,
        toUser,
      };

      socket.emit('message', JSON.stringify(data));
      setInput('');
      setToUser('');
    }
  } catch (err) {
    console.error('Error sending message:', err);
    alert('Failed to send image.');
  }
};

  
  const filteredMessages = messages.filter(msg => {
    if (!msg) return false;
    
    switch (messageFilter) {
      case 'dm':
        return msg.unicast && (msg.user === currentUser.username || msg.toUser === currentUser.username);
      case 'group':
        return !msg.unicast;
      default:
        return true;
    }
  });
  
  // Authentication UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              <span className="text-blue-400">Fast</span>Chat
            </h1>
            <p className="text-gray-300">Real-time communication platform</p>
          </div>
          
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                authMode === 'login' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                authMode === 'register' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={authForm.username}
                onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {authMode === 'register' && (
              <div>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {authError && (
              <div className="text-red-400 text-sm text-center">{authError}</div>
            )}
            
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Register')}
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  // Main Chat UI
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-400">Fast</span>Chat
            </h1>
            {connected && room && (
              <div className="flex items-center space-x-2 text-gray-300">
                <MessageCircle size={20} />
                <span>#{room}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {currentUser.username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Room Actions */}
          <div className="p-4 border-b border-gray-700">
            <div className="space-y-2">
              <button
                onClick={() => setShowCreateRoom(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span>Create Room</span>
              </button>
              <button
                onClick={() => setShowJoinRoom(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                <MessageCircle size={16} />
                <span>Join Room</span>
              </button>
            </div>
          </div>
          
          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Available Rooms</h3>
              <div className="space-y-2">
                {rooms.map((roomItem) => (
                  <div
                    key={roomItem.name || roomItem}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      room === (roomItem.name || roomItem)
                        ? 'bg-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => {
                      const roomName = roomItem.name || roomItem;
                      if (room !== roomName) {
                        setJoinRoomForm({ ...joinRoomForm, name: roomName });
                        setShowJoinRoom(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{roomItem.name || roomItem}</span>
                      {(roomItem.hasPassword || (typeof roomItem === 'object' && roomItem.password)) && (
                        <Lock size={16} className="text-yellow-400" />
                      )}
                    </div>
                    {roomItem.description && (
                      <p className="text-sm text-gray-400 mt-1">{roomItem.description}</p>
                    )}
                    {roomItem.memberCount && (
                      <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400">
                        <Users size={12} />
                        <span>{roomItem.memberCount} members</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Online Users */}
            {users.length > 0 && (
              <div className="p-4 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-gray-300">Online Users</h3>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-gray-700"
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm">{user}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {connected ? (
            <>
              {/* Message Filter */}
              <div className="p-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center space-x-4">
                  <label className="text-sm text-gray-300">Filter:</label>
                  <select
                    value={messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Messages</option>
                    <option value="group">Group Messages</option>
                    <option value="dm">Direct Messages</option>
                  </select>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center text-gray-400">No messages yet</div>
                ) : (
                  filteredMessages.map((msg, index) => {
                          console.log('Rendering msg:', msg);
                    return (
                   
                    <div key={index} className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span>{new Date(msg.time).toLocaleString()}</span>
                        <span className="text-red-400">
                          {msg.broadcast 
                            ? '!!Global Broadcast!!' 
                            : msg.unicast 
                              ? '!!Direct Message!!' 
                              : '!!Group Message!!'
                          }
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                          {msg.user?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-blue-400">{msg.user}</span>
                            {msg.unicast && msg.toUser && (
                              <span className="text-gray-400">→ {msg.toUser}</span>
                            )}
                          </div>
                        
                      
                                   <div className="mt-1">
                                                                                         {typeof msg.data === 'string' && msg.data.startsWith('data:image') ? (
                                                                                        <img
                                                                                src={msg.data}
                                                                                 alt="Shared"
                                                                                 className="max-w-xs max-h-64 rounded-lg border border-gray-600"
                                                                    />
                                                          ) : (
                                               <p className="text-gray-200 whitespace-pre-wrap break-words">{msg.data}</p>
                                         )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )})
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-700 bg-gray-800">
                <div className="space-y-4">
                  {/* Message options */}
                  <div className="flex items-center space-x-4 text-sm">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isBroadcast}
                        onChange={(e) => setIsBroadcast(e.target.checked)}
                        className="rounded"
                      />
                      <span>Broadcast</span>
                    </label>
                    
                    <input
                      type="text"
                      placeholder="Direct message to user..."
                      value={toUser}
                      onChange={(e) => setToUser(e.target.value)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* File upload */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImg(e.target.files[0])}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
                    >
                      {img ? `Selected: ${img.name}` : 'Upload Image'}
                    </label>
                  </div>
                  
                  {/* Message input */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4 text-gray-600" />
                <h2 className="text-2xl font-bold mb-2">Welcome to FastChat</h2>
                <p className="text-gray-400">Create or join a room to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <input
                type="text"
                placeholder="Room name"
                value={createRoomForm.name}
                onChange={(e) => setCreateRoomForm({...createRoomForm, name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={createRoomForm.description}
                onChange={(e) => setCreateRoomForm({...createRoomForm, description: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
              />
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createRoomForm.hasPassword}
                  onChange={(e) => setCreateRoomForm({...createRoomForm, hasPassword: e.target.checked})}
                  className="rounded"
                />
                <span>Password protected</span>
              </label>
              {createRoomForm.hasPassword && (
                <input
                  type="password"
                  placeholder="Room password"
                  value={createRoomForm.password}
                  onChange={(e) => setCreateRoomForm({...createRoomForm, password: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Join Room Modal */}
      {showJoinRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Join Room</h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                placeholder="Room name"
                value={joinRoomForm.name}
                onChange={(e) => setJoinRoomForm({...joinRoomForm, name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Password (if required)"
                value={joinRoomForm.password}
                onChange={(e) => setJoinRoomForm({...joinRoomForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowJoinRoom(false)}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastChat;