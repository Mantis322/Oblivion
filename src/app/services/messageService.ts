import { db } from "../../../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  updateDoc,
  limit,
  writeBatch,
  and
} from "@firebase/firestore";
import advancedEncryptionService from './simpleEncryptionService';
import { getUserByWallet } from './userService';
import type { MessageData, ConversationData } from './simpleEncryptionService';

// Create or get conversation between two users
export const createOrGetConversation = async (user1Id: string, user2Id: string): Promise<string | null> => {
  try {
    // Create a consistent conversation ID regardless of parameter order
    const conversationId = [user1Id, user2Id].sort().join('_');
    
    const conversationRef = doc(db, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      // Get user data for names and avatars
      const [user1Data, user2Data] = await Promise.all([
        getUserByWallet(user1Id),
        getUserByWallet(user2Id)
      ]);
      
      const conversationData: ConversationData = {
        id: conversationId,
        participants: [user1Id, user2Id],
        participantNames: {
          [user1Id]: user1Data?.name || user1Data?.username || 'Anonymous',
          [user2Id]: user2Data?.name || user2Data?.username || 'Anonymous'
        },
        participantAvatars: {
          [user1Id]: user1Data?.avatar || '',
          [user2Id]: user2Data?.avatar || ''
        },
        unreadCount: {
          [user1Id]: 0,
          [user2Id]: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(conversationRef, conversationData);
    }
    
    return conversationId;
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    return null;
  }
};

// Send a message
export const sendMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' = 'text'
): Promise<boolean> => {  try {
    // Create or get conversation first
    const conversationId = await createOrGetConversation(senderId, receiverId);
    if (!conversationId) {
      throw new Error('Failed to create conversation');
    }

    // Initialize encryption for this conversation
    await advancedEncryptionService.initializeForConversation(conversationId);
    
    // Encrypt the message content using conversation key
    const encryptionResult = await advancedEncryptionService.encryptMessage(content, conversationId);
    if (!encryptionResult) {
      throw new Error('Failed to encrypt message');
    }
      // Get sender data
    const senderData = await getUserByWallet(senderId);
      // Create message with encrypted content
    const messageData: Omit<MessageData, 'id'> = {
      conversationId,
      senderId,
      receiverId,
      encryptedContent: encryptionResult.encryptedContent,
      iv: encryptionResult.iv,
      timestamp: serverTimestamp(),
      messageType,
      isRead: false,
      senderName: senderData?.name || senderData?.username || 'Anonymous',
      senderAvatar: senderData?.avatar || ''
    };
      const messagesRef = collection(db, "messages");
    await addDoc(messagesRef, messageData);
    
    // Update conversation with last message info
    const conversationRef = doc(db, "conversations", conversationId);
    const batch = writeBatch(db);
    
    // Decrypt content for last message preview (only for display purposes)
    const decryptedPreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    
    batch.update(conversationRef, {
      lastMessage: decryptedPreview,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: senderId,
      updatedAt: serverTimestamp(),
      [`unreadCount.${receiverId}`]: (await getConversationUnreadCount(conversationId, receiverId)) + 1
    });
    
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId: string, currentUserId?: string, limitCount: number = 50): Promise<MessageData[]> => {
  try {
    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const messages: MessageData[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const messageData = { id: docSnapshot.id, ...docSnapshot.data() } as MessageData;
      
      // Filter out messages deleted by current user
      if (currentUserId && messageData.deletedFor && Array.isArray(messageData.deletedFor)) {
        if (messageData.deletedFor.includes(currentUserId)) {
          continue; // Skip this message for current user
        }
      }
      
      // Skip messages deleted for everyone
      if (messageData.isDeletedForEveryone) {
        continue;
      }
      
      // Decrypt message content if it's encrypted
      if (messageData.encryptedContent && messageData.iv && currentUserId) {        try {
          const decryptedContent = await advancedEncryptionService.decryptMessage(
            messageData.encryptedContent,
            messageData.iv,
            conversationId
          );
          
          // Add decrypted content as a temporary property for display
          (messageData as any).content = decryptedContent;
        } catch (error) {
          console.error('Error decrypting message:', error);
          (messageData as any).content = 'Failed to decrypt message';
        }
      }
      
      messages.push(messageData);
    }
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

// Get user conversations
export const getUserConversations = async (userId: string): Promise<ConversationData[]> => {
  try {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const conversations: ConversationData[] = [];
    
    querySnapshot.forEach((doc) => {
      const conversationData = { id: doc.id, ...doc.data() } as ConversationData;
      
      // Filter out conversations deleted by current user
      if (conversationData.deletedFor && conversationData.deletedFor.includes(userId)) {
        return; // Skip this conversation for current user
      }
      
      conversations.push(conversationData);
    });
    
    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    return [];
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<boolean> => {
  try {
    // Update unread count in conversation
    const conversationRef = doc(db, "conversations", conversationId);
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    // Mark individual messages as read
    const q = query(
      collection(db, "messages"),
      and(
        where("conversationId", "==", conversationId),
        where("receiverId", "==", userId),
        where("isRead", "==", false)
      )
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
};

// Get unread count for a conversation
export const getConversationUnreadCount = async (conversationId: string, userId: string): Promise<number> => {
  try {
    const conversationDoc = await getDoc(doc(db, "conversations", conversationId));
    if (conversationDoc.exists()) {
      const data = conversationDoc.data() as ConversationData;
      return data.unreadCount[userId] || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Get total unread messages count for user
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  try {
    const conversations = await getUserConversations(userId);
    let totalUnread = 0;
    
    conversations.forEach(conversation => {
      totalUnread += conversation.unreadCount[userId] || 0;
    });
    
    return totalUnread;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    return 0;
  }
};

// Search users for messaging
export const searchUsersForMessaging = async (searchTerm: string, currentUserId: string): Promise<any[]> => {
  try {
    const usersRef = collection(db, "users");
    
    // Search by username and name
    const [usernameQuery, nameQuery] = await Promise.all([
      getDocs(query(usersRef, where("username", ">=", searchTerm), where("username", "<=", searchTerm + '\uf8ff'))),
      getDocs(query(usersRef, where("name", ">=", searchTerm), where("name", "<=", searchTerm + '\uf8ff')))
    ]);
    
    const users = new Map();
    
    // Add results from username search
    usernameQuery.forEach(doc => {
      const userData = doc.data();
      if (userData.walletAddress !== currentUserId) {
        users.set(userData.walletAddress, userData);
      }
    });
    
    // Add results from name search
    nameQuery.forEach(doc => {
      const userData = doc.data();
      if (userData.walletAddress !== currentUserId) {
        users.set(userData.walletAddress, userData);
      }
    });
    
    return Array.from(users.values());
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Real-time message listener
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: MessageData[]) => void,
  currentUserId?: string
): () => void => {
  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    orderBy("timestamp", "desc"),
    limit(50)
  );
  
  return onSnapshot(q, async (snapshot) => {
    const messages: MessageData[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const messageData = { id: docSnapshot.id, ...docSnapshot.data() } as MessageData;
      
      // Filter out messages deleted by current user
      if (currentUserId && messageData.deletedFor && Array.isArray(messageData.deletedFor)) {
        if (messageData.deletedFor.includes(currentUserId)) {
          continue; // Skip this message for current user
        }
      }
      
      // Skip messages deleted for everyone
      if (messageData.isDeletedForEveryone) {
        continue;
      }
      
      // Decrypt message content if it's encrypted
      if (messageData.encryptedContent && messageData.iv && currentUserId) {        try {
          const decryptedContent = await advancedEncryptionService.decryptMessage(
            messageData.encryptedContent,
            messageData.iv,
            conversationId
          );
          
          // Add decrypted content as a temporary property for display
          (messageData as any).content = decryptedContent;
        } catch (error) {
          console.error('Error decrypting message in subscription:', error);
          (messageData as any).content = 'Failed to decrypt message';
        }
      }
      
      messages.push(messageData);
    }
    
    callback(messages.reverse());
  });
};

// Real-time conversation listener
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: ConversationData[]) => void
): () => void => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const conversations: ConversationData[] = [];
    snapshot.forEach((doc) => {
      const conversationData = { id: doc.id, ...doc.data() } as ConversationData;
      
      // Filter out conversations deleted by current user
      if (conversationData.deletedFor && conversationData.deletedFor.includes(userId)) {
        return; // Skip this conversation for current user
      }
      
      conversations.push(conversationData);
    });
    callback(conversations);
  });
};

// Delete a message
export const deleteMessage = async (messageId: string, deleteForBoth: boolean = false, currentUserId?: string): Promise<boolean> => {
  try {
    if (deleteForBoth) {
      // Mark as deleted for everyone
      await updateDoc(doc(db, "messages", messageId), {
        isDeletedForEveryone: true,
        content: "This message was deleted"
      });
    } else {
      // Mark as deleted only for current user
      const messageRef = doc(db, "messages", messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists() && currentUserId) {
        const currentData = messageDoc.data();
        const deletedFor = currentData.deletedFor || [];
        
        if (!deletedFor.includes(currentUserId)) {
          deletedFor.push(currentUserId);
          await updateDoc(messageRef, {
            deletedFor: deletedFor
          });
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};

// Delete entire conversation
export const deleteConversation = async (conversationId: string, deleteForBoth: boolean = false, currentUserId?: string): Promise<boolean> => {
  try {
    if (deleteForBoth) {
      // Delete conversation and all messages for everyone
      const batch = writeBatch(db);
      
      // Delete all messages in the conversation
      const messagesQuery = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      messagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete the conversation itself
      batch.delete(doc(db, "conversations", conversationId));
      
      await batch.commit();
    } else {
      // Mark conversation as deleted only for current user
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists() && currentUserId) {
        const currentData = conversationDoc.data();
        const deletedFor = currentData.deletedFor || [];
        
        if (!deletedFor.includes(currentUserId)) {
          deletedFor.push(currentUserId);
          await updateDoc(conversationRef, {
            deletedFor: deletedFor
          });
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
};

// Get conversation by ID
export const getConversationById = async (conversationId: string): Promise<ConversationData | null> => {
  try {
    const conversationDoc = await getDoc(doc(db, "conversations", conversationId));
    if (conversationDoc.exists()) {
      return { id: conversationDoc.id, ...conversationDoc.data() } as ConversationData;
    }
    return null;
  } catch (error) {
    console.error('Error getting conversation by ID:', error);
    return null;
  }
};
