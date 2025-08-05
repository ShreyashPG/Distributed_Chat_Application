


import React from 'react';
import { ChatProvider, useChatContext } from './context/ChatContext';
import AuthScreen from './components/auth/AuthScreen';
import ChatLayout from './components/chat/ChatLayout';
import './index.css'; // Assuming you have Tailwind CSS setup

const AppContent = () => {
    // This component decides which view to show
    const { isAuthenticated } = useChatContext();
    return isAuthenticated ? <ChatLayout /> : <AuthScreen />;
};

const App = () => {
    return (
        <ChatProvider>
            <AppContent />
        </ChatProvider>
    );
};

export default App;