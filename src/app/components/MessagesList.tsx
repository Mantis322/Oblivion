"use client"
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { 
  getMessages, 
  sendMessage, 
  markMessagesAsRead,
  subscribeToMessages,
  deleteMessage,
  getConversationById
} from '../services/messageService';
import advancedEncryptionService, { MessageData, ConversationData } from '../services/simpleEncryptionService';
import { FaPaperPlane, FaTrash, FaLock, FaShieldAlt, FaTimes } from 'react-icons/fa';

interface MessagesListProps {
  conversationId: string;
}

export default function MessagesList({ conversationId }: MessagesListProps) {
  const { address } = useWallet();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);  const [loading, setLoading] = useState(true);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [deleteForBoth, setDeleteForBoth] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);  // Initialize and load messages
  useEffect(() => {
    if (!address || !conversationId) return;    const initializeAndLoadMessages = async () => {
      try {
        setLoading(true);
        
        // Initialize encryption for this conversation
        await advancedEncryptionService.initializeForConversation(conversationId);
        
        // Load conversation data first
        const conversationData = await getConversationById(conversationId);
        console.log('Loaded conversation:', conversationData);
        setConversation(conversationData);
          // Load messages
        const messagesList = await getMessages(conversationId, address);
        setMessages(messagesList);
          // Messages are now automatically decrypted in the service layer
        const decrypted = new Map<string, string>();
        for (const message of messagesList) {
          try {
            // Content is already decrypted and available as (message as unknown as { content: string }).content
            const content = (message as unknown as { content: string }).content || 'Message content unavailable';
            decrypted.set(message.id, content);
          } catch (error) {
            console.error('Error processing message:', error);
            decrypted.set(message.id, 'Unable to display message');
          }
        }
        setDecryptedMessages(decrypted);
        
        // Mark messages as read
        await markMessagesAsRead(conversationId, address);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };    initializeAndLoadMessages();    // Subscribe to real-time message updates
    const unsubscribe = subscribeToMessages(conversationId, async (updatedMessages) => {
      setMessages(updatedMessages);
      
      // Process new messages - content is already decrypted in the service layer
      const decrypted = new Map(decryptedMessages);
      for (const message of updatedMessages) {
        if (!decrypted.has(message.id)) {          try {
            // Content is already decrypted and available as (message as unknown as { content: string }).content
            const content = (message as unknown as { content: string }).content || 'Message content unavailable';
            decrypted.set(message.id, content);
          } catch (error) {
            console.error('Error processing message:', error);
            decrypted.set(message.id, 'Unable to display message');
          }
        }
      }
      setDecryptedMessages(decrypted);
      
      // Mark new messages as read
      if (updatedMessages.some(m => m.receiverId === address && !m.isRead)) {
        await markMessagesAsRead(conversationId, address);
      }
    }, address);

    return unsubscribe;
  }, [conversationId, address]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !address || sending || !conversation) {
      console.log('Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasAddress: !!address, 
        sending, 
        hasConversation: !!conversation 
      });
      return;
    }

    setSending(true);    try {
      // Get receiver ID from conversation participants
      const otherParticipant = conversation.participants.find((p: string) => p !== address);
        
      if (!otherParticipant) {
        console.error('Cannot determine receiver - no other participant found');
        console.log('Conversation participants:', conversation.participants);
        console.log('Current address:', address);
        setSending(false);
        return;
      }

      console.log('Sending message to:', otherParticipant);
      const success = await sendMessage(address, otherParticipant, newMessage.trim());
      
      if (success) {
        setNewMessage('');
        // Auto-resize textarea
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowDeleteModal(true);
    setDeleteForBoth(false);
  };

  // Confirm delete message
  const confirmDeleteMessage = async () => {
    if (!selectedMessageId) return;
    
    setDeleting(true);
    try {
      const success = await deleteMessage(selectedMessageId, deleteForBoth);
      if (success) {
        setMessages(prev => prev.filter(m => m.id !== selectedMessageId));
        setDecryptedMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(selectedMessageId);
          return newMap;
        });
        setShowDeleteModal(false);
        setSelectedMessageId(null);
        setDeleteForBoth(false);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedMessageId(null);
    setDeleteForBoth(false);
  };

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="w-5 h-5 text-green-400" />        <div>            <h2 className="font-semibold text-white">Secure Conversation</h2>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <FaShieldAlt className="w-3 h-3" />
              End-to-end encrypted with AES-256-GCM
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <FaLock className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start your secure conversation</h3>
            <p className="text-slate-400">Messages are end-to-end encrypted and cannot be read by anyone else.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === address;            const decryptedContent = decryptedMessages.get(message.id) || 'Decrypting...';
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md group relative ${isOwn ? 'order-2' : 'order-1'}`}>
                  {/* Avatar for received messages */}
                  {!isOwn && (
                    <div className="flex items-end gap-2">
                      {message.senderAvatar ? (
                        <img
                          src={message.senderAvatar}
                          alt={message.senderName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {message.senderName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className={`p-3 rounded-2xl ${
                          isOwn 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-slate-800 text-white rounded-bl-md'
                        }`}>
                          <p className="text-sm leading-relaxed break-words">
                            {decryptedContent}
                          </p>                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70 mr-4">
                              {formatTimestamp(message.timestamp)}
                            </span>
                            <FaLock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Own messages */}
                  {isOwn && (
                    <div className={`p-3 rounded-2xl bg-blue-600 text-white rounded-br-md relative`}>
                      <p className="text-sm leading-relaxed break-words">
                        {decryptedContent}
                      </p>                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-70 mr-4">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <FaLock className="w-3 h-3 opacity-50" />
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity duration-200 p-1"
                            title="Delete message"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a secure message..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={sending}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <FaLock className="w-4 h-4 text-green-400" title="End-to-end encrypted" />
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-full transition-colors duration-200 disabled:cursor-not-allowed flex-shrink-0"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FaPaperPlane className="w-5 h-5" />
            )}
          </button>
        </div>        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          <FaShieldAlt className="w-3 h-3" />
          Messages are end-to-end encrypted with military-grade AES-256-GCM • Zero-knowledge architecture
        </p>
      </div>

      {/* Delete Message Modal */}
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
                  <h3 className="text-lg font-bold text-white">Delete Message</h3>
                  <p className="text-sm text-slate-400">Choose deletion option</p>
                </div>
              </div>
              <button
                onClick={cancelDelete}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                disabled={deleting}
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-slate-300 mb-4">
                Are you sure you want to delete this message? Choose who should see the deletion:
              </p>

              {/* Delete options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={!deleteForBoth}
                    onChange={() => setDeleteForBoth(false)}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500"
                    disabled={deleting}
                  />
                  <div>
                    <div className="text-white font-medium">Delete for me only</div>
                    <div className="text-sm text-slate-400">The message will only be removed from your chat</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteForBoth}
                    onChange={() => setDeleteForBoth(true)}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500"
                    disabled={deleting}
                  />
                  <div>
                    <div className="text-white font-medium">Delete for everyone</div>
                    <div className="text-sm text-slate-400">The message will be removed from both sides of the conversation</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-semibold rounded-xl border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
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
