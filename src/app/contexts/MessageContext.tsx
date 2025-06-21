"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import { getTotalUnreadCount, subscribeToConversations } from '../services/messageService';

interface MessageContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  isLoading: boolean;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

interface MessageProviderProps {
  children: ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const { address } = useWallet();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Function to refresh unread count
  const refreshUnreadCount = async () => {
    if (!address) {
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const count = await getTotalUnreadCount(address);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to conversation updates for real-time unread count
  useEffect(() => {
    if (!address) {
      setUnreadCount(0);
      return;
    }

    // Initial load
    refreshUnreadCount();

    // Subscribe to real-time conversation updates
    const unsubscribe = subscribeToConversations(address, (conversations) => {
      let totalUnread = 0;
      conversations.forEach(conversation => {
        totalUnread += conversation.unreadCount[address] || 0;
      });
      setUnreadCount(totalUnread);
    });

    return unsubscribe;
  }, [address]);

  const value: MessageContextType = {
    unreadCount,
    refreshUnreadCount,
    isLoading
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};
