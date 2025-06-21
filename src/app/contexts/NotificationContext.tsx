"use client"
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NotificationData, getUserNotifications, getUnreadNotificationCount } from '../services/notificationService';
import { useWallet } from './WalletContext';

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useWallet();

  useEffect(() => {
    if (!user?.walletAddress) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Bildirimleri dinle
    const unsubscribeNotifications = getUserNotifications(
      user.walletAddress,
      (notificationData) => {
        setNotifications(notificationData);
        setIsLoading(false);
      }
    );

    // Okunmamış bildirim sayısını dinle
    const unsubscribeUnreadCount = getUnreadNotificationCount(
      user.walletAddress,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeUnreadCount();
    };
  }, [user?.walletAddress]);

  const refreshNotifications = () => {
    // Manuel yenileme gerekirse kullanılabilir
    if (user?.walletAddress) {
      setIsLoading(true);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
