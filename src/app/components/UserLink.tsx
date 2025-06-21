"use client"
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

  // Hangi değeri kullanacağımızı belirle
  const linkDestination = username || walletAddress;
  const displayText = children || displayName || username || 'Anonymous';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Parent elementlerin click event'lerini durdur
    
    if (onClick) {
      onClick();
    }
    
    if (linkDestination) {
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
    <span
      onClick={handleClick}
      className={`hover:text-blue-400 hover:underline cursor-pointer transition-colors duration-200 ${className}`}
    >
      {showAt && '@'}{displayText}
    </span>
  );
}
