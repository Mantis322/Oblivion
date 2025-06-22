"use client"
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UserLinkProps {
  username?: string;
  displayName?: string;
  walletAddress?: string;
  className?: string;
  children?: React.ReactNode;
  showAt?: boolean; // @ işaretini göster
  onClick?: () => void; // İsteğe bağlı ek click handler
}

export default function UserLink({ 
  username, 
  displayName, 
  walletAddress, 
  className = "", 
  children, 
  showAt = false,
  onClick 
}: UserLinkProps) {
  const router = useRouter();
  const [showLucyToast, setShowLucyToast] = useState(false);

  // Hangi değeri kullanacağımızı belirle
  const linkDestination = username || walletAddress;
  const displayText = children || displayName || username || 'Anonymous';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Parent elementlerin click event'lerini durdur
    
    if (onClick) {
      onClick();
    }
    
    if (linkDestination) {
      // Lucy AI için özel handling
      if (linkDestination === 'lucy' || linkDestination === 'lucy-ai-assistant') {
        // Modern toast notification göster
        setShowLucyToast(true);
        setTimeout(() => setShowLucyToast(false), 3000);
        return;
      }
      
      router.push(`/profile/${linkDestination}`);
    }
  };

  if (!linkDestination) {
    // Link oluşturulamıyorsa normal span döndür
    return (
      <span className={`text-slate-400 ${className}`}>
        {showAt && '@'}{displayText}
      </span>
    );
  }

  return (
    <>
      <span
        onClick={handleClick}
        className={`hover:text-blue-400 hover:underline cursor-pointer transition-colors duration-200 inline-block relative z-10 select-none ${className}`}
        style={{ pointerEvents: 'auto' }}
      >
        {showAt && '@'}{displayText}
      </span>
      
      {/* Lucy AI Toast Notification */}
      {showLucyToast && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-purple-500/20 backdrop-blur-lg animate-slide-in-right">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <div className="font-semibold text-sm">Lucy AI Assistant</div>
              <div className="text-xs text-purple-100">I respond to @lucy mentions in comments!</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
