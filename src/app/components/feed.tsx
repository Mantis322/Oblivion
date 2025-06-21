"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostsFromFollowedUsers, PostData } from '../services/postService';
import { useWallet } from '../contexts/WalletContext';
import { usePostModal } from '../contexts/PostModalContext';
import PostComponent from './PostComponent';
import Input from './input';

function Feed() {
  const { user: currentUser } = useWallet();
  const { setOnPostComplete } = usePostModal();
  const router = useRouter();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch posts from followed users
  useEffect(() => {
    if (currentUser?.walletAddress) {
      fetchFeedPosts();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  // Set up post completion callback to refresh feed
  useEffect(() => {
    setOnPostComplete(() => handleRefreshFeed);
    
    // Cleanup on unmount
    return () => {
      setOnPostComplete(undefined);
    };
  }, [setOnPostComplete]);

  const fetchFeedPosts = async () => {
    if (!currentUser?.walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const feedPosts = await getPostsFromFollowedUsers(currentUser.walletAddress, 20);
      setPosts(feedPosts);
    } catch (err) {
      console.error('Error fetching feed posts:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!currentUser?.walletAddress || loadingMore || posts.length === 0) return;
    
    try {
      setLoadingMore(true);
      
      // Get the timestamp of the last post for pagination
      const lastPost = posts[posts.length - 1];
      const lastTimestamp = lastPost.timestamp;
      
      // Fetch more posts older than the last post
      const morePosts = await getPostsFromFollowedUsers(
        currentUser.walletAddress, 
        10, // Get 10 more posts
        lastTimestamp // Pass the last timestamp for pagination
      );
      
      // Filter out any posts that might already exist (safety check)
      const existingPostIds = new Set(posts.map(p => p.id));
      const newPosts = morePosts.filter(post => !existingPostIds.has(post.id));
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  // Callback function to handle new posts
  const handleNewPost = async (newPost: PostData) => {
    // Add the new post to the beginning of the posts array
    setPosts(prev => [newPost, ...prev]);
  };

  // Callback function to refresh the entire feed
  const handleRefreshFeed = async () => {
    await fetchFeedPosts();
  };

  // If no user is logged in, redirect to login or show message
  if (!currentUser) {
    return (
      <div className="flex flex-col">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Home</h1>
          <p className="text-slate-300 text-base font-medium">Please log in to see your personalized feed.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-slate-400 mb-6">You need to connect your wallet to view your personalized feed.</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Feed Header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Home</h1>
        <p className="text-slate-300 text-base font-medium">See what’s happening in your world right now.</p>
      </div>

      {/* Input component with callback */}
      <Input onNewPost={handleNewPost} onRefreshFeed={handleRefreshFeed} />

      {/* Feed Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading your feed...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button 
              onClick={fetchFeedPosts}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-white mb-2">Your feed is empty</h2>
            <p className="text-slate-400 mb-6">Follow other users to see their posts in your feed, or create your first post!</p>
            <button 
              onClick={() => router.push('/explore')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Discover Users
            </button>
          </div>
        </div>
      ) : (        <div className="space-y-6">
          {posts.map((post) => (
            <PostComponent
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {posts.length > 0 && (
        <div className="p-6 text-center mt-6">
          <button 
            onClick={loadMorePosts}
            disabled={loadingMore}
            className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/50 text-blue-400 hover:text-blue-300 px-6 py-3 rounded-2xl font-medium transition-all duration-200 hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading...' : 'Load more posts'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Feed;