// Updated interfaces with deletion functionality
export interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  iv: string;
  timestamp: unknown;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  senderName?: string;
  senderAvatar?: string;
  // Deletion tracking
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
}

export interface ConversationData {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  participantAvatars: { [key: string]: string };
  lastMessage?: string;
  lastMessageTime?: unknown;
  lastMessageSender?: string;
  unreadCount: { [userId: string]: number };
  createdAt: unknown;
  updatedAt: unknown;
  // Deletion tracking
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
}

export interface EncryptionResult {
  encryptedContent: string;
  iv: string;
}

class AdvancedEncryptionService {
  private conversationKeys: Map<string, CryptoKey> = new Map();

  // Generate or get a shared key for a conversation
  private async getConversationKey(conversationId: string): Promise<CryptoKey> {
    if (this.conversationKeys.has(conversationId)) {
      return this.conversationKeys.get(conversationId)!;
    }

    try {
      // Try to load existing conversation key from localStorage
      const storedKey = localStorage.getItem(`conversationKey_${conversationId}`);
      if (storedKey) {
        const keyData = JSON.parse(storedKey);
        const key = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
        this.conversationKeys.set(conversationId, key);
        return key;
      }

      // Generate deterministic key from conversation ID
      // This ensures both participants get the same key
      const encoder = new TextEncoder();
      const data = encoder.encode(conversationId + '_shared_secret_key');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      const key = await crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );

      // Store key for future use
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      localStorage.setItem(`conversationKey_${conversationId}`, JSON.stringify(Array.from(new Uint8Array(exportedKey))));
      
      this.conversationKeys.set(conversationId, key);
      return key;
    } catch (error) {
      console.error('Error getting conversation key:', error);
      throw error;
    }
  }

  // Initialize encryption for a conversation
  async initializeForConversation(conversationId: string): Promise<void> {
    await this.getConversationKey(conversationId);
  }  // Encrypt a message using AES-GCM with conversation key
  async encryptMessage(content: string, conversationId: string): Promise<EncryptionResult | null> {
    try {
      // Get shared conversation key
      const key = await this.getConversationKey(conversationId);
      
      if (!key) {
        throw new Error('No encryption key found for conversation');
      }

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the content
      const encodedContent = new TextEncoder().encode(content);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedContent
      );

      return {
        encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        iv: btoa(String.fromCharCode(...iv))
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      return null;
    }
  }

  // Decrypt a message using AES-GCM with conversation key
  async decryptMessage(
    encryptedContent: string,
    iv: string,
    conversationId: string
  ): Promise<string | null> {
    try {
      // Get shared conversation key
      const key = await this.getConversationKey(conversationId);
      
      if (!key) {
        throw new Error('No encryption key found for conversation');
      }

      // Convert base64 strings back to Uint8Array
      const encryptedData = new Uint8Array(
        atob(encryptedContent).split('').map(char => char.charCodeAt(0))
      );
      const ivArray = new Uint8Array(
        atob(iv).split('').map(char => char.charCodeAt(0))
      );

      // Decrypt the content
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Error decrypting message:', error);
      // Return encrypted content as fallback
      return `[Encrypted: ${encryptedContent.substring(0, 20)}...]`;
    }
  }
  // Clear all stored keys (for logout)
  clearKeys(): void {
    this.conversationKeys.clear();
    // Clear all conversation keys from localStorage
    const keys = Object.keys(localStorage).filter(key => key.startsWith('conversationKey_'));
    keys.forEach(key => localStorage.removeItem(key));
  }
}

// Export a singleton instance
const advancedEncryptionService = new AdvancedEncryptionService();
export default advancedEncryptionService;