import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import { Plus, MessageCircle, Users, Lock } from 'lucide-react';

const Sidebar = () => {
    const { rooms, users, currentRoom, setShowCreateRoom, setShowJoinRoom, setJoinRoomForm, joinRoomForm } = useChatContext();

    // PASTE your sidebar JSX here
    // Replace state/handlers with context versions
    // Example: onClick={() => setShowCreateRoom(true)}
    
    return (
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
                   
           {/* Room Actions */}
           <div className="p-4 border-b border-gray-700">
             <div className="space-y-2">
               <button
                onClick={() => setShowCreateRoom(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span>Create Room</span>
              </button>
              <button
                onClick={() => setShowJoinRoom(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                <MessageCircle size={16} />
                <span>Join Room</span>
              </button>
            </div>
          </div>
          
          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Available Rooms</h3>
              <div className="space-y-2">
                {rooms.map((roomItem) => (
                  <div
                    key={roomItem.name || roomItem}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentRoom === (roomItem.name || roomItem)
                        ? 'bg-blue-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => {
                      const roomName = roomItem.name || roomItem;
                      if (currentRoom !== roomName) {
                        setJoinRoomForm({ ...joinRoomForm, name: roomName });
                        setShowJoinRoom(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{roomItem.name || roomItem}</span>
                      {(roomItem.hasPassword || (typeof roomItem === 'object' && roomItem.password)) && (
                        <Lock size={16} className="text-yellow-400" />
                      )}
                    </div>
                    {roomItem.description && (
                      <p className="text-sm text-gray-400 mt-1">{roomItem.description}</p>
                    )}
                    {roomItem.memberCount && (
                      <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400">
                        <Users size={12} />
                        <span>{roomItem.memberCount} members</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {users.length > 0 && (
                    <div className="p-4 border-t border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-300">Online Users</h3>
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div key={user} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-700">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="text-sm">{user}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

export default Sidebar;