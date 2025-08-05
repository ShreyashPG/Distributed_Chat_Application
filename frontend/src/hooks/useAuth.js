import { useState, useEffect } from 'react';
import { setAuthToken, loginUser, registerUser } from '../services/api';

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('fastchat_token'));
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        // On initial load, check for token in local storage
        const storedToken = localStorage.getItem('fastchat_token');
        const storedUser = localStorage.getItem('fastchat_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setCurrentUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
            setAuthToken(storedToken);
        }
    }, []);

    const handleLogin = async (credentials) => {
        setAuthLoading(true);
        setAuthError('');
        try {
            const { data } = await loginUser(credentials);
            localStorage.setItem('fastchat_token', data.token);
            localStorage.setItem('fastchat_user', JSON.stringify(data.user));
            setToken(data.token);
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            setAuthToken(data.token);
        } catch (error) {
            setAuthError(error.response?.data?.error || 'Login failed');
            throw error; // Re-throw to handle in component if needed
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegister = async (userData) => {
        setAuthLoading(true);
        setAuthError('');
        try {
            const { data } = await registerUser(userData);
            localStorage.setItem('fastchat_token', data.token);
            localStorage.setItem('fastchat_user', JSON.stringify(data.user));
            setToken(data.token);
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            setAuthToken(data.token);
        } catch (error) {
            setAuthError(error.response?.data?.error || 'Registration failed');
            throw error; // Re-throw
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
        setAuthToken(null);
    };

    return {
        isAuthenticated,
        currentUser,
        token,
        authLoading,
        authError,
        setAuthError,
        handleLogin,
        handleRegister,
        handleLogout,
    };
};