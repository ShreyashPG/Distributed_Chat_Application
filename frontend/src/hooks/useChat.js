import { useState, useEffect, useRef, useCallback } from 'react';
import socketIOClient from 'socket.io-client';
import { loadRoomMessages as apiLoadRoomMessages, fetchRooms as apiFetchRooms } from '../services/api';

const ENDPOINT = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

export const useChat = (token, currentUser) => {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentRoom, setCurrentRoom] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll to bottom effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Socket initialization
    useEffect(() => {
        if (!token || !currentUser) return;

        const newSocket = socketIOClient(ENDPOINT, {
            transports: ['websocket'],
            auth: { token },
        });

        newSocket.on('connect', () => {
            console.log('Connected to FastChat server');
            setIsConnected(true);
            apiFetchRooms().then(response => setRooms(response.data)).catch(console.error);
        });

        newSocket.on('message', (msg) => {
            const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
            setMessages(prev => [...prev, data]);
        });

        newSocket.on('roomusers', (msg) => {
            const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
            setUsers([...new Set(data)]);
        });
        
        newSocket.on('room', (msg) => {
             const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
             setRooms(data);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
            setIsConnected(false);
        };
    }, [token, currentUser]);
    
    const joinRoom = useCallback(async (roomName) => {
        if (!socket) return;
        
        socket.emit('join', JSON.stringify({ room: roomName, user: currentUser.username }));
        setCurrentRoom(roomName);
        
        // Load messages for the room
        try {
            const response = await apiLoadRoomMessages(roomName);
            setMessages(response.data);
        } catch (error) {
            console.error('Failed to load messages:', error);
            setMessages([]); // Clear messages on failure
        }
    }, [socket, currentUser]);
    
    const sendMessage = useCallback((messageData) => {
        if (socket) {
            const data = {
                ...messageData,
                time: new Date(),
                user: currentUser.username,
                room: currentRoom,
            };
            socket.emit('message', JSON.stringify(data));
        }
    }, [socket, currentUser, currentRoom]);
    
    const refreshRooms = async () => {
        try {
            const response = await apiFetchRooms();
            setRooms(response.data);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        }
    };


    return {
        socket,
        messages,
        rooms,
        users,
        currentRoom,
        isConnected,
        messagesEndRef,
        setCurrentRoom,
        joinRoom,
        sendMessage,
        refreshRooms
    };
};