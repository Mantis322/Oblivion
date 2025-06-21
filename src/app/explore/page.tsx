'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import Sidebar from '../components/sidebar';
import PostComponent from '../components/PostComponent';
import UserLink from '../components/UserLink';
import { PostData, getTrendingPosts, getTrendingHashtags, searchPosts } from '../services/postService';
import { UserData, getSuggestedUsers, searchUsers } from '../services/userService';
import { FaFire, FaUsers, FaHashtag, FaSearch, FaTrendingUp, FaNewspaper, FaFutbol, FaFilm } from 'react-icons/fa';
import Image from 'next/image';

interface TrendingHashtag {
  tag: string;
  count: number;
  category?: string;
}

export default function ExplorePage() {
  const { user } = useWallet();
  const [activeTab, setActiveTab] = useState<'trending' | 'news' | 'sports' | 'entertainment'>('trending');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserData[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{posts: PostData[], users: UserData[]}>({posts: [], users: []});
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
    loadExploreData();
  }, [activeTab, user]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults({ posts: [], users: [] });
      setIsSearching(false);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const [searchedPosts, searchedUsers] = await Promise.all([
        searchPosts(searchQuery, 10),
        searchUsers(searchQuery, 5)
      ]);
      
      setSearchResults({
        posts: searchedPosts,
        users: searchedUsers
      });
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsSearching(false);
    }
  };
  const loadExploreData = async () => {
    setLoading(true);
    try {
      // Load data based on active tab
      if (activeTab === 'trending') {
        // Get trending posts
        const trendingPosts = await getTrendingPosts(20);
        setPosts(trendingPosts);

        // Get trending hashtags
        const hashtags = await getTrendingHashtags(10);
        const formattedHashtags: TrendingHashtag[] = hashtags.map(h => ({
          tag: h.tag,
          count: h.count,
          category: 'Trending' // Default category
        }));
        setTrendingHashtags(formattedHashtags);

        // Get suggested users
        if (user?.walletAddress) {
          const suggested = await getSuggestedUsers(user.walletAddress, 5);
          // Add follower count for each user
          const suggestedWithCounts = await Promise.all(
            suggested.map(async (suggestedUser) => {
              const { getUserFollowerCount } = await import('../services/userService');
              const followerCount = await getUserFollowerCount(suggestedUser.walletAddress);
              return {
                ...suggestedUser,
                followerCount
              };
            })
          );
          setSuggestedUsers(suggestedWithCounts);
        }
      } else {
        // For other tabs, use empty arrays for now
        setPosts([]);
        setTrendingHashtags([]);
        setSuggestedUsers([]);
      }
    } catch (error) {
      console.error('Error loading explore data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };
  const handleBookmarkChanged = (postId: string, isBookmarked: boolean) => {
    // Handle bookmark state change if needed
  };

  const handleFollowUser = async (targetUser: UserData) => {
    if (!user?.walletAddress) return;
    
    try {
      const { toggleUserFollow } = await import('../services/userService');
      const { createNotification } = await import('../services/notificationService');
      
      const result = await toggleUserFollow(user.walletAddress, targetUser.walletAddress);
      
      if (result.success && result.isFollowing) {
        // Remove from suggestions if followed
        setSuggestedUsers(prev => prev.filter(u => u.walletAddress !== targetUser.walletAddress));
        
        // Send notification
        try {
          await createNotification({
            type: 'follow',
            fromUserId: user.walletAddress,
            fromUserName: user.username || 'anonymous',
            fromUserDisplayName: user.name || 'Anonymous User',
            toUserId: targetUser.walletAddress,
          });
        } catch (notificationError) {
          console.error('Error creating follow notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-purple-400">Loading explore...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        
        <div className="flex-1 ml-20 lg:ml-72 max-w-4xl">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-6 pt-6 pb-4 z-10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Explore</h1>
              <FaSearch className="w-6 h-6 text-slate-400" />
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search Oblivion"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>            {/* Category Tabs */}
            <div className="flex space-x-2 overflow-x-auto">
              { [
                { id: 'trending', label: 'Trending', icon: FaFire },
                { id: 'news', label: 'News', icon: FaNewspaper },
                { id: 'sports', label: 'Sports', icon: FaFutbol },
                { id: 'entertainment', label: 'Entertainment', icon: FaFilm }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === id
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>          <div className="flex gap-6 px-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Search Results */}
              {searchQuery.trim() && (
                <div className="space-y-6 py-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <FaSearch className="w-5 h-5 text-purple-400" />
                    <h2 className="text-xl font-bold text-white">
                      Search results for "{searchQuery}"
                    </h2>
                    {isSearching && (
                      <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    )}
                  </div>

                  {/* Search Results: Users */}
                  {searchResults.users.length > 0 && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <FaUsers className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-bold text-white">Users</h3>
                      </div>
                      <div className="space-y-3">
                        {searchResults.users.map((searchUser) => (
                          <div key={searchUser.walletAddress} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {searchUser.avatar ? (
                                  <Image
                                    src={searchUser.avatar}
                                    alt={searchUser.name || 'User'}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-semibold text-sm">
                                    {(searchUser.name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <UserLink
                                  username={searchUser.username}
                                  displayName={searchUser.name}
                                  walletAddress={searchUser.walletAddress}
                                  className="text-white font-medium hover:text-purple-400 transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Results: Posts */}
                  {searchResults.posts.length > 0 && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <FaHashtag className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Posts</h3>
                      </div>
                      <div className="space-y-4">
                        {searchResults.posts.map((post) => (
                          <PostComponent
                            key={post.id}
                            post={post}
                            onPostDeleted={handlePostDeleted}
                            onBookmarkChanged={handleBookmarkChanged}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {!isSearching && searchQuery.trim() && searchResults.posts.length === 0 && searchResults.users.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                        <FaSearch className="w-6 h-6 text-slate-500" />
                      </div>
                      <p className="text-slate-400">No results found for "{searchQuery}"</p>
                      <p className="text-slate-500 text-sm mt-1">Try searching with different keywords</p>
                    </div>
                  )}
                </div>
              )}

              {/* Trending Section - Only show when not searching */}
              {!searchQuery.trim() && activeTab === 'trending' && (
                <div className="space-y-6 py-6">
                  {/* Trending Hashtags */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <FaHashtag className="w-5 h-5 text-purple-400" />
                      <h2 className="text-xl font-bold text-white">Trending Hashtags</h2>
                    </div>
                    <div className="space-y-3">
                      {trendingHashtags.map((hashtag, index) => (
                        <div key={hashtag.tag} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <span className="text-slate-500 font-medium">#{index + 1}</span>
                            <div>
                              <div className="text-white font-semibold">#{hashtag.tag}</div>
                              <div className="text-slate-400 text-sm">{hashtag.category}</div>
                            </div>
                          </div>
                          <div className="text-slate-400 text-sm">{hashtag.count} posts</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trending Posts */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <FaFire className="w-5 h-5 text-orange-400" />
                      <h2 className="text-xl font-bold text-white">Trending Posts</h2>
                    </div>
                    {posts.length > 0 ? (
                      <div className="space-y-4">
                        {posts.map((post) => (
                          <PostComponent
                            key={post.id}
                            post={post}
                            onPostDeleted={handlePostDeleted}
                            onBookmarkChanged={handleBookmarkChanged}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                          <FaFire className="w-6 h-6 text-slate-500" />
                        </div>
                        <p className="text-slate-400">No trending posts right now</p>
                        <p className="text-slate-500 text-sm mt-1">Check back later for hot content!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}              {/* Other category content - Only show when not searching */}
              {!searchQuery.trim() && activeTab !== 'trending' && (
                <div className="py-6">
                  <div className="text-center py-20">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                      <FaHashtag className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Coming Soon</h3>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} content is being curated for you. 
                      Stay tuned for exciting updates!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-80 space-y-6 py-6">
              {/* Who to Follow */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FaUsers className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Who to Follow</h2>
                </div>
                {suggestedUsers.length > 0 ? (
                  <div className="space-y-4">
                    {suggestedUsers.map((suggestedUser) => (
                      <div key={suggestedUser.walletAddress} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {suggestedUser.avatar ? (
                              <Image
                                src={suggestedUser.avatar}
                                alt={suggestedUser.name || 'User'}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-semibold">
                                {(suggestedUser.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <UserLink
                              username={suggestedUser.username}
                              displayName={suggestedUser.name}
                              walletAddress={suggestedUser.walletAddress}
                              className="text-white font-medium truncate block"
                            />                            <p className="text-slate-400 text-sm truncate">
                              {suggestedUser.followerCount || 0} followers
                            </p>
                          </div>
                        </div>                        <button 
                          onClick={() => handleFollowUser(suggestedUser)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                          Follow
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center">
                      <FaUsers className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm">No suggestions right now</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
