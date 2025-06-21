import { db } from "../../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  Timestamp,
  deleteDoc
} from "@firebase/firestore";

export interface NotificationData {
  id: string;
  type: 'comment' | 'like' | 'follow' | 'repost' | 'mention' | 'mention_comment' | 'campaign_like';
  fromUserId: string;
  fromUserName: string;
  fromUserDisplayName: string;
  toUserId: string;
  postId?: string;
  campaignId?: number;
  campaignTitle?: string;
  isRead: boolean;
  timestamp: Timestamp;
}

export interface CreateNotificationData {
  type: 'comment' | 'like' | 'follow' | 'repost' | 'mention' | 'mention_comment' | 'campaign_like';
  fromUserId: string;
  fromUserName: string;
  fromUserDisplayName: string;
  toUserId: string;
  postId?: string;
  campaignId?: number;
  campaignTitle?: string;
}

// Bildirim oluştur
export const createNotification = async (notificationData: CreateNotificationData): Promise<boolean> => {
  try {
    // Kendi kendine bildirim gönderme
    if (notificationData.fromUserId === notificationData.toUserId) {
      return true;
    }

    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      isRead: false,
      timestamp: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
};

// Kullanıcının bildirimlerini getir
export const getUserNotifications = (userId: string, callback: (notifications: NotificationData[]) => void) => {
  const q = query(
    collection(db, "notifications"),
    where("toUserId", "==", userId),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: NotificationData[] = [];
    snapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      } as NotificationData);
    });
    callback(notifications);
  });
};

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true
    });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

// Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", userId),
      where("isRead", "==", false)
    );
    
    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isRead: true })
    );
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
};

// Okunmamış bildirim sayısını getir
export const getUnreadNotificationCount = (userId: string, callback: (count: number) => void) => {
  const q = query(
    collection(db, "notifications"),
    where("toUserId", "==", userId),
    where("isRead", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
};

// Bildirim formatı
export const formatNotificationDate = (timestamp: Timestamp): string => {
  if (!timestamp) return '';
  
  const now = new Date();
  const notificationDate = timestamp.toDate();
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'şimdi';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}d`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}s`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}g`;
  } else {
    return notificationDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short'
    });
  }
};

// Tüm bildirimleri sil
export const deleteAllNotifications = async (userId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    return false;
  }
};
