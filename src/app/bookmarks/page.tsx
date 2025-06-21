"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../contexts/WalletContext';
import { getUserBookmarks } from '../services/userService';
import { getBookmarkedPosts } from '../services/postService';
import { PostData } from '../services/postService';
import PostComponent from '../components/PostComponent';
import Sidebar from '../components/sidebar';
import { FaBookmark, FaSpinner, FaArrowLeft, FaTrash } from 'react-icons/fa';

export default function BookmarksPage() {
  const { user } = useWallet();
  const router = useRouter();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (user?.walletAddress) {
      fetchBookmarkedPosts();
    }
  }, [user, router]);

  const fetchBookmarkedPosts = async () => {
    if (!user?.walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get user's bookmarked post IDs
      const bookmarkIds = await getUserBookmarks(user.walletAddress);
      
      if (bookmarkIds.length === 0) {
        setBookmarkedPosts([]);
        return;
      }
      
      // Get the actual posts
      const posts = await getBookmarkedPosts(bookmarkIds);
      
      // Sort by bookmark date (most recent first) - we could enhance this by storing bookmark timestamps
      setBookmarkedPosts(posts);
    } catch (err) {
      console.error('Error fetching bookmarked posts:', err);
      setError('Failed to load bookmarked posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handlePostDeleted = (postId: string) => {
    setBookmarkedPosts(prev => prev.filter(post => post.id !== postId));
  };

  const handleBookmarkChanged = (postId: string, isBookmarked: boolean) => {
    // If post is unbookmarked, remove it from the bookmarks list
    if (!isBookmarked) {
      setBookmarkedPosts(prev => prev.filter(post => {
        const targetId = post.isRepost ? post.originalPostId : post.id;
        return targetId !== postId;
      }));
    }
  };
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />

        <div className="flex-1 ml-20 lg:ml-72 max-w-3xl px-4 lg:px-6">
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
                  <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Bookmarks</h1>
                  {loading ? (
                    <p className="text-slate-300 text-base font-medium">Loading your saved posts...</p>
                  ) : bookmarkedPosts.length > 0 ? (
                    <p className="text-slate-300 text-base font-medium">
                      {bookmarkedPosts.length} saved post{bookmarkedPosts.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="text-slate-300 text-base font-medium">Save posts to read them later.</p>
                  )}
                </div>
              </div>
              
              {/* Clear all button can be added here if needed */}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <FaSpinner className="w-8 h-8 text-yellow-400 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Loading bookmarks</h2>
              <p className="text-slate-400">
                Getting your saved posts...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
              <p className="text-slate-400 mb-6">{error}</p>
              <button
                onClick={fetchBookmarkedPosts}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && bookmarkedPosts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <FaBookmark className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No bookmarks yet</h2>
              <p className="text-slate-400">
                When you bookmark posts, they'll appear here.
              </p>
            </div>
          )}          {/* Bookmarks List */}
          {!loading && !error && bookmarkedPosts.length > 0 && (
            <div className="space-y-6">
              {bookmarkedPosts.map((post) => (
                <PostComponent
                  key={post.id}
                  post={post}
                  onPostDeleted={handlePostDeleted}
                  onBookmarkChanged={handleBookmarkChanged}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
