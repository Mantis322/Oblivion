"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../contexts/WalletContext';
import { useMessages } from '../contexts/MessageContext';
import { 
  getUserConversations, 
  searchUsersForMessaging, 
  createOrGetConversation,
  getTotalUnreadCount,
  subscribeToConversations,
  deleteConversation
} from '../services/messageService';
import { ConversationData } from '../services/simpleEncryptionService';
import Sidebar from '../components/sidebar';
import MessagesList from '../components/MessagesList';
import UserSearch from '../components/UserSearch';
import { FaArrowLeft, FaSearch, FaPlus, FaTimes, FaLock, FaTrash, FaEllipsisH, FaShieldAlt } from 'react-icons/fa';

export default function MessagesPage() {
  const { user, address } = useWallet();
  const { refreshUnreadCount } = useMessages();
  const router = useRouter();
    const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Conversation deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [deleteForBoth, setDeleteForBoth] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user || !address) {
      router.push('/');
      return;
    }
  }, [user, address, router]);

  // Load conversations
  useEffect(() => {
    if (!address) return;

    const loadConversations = async () => {
      try {
        const userConversations = await getUserConversations(address);
        setConversations(userConversations);
        
        const unreadCount = await getTotalUnreadCount(address);
        setTotalUnreadCount(unreadCount);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();

    // Subscribe to real-time conversation updates
    const unsubscribe = subscribeToConversations(address, (updatedConversations) => {
      setConversations(updatedConversations);
    });

    return unsubscribe;
  }, [address]);  // Search users with useCallback to prevent re-rendering
  const handleSearch = useCallback(async (term: string) => {
    if (!address || !term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsersForMessaging(term.trim(), address);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }, [address]);

  // Close conversation menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (conversationMenuOpen) {
        setConversationMenuOpen(null);
      }
    };

    if (conversationMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [conversationMenuOpen]);

  // Start conversation with selected user
  const handleStartConversation = async (selectedUser: any) => {
    if (!address) return;

    try {
      const conversationId = await createOrGetConversation(address, selectedUser.walletAddress);
      if (conversationId) {
        setSelectedConversation(conversationId);
        setShowUserSearch(false);
        setSearchTerm('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };
  // Get other participant in conversation
  const getOtherParticipant = (conversation: ConversationData) => {
    const otherParticipantId = conversation.participants.find((p: string) => p !== address);
    return {
      id: otherParticipantId,
      name: otherParticipantId ? conversation.participantNames[otherParticipantId] : 'Unknown',
      avatar: otherParticipantId ? conversation.participantAvatars[otherParticipantId] : ''
    };
  };
  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle conversation deletion
  const handleDeleteConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowDeleteModal(true);
    setDeleteForBoth(false);
    setConversationMenuOpen(null);
  };

  // Confirm delete conversation
  const confirmDeleteConversation = async () => {
    if (!selectedConversationId || !address) return;
    
    setDeleting(true);
    try {
      const success = await deleteConversation(selectedConversationId, deleteForBoth, address);
      if (success) {
        setConversations(prev => prev.filter(c => c.id !== selectedConversationId));
        if (selectedConversation === selectedConversationId) {
          setSelectedConversation(null);
        }
        setShowDeleteModal(false);
        setSelectedConversationId(null);
        setDeleteForBoth(false);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const cancelDeleteConversation = () => {
    setShowDeleteModal(false);
    setSelectedConversationId(null);
    setDeleteForBoth(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        
        <div className="flex-1 ml-20 lg:ml-72 flex h-screen">
          {/* Conversations List */}
          <div className="w-full lg:w-1/3 border-r border-slate-700/50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="lg:hidden p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
                  >
                    <FaArrowLeft className="w-5 h-5" />
                  </button>                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FaLock className="w-5 h-5 text-green-400" />
                      Messages
                    </h1>                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <FaShieldAlt className="w-4 h-4 text-green-400" />
                      End-to-end encrypted with AES-256-GCM
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors duration-200 text-white"
                  title="Start new conversation"
                >
                  <FaPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <FaLock className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No conversations yet</h3>
                  <p className="text-slate-400 mb-6">Start a secure conversation with someone!</p>
                  <button
                    onClick={() => setShowUserSearch(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                  >
                    Start Conversation
                  </button>
                </div>
              ) : (                <div className="space-y-1 p-2">
                  {conversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    const unreadCount = conversation.unreadCount[address!] || 0;
                    const isSelected = selectedConversation === conversation.id;
                    const isMenuOpen = conversationMenuOpen === conversation.id;
                    
                    return (                      <div key={conversation.id} className="relative group">
                        <div
                          className={`w-full p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-600/20 border border-blue-500/30' 
                              : 'hover:bg-slate-800/50 border border-transparent'
                          }`}
                          onClick={() => handleConversationSelect(conversation.id)}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {otherParticipant.avatar ? (
                                <img
                                  src={otherParticipant.avatar}
                                  alt={otherParticipant.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {otherParticipant.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-8">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-white truncate">
                                  {otherParticipant.name}
                                </h3>                                <div className="flex items-center gap-2">
                                  {!!conversation.lastMessageTime && (
                                    <span className="text-xs text-slate-400">
                                      {formatTimestamp(conversation.lastMessageTime as any)}
                                    </span>
                                  )}
                                  {unreadCount > 0 && (
                                    <div className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                      {unreadCount > 9 ? '9+' : unreadCount}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {conversation.lastMessage && (
                                <p className="text-sm text-slate-400 truncate">
                                  {conversation.lastMessageSender === address ? 'You: ' : ''}
                                  {conversation.lastMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu button - positioned at the right edge, vertically centered */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationMenuOpen(isMenuOpen ? null : conversation.id);
                          }}
                          className="absolute top-1/2 right-2 transform -translate-y-1/2 p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                        >
                          <FaEllipsisH className="w-4 h-4" />
                        </button>

                        {/* Conversation menu */}
                        {isMenuOpen && (
                          <div className="absolute right-2 top-16 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[150px]">
                            <button
                              onClick={() => handleDeleteConversation(conversation.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <FaTrash className="w-3 h-3" />
                              Delete conversation
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Message View */}
          <div className="hidden lg:flex flex-1 flex-col">
            {selectedConversation ? (
              <MessagesList conversationId={selectedConversation} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaLock className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                  <p className="text-slate-400">Choose a conversation to start messaging securely</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch
          onClose={() => {
            setShowUserSearch(false);
            setSearchTerm('');
            setSearchResults([]);
          }}
          onSelectUser={handleStartConversation}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchResults={searchResults}
          onSearch={handleSearch}
          searching={searching}
        />
      )}

      {/* Conversation Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <FaTrash className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Conversation</h3>
                  <p className="text-sm text-slate-400">Choose deletion option</p>
                </div>
              </div>
              <button
                onClick={cancelDeleteConversation}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                disabled={deleting}
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-slate-300 mb-4">
                Are you sure you want to delete this conversation? Choose who should see the deletion:
              </p>

              {/* Delete options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="deleteConversationOption"
                    checked={!deleteForBoth}
                    onChange={() => setDeleteForBoth(false)}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500"
                    disabled={deleting}
                  />
                  <div>
                    <div className="text-white font-medium">Delete for me only</div>
                    <div className="text-sm text-slate-400">The conversation will only be removed from your chat list</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="deleteConversationOption"
                    checked={deleteForBoth}
                    onChange={() => setDeleteForBoth(true)}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500"
                    disabled={deleting}
                  />
                  <div>
                    <div className="text-white font-medium">Delete for everyone</div>
                    <div className="text-sm text-slate-400">The conversation and all messages will be permanently removed for both participants</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteConversation}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-semibold rounded-xl border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConversation}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
