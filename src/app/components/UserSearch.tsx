"use client"
import { useEffect, useRef } from 'react';
import { FaTimes, FaSearch, FaUser } from 'react-icons/fa';

interface UserSearchProps {
  onClose: () => void;
  onSelectUser: (user: any) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: any[];
  onSearch: (term: string) => void;
  searching: boolean;
}

export default function UserSearch({
  onClose,
  onSelectUser,
  searchTerm,
  setSearchTerm,
  searchResults,
  onSearch,
  searching
}: UserSearchProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);
  // Handle search input change with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      onSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]); // Remove onSearch from dependencies

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Start New Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-slate-700">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or username..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : searchTerm.trim() && searchResults.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUser className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No users found</h3>
              <p className="text-slate-400">Try searching with a different term</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 p-2">
              {searchResults.map((user) => (
                <button
                  key={user.walletAddress}
                  onClick={() => onSelectUser(user)}
                  className="w-full p-4 rounded-xl text-left hover:bg-slate-800/50 transition-colors duration-200 border border-transparent hover:border-slate-600/30"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name || user.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {(user.name || user.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {user.name || user.username || 'Anonymous'}
                      </h3>
                      {user.username && (
                        <p className="text-sm text-slate-400 truncate">
                          @{user.username}
                        </p>
                      )}
                      {user.bio && (
                        <p className="text-sm text-slate-500 truncate mt-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSearch className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Search for users</h3>
              <p className="text-slate-400">Enter a name or username to find someone to message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
