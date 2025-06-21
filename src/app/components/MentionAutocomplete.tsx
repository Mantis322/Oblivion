// MentionAutocomplete component for Twitter-like @username suggestions
'use client';

import { useState, useEffect, useRef } from 'react';
import { MentionUser, searchUsersForMention } from '../services/mentionService';
import Image from 'next/image';

interface MentionAutocompleteProps {
  searchTerm: string;
  onSelectUser: (user: MentionUser) => void;
  onClose: () => void;
  currentUserId?: string;
  position: { x: number; y: number };
}

export default function MentionAutocomplete({
  searchTerm,
  onSelectUser,
  onClose,
  currentUserId,
  position
}: MentionAutocompleteProps) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search users when search term changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchUsersForMention(searchTerm, currentUserId);
        setUsers(results);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, currentUserId]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (users.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, users.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (users[selectedIndex]) {
            onSelectUser(users[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex, onSelectUser, onClose]);

  // Don't render if no search term or no users found
  if (!searchTerm.trim() || (users.length === 0 && !loading)) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto w-64"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {loading ? (
        <div className="p-3 text-center">
          <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-slate-400 text-sm">Searching users...</p>
        </div>
      ) : users.length > 0 ? (
        <div className="py-2">
          {users.map((user, index) => (
            <button
              key={user.walletAddress}
              onClick={() => onSelectUser(user)}
              className={`w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors duration-150 flex items-center gap-3 ${
                index === selectedIndex ? 'bg-slate-700/50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name || user.username}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {(user.name || user.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">
                    {user.name || user.username}
                  </p>
                  {user.name && (
                    <p className="text-slate-400 text-sm truncate">
                      @{user.username}
                    </p>
                  )}
                </div>
                {!user.name && (
                  <p className="text-slate-400 text-sm">@{user.username}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
