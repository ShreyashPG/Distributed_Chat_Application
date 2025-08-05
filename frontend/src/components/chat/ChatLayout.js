import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import Header from './Header';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import CreateRoomModal from '../common/CreateRoomModal';
import JoinRoomModal from '../common/JoinRoomModal';
import SearchResults from './SearchResults';

const ChatLayout = () => {
    const { showCreateRoom, showJoinRoom, isSearching } = useChatContext();

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Header />
            <div className="flex h-[calc(100vh-80px)]">
                <Sidebar />
                <main className="flex-1 flex flex-col relative">
                    {isSearching ? <SearchResults /> : <ChatWindow />}
                </main>
            </div>
            {showCreateRoom && <CreateRoomModal />}
            {showJoinRoom && <JoinRoomModal />}
        </div>
    );
};

export default ChatLayout;