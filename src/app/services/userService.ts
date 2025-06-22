import { db } from "../../../firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  orderBy,
  Timestamp
} from "@firebase/firestore";

export interface UserData {
  walletAddress: string;
  name?: string;
  username?: string;
  usernameLower?: string; // Lowercase version for case-insensitive search
  avatar?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  bookmarks?: string[];
  followerCount?: number;
  followingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Kullanıcıyı cüzdan adresine göre getir
export const getUserByWallet = async (walletAddress: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", walletAddress));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// Username'in benzersiz olup olmadığını kontrol et
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

// Yeni kullanıcı oluştur
export const createUser = async (userData: Partial<UserData>): Promise<boolean> => {
  try {
    if (!userData.walletAddress) {
      throw new Error("Wallet address is required");
    }    const newUser: UserData = {
      walletAddress: userData.walletAddress,
      name: userData.name || "",
      username: userData.username || "",
      usernameLower: userData.username ? userData.username.toLowerCase() : "",
      avatar: userData.avatar || "",
      bio: userData.bio || "",
      following: [],
      followers: [],
      bookmarks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, "users", userData.walletAddress), newUser);
    return true;
  } catch (error) {
    console.error("Error creating user:", error);
    return false;
  }
};

// Kullanıcı bilgilerini güncelle
export const updateUser = async (walletAddress: string, userData: Partial<UserData>): Promise<boolean> => {
  try {
    const updateData: any = {
      ...userData,
      updatedAt: new Date()
    };
    
    // Eğer username güncelleniyorsa, usernameLower'ı da güncelle
    if (userData.username) {
      updateData.usernameLower = userData.username.toLowerCase();
    }
    
    await updateDoc(doc(db, "users", walletAddress), updateData);
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};

// Kullanıcıyı username ile getir
export const getUserByUsername = async (username: string): Promise<UserData | null> => {
  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return null;
  }
};

// Follow/Unfollow a user
export const toggleUserFollow = async (
  currentUserWallet: string, 
  targetUserWallet: string
): Promise<{ success: boolean; isFollowing: boolean; followerCount: number }> => {
  try {
    const batch = writeBatch(db);
    
    // Get current user and target user documents
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(doc(db, "users", currentUserWallet)),
      getDoc(doc(db, "users", targetUserWallet))
    ]);

    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      return { success: false, isFollowing: false, followerCount: 0 };
    }

    const currentUserData = currentUserDoc.data() as UserData;
    const targetUserData = targetUserDoc.data() as UserData;
    
    const currentFollowing = currentUserData.following || [];
    const targetFollowers = targetUserData.followers || [];
    
    const isCurrentlyFollowing = currentFollowing.includes(targetUserWallet);
    
    const currentUserRef = doc(db, "users", currentUserWallet);
    const targetUserRef = doc(db, "users", targetUserWallet);
    
    if (isCurrentlyFollowing) {
      // Unfollow
      batch.update(currentUserRef, {
        following: arrayRemove(targetUserWallet),
        updatedAt: new Date()
      });
      batch.update(targetUserRef, {
        followers: arrayRemove(currentUserWallet),
        updatedAt: new Date()
      });
    } else {
      // Follow
      batch.update(currentUserRef, {
        following: arrayUnion(targetUserWallet),
        updatedAt: new Date()
      });
      batch.update(targetUserRef, {
        followers: arrayUnion(currentUserWallet),
        updatedAt: new Date()
      });
    }
    
    await batch.commit();
    
    const newFollowerCount = isCurrentlyFollowing 
      ? targetFollowers.length - 1
      : targetFollowers.length + 1;
    
    return { 
      success: true, 
      isFollowing: !isCurrentlyFollowing,
      followerCount: newFollowerCount
    };
  } catch (error) {
    console.error("Error toggling follow:", error);
    return { success: false, isFollowing: false, followerCount: 0 };
  }
};

// Check if current user is following target user
export const checkUserFollowing = async (
  currentUserWallet: string, 
  targetUserWallet: string
): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", currentUserWallet));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data() as UserData;
    const following = userData.following || [];
    return following.includes(targetUserWallet);
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
};

// Get follower count for a user
export const getUserFollowerCount = async (userWallet: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return 0;
    
    const userData = userDoc.data() as UserData;
    return (userData.followers || []).length;
  } catch (error) {
    console.error("Error getting follower count:", error);
    return 0;
  }
};

// Get following count for a user
export const getUserFollowingCount = async (userWallet: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return 0;
    
    const userData = userDoc.data() as UserData;
    return (userData.following || []).length;
  } catch (error) {
    console.error("Error getting following count:", error);
    return 0;
  }
};

// Get followers list for a user
export const getUserFollowers = async (userWallet: string): Promise<UserData[]> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data() as UserData;
    const followerWallets = userData.followers || [];
    
    if (followerWallets.length === 0) return [];
    
    // Get all follower user data
    const followerPromises = followerWallets.map(wallet => getUserByWallet(wallet));
    const followers = await Promise.all(followerPromises);
    
    return followers.filter(follower => follower !== null) as UserData[];
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
};

// Get following list for a user
export const getUserFollowing = async (userWallet: string): Promise<UserData[]> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data() as UserData;
    const followingWallets = userData.following || [];
    
    if (followingWallets.length === 0) return [];
    
    // Get all following user data
    const followingPromises = followingWallets.map(wallet => getUserByWallet(wallet));
    const following = await Promise.all(followingPromises);
    
    return following.filter(user => user !== null) as UserData[];
  } catch (error) {
    console.error("Error getting following:", error);
    return [];
  }
};

// Bookmark Functions

// Toggle bookmark for a post
export const toggleBookmark = async (userWallet: string, postId: string): Promise<{ success: boolean; isBookmarked: boolean }> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) {
      return { success: false, isBookmarked: false };
    }

    const userData = userDoc.data() as UserData;
    const bookmarks = userData.bookmarks || [];
    const isCurrentlyBookmarked = bookmarks.includes(postId);

    if (isCurrentlyBookmarked) {
      // Remove bookmark
      await updateDoc(doc(db, "users", userWallet), {
        bookmarks: arrayRemove(postId),
        updatedAt: new Date()
      });
    } else {
      // Add bookmark
      await updateDoc(doc(db, "users", userWallet), {
        bookmarks: arrayUnion(postId),
        updatedAt: new Date()
      });
    }

    return { 
      success: true, 
      isBookmarked: !isCurrentlyBookmarked 
    };
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return { success: false, isBookmarked: false };
  }
};

// Check if user has bookmarked a post
export const checkUserBookmarked = async (userWallet: string, postId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data() as UserData;
    const bookmarks = userData.bookmarks || [];
    return bookmarks.includes(postId);
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return false;
  }
};

// Get user's bookmarks count
export const getUserBookmarksCount = async (userWallet: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return 0;

    const userData = userDoc.data() as UserData;
    return (userData.bookmarks || []).length;
  } catch (error) {
    console.error("Error getting bookmarks count:", error);
    return 0;
  }
};

// Get user's bookmarked post IDs
export const getUserBookmarks = async (userWallet: string): Promise<string[]> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userWallet));
    if (!userDoc.exists()) return [];

    const userData = userDoc.data() as UserData;
    return userData.bookmarks || [];
  } catch (error) {
    console.error("Error getting bookmarks:", error);
    return [];
  }
};

// Get suggested users (users not followed by current user, sorted by follower count)
export const getSuggestedUsers = async (currentUserId: string, limitCount: number = 5): Promise<UserData[]> => {
  try {
    // Get current user's following list
    const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
    const following = currentUserDoc.exists() ? (currentUserDoc.data().following || []) : [];
    
    // Get all users
    const usersQuery = query(collection(db, "users"));
    const usersSnapshot = await getDocs(usersQuery);
    
    const suggestedUsers: UserData[] = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data() as UserData;
      
      // Skip current user and already followed users
      if (userData.walletAddress !== currentUserId && !following.includes(userData.walletAddress)) {
        suggestedUsers.push(userData);
      }
    });
    
    // Sort by follower count (descending)
    suggestedUsers.sort((a, b) => {
      const aFollowerCount = a.followers?.length || 0;
      const bFollowerCount = b.followers?.length || 0;
      return bFollowerCount - aFollowerCount;
    });
    
    return suggestedUsers.slice(0, limitCount);
  } catch (error) {
    console.error("Error getting suggested users:", error);
    return [];
  }
};

// Search users by username or display name
export const searchUsers = async (searchQuery: string, limitCount: number = 20): Promise<UserData[]> => {
  try {
    const usersQuery = query(collection(db, "users"));
    const usersSnapshot = await getDocs(usersQuery);
    
    const matchingUsers: UserData[] = [];
    const searchTerm = searchQuery.toLowerCase();
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data() as UserData;
      const username = userData.username?.toLowerCase() || '';
      const displayName = userData.name?.toLowerCase() || '';
      
      if (username.includes(searchTerm) || displayName.includes(searchTerm)) {
        matchingUsers.push(userData);
      }
    });
    
    // Sort by follower count
    matchingUsers.sort((a, b) => {
      const aFollowerCount = a.followers?.length || 0;
      const bFollowerCount = b.followers?.length || 0;
      return bFollowerCount - aFollowerCount;
    });
    
    return matchingUsers.slice(0, limitCount);
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

// Campaign final amounts service functions

export interface CampaignFinalAmount {
  campaignId: number;
  finalAmount: string; // bigint as string for Firebase compatibility
  withdrawnAt: Date;
  withdrawnBy: string;
}

// Save campaign final amount to Firebase
export const saveCampaignFinalAmount = async (
  campaignId: number, 
  finalAmount: bigint, 
  withdrawnBy: string
): Promise<void> => {
  try {
    const campaignAmountDoc = doc(db, "campaignFinalAmounts", campaignId.toString());
    const data: CampaignFinalAmount = {
      campaignId,
      finalAmount: finalAmount.toString(),
      withdrawnAt: new Date(),
      withdrawnBy
    };
    
    await setDoc(campaignAmountDoc, data);
    console.log(`Campaign ${campaignId} final amount saved to Firebase:`, finalAmount.toString());
  } catch (error) {
    console.error("Error saving campaign final amount:", error);
    throw error;
  }
};

// Get campaign final amount from Firebase
export const getCampaignFinalAmount = async (campaignId: number): Promise<bigint | null> => {
  try {
    const campaignAmountDoc = await getDoc(doc(db, "campaignFinalAmounts", campaignId.toString()));
    
    if (campaignAmountDoc.exists()) {
      const data = campaignAmountDoc.data() as CampaignFinalAmount;
      return BigInt(data.finalAmount);
    }
    
    return null;
  } catch (error) {
    console.error("Error getting campaign final amount:", error);
    return null;
  }
};

// Get multiple campaign final amounts
export const getMultipleCampaignFinalAmounts = async (campaignIds: number[]): Promise<{[key: number]: bigint}> => {
  try {
    const batch = writeBatch(db);
    const results: {[key: number]: bigint} = {};
    
    // Use Promise.all to fetch all campaign amounts concurrently
    const promises = campaignIds.map(async (campaignId) => {
      const amount = await getCampaignFinalAmount(campaignId);
      if (amount !== null) {
        results[campaignId] = amount;
      }
    });
    
    await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error getting multiple campaign final amounts:", error);
    return {};
  }
};

// Campaign Like functionality
export interface CampaignLike {
  id: string;
  campaignId: number;
  userId: string;
  userName: string;
  userDisplayName: string;
  createdAt: Timestamp;
}

// Like a campaign
export const likeCampaign = async (campaignId: number, userId: string, userName: string, userDisplayName: string): Promise<{ success: boolean; isLiked: boolean; likeCount: number }> => {
  try {
    const likeId = `${userId}_${campaignId}`;
    const likeRef = doc(db, 'campaignLikes', likeId);
    const likeDoc = await getDoc(likeRef);
    
    const batch = writeBatch(db);
    
    if (likeDoc.exists()) {
      // Unlike - remove the like
      batch.delete(likeRef);
      
      // Get updated like count
      const likesQuery = query(
        collection(db, 'campaignLikes'),
        where('campaignId', '==', campaignId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      const likeCount = Math.max(0, likesSnapshot.size - 1); // -1 because we're about to delete one
      
      await batch.commit();
      
      return { success: true, isLiked: false, likeCount };
    } else {
      // Like - add the like
      const likeData: CampaignLike = {
        id: likeId,
        campaignId,
        userId,
        userName,
        userDisplayName,
        createdAt: Timestamp.now()
      };
      
      batch.set(likeRef, likeData);
      
      // Get updated like count
      const likesQuery = query(
        collection(db, 'campaignLikes'),
        where('campaignId', '==', campaignId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      const likeCount = likesSnapshot.size + 1; // +1 because we're about to add one
      
      await batch.commit();
      
      return { success: true, isLiked: true, likeCount };
    }
  } catch (error) {
    console.error('Error toggling campaign like:', error);
    return { success: false, isLiked: false, likeCount: 0 };
  }
};

// Check if user has liked a campaign
export const checkCampaignLike = async (campaignId: number, userId: string): Promise<boolean> => {
  try {
    const likeId = `${userId}_${campaignId}`;
    const likeRef = doc(db, 'campaignLikes', likeId);
    const likeDoc = await getDoc(likeRef);
    
    return likeDoc.exists();
  } catch (error) {
    console.error('Error checking campaign like:', error);
    return false;
  }
};

// Get campaign like count
export const getCampaignLikeCount = async (campaignId: number): Promise<number> => {
  try {
    const likesQuery = query(
      collection(db, 'campaignLikes'),
      where('campaignId', '==', campaignId)
    );
    const likesSnapshot = await getDocs(likesQuery);
    
    return likesSnapshot.size;
  } catch (error) {
    console.error('Error getting campaign like count:', error);
    return 0;
  }
};

// Get multiple campaign like counts
export const getMultipleCampaignLikeCounts = async (campaignIds: number[]): Promise<{[key: number]: number}> => {
  try {
    const results: {[key: number]: number} = {};
    
    // Use Promise.all to fetch all like counts concurrently
    const promises = campaignIds.map(async (campaignId) => {
      const count = await getCampaignLikeCount(campaignId);
      results[campaignId] = count;
    });
    
    await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error getting multiple campaign like counts:", error);
    return {};
  }
};

// Check multiple campaign likes for a user
export const checkMultipleCampaignLikes = async (campaignIds: number[], userId: string): Promise<{[key: number]: boolean}> => {
  try {
    const results: {[key: number]: boolean} = {};
    
    // Use Promise.all to check all likes concurrently
    const promises = campaignIds.map(async (campaignId) => {
      const isLiked = await checkCampaignLike(campaignId, userId);
      results[campaignId] = isLiked;
    });
    
    await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error checking multiple campaign likes:", error);
    return {};
  }
};

// Get campaign likes for notifications
export const getCampaignLikes = async (campaignId: number): Promise<CampaignLike[]> => {
  try {
    const likesQuery = query(
      collection(db, 'campaignLikes'),
      where('campaignId', '==', campaignId),
      orderBy('createdAt', 'desc')
    );
    const likesSnapshot = await getDocs(likesQuery);
    
    return likesSnapshot.docs.map(doc => doc.data() as CampaignLike);
  } catch (error) {
    console.error('Error getting campaign likes:', error);
    return [];
  }
};