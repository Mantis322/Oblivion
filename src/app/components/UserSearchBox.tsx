"use client"
import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaSpinner, FaTimes } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { searchUsers, UserData } from '../services/userService';

interface UserSearchBoxProps {
  isCollapsed?: boolean;
}

const UserSearchBox: React.FC<UserSearchBoxProps> = ({ isCollapsed = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  // Arama fonksiyonu
  const handleSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchUsers(query.trim(), 10);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
    setIsLoading(false);
  };

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  // Dışarı tıklandığında sonuçları gizle
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kullanıcı profili sayfasına git
  const handleUserClick = (username: string) => {
    setShowResults(false);
    setSearchQuery('');
    router.push(`/profile/${username}`);
  };

  // Arama temizle
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Avatar initials generator
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isCollapsed) {
    return (
      <div className="relative" ref={searchRef}>
        <button
          className="w-full p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-300 border border-transparent hover:border-slate-600/30"
          title="Search Users"
          onClick={() => setShowResults(!showResults)}
        >
          <FaSearch className="text-lg" />
        </button>
        
        {showResults && (
          <div className="absolute left-16 top-0 w-80 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50">
            <div className="p-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-10 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                )}
                {isLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FaSpinner className="text-slate-400 text-sm animate-spin" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto border-t border-slate-700/50">
                {searchResults.map((user) => (
                  <button
                    key={user.walletAddress}
                    onClick={() => handleUserClick(user.username || user.walletAddress)}
                    className="w-full p-3 hover:bg-slate-700/50 transition-colors text-left border-b border-slate-700/30 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name || user.username || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {getInitials(user.name || user.username || 'U')}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {user.name || user.username || 'Anonymous'}
                        </div>
                        {user.username && (
                          <div className="text-slate-400 text-xs truncate">
                            @{user.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
              <div className="p-4 text-center text-slate-400 text-sm border-t border-slate-700/50">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-6" ref={searchRef}>
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-300"
          onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <FaSpinner className="text-slate-400 text-sm animate-spin" />
          </div>
        )}
      </div>
      
      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full mt-2 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <button
                key={user.walletAddress}
                onClick={() => handleUserClick(user.username || user.walletAddress)}
                className="w-full p-4 hover:bg-slate-700/50 transition-colors text-left border-b border-slate-700/30 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.username || 'User'}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {getInitials(user.name || user.username || 'U')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {user.name || user.username || 'Anonymous'}
                    </div>
                    {user.username && (
                      <div className="text-slate-400 text-sm truncate">
                        @{user.username}
                      </div>
                    )}
                    {user.bio && (
                      <div className="text-slate-500 text-xs truncate mt-1">
                        {user.bio}
                      </div>
                    )}
                  </div>
                  {user.followers && user.followers.length > 0 && (
                    <div className="text-slate-400 text-xs">
                      {user.followers.length} followers
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : searchQuery.length >= 2 && !isLoading ? (
            <div className="p-4 text-center text-slate-400">
              No users found for "{searchQuery}"
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Type at least 2 characters to search
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default UserSearchBox;
