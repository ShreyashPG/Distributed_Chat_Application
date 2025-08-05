import React, { useState, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { joinRoom as apiJoinRoom } from '../../services/api';

const JoinRoomModal = () => {
      // Destructure joinRoomForm from the context
    const { setShowJoinRoom, joinRoom, joinRoomForm, setJoinRoomForm } = useChatContext();
    
    // Initialize local form state with the value from context
    const [form, setForm] = useState(joinRoomForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Sync local state if the context value changes (e.g., clicking another room)
    useEffect(() => {
        setForm(joinRoomForm);
    }, [joinRoomForm]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleClose = () => {
        setShowJoinRoom(false);
        setJoinRoomForm({ name: '', password: '' }); // Reset context state on close
    };


    const handleJoinRoom = async (e) => {
         e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await apiJoinRoom({ roomName: form.name, password: form.password });
            await joinRoom(form.name);
            handleClose(); // Use handleClose to also reset state
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    return (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Join Room</h2>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                    <input
                        type="text" name="name" placeholder="Room name" value={form.name}
                        onChange={handleInputChange} required
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    <input
                        type="password" name="password" placeholder="Password (if required)" value={form.password}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex space-x-3">
                       <button type="button" onClick={handleClose} className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50">
                            {loading ? 'Joining...' : 'Join Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JoinRoomModal;