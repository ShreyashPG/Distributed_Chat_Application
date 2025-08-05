import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import { MessageCircle, Search, LogOut } from 'lucide-react';

const Header = () => {
    const { 
        currentUser, 
        handleLogout, 
        currentRoom, 
        isConnected, 
        searchQuery, 
        setSearchQuery, 
        debouncedSearch 
    } = useChatContext();

    return (
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold">
                        <span className="text-blue-400">Fast</span>Chat
                    </h1>
                    {isConnected && currentRoom && (
                        <div className="flex items-center space-x-2 text-gray-300">
                            <MessageCircle size={20} />
                            <span>#{currentRoom}</span>
                        </div>
                    )}
                </div>

                <div className="relative w-full max-w-md">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            debouncedSearch(e.target.value);
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
    );
};

export default Header;