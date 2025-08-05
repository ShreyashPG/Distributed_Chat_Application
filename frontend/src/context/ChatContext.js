import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { searchMessages } from '../services/api';
import { debounce } from '../utils/helpers';

const ChatContext = createContext(null);

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const auth = useAuth();
    const chat = useChat(auth.token, auth.currentUser);

    // Modal visibility states
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);

        // State for the join room form to pre-fill the name
    const [joinRoomForm, setJoinRoomForm] = useState({ name: '', password: '' });


    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    
    const handleSearch = async (query) => {
        if (query.trim() === '') {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        setSearchLoading(true);
        try {
            const { data } = await searchMessages(query, chat.currentRoom);
            setSearchResults(data);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };
    
    const debouncedSearch = useRef(debounce((query) => handleSearch(query), 300)).current;

    const closeSearch = () => {
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        debouncedSearch.cancel();
    };

    const value = {
        ...auth,
        ...chat,
        showCreateRoom,
        setShowCreateRoom,
        showJoinRoom,
        setShowJoinRoom,
         joinRoomForm, // <<< ADD THIS
        setJoinRoomForm, // <<< ADD THIS
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchLoading,
        debouncedSearch,
        closeSearch,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};