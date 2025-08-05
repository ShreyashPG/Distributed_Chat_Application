import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { readFileAsDataURL } from '../../utils/helpers';
import { Send } from 'lucide-react';

const MessageInput = () => {
    const { sendMessage, currentRoom } = useChatContext();

    // State for the input form is kept local to this component
    const [input, setInput] = useState('');
    const [img, setImg] = useState(null);
    const [isBroadcast, setIsBroadcast] = useState(false);
    const [toUser, setToUser] = useState('');

    const handleSendMessage = async () => {
        const isUnicast = !isBroadcast && toUser !== '';

        if (!currentRoom && !isBroadcast && !isUnicast) {
            alert('Either join a chatroom, broadcast, or use direct messaging.');
            return;
        }

        try {
            if (img) {
                const base64 = await readFileAsDataURL(img);
                sendMessage({
                    data: base64,
                    type: 'image',
                    broadcast: Number(isBroadcast),
                    unicast: isUnicast,
                    toUser,
                });
                setImg(null); // Clear image after sending
            } else if (input.trim() !== '') {
                sendMessage({
                    data: input,
                    type: 'text',
                    broadcast: Number(isBroadcast),
                    unicast: isUnicast,
                    toUser,
                });
                setInput(''); // Clear input after sending
            }
             // Clear DM target after sending any message
             if(isUnicast) setToUser('');
        } catch (err) {
            console.error('Error sending message:', err);
            alert('Failed to send image.');
        }
    };

    return (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="space-y-4">
                {/* Message options */}
                <div className="flex items-center space-x-4 text-sm">
                    <label className="flex items-center space-x-2 cursor-pointer">
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
                        disabled={isBroadcast}
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
                    <label htmlFor="image-upload" className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                        {img ? `Selected: ${img.name}` : 'Upload Image'}
                    </label>
                </div>
                {/* Message input */}
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!!img} // Disable text input if an image is selected
                    />
                    <button onClick={handleSendMessage} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageInput;