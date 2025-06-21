// Mention Service for Twitter-like @username functionality
import { getUserByWallet, isUsernameAvailable } from './userService';
import { createNotification } from './notificationService';
import { db } from "../../../firebase";
import { collection, query, where, getDocs, orderBy, limit } from "@firebase/firestore";

export interface MentionUser {
  walletAddress: string;
  username: string;
  name?: string;
  avatar?: string;
}

export interface ParsedMention {
  type: 'text' | 'mention';
  content: string;
  username?: string;
  walletAddress?: string;
}

// Extract mentions from text (@username format)
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  
  return mentions;
}

// Search users for mention autocomplete
export async function searchUsersForMention(searchTerm: string, currentUserId?: string): Promise<MentionUser[]> {
  try {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      return [];
    }

    const term = searchTerm.toLowerCase();
    const usersRef = collection(db, "users");
    
    // Search by username
    const usernameQuery = query(
      usersRef,
      where("username", ">=", term),
      where("username", "<=", term + '\uf8ff'),
      orderBy("username"),
      limit(10)
    );

    // Search by name
    const nameQuery = query(
      usersRef,
      where("name", ">=", searchTerm),
      where("name", "<=", searchTerm + '\uf8ff'),
      orderBy("name"),
      limit(10)
    );

    const [usernameResults, nameResults] = await Promise.all([
      getDocs(usernameQuery),
      getDocs(nameQuery)
    ]);

    const users = new Map<string, MentionUser>();

    // Add username search results
    usernameResults.forEach(doc => {
      const userData = doc.data();
      if (userData.username && userData.walletAddress !== currentUserId) {
        users.set(userData.walletAddress, {
          walletAddress: userData.walletAddress,
          username: userData.username,
          name: userData.name,
          avatar: userData.avatar
        });
      }
    });

    // Add name search results
    nameResults.forEach(doc => {
      const userData = doc.data();
      if (userData.username && userData.walletAddress !== currentUserId) {
        users.set(userData.walletAddress, {
          walletAddress: userData.walletAddress,
          username: userData.username,
          name: userData.name,
          avatar: userData.avatar
        });
      }
    });

    return Array.from(users.values());
  } catch (error) {
    console.error('Error searching users for mention:', error);
    return [];
  }
}

// Parse text and split into mentions and regular text
export async function parseTextWithMentions(text: string): Promise<ParsedMention[]> {
  try {
    const parts: ParsedMention[] = [];
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        if (beforeText) {
          parts.push({
            type: 'text',
            content: beforeText
          });
        }
      }

      // Try to find user by username
      const username = match[1].toLowerCase();
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          parts.push({
            type: 'mention',
            content: `@${match[1]}`,
            username: userData.username,
            walletAddress: userData.walletAddress
          });
        } else {
          // Username not found, treat as regular text
          parts.push({
            type: 'text',
            content: match[0]
          });
        }
      } catch (error) {
        // Error finding user, treat as regular text
        parts.push({
          type: 'text',
          content: match[0]
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        parts.push({
          type: 'text',
          content: remainingText
        });
      }
    }

    // If no mentions found, return original text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: text
      });
    }

    return parts;
  } catch (error) {
    console.error('Error parsing text with mentions:', error);
    return [{
      type: 'text',
      content: text
    }];
  }
}

// Send notifications to mentioned users
export async function sendMentionNotifications(
  text: string,
  fromUserId: string,
  fromUserName: string,
  fromUserDisplayName: string,
  postId: string,
  type: 'post' | 'comment' = 'post'
): Promise<void> {
  try {
    const mentions = extractMentions(text);
    
    for (const username of mentions) {
      try {
        // Find user by username
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          const toUserId = userData.walletAddress;
          
          // Don't send notification to self
          if (toUserId !== fromUserId) {
            await createNotification({
              type: type === 'post' ? 'mention' : 'mention_comment',
              fromUserId,
              fromUserName,
              fromUserDisplayName,
              toUserId,
              postId
            } as any);
          }
        }
      } catch (error) {
        console.error(`Error sending mention notification to @${username}:`, error);
        // Continue with other mentions
      }
    }
  } catch (error) {
    console.error('Error sending mention notifications:', error);
  }
}

// Get cursor position for mention autocomplete
export function getCursorMentionContext(text: string, cursorPosition: number): {
  isInMention: boolean;
  mentionStart: number;
  mentionText: string;
} | null {
  if (cursorPosition > text.length) {
    return null;
  }

  // Look backwards from cursor to find @
  let mentionStart = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    if (char === '@') {
      mentionStart = i;
      break;
    }
    if (char === ' ' || char === '\n') {
      break;
    }
  }

  if (mentionStart === -1) {
    return null;
  }

  // Extract mention text from @ to cursor
  const mentionText = text.slice(mentionStart + 1, cursorPosition);
  
  // Check if mention text is valid (no spaces)
  if (mentionText.includes(' ') || mentionText.includes('\n')) {
    return null;
  }

  return {
    isInMention: true,
    mentionStart,
    mentionText
  };
}

// Replace mention text with selected user
export function insertMention(
  text: string,
  mentionStart: number,
  mentionLength: number,
  username: string
): { newText: string; newCursorPosition: number } {
  const beforeMention = text.slice(0, mentionStart);
  const afterMention = text.slice(mentionStart + mentionLength + 1); // +1 for @
  const newMention = `@${username}`;
  const newText = beforeMention + newMention + afterMention;
  const newCursorPosition = mentionStart + newMention.length;

  return {
    newText,
    newCursorPosition
  };
}
