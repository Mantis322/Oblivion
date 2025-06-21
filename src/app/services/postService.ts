import { db } from "../../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  Timestamp,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  getDoc,
  writeBatch,
  increment,
  updateDoc
} from "@firebase/firestore";

export interface PostData {
  id: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userImg?: string;
  text: string;
  image?: string;
  storageType: 'database' | 'oblivion';
  likeCount?: number;
  repostCount?: number;
  // Repost information
  isRepost?: boolean;
  originalPostId?: string;
  originalUserId?: string;
  originalUsername?: string;
  originalUserDisplayName?: string;
  originalUserImg?: string;
  originalText?: string;
  originalImage?: string;
  originalTimestamp?: {
    seconds: number;
    nanoseconds: number;
  };
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
}

// Kullanıcının postlarını getir (en yeni önce)
export const getPostsByUser = async (userId: string, limitCount: number = 10): Promise<PostData[]> => {
  try {
    const q = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);    const posts: PostData[] = [];
      querySnapshot.forEach((doc) => {
      const data = doc.data();
      const post: PostData = {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to plain object
        timestamp: {
          seconds: data.timestamp.seconds,
          nanoseconds: data.timestamp.nanoseconds
        }
      } as PostData;
      
      // If this is a repost, also convert originalTimestamp
      if (data.isRepost && data.originalTimestamp) {
        post.originalTimestamp = {
          seconds: data.originalTimestamp.seconds,
          nanoseconds: data.originalTimestamp.nanoseconds
        };
      }
      
      posts.push(post);
    });
    
    return posts;
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return [];  }
};

// Post silme fonksiyonu
export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, "posts", postId));
    return true;
  } catch (error) {
    console.error("Error deleting post:", error);
    return false;
  }
};

// Zaman formatlamak için yardımcı fonksiyon
export const formatPostDate = (timestamp: { seconds: number; nanoseconds: number }): string => {
  const now = new Date();
  const postDate = new Date(timestamp.seconds * 1000);
  const diffInMs = now.getTime() - postDate.getTime();
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
    return postDate.toLocaleDateString();
  }
};

// Comment interface
export interface CommentData {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userImg: string; // Ensure this is not optional
  text: string;
  media?: string;
  mediaType?: 'image' | 'video' | 'gif';
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
}

// Add comment to a post
export const addComment = async (commentData: Omit<CommentData, 'id' | 'timestamp'>): Promise<boolean> => {
  try {
    // Ensure userImg is always present, even if an empty string
    const dataToSave = {
      ...commentData,
      userImg: commentData.userImg || '',
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "comments"), dataToSave);
    
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
};

// Get comments for a post
export const getCommentsByPostId = async (postId: string): Promise<CommentData[]> => {
  try {
    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const comments: CommentData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        timestamp: {
          seconds: data.timestamp.seconds,
          nanoseconds: data.timestamp.nanoseconds
        }
      } as CommentData);
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

// Delete a comment
export const deleteComment = async (commentId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, "comments", commentId));
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};

// Get a single post by ID
export const getPostById = async (postId: string): Promise<PostData | null> => {
  try {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const post: PostData = {
        id: docSnap.id,
        ...data,
        timestamp: {
          seconds: data.timestamp.seconds,
          nanoseconds: data.timestamp.nanoseconds
        }
      } as PostData;
      
      // If this is a repost, also convert originalTimestamp
      if (data.isRepost && data.originalTimestamp) {
        post.originalTimestamp = {
          seconds: data.originalTimestamp.seconds,
          nanoseconds: data.originalTimestamp.nanoseconds
        };
      }
      
      return post;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting post:', error);
    return null;
  }
};

// Like interface
export interface LikeData {
  id: string;
  postId: string;
  userId: string;
  timestamp: Timestamp;
}

// Like Functions

// Toggle post like (like/unlike)
export const togglePostLike = async (postId: string, userId: string): Promise<{ success: boolean; isLiked: boolean; likeCount: number }> => {
  try {
    const batch = writeBatch(db);
    
    // Check if user already liked the post
    const likesQuery = query(
      collection(db, "likes"),
      where("postId", "==", postId),
      where("userId", "==", userId)
    );
    
    const existingLike = await getDocs(likesQuery);
    const isCurrentlyLiked = !existingLike.empty;
    
    if (isCurrentlyLiked) {
      // Unlike: Remove like document and decrement count
      existingLike.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Decrement like count in post
      const postRef = doc(db, "posts", postId);
      batch.update(postRef, {
        likeCount: increment(-1)
      });
    } else {
      // Like: Add like document and increment count
      const likeRef = doc(collection(db, "likes"));
      batch.set(likeRef, {
        postId,
        userId,
        timestamp: serverTimestamp()
      });
      
      // Increment like count in post
      const postRef = doc(db, "posts", postId);
      batch.update(postRef, {
        likeCount: increment(1)
      });
    }
    
    await batch.commit();
    
    // Get updated like count
    const postDoc = await getDoc(doc(db, "posts", postId));
    const likeCount = postDoc.data()?.likeCount || 0;
    
    return {
      success: true,
      isLiked: !isCurrentlyLiked,
      likeCount
    };
  } catch (error) {
    console.error("Error toggling post like:", error);
    return {
      success: false,
      isLiked: false,
      likeCount: 0
    };
  }
};

// Check if user liked a specific post
export const checkUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const likesQuery = query(
      collection(db, "likes"),
      where("postId", "==", postId),
      where("userId", "==", userId)
    );
    
    const snapshot = await getDocs(likesQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user like:", error);
    return false;
  }
};

// Get total likes count for a post
export const getPostLikes = async (postId: string): Promise<number> => {
  try {
    const postDoc = await getDoc(doc(db, "posts", postId));
    return postDoc.data()?.likeCount || 0;
  } catch (error) {
    console.error("Error getting post likes:", error);
    return 0;
  }
};

// Repost interface
export interface RepostData {
  id: string;
  postId: string;
  userId: string;
  timestamp: Timestamp;
}

// Repost Functions

// Toggle post repost (repost/unrepost)
export const togglePostRepost = async (postId: string, userId: string): Promise<{ success: boolean; isReposted: boolean; repostCount: number }> => {
  try {
    // Get user data for the reposter
    const { getUserByWallet } = await import('./userService');
    const userData = await getUserByWallet(userId);
    if (!userData) {
      throw new Error('User data not found');
    }

    // Check if user already reposted this post by looking for existing repost posts
    const existingRepostQuery = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      where("isRepost", "==", true),
      where("originalPostId", "==", postId)
    );
    
    const existingRepostSnapshot = await getDocs(existingRepostQuery);
    const isCurrentlyReposted = !existingRepostSnapshot.empty;
    
    if (isCurrentlyReposted) {
      // Unrepost: Delete the repost post and decrement original post's repost count
      const batch = writeBatch(db);
      
      // Delete all repost posts by this user for this original post
      existingRepostSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Decrement repost count in original post
      const originalPostRef = doc(db, "posts", postId);
      batch.update(originalPostRef, {
        repostCount: increment(-1)
      });
      
      await batch.commit();
      
      // Get updated repost count
      const originalPostDoc = await getDoc(doc(db, "posts", postId));
      const repostCount = originalPostDoc.data()?.repostCount || 0;
      
      return {
        success: true,
        isReposted: false,
        repostCount
      };
    } else {
      // Repost: Create a new repost post and increment original post's repost count
      const originalPostDoc = await getDoc(doc(db, "posts", postId));
      if (!originalPostDoc.exists()) {
        throw new Error('Original post not found');
      }
      
      const originalPost = originalPostDoc.data() as PostData;
        // Create new repost post
      const repostData = {
        userId: userId,
        username: userData.username || 'anonymous',
        userDisplayName: userData.name || 'Anonymous User',
        userImg: userData.avatar || '',
        text: '', // Repost has no additional text (like Twitter retweets)
        storageType: 'database' as const,
        isRepost: true,
        originalPostId: postId,
        originalUserId: originalPost.userId,
        originalUsername: originalPost.username,
        originalUserDisplayName: originalPost.userDisplayName,
        originalUserImg: originalPost.userImg || '',
        originalText: originalPost.text,
        originalImage: originalPost.image || '',
        // Convert Firebase timestamp to plain object
        originalTimestamp: {
          seconds: originalPost.timestamp.seconds,
          nanoseconds: originalPost.timestamp.nanoseconds
        },
        timestamp: serverTimestamp(),
        likeCount: 0,
        repostCount: 0
      };
      
      const batch = writeBatch(db);
      
      // Add the repost post
      const repostRef = doc(collection(db, "posts"));
      batch.set(repostRef, repostData);
      
      // Increment repost count in original post
      const originalPostRef = doc(db, "posts", postId);
      batch.update(originalPostRef, {
        repostCount: increment(1)
      });
      
      await batch.commit();
      
      // Get updated repost count
      const updatedOriginalPostDoc = await getDoc(doc(db, "posts", postId));
      const repostCount = updatedOriginalPostDoc.data()?.repostCount || 0;
      
      return {
        success: true,
        isReposted: true,
        repostCount
      };
    }
  } catch (error) {
    console.error("Error toggling post repost:", error);
    return {
      success: false,
      isReposted: false,
      repostCount: 0
    };
  }
};

// Check if user reposted a specific post
export const checkUserRepostedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    // Check if user has any repost posts for this original post
    const repostQuery = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      where("isRepost", "==", true),
      where("originalPostId", "==", postId)
    );
    
    const snapshot = await getDocs(repostQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user repost:", error);
    return false;
  }
};

// Get total reposts count for a post
export const getPostReposts = async (postId: string): Promise<number> => {
  try {
    const postDoc = await getDoc(doc(db, "posts", postId));
    return postDoc.data()?.repostCount || 0;
  } catch (error) {
    console.error("Error getting post reposts:", error);
    return 0;
  }
};

// Get bookmarked posts for a user
export const getBookmarkedPosts = async (bookmarkIds: string[], limitCount: number = 20): Promise<PostData[]> => {
  try {
    if (bookmarkIds.length === 0) return [];

    // Firestore has a limit of 10 items for 'in' queries, so we need to batch them
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < bookmarkIds.length; i += batchSize) {
      const batch = bookmarkIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    const allPosts: PostData[] = [];

    for (const batch of batches) {
      const q = query(
        collection(db, "posts"),
        where("__name__", "in", batch),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const batchPosts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PostData));

      allPosts.push(...batchPosts);
    }

    // Sort all posts by timestamp and apply limit
    const sortedPosts = allPosts
      .sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, limitCount);

    return sortedPosts;
  } catch (error) {
    console.error("Error getting bookmarked posts:", error);
    return [];
  }
};

// Get posts from users that the current user follows (for home feed)
export const getPostsFromFollowedUsers = async (
  currentUserId: string, 
  limitCount: number = 20, 
  lastTimestamp?: { seconds: number; nanoseconds: number }
): Promise<PostData[]> => {
  try {
    // First, get the list of users the current user follows
    const { getUserFollowing } = await import('./userService');
    const followingUsers = await getUserFollowing(currentUserId);
    
    if (followingUsers.length === 0) {
      // If user doesn't follow anyone, return empty array
      return [];
    }
    
    // Get wallet addresses of followed users
    const followingWallets = followingUsers.map(user => user.walletAddress);
    
    // Add current user's posts to the feed as well (like Twitter)
    followingWallets.push(currentUserId);
    
    // Firestore has a limit of 10 items for 'in' queries, so we need to batch them
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < followingWallets.length; i += batchSize) {
      const batch = followingWallets.slice(i, i + batchSize);
      batches.push(batch);
    }

    const allPosts: PostData[] = [];

    // Get posts from each batch
    for (const batch of batches) {
      let q;
      
      if (lastTimestamp) {
        // Pagination: get posts older than the last timestamp
        const lastTimestampFirestore = Timestamp.fromDate(
          new Date(lastTimestamp.seconds * 1000 + lastTimestamp.nanoseconds / 1000000)
        );
        
        q = query(
          collection(db, "posts"),
          where("userId", "in", batch),
          where("timestamp", "<", lastTimestampFirestore),
          orderBy("timestamp", "desc"),
          limit(50)
        );
      } else {
        // Initial load
        q = query(
          collection(db, "posts"),
          where("userId", "in", batch),
          orderBy("timestamp", "desc"),
          limit(50)
        );
      }

      const querySnapshot = await getDocs(q);
      const batchPosts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to plain object
          timestamp: {
            seconds: data.timestamp.seconds,
            nanoseconds: data.timestamp.nanoseconds
          }
        } as PostData;
      });

      allPosts.push(...batchPosts);
    }

    // Sort all posts by timestamp (newest first) and apply limit
    const sortedPosts = allPosts
      .sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, limitCount);

    return sortedPosts;
  } catch (error) {
    console.error("Error getting posts from followed users:", error);
    return [];
  }
};

// Get trending posts (posts with most likes and reposts in last 24 hours)
export const getTrendingPosts = async (limitCount: number = 20): Promise<PostData[]> => {
  try {
    // Get posts from last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const q = query(
      collection(db, "posts"),
      where("timestamp", ">=", Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy("timestamp", "desc"),
      limit(100) // Get more posts to sort by engagement
    );
    
    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const post: PostData = {
        id: doc.id,
        ...data,
        timestamp: {
          seconds: data.timestamp.seconds,
          nanoseconds: data.timestamp.nanoseconds
        }
      } as PostData;
      
      if (data.isRepost && data.originalTimestamp) {
        post.originalTimestamp = {
          seconds: data.originalTimestamp.seconds,
          nanoseconds: data.originalTimestamp.nanoseconds
        };
      }
      
      posts.push(post);
    });
    
    // Sort by engagement (likes + reposts)
    const sortedPosts = posts.sort((a, b) => {
      const aEngagement = (a.likeCount || 0) + (a.repostCount || 0);
      const bEngagement = (b.likeCount || 0) + (b.repostCount || 0);
      return bEngagement - aEngagement;
    });
    
    return sortedPosts.slice(0, limitCount);
  } catch (error) {
    console.error("Error getting trending posts:", error);
    return [];
  }
};

// Get posts by hashtag
export const getPostsByHashtag = async (hashtag: string, limitCount: number = 20): Promise<PostData[]> => {
  try {
    // Search for posts containing the hashtag
    const q = query(
      collection(db, "posts"),
      orderBy("timestamp", "desc"),
      limit(100) // Get more posts to filter through
    );
    
    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const text = data.text?.toLowerCase() || '';
      
      // Check if post contains the hashtag
      if (text.includes(`#${hashtag.toLowerCase()}`)) {
        const post: PostData = {
          id: doc.id,
          ...data,
          timestamp: {
            seconds: data.timestamp.seconds,
            nanoseconds: data.timestamp.nanoseconds
          }
        } as PostData;
        
        if (data.isRepost && data.originalTimestamp) {
          post.originalTimestamp = {
            seconds: data.originalTimestamp.seconds,
            nanoseconds: data.originalTimestamp.nanoseconds
          };
        }
        
        posts.push(post);
      }
    });
    
    return posts.slice(0, limitCount);
  } catch (error) {
    console.error("Error getting posts by hashtag:", error);
    return [];
  }
};

// Search posts by text content
export const searchPosts = async (searchQuery: string, limitCount: number = 20): Promise<PostData[]> => {
  try {
    const q = query(
      collection(db, "posts"),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const text = data.text?.toLowerCase() || '';
      const username = data.username?.toLowerCase() || '';
      const displayName = data.userDisplayName?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      
      // Check if post matches search query
      if (text.includes(query) || username.includes(query) || displayName.includes(query)) {
        const post: PostData = {
          id: doc.id,
          ...data,
          timestamp: {
            seconds: data.timestamp.seconds,
            nanoseconds: data.timestamp.nanoseconds
          }
        } as PostData;
        
        if (data.isRepost && data.originalTimestamp) {
          post.originalTimestamp = {
            seconds: data.originalTimestamp.seconds,
            nanoseconds: data.originalTimestamp.nanoseconds
          };
        }
        
        posts.push(post);
      }
    });
    
    return posts.slice(0, limitCount);
  } catch (error) {
    console.error("Error searching posts:", error);
    return [];
  }
};

// Get trending hashtags
export const getTrendingHashtags = async (limitCount: number = 10): Promise<{ tag: string; count: number }[]> => {
  try {
    // Get recent posts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, "posts"),
      where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo)),
      orderBy("timestamp", "desc"),
      limit(1000)
    );
    
    const querySnapshot = await getDocs(q);
    const hashtagCounts = new Map<string, number>();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const text = data.text || '';
      
      // Extract hashtags from text
      const hashtagRegex = /#(\w+)/g;
      let match;
      
      while ((match = hashtagRegex.exec(text)) !== null) {
        const hashtag = match[1].toLowerCase();
        hashtagCounts.set(hashtag, (hashtagCounts.get(hashtag) || 0) + 1);
      }
    });
    
    // Convert to array and sort by count
    const trending = Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
    
    return trending;
  } catch (error) {
    console.error("Error getting trending hashtags:", error);
    return [];
  }
};
