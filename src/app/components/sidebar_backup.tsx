"use client"
import Link from 'next/link';
import { FaHome, FaHashtag, FaBell, FaEnvelope, FaBookmark, FaUser, FaWallet, FaEllipsisH, FaSignOutAlt, FaFeatherAlt, FaHeart, FaBuilding } from 'react-icons/fa';
import { Shield } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { usePostModal } from '../contexts/PostModalContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useMessages } from '../contexts/MessageContext';
import UserSetup from './UserSetup';
import UserLink from './UserLink';
import UserSearchBox from './UserSearchBox';
import AdminModal from './AdminModal';

// Oblivion Icon Component
const OblivionIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="oblivionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#8B5CF6', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#EC4899', stopOpacity:1}} />
      </linearGradient>
    </defs>
    <text x="16" y="25" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="url(#oblivionGradient)">∅</text>
  </svg>
);

function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const isActive = (path: string | null) => !!path && pathname === path;
    
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState(false);

    const { address, disconnectWallet, user, userLoading, refreshUser, contract } = useWallet();
    const { openPostModal } = usePostModal();
    const { unreadCount } = useNotifications();
    const { unreadCount: messageUnreadCount } = useMessages();

    // Ekran boyutunu takip et
    useEffect(() => {
        const handleResize = () => {
            setIsCollapsed(window.innerWidth < 1024); // lg breakpoint
        };

        handleResize(); // İlk yükleme
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleProfileClick = () => {
        if (user?.username) {
            router.push(`/profile/${user.username}`);
        } else {
            router.push('/profile'); // fallback
        }
        setShowUserMenu(false);
    };

    const handleHomeClick = () => {
        if (address) {
            router.push('/home');
        } else {
            // Eğer cüzdan bağlı değilse, normal yönlendirme veya başka bir işlem yapılabilir
            router.push('/home');
        }
        setShowUserMenu(false);
    };

    const menuItems = [
        { icon: FaHome, label: 'Home', path: '/', onClick: handleHomeClick },
        { icon: FaHashtag, label: 'Explore', path: '/explore' },
        { icon: FaHeart, label: 'Campaigns', path: '/campaigns' },
        { icon: FaBuilding, label: 'O.B.I', path: '/obi' },
        { icon: FaBell, label: 'Notifications', path: '/notifications' },
        { icon: FaEnvelope, label: 'Messages', path: '/messages' },
        { icon: FaBookmark, label: 'Bookmarks', path: '/bookmarks' },
        { icon: FaUser, label: 'Profile', path: null, onClick: handleProfileClick }
    ];

    // User data - now using Firebase data from wallet context
    const userData = {
        name: user?.name || "Anonymous User",
        username: user?.username ? `@${user.username}` : "@anonymous",
        walletAddress: address || "Not Connected",
        avatar: user?.avatar || null
    };

    // Avatar initials generator
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Cüzdan adresini kısaltma fonksiyonu
    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Sign out işlemi
    const handleSignOut = () => {
        disconnectWallet();
        setShowUserMenu(false);
        router.push('/');
    };

    // Settings modalını aç
    const handleSettings = () => {
        setShowSettings(true);
        setShowUserMenu(false);
    };

    // Settings modal kapatma ve güncelleme
    const handleSettingsComplete = async (userData: { name: string; username: string }) => {
        await refreshUser();
        setShowSettings(false);
    };

    const handleSettingsCancel = () => {
        setShowSettings(false);
    };

    // Cüzdan adresini kopyalama işlemi
    const handleCopyAddress = async () => {
        try {
            await navigator.clipboard.writeText(userData.walletAddress);
            setCopied(true);
            // 2 saniye sonra "Copied!" mesajını gizle
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    };

    // Menü dışına tıklayınca menüyü kapat
    useEffect(() => {
        const handleClickOutside = () => {
            setShowUserMenu(false);
        };

        if (showUserMenu) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showUserMenu]);

    // Check if current user is admin - cleaned version
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!contract || !address) {
                setIsAdmin(false);
                return;
            }
            
            try {
                setAdminCheckLoading(true);
                
                // Get admin address from contract
                const adminTransaction = await contract.get_admin();
                let adminAddress = null;
                let resultToCheck = null;
                
                // Method 1: Direct result access
                if (adminTransaction.result !== undefined) {
                    resultToCheck = adminTransaction.result;
                }
                // Method 2: Force simulation if no result
                else {
                    try {
                        await adminTransaction.simulate();
                        resultToCheck = adminTransaction.result;
                    } catch (simError) {
                        // Simulation failed, continue with null result
                    }
                }
                
                // Parse the result
                if (resultToCheck !== null && resultToCheck !== undefined) {
                    if (typeof resultToCheck === 'string') {
                        adminAddress = resultToCheck;
                    } else if (resultToCheck && typeof resultToCheck === 'object') {
                        // Handle different Option formats
                        if ((resultToCheck as any)._arm === 'some' && (resultToCheck as any)._value) {
                            adminAddress = (resultToCheck as any)._value;
                        } else if ((resultToCheck as any).tag === 'some' && (resultToCheck as any).values?.[0]) {
                            adminAddress = (resultToCheck as any).values[0];
                        } else {
                            // Try to find any string value in the object
                            const findStringValue = (obj: any): string | null => {
                                if (typeof obj === 'string') return obj;
                                if (!obj || typeof obj !== 'object') return null;
                                
                                for (const [key, value] of Object.entries(obj)) {
                                    if (typeof value === 'string' && value.length > 0) {
                                        return value;
                                    } else if (typeof value === 'object') {
                                        const nested = findStringValue(value);
                                        if (nested) return nested;
                                    }
                                }
                                return null;
                            };
                            
                            adminAddress = findStringValue(resultToCheck);
                        }
                    }
                }
                
                // Check if current user is admin
                const isUserAdmin = adminAddress === address;
                setIsAdmin(isUserAdmin);
                
            } catch (error) {
                setIsAdmin(false);
            } finally {
                setAdminCheckLoading(false);
            }
        };

        checkAdminStatus();
    }, [contract, address]);

    return (
        <>
            {showSettings && (
                <UserSetup
                    walletAddress={address || ''}
                    existingUser={{
                        name: user?.name || '',
                        username: user?.username || '',
                        avatar: user?.avatar || ''
                    }}
                    onComplete={handleSettingsComplete}
                    onCancel={handleSettingsCancel}
                    isEditMode={true}
                />
            )}
            
            <div 
                className={`h-screen fixed left-0 top-0 flex flex-col justify-between bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 z-50 transition-all duration-300 ${
                    isCollapsed ? 'w-20' : 'w-[280px]'
                }`}
                style={{ minWidth: isCollapsed ? '80px' : '280px' }}
            >
                {/* Top Section */}
                <div className={`flex flex-col items-stretch transition-all duration-300 ${isCollapsed ? 'pt-6 px-3' : 'pt-8 px-6'}`}>
                    {/* Logo */}
                    <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isCollapsed ? 'mb-6' : 'mb-10'}`}>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                            <div className={`relative bg-slate-800 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                isCollapsed ? 'w-10 h-10' : 'w-12 h-12'
                            }`}>
                                <OblivionIcon className={`transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
                            </div>
                        </div>
                        {!isCollapsed && (
                            <div className="mt-3">
                                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent tracking-wide">
                                    Oblivion
                                </h1>
                            </div>
                        )}
                    </div>

                    {/* User Search Box */}
                    <UserSearchBox isCollapsed={isCollapsed} />

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-2">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick ? item.onClick : () => router.push(item.path!)}
                                className={`group flex items-center rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${
                                isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3'
                            } ${(item.path && isActive(item.path))
                                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent hover:border-slate-600/30'}
                            `}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {/* Active indicator line */}
                            {item.path && isActive(item.path) && (
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full"></div>
                            )}
                            <div className="relative">
                                <item.icon className={`transition-all duration-300 ${
                                    item.path && isActive(item.path)
                                        ? 'text-blue-400' 
                                        : 'text-slate-400 group-hover:text-slate-200'
                                } ${isCollapsed ? 'text-lg' : 'text-lg'}`} />
                                {/* Notification badge for notifications menu item */}
                                {item.label === 'Notifications' && unreadCount > 0 && (
                                    <div className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-red-500/50 animate-pulse ${
                                        isCollapsed ? 'scale-90' : ''
                                    }`}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </div>
                                )}
                                {/* Message badge for messages menu item */}
                                {item.label === 'Messages' && messageUnreadCount > 0 && (
                                    <div className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/50 animate-pulse ${
                                        isCollapsed ? 'scale-90' : ''
                                    }`}>
                                        {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                                    </div>
                                )}
                            </div>
                            {!isCollapsed && (
                                <span className="text-sm font-medium select-none">{item.label}</span>
                            )}
                            {/* Hover effect background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </button>
                    ))}
                </nav>

                {/* Post Button - moved here */}
                <div className={`transition-all duration-300 ${isCollapsed ? 'mt-6' : 'mt-8'}`}>
                    <button 
                        onClick={openPostModal}
                        className={`group relative w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/25 transition-all duration-300 text-sm overflow-hidden ${
                        isCollapsed ? 'p-3 aspect-square' : 'py-4'
                    }`} title={isCollapsed ? 'Post' : undefined}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className={`relative flex items-center justify-center transition-all duration-300 ${isCollapsed ? '' : 'gap-2'}`}>
                            <FaFeatherAlt className="w-4 h-4" />
                            {!isCollapsed && 'Post'}
                        </span>
                    </button>
                </div>
            </div>

            {/* User Profile Section - Bottom */}
            {!isCollapsed && (
                <div className="px-6 pb-6">
                    <div className="group relative bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-4 transition-all duration-300 border border-slate-700/30 hover:border-slate-600/50">
                        <div className="flex items-center gap-3">
                            {/* User Avatar */}
                            <div className="relative">
                                {userData.avatar ? (
                                    <img 
                                        src={userData.avatar} 
                                        alt="User Avatar"
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/30"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {getInitials(userData.name)}
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <UserLink
                                            username={user?.username || undefined}
                                            displayName={userData.name}
                                            walletAddress={address || undefined}
                                            className="text-white font-medium text-sm truncate block"
                                        />
                                        <UserLink
                                            username={user?.username || undefined}
                                            walletAddress={address || undefined}
                                            className="text-slate-400 text-xs truncate block"
                                            showAt={true}
                                        />
                                    </div>
                                    <div className="relative">
                                        <button 
                                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-slate-700 rounded-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowUserMenu(!showUserMenu);
                                            }}
                                        >
                                            <FaEllipsisH className="text-slate-400 text-sm" />
                                        </button>

                                        {/* User Menu Dropdown */}
                                        {showUserMenu && (
                                            <div className="absolute right-0 bottom-full mb-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                                                <button
                                                    onClick={handleSettings}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-700/50 transition-colors duration-200"
                                                >
                                                    <FaUser className="text-xs" />
                                                    Settings
                                                </button>
                                                {/* Admin butonu sadece admin kullanıcılar için */}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => {
                                                            setShowAdminModal(true);
                                                            setShowUserMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-purple-400 hover:bg-slate-700/50 transition-colors duration-200"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        Admin
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleSignOut}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-slate-700/50 rounded-b-lg transition-colors duration-200"
                                                >
                                                    <FaSignOutAlt className="text-xs" />
                                                    Sign out
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Wallet Address */}
                                {address ? (
                                    <div className="flex items-center gap-1 mt-2 bg-slate-700/50 rounded-lg px-2 py-1 relative">
                                        <FaWallet className="text-slate-400 text-xs" />
                                        <span className="text-slate-300 text-xs font-mono">
                                            {shortenAddress(userData.walletAddress)}
                                        </span>
                                        <div className="relative">
                                            <button 
                                                className="ml-1 text-slate-400 hover:text-blue-400 transition-colors duration-200"
                                                onClick={handleCopyAddress}
                                                title="Copy wallet address"
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                                                </svg>
                                            </button>
                                            
                                            {/* Copied! Notification */}
                                            {copied && (
                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap">
                                                    Copied!
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-green-600"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 mt-2 bg-slate-700/50 rounded-lg px-2 py-1">
                                        <FaWallet className="text-slate-400 text-xs" />
                                        <span className="text-slate-400 text-xs">
                                            Not Connected
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Collapsed User Avatar - Only show when collapsed */}
            {isCollapsed && (
                <div className="px-3 pb-6">
                    <div className="relative group cursor-pointer" title={`${userData.name} (${userData.username})`}>
                        {userData.avatar ? (
                            <img 
                                src={userData.avatar} 
                                alt="User Avatar"
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30 hover:ring-blue-500/50 transition-all duration-300"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-all duration-300">
                                {getInitials(userData.name)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Admin Modal */}
        <AdminModal
            isOpen={showAdminModal}
            onClose={() => setShowAdminModal(false)}
        />
    </>
);
}

export default Sidebar;
