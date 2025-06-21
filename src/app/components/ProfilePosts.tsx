"use client"
import { useState, useEffect } from 'react';
import PostComponent from './PostComponent';
import { PostData } from '../services/postService';
import { useWallet } from '../contexts/WalletContext';
import { getUserByUsername, toggleUserFollow, checkUserFollowing } from '../services/userService';
import { createNotification } from '../services/notificationService';

interface ProfilePostsProps {
  posts: PostData[];
  username: string;
}

export default function ProfilePosts({ posts: initialPosts, username }: ProfilePostsProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [visibleCount, setVisibleCount] = useState(4);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  
  const { user: currentUser } = useWallet();

  // Get profile user data and check follow status
  useEffect(() => {
    const fetchProfileData = async () => {
      if (currentUser && username) {
        const user = await getUserByUsername(username);
        setProfileUser(user);
        
        if (user && currentUser.walletAddress !== user.walletAddress) {
          const following = await checkUserFollowing(currentUser.walletAddress, user.walletAddress);
          setIsFollowing(following);
        }
      }
    };
    fetchProfileData();
  }, [currentUser, username]);

  const handleFollow = async () => {
    if (!currentUser || !profileUser) return;
    
    setIsLoadingFollow(true);
    try {
      const result = await toggleUserFollow(currentUser.walletAddress, profileUser.walletAddress);
      
      if (result.success) {
        setIsFollowing(result.isFollowing);
        
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
          }
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMorePosts = posts.length > visibleCount;
  const remainingPosts = posts.length - visibleCount;

  const loadMorePosts = () => {
    setVisibleCount(prev => Math.min(prev + 4, posts.length));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            Recent Posts
          </h2>
          <p className="text-slate-400">
            Latest thoughts and updates from @{username}
          </p>
        </div>
      </div>

      {/* Posts Content */}
      {visiblePosts.length > 0 ? (
        <div className="space-y-6">
          {visiblePosts.map((post) => (
            <div key={post.id} className="transform transition-all duration-300 hover:scale-[1.02]">
              <PostComponent post={post} onPostDeleted={handlePostDeleted} />
            </div>
          ))}
          
          {/* Load More Button - only show if there are more posts */}
          {hasMorePosts && (
            <div className="text-center pt-8">
              <button 
                onClick={loadMorePosts}
                className="px-8 py-4 bg-gradient-to-r from-slate-800/80 to-slate-700/80 hover:from-slate-700/80 hover:to-slate-600/80 text-white font-semibold rounded-2xl border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Load More Posts ({remainingPosts} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
              <div className="text-4xl">✨</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No posts yet</h3>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              @{username} hasn't shared anything yet. When they do, their posts will appear here.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentUser && profileUser && currentUser.walletAddress !== profileUser.walletAddress ? (
                <button 
                  onClick={handleFollow}
                  disabled={isLoadingFollow}
                  className={`px-6 py-3 font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFollowing 
                      ? 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                  }`}
                >
                  {isLoadingFollow ? 'Loading...' : (isFollowing ? 'Following' : 'Follow to get updates')}
                </button>
              ) : null}
              <button className="px-6 py-3 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white font-semibold rounded-2xl border border-slate-700 hover:border-slate-600 transition-all duration-300">
                Suggest content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
