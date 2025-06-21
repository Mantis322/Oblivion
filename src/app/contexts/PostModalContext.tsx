"use client"
import React, { createContext, useContext, useState } from 'react';

interface PostModalContextType {
  isPostModalOpen: boolean;
  openPostModal: () => void;
  closePostModal: () => void;
  onPostComplete?: () => void;
  setOnPostComplete: (callback: (() => void) | undefined) => void;
}

const PostModalContext = createContext<PostModalContextType | undefined>(undefined);

export function PostModalProvider({ children }: { children: React.ReactNode }) {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [onPostComplete, setOnPostComplete] = useState<(() => void) | undefined>(undefined);

  const openPostModal = () => setIsPostModalOpen(true);
  const closePostModal = () => setIsPostModalOpen(false);

  return (
    <PostModalContext.Provider value={{
      isPostModalOpen,
      openPostModal,
      closePostModal,
      onPostComplete,
      setOnPostComplete
    }}>
      {children}
    </PostModalContext.Provider>
  );
}

export function usePostModal() {
  const context = useContext(PostModalContext);
  if (context === undefined) {
    throw new Error('usePostModal must be used within a PostModalProvider');
  }
  return context;
}
