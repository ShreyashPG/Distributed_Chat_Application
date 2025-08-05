import React from 'react';

const Message = ({ msg }) => {
    // Basic check in case of malformed message objects
    if (!msg || !msg.user || !msg.time) {
        return null; 
    }

    return (
        <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>{new Date(msg.time).toLocaleString()}</span>
                <span className="text-red-400">
                    {msg.broadcast ? '!!Global Broadcast!!' : msg.unicast ? '!!Direct Message!!' : '!!Group Message!!'}
                </span>
            </div>
            <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {msg.user.charAt(0).toUpperCase()}
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
                                alt="Shared content"
                                className="max-w-xs max-h-64 rounded-lg border border-gray-600 mt-1"
                            />
                        ) : (
                            <p className="text-gray-200 whitespace-pre-wrap break-words">{msg.data}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Message;