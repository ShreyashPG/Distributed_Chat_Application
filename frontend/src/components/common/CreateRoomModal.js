import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { createRoom as apiCreateRoom } from '../../services/api';

const CreateRoomModal = () => {
    const { setShowCreateRoom, refreshRooms } = useChatContext();
    const [form, setForm] = useState({ name: '', description: '', password: '', hasPassword: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const roomData = {
                roomName: form.name,
                description: form.description,
                password: form.hasPassword ? form.password : undefined,
            };
            await apiCreateRoom(roomData);
            alert('Room created successfully!');
            await refreshRooms();
            setShowCreateRoom(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Create New Room</h2>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                    <input
                        type="text" name="name" placeholder="Room name" value={form.name}
                        onChange={handleInputChange} required
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    <textarea
                        name="description" placeholder="Description (optional)" value={form.description}
                        onChange={handleInputChange} rows="3"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                    />
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" name="hasPassword" checked={form.hasPassword} onChange={handleInputChange} className="rounded"/>
                        <span>Password protected</span>
                    </label>
                    {form.hasPassword && (
                        <input
                            type="password" name="password" placeholder="Room password" value={form.password}
                            onChange={handleInputChange} required
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                    )}
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex space-x-3">
                        <button type="button" onClick={() => setShowCreateRoom(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoomModal;