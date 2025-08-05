import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';
import { MessageCircle as MessageCircleIcon } from 'lucide-react';

const ChatWindow = () => {
    const { messages, currentUser, isConnected, messagesEndRef } = useChatContext();
    const [messageFilter, setMessageFilter] = useState('all');

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

    if (!isConnected|| !currentUser) {
        return (
             <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <MessageCircleIcon size={64} className="mx-auto mb-4 text-gray-600" />
                    <h2 className="text-2xl font-bold mb-2">Welcome to FastChat</h2>
                    <p className="text-gray-400">Create or join a room to start chatting</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Paste the Message Filter and Messages display JSX here */}
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

             {/* Messages - THIS IS THE CORRECTED PART */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg, index) => (
                        <Message key={index} msg={msg} />
                    ))
                ) : (
                    <div className="text-center text-gray-400">No messages yet in this filter.</div>
                )}
                <div ref={messagesEndRef} />
            </div>
              
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {filteredMessages.map((msg, index) => (
                    <Message key={index} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <MessageInput />
        </>
    );
};

export default ChatWindow;