import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import Message from './Message'; // Re-using our Message component!
import { X } from 'lucide-react';

const SearchResults = () => {
    const { searchQuery, searchResults, searchLoading, closeSearch } = useChatContext();

    return (
        <div className="absolute inset-0 bg-gray-900 z-10 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                <h3 className="text-lg font-semibold">Search Results for "{searchQuery}"</h3>
                <button
                    onClick={closeSearch}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {searchLoading && <div className="text-center text-gray-400 mt-8">Searching...</div>}
                
                {!searchLoading && searchResults.length === 0 && (
                    <div className="text-center text-gray-400 mt-8">No results found.</div>
                )}
                
                {!searchLoading && searchResults.map((msg, index) => (
                    // We can reuse the Message component if the search result data structure matches
                    // Or use the original dedicated rendering logic. The original had slightly different styling.
                    // Let's stick to the original's search result styling for consistency.
                    <div key={index} className="flex flex-col space-y-1 p-3 bg-gray-800 rounded-lg">
                         <div className="flex items-center justify-between text-xs text-gray-400">
                             <span>{new Date(msg.time).toLocaleString()}</span>
                             {msg.room && <span className="font-semibold text-blue-400">#{msg.room}</span>}
                         </div>
                         <div className="flex items-start space-x-3 mt-1">
                             <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                 {msg.user?.charAt(0)?.toUpperCase() || '?'}
                             </div>
                             <div className="flex-1">
                                 <span className="font-medium text-blue-300">{msg.user}</span>
                                 <p className="text-gray-200 whitespace-pre-wrap break-words mt-1">{msg.data}</p>
                             </div>
                         </div>
                     </div>
                ))}
            </div>
        </div>
    );
};

export default SearchResults;