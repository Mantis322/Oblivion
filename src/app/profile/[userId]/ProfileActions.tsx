"use client"
import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { toggleUserFollow, checkUserFollowing } from '../../services/userService';
import { createNotification } from '../../services/notificationService';

interface ProfileActionsProps {
  profileUser: {
    username: string;
    walletAddress: string;
  };
}

export default function ProfileActions({ profileUser }: ProfileActionsProps) {
  const { user: currentUser } = useWallet();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  
  // Eğer kendi profilimizse butonları gösterme
  const isOwnProfile = currentUser?.username === profileUser.username || 
                      currentUser?.walletAddress === profileUser.walletAddress;

  // Check follow status on component mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (currentUser && !isOwnProfile) {
        const following = await checkUserFollowing(currentUser.walletAddress, profileUser.walletAddress);
        setIsFollowing(following);
      }
    };
    checkFollowStatus();
  }, [currentUser, profileUser.walletAddress, isOwnProfile]);

  const handleFollow = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const result = await toggleUserFollow(currentUser.walletAddress, profileUser.walletAddress);
      
      if (result.success) {
        setIsFollowing(result.isFollowing);
        setFollowerCount(result.followerCount);
        
        // Send notification if followed (not unfollowed)
        if (result.isFollowing) {
          try {
            await createNotification({
              type: 'follow',
              fromUserId: currentUser.walletAddress,
              fromUserName: currentUser.username || 'anonymous',
              fromUserDisplayName: currentUser.name || 'Anonymous User',
              toUserId: profileUser.walletAddress,
            });
          } catch (notificationError) {
            console.error('Error creating follow notification:', notificationError);
            // Don't fail the follow if notification fails
          }
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isOwnProfile) {
    return null;
  }

  return (
    <div className="flex gap-3 justify-center lg:justify-end">
      <button 
        onClick={handleFollow}
        disabled={isLoading}
        className={`px-6 py-3 font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
          isFollowing 
            ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 hover:border-slate-500'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
        }`}
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        )}
        {isFollowing ? 'Following' : 'Follow'}
      </button>
      <button className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold rounded-2xl shadow-lg border border-slate-700 hover:border-slate-600 transition-all duration-300">
        Message
      </button>
    </div>
  );
}
