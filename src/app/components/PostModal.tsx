"use client"
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { db, storage } from "../../../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "@firebase/firestore";
import { getDownloadURL, ref, uploadString } from "@firebase/storage";
import { useWallet } from '../contexts/WalletContext';
import { usePostModal } from '../contexts/PostModalContext';
import { addComment } from '../services/postService';
import { FaTimes, FaImage, FaSmile } from 'react-icons/fa';
import * as OblivionContract from "../../../packages/oblivion/src";

function PostModal() {
  const { user, address, kit, contract, signTxForOblivion } = useWallet();
  const { isPostModalOpen, closePostModal, onPostComplete } = usePostModal();
  
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | null>(null);
  const [tweetText, setTweetText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [storageType, setStorageType] = useState<'database' | 'oblivion'>('database');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isPostModalOpen) {
      setTweetText('');
      setSelectedMedia(null);
      setMediaType(null);
      setUploadError(null);
      setShowEmojiPicker(false);
      setIsPosting(false);
      
      // Focus on textarea when modal opens
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isPostModalOpen]);
  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPostModalOpen) {
        closePostModal();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closePostModal();
      }
    };

    if (isPostModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isPostModalOpen, closePostModal]);

  // Click outside handler for emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadError(null);

      // File size limits
      const maxSizeImage = 5 * 1024 * 1024; // 5MB
      const maxSizeVideo = 10 * 1024 * 1024; // 10MB

      if (file.type.startsWith('image/')) {
        if (file.size > maxSizeImage) {
          setUploadError('Image size must be less than 5MB');
          return;
        }
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        if (file.size > maxSizeVideo) {
          setUploadError('Video size must be less than 10MB');
          return;
        }
        setMediaType('video');
      } else {
        setUploadError('Please select a valid image or video file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedMedia(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    setMediaType(null);
    setUploadError(null);
  };

  const handleEmojiSelect = (emojiObject: any) => {
    const emoji = emojiObject.emoji;
    const textarea = textareaRef.current;
    
    if (!textarea) {
      setTweetText(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const textBefore = tweetText.substring(0, start);
    const textAfter = tweetText.substring(end);
    const newText = textBefore + emoji + textAfter;

    setTweetText(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = start + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 100);
  };
  
  const handlePost = async () => {
    if (isPosting) return;

    setIsPosting(true);
    setUploadError(null);

    try {
      let imageUrl = '';
      
      // If there's media, upload it first
      if (selectedMedia) {
        const timestamp = Date.now();
        const imageRef = ref(storage, `posts/${timestamp}_${Math.random()}/image`);
        await uploadString(imageRef, selectedMedia, "data_url");
        imageUrl = await getDownloadURL(imageRef);
      }

      // If storage type is "oblivion", post to blockchain first
      if (storageType === 'oblivion') {
        try {
          console.log('Posting to Stellar blockchain...');
          console.log('User address:', address);
          console.log('Contract instance:', contract);
          console.log('Contract publicKey:', contract?.options?.publicKey);
          
          // Check if address and contract are available
          if (!address) {
            setUploadError('Please connect your wallet to post to blockchain.');
            return;
          }

          if (!contract || !kit) {
            setUploadError('Blockchain integration not ready. Please refresh and try again.');
            return;
          }

          // If contract's publicKey is not the same as address, re-instantiate contract
          if (contract.options?.publicKey !== address) {
            console.warn('Contract publicKey does not match wallet address, re-initializing contract...');
            const newContract = new OblivionContract.Client({
              ...OblivionContract.networks.testnet,
              rpcUrl: "https://soroban-testnet.stellar.org:443",
              allowHttp: true,
              publicKey: address,
            });
            // Use the new contract instance for this transaction
            const transaction = await newContract.create_post({
              author: address,
              content: tweetText,
              image_url: imageUrl || ''
            });
            const result = await transaction.signAndSend({
              signTransaction: signTxForOblivion,
            });
            console.log('✅ Post successfully created on Stellar blockchain');
            console.log('Transaction result:', result);
          } else {
            // Create post transaction on blockchain - following the working pattern
            const transaction = await contract.create_post({
              author: address,
              content: tweetText,
              image_url: imageUrl || ''
            });
            const result = await transaction.signAndSend({
              signTransaction: signTxForOblivion,
            });
            console.log('✅ Post successfully created on Stellar blockchain');
            console.log('Transaction result:', result);
          }
        } catch (blockchainError) {
          console.error('❌ Blockchain posting failed:', blockchainError);
          setUploadError(`Failed to post to blockchain: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`);
          return;
        }
      }

      // After successful blockchain posting (or if using database storage), 
      // save to Firebase database
      const docRef = await addDoc(collection(db, "posts"), {
        userId: address,
        username: user?.username || 'anonymous',
        userDisplayName: user?.name || 'Anonymous User',
        text: tweetText,
        storageType: storageType,
        timestamp: serverTimestamp(),
        ...(imageUrl && { image: imageUrl })
      });

      console.log('✅ Post saved to database with ID:', docRef.id);

      // Reset form and close modal
      setTweetText('');
      setSelectedMedia(null);
      setMediaType(null);
      setUploadError(null);
      closePostModal();
      
      // Call the post completion callback to refresh feed
      if (onPostComplete) {
        onPostComplete();
      }
    } catch (error) {
      console.error("Error posting:", error);
      setUploadError('Failed to post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (!isPostModalOpen) return null;
  const characterCount = tweetText.length;
  const maxCharacters = 400;
  const remainingCharacters = maxCharacters - characterCount;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Create Post</h2>          <button
            onClick={closePostModal}
            className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="flex gap-4 mb-4">
            <div className="flex-shrink-0">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="User Avatar"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AU'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{user?.name || 'Anonymous User'}</p>
              <p className="text-slate-400 text-sm">@{user?.username || 'anonymous'}</p>
            </div>
          </div>

          {/* Text Area */}
          <div className="mb-4">
            <textarea
              ref={textareaRef}
              value={tweetText}
              onChange={(e) => {
                setTweetText(e.target.value);
                setCursorPosition(e.target.selectionStart || 0);
              }}
              onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
              placeholder="What's happening?"
              className="w-full h-32 bg-transparent text-white text-xl placeholder-slate-400 resize-none focus:outline-none"
              maxLength={maxCharacters}
            />
          </div>

          {/* Character Count */}
          {tweetText && (
            <div className="mb-4">
              <div className="flex justify-end">
                <span className={`text-sm ${remainingCharacters < 0 ? 'text-red-400' : remainingCharacters < 20 ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {remainingCharacters}
                </span>
              </div>
            </div>
          )}

          {/* Media Preview */}
          {selectedMedia && (
            <div className="mb-4 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/50">
                {mediaType === 'image' ? (
                  <img 
                    src={selectedMedia} 
                    alt="Selected media" 
                    className="w-full max-h-96 object-cover"
                  />
                ) : (
                  <video 
                    src={selectedMedia} 
                    controls 
                    className="w-full max-h-96"
                  />
                )}
                <button
                  onClick={removeMedia}
                  className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors duration-200 text-white"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{uploadError}</p>
            </div>
          )}

          {/* Bottom Section */}
          <div className="flex items-center justify-between">
            {/* Media Actions */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageSelect}
                className="hidden"
                id="media-upload"
              />
              <label
                htmlFor="media-upload"
                className="p-2 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors duration-200 cursor-pointer"
                title="Add media"
              >
                <FaImage className="text-lg" />
              </label>

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-full hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                title="Add emoji"
              >
                <FaSmile className="text-lg" />
              </button>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute z-[10000] mt-2" style={{ transform: 'translateY(100%)' }}>
                  <div ref={emojiPickerRef}>
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      width={320}
                      height={400}
                      theme={Theme.DARK}
                      searchDisabled={false}
                      skinTonesDisabled={false}
                      previewConfig={{
                        showPreview: false
                      }}
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid rgba(71, 85, 105, 0.5)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Storage Type Toggle */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium transition-colors duration-200 ${storageType === 'database' ? 'text-blue-400' : 'text-slate-400'}`}>
                  Database
                </span>

                <button
                  onClick={() => setStorageType(storageType === 'database' ? 'oblivion' : 'database')}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${storageType === 'oblivion'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                      : 'bg-slate-600'
                    }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${storageType === 'oblivion' ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>

                <span className={`text-sm font-medium transition-colors duration-200 ${storageType === 'oblivion' ? 'text-purple-400' : 'text-slate-400'}`}>
                  Oblivion
                </span>
              </div>

              {/* Post Button */}
              <button
                onClick={handlePost}
                disabled={(!tweetText.trim() && !selectedMedia) || isPosting || remainingCharacters < 0}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-lg flex items-center gap-2 ${(tweetText.trim() || selectedMedia) && !isPosting && remainingCharacters >= 0
                    ? storageType === 'oblivion' 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-purple-500/25'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-blue-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {isPosting && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                {isPosting 
                  ? storageType === 'oblivion' 
                    ? 'Posting to Blockchain...' 
                    : 'Posting...'
                  : storageType === 'oblivion'
                    ? 'Post to Oblivion'
                    : 'Post'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PostModal;
