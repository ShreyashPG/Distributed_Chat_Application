import axios from 'axios';

const ENDPOINT = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: ENDPOINT,
});

// Function to set the auth token for all subsequent requests
export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// --- Auth Endpoints ---
export const loginUser = (credentials) => api.post('/api/login', credentials);
export const registerUser = (userData) => api.post('/api/register', userData);

// --- Room Endpoints ---
export const fetchRooms = () => api.get('/api/rooms');
export const createRoom = (roomData) => api.post('/api/rooms/create', roomData);
export const joinRoom = (joinData) => api.post('/api/rooms/join', joinData);

// --- Chat/Message Endpoints ---
export const loadRoomMessages = (roomName) => api.post('/chat', { room: roomName });
export const searchMessages = (query, room) => api.post('/chat/search', { query, room });

export default api;