'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../contexts/WalletContext';
import { useNotifications } from '../contexts/NotificationContext';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteAllNotifications } from '../services/notificationService';
import Sidebar from '../components/sidebar';
import UserLink from '../components/UserLink';
import { FaArrowLeft, FaComment, FaHeart, FaUserPlus, FaCheckDouble, FaTimes, FaTrash, FaShare } from 'react-icons/fa';

export default function NotificationsPage() {
  const { user } = useWallet();
  const { notifications, refreshNotifications } = useNotifications();
  const router = useRouter();  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);
  const handleNotificationClick = async (notificationId: string, postId?: string, notificationType?: string, fromUserName?: string, campaignId?: number) => {
    // Mark as read first
    if (!notifications.find(n => n.id === notificationId)?.isRead) {
      setMarkingAsRead(prev => new Set(prev).add(notificationId));
      try {
        await markNotificationAsRead(notificationId);
        await refreshNotifications();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      } finally {
        setMarkingAsRead(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }
    }

    // Navigate based on notification type
    if (notificationType === 'follow' && fromUserName) {
      // For follow notifications, navigate to the follower's profile
      router.push(`/profile/${fromUserName}`);
    } else if (notificationType === 'campaign_like') {
      // For campaign like notifications, navigate to campaigns page
      router.push('/campaigns');
    } else if (postId) {
      // For other notifications, navigate to the post
      router.push(`/post/${postId}`);
    }
  };
  const handleMarkAllAsRead = async () => {
    if (!user) return;

    setMarkingAllAsRead(true);
    try {
      await markAllNotificationsAsRead(user.walletAddress);
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!user) return;

    setClearingAll(true);
    try {
      await deleteAllNotifications(user.walletAddress);
      await refreshNotifications();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    } finally {
      setClearingAll(false);
    }
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <FaComment className="w-5 h-5 text-blue-400" />;
      case 'like':
        return <FaHeart className="w-5 h-5 text-pink-400" />;
      case 'follow':
        return <FaUserPlus className="w-5 h-5 text-green-400" />;
      case 'repost':
        return <FaShare className="w-5 h-5 text-green-400" />;
      case 'mention':
      case 'mention_comment':
        return <FaComment className="w-5 h-5 text-purple-400" />;
      case 'campaign_like':
        return <FaHeart className="w-5 h-5 text-purple-400" />;
      default:
        return <FaComment className="w-5 h-5 text-gray-400" />;
    }
  };  const getNotificationText = (notification: any) => {
    switch (notification.type) {
      case 'comment':
        return 'commented on your post';
      case 'like':
        return 'liked your post';
      case 'follow':
        return 'started following you';
      case 'repost':
        return 'reposted your post';
      case 'mention':
        return 'mentioned you in a post';
      case 'mention_comment':
        return 'mentioned you in a comment';
      case 'campaign_like':
        return `liked your campaign "${notification.campaignTitle || 'Untitled Campaign'}"`;
      default:
        return 'interacted with your content';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else {
      return date.toLocaleDateString();
    }
  };  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.isRead);
  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />        <div className="flex-1 ml-20 lg:ml-72 max-w-3xl px-4 lg:px-6">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
                >
                  <FaArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Notifications</h1>
                  {unreadNotifications.length > 0 ? (
                    <p className="text-slate-300 text-base font-medium">
                      {unreadNotifications.length} unread notification{unreadNotifications.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="text-slate-300 text-base font-medium">Stay updated with your community interactions.</p>                  )}
                </div>              </div>
              
              <div className="flex items-center gap-3">
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllAsRead || clearingAll}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors duration-200 text-sm font-medium disabled:cursor-not-allowed"
                  >
                    {markingAllAsRead ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FaCheckDouble className="w-4 h-4" />
                    )}
                    Mark all read
                  </button>
                )}
                
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAllNotifications}
                    disabled={clearingAll || markingAllAsRead}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors duration-200 text-sm font-medium disabled:cursor-not-allowed"
                  >
                    {clearingAll ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FaTrash className="w-4 h-4" />
                    )}
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <FaComment className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No notifications yet</h2>
              <p className="text-slate-400">
                When someone interacts with your posts, you'll see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.postId, notification.type, notification.fromUserName, notification.campaignId)}
                  className={`group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-200 cursor-pointer ${
                    notification.isRead 
                      ? '' 
                      : 'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5'
                  }`}
                >
                  {/* Gradient hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>
                  
                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                  
                  <div className="flex items-start gap-4 relative z-10">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                      {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-base leading-relaxed">
                        <UserLink
                          username={notification.fromUserName}
                          className="font-semibold hover:text-blue-400 transition-colors duration-200"
                          showAt={true}
                        />{' '}
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-slate-400 text-sm mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    
                    {/* Loading indicator */}
                    {markingAsRead.has(notification.id) && (
                      <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
