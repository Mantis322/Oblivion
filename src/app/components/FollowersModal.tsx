'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaUserPlus, FaUserMinus } from 'react-icons/fa';
import { getUserFollowers, getUserFollowing, toggleUserFollow, checkUserFollowing } from '../services/userService';
import { useWallet } from '../contexts/WalletContext';
import { createNotification } from '../services/notificationService';
import Link from 'next/link';
import UserLink from './UserLink';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  title: string;
}

interface UserInfo {
  walletAddress: string;
  username?: string;
  name?: string;
  avatar?: string;
}

export default function FollowersModal({ isOpen, onClose, userId, type, title }: FollowersModalProps) {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<{[key: string]: boolean}>({});
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const { user: currentUser } = useWallet();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let userList: UserInfo[] = [];
      
      if (type === 'followers') {
        userList = await getUserFollowers(userId);
      } else {
        userList = await getUserFollowing(userId);
      }
      
      setUsers(userList);

      // Check following states for current user
      if (currentUser) {
        const states: {[key: string]: boolean} = {};
        for (const user of userList) {
          if (user.walletAddress !== currentUser.walletAddress) {
            const isFollowing = await checkUserFollowing(currentUser.walletAddress, user.walletAddress);
            states[user.walletAddress] = isFollowing;
          }
        }
        setFollowingStates(states);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUser: UserInfo) => {
    if (!currentUser) return;

    setLoadingStates(prev => ({ ...prev, [targetUser.walletAddress]: true }));
    
    try {
      const result = await toggleUserFollow(currentUser.walletAddress, targetUser.walletAddress);
      
      if (result.success) {
        setFollowingStates(prev => ({
          ...prev,
          [targetUser.walletAddress]: result.isFollowing
        }));

        // Send notification if followed
        if (result.isFollowing) {
          try {
            await createNotification({
              type: 'follow',
              fromUserId: currentUser.walletAddress,
              fromUserName: currentUser.username || 'anonymous',
              fromUserDisplayName: currentUser.name || 'Anonymous User',
              toUserId: targetUser.walletAddress,
            });
          } catch (notificationError) {
            console.error('Error creating follow notification:', notificationError);
          }
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [targetUser.walletAddress]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <FaUserPlus className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">              {users.map((user) => (
                <div key={user.walletAddress} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden">                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name || user.username || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <UserLink
                        username={user.username}
                        displayName={user.name || user.username || 'Anonymous'}
                        walletAddress={user.walletAddress}
                        className="text-white font-medium truncate block"
                        onClick={() => onClose()}
                      />
                      <UserLink
                        username={user.username}
                        walletAddress={user.walletAddress}
                        className="text-slate-400 text-sm truncate block"
                        showAt={true}
                        onClick={() => onClose()}
                      />
                    </div>
                  </div>

                  {/* Follow button - only show if not current user */}
                  {currentUser && user.walletAddress !== currentUser.walletAddress && (
                    <button
                      onClick={() => handleFollow(user)}
                      disabled={loadingStates[user.walletAddress]}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        followingStates[user.walletAddress]
                          ? 'bg-slate-700 hover:bg-slate-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {loadingStates[user.walletAddress] ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : followingStates[user.walletAddress] ? (
                        <>
                          <FaUserMinus className="w-3 h-3" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="w-3 h-3" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
