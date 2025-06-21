"use client"
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { db, storage } from "../../../firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "@firebase/firestore";
import { getDownloadURL, ref, uploadString } from "@firebase/storage";
import { useWallet } from '../contexts/WalletContext';
import { PostData, addComment } from '../services/postService';
import { 
  MentionUser, 
  getCursorMentionContext, 
  insertMention, 
  sendMentionNotifications 
} from '../services/mentionService';
import MentionAutocomplete from './MentionAutocomplete';
import * as OblivionContract from "../../../packages/oblivion/src";

interface InputProps {
  onNewPost?: (newPost: PostData) => void;
  onRefreshFeed?: () => void;
}

function Input({ onNewPost, onRefreshFeed }: InputProps) {
  const { user, address, kit, contract, signTxForOblivion, walletType } = useWallet(); const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | null>(null);
  const [tweetText, setTweetText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [storageType, setStorageType] = useState<'database' | 'oblivion'>('database');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  // Mention system states
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const [mentionContext, setMentionContext] = useState<{
    isInMention: boolean;
    mentionStart: number;
    mentionText: string;
  } | null>(null);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Handle mention detection and autocomplete
  const handleTextChange = (newText: string) => {
    setTweetText(newText);
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Check for mention context
    const context = getCursorMentionContext(newText, cursorPos);
    
    if (context && context.isInMention) {
      setMentionContext(context);
      setMentionSearchTerm(context.mentionText);
      
      // Calculate position for autocomplete dropdown
      const rect = textarea.getBoundingClientRect();
      const lineHeight = 24; // Approximate line height
      const lines = newText.substring(0, context.mentionStart).split('\n').length;
      
      setMentionPosition({
        x: rect.left,
        y: rect.top + (lines * lineHeight) + 30
      });
      
      setShowMentionAutocomplete(true);
    } else {
      setShowMentionAutocomplete(false);
      setMentionContext(null);
      setMentionSearchTerm('');
    }
  };

  // Handle mention user selection
  const handleMentionSelect = (user: MentionUser) => {
    if (!mentionContext || !textareaRef.current) return;

    const { newText, newCursorPosition } = insertMention(
      tweetText,
      mentionContext.mentionStart,
      mentionContext.mentionText.length,
      user.username
    );

    setTweetText(newText);
    setShowMentionAutocomplete(false);
    setMentionContext(null);
    setMentionSearchTerm('');

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        setCursorPosition(newCursorPosition);
      }
    }, 0);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clear any previous upload errors
      setUploadError(null);

      // Check file size limits
      const maxVideoSize = 512 * 1024 * 1024; // 512 MB in bytes
      const maxImageSize = 10 * 1024 * 1024; // 10 MB for images

      if (file.type.startsWith('video/') && file.size > maxVideoSize) {
        setUploadError('Video files must be under 512 MB');
        return;
      }

      if (file.type.startsWith('image/') && file.size > maxImageSize) {
        setUploadError('Image files must be under 10 MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedMedia(e.target?.result as string);

        // Dosya tipini belirle
        if (file.type.startsWith('image/')) {
          if (file.type === 'image/gif') {
            setMediaType('gif');
          } else {
            setMediaType('image');
          }
        } else if (file.type.startsWith('video/')) {
          setMediaType('video');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedMedia(null);
    setMediaType(null);
    setUploadError(null);
  };

  const handleEmojiSelect = (emojiObject: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    console.log('Emoji object received:', emojiObject); // Debug için

    // emoji-picker-react kütüphanesinde emoji emoji property'sinde geliyor
    const emoji = emojiObject.emoji;

    if (!emoji) {
      console.error('No emoji found in object:', emojiObject);
      return;
    }

    // Get current cursor position from the textarea directly
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    // Get text before and after cursor
    const textBefore = tweetText.substring(0, start);
    const textAfter = tweetText.substring(end);

    // Create new text with emoji inserted
    const newText = textBefore + emoji + textAfter;

    console.log('New text will be:', newText); // Debug için

    setTweetText(newText);
    setShowEmojiPicker(false);

    // Focus textarea and set cursor position after emoji
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
    if (isPosting) return; // Prevent multiple submissions

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

          if (!signTxForOblivion) {
            setUploadError('Wallet signing function not available. Please refresh and try again.');
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
            
            const signedResult = await signTxForOblivion(transaction.toXDR());
            
            // For passkey wallets, transaction is already submitted via Launchtube
            if (walletType === 'passkey') {
              if (signedResult.submissionResult && signedResult.submissionResult.success) {
                console.log('✅ Post successfully created via Launchtube');
                console.log('Transaction hash:', signedResult.submissionResult.transactionHash);
              } else {
                throw new Error('Transaction submission failed');
              }
            } else {
              // For stellar wallets, continue with normal flow
              const result = await transaction.signAndSend({
                signTransaction: signTxForOblivion,
              });
              console.log('✅ Post successfully created on Stellar blockchain');
              console.log('Transaction result:', result);
            }
          } else {
            // Create post transaction on blockchain - following the working pattern
            const transaction = await contract.create_post({
              author: address,
              content: tweetText,
              image_url: imageUrl || ''
            });
            
            const signedResult = await signTxForOblivion(transaction.toXDR());
            
            // For passkey wallets, transaction is already submitted via Launchtube
            if (walletType === 'passkey') {
              if (signedResult.submissionResult && signedResult.submissionResult.success) {
                console.log('✅ Post successfully created via Launchtube');
                console.log('Transaction hash:', signedResult.submissionResult.transactionHash);
              } else {
                throw new Error('Transaction submission failed');
              }
            } else {
              // For stellar wallets, continue with normal flow
              const result = await transaction.signAndSend({
                signTransaction: signTxForOblivion,
              });
              console.log('✅ Post successfully created on Stellar blockchain');
              console.log('Transaction result:', result);
            }
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

      // Send mention notifications
      try {
        await sendMentionNotifications(
          tweetText,
          address || '',
          user?.username || 'anonymous',
          user?.name || 'Anonymous User',
          docRef.id,
          'post'
        );
      } catch (mentionError) {
        console.error('Error sending mention notifications:', mentionError);
        // Don't fail the post if mention notifications fail
      }

      // Create the new post object to pass to callback
      const newPost: PostData = {
        id: docRef.id,
        userId: address || '',
        username: user?.username || 'anonymous',
        userDisplayName: user?.name || 'Anonymous User',
        userImg: user?.avatar || '',
        text: tweetText,
        image: imageUrl || undefined,
        storageType: storageType,
        timestamp: {
          seconds: Math.floor(Date.now() / 1000),
          nanoseconds: 0
        },
        likeCount: 0,
        repostCount: 0,
      };

      // Reset form
      setTweetText('');
      setSelectedMedia(null);
      setMediaType(null);
      setUploadError(null);
      setShowEmojiPicker(false);
      setShowMentionAutocomplete(false);
      setMentionContext(null);
      setMentionSearchTerm('');
      setStorageType('database');

      // Call the callback to update the feed immediately
      if (onNewPost) {
        onNewPost(newPost);
      }
    } catch (error) {
      console.error('Error posting:', error);
      setUploadError('Failed to post. Please try again.');
      
      // Optionally refresh the entire feed if there was an error
      if (onRefreshFeed) {
        onRefreshFeed();
      }
    } finally {
      setIsPosting(false);
    }
  };
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6 relative">      {/* Loading Overlay */}
      {isPosting && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-50">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-sm font-medium">Posting...</p>
            <p className="text-slate-400 text-xs mt-1">
              {selectedMedia ? 'Uploading media and creating post' : 'Creating your post'}
            </p>
          </div>
        </div>
      )}
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full flex-shrink-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Your Avatar"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {user?.name ?
                user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : 'YU'
              }
            </div>
          )}
        </div>

        <div className="flex-1">          <textarea
            ref={textareaRef}
            placeholder="What's happening?"
            value={tweetText}
            onChange={(e) => {
              handleTextChange(e.target.value);
            }}
            onSelect={(e) => {
              const textarea = e.target as HTMLTextAreaElement;
              setCursorPosition(textarea.selectionStart || 0);
            }}
            onClick={(e) => {
              const textarea = e.target as HTMLTextAreaElement;
              setCursorPosition(textarea.selectionStart || 0);
            }}
            onKeyUp={(e) => {
              const textarea = e.target as HTMLTextAreaElement;
              setCursorPosition(textarea.selectionStart || 0);
            }}
            className="w-full bg-transparent text-white placeholder-slate-400 text-lg resize-none outline-none min-h-[120px] leading-relaxed"
            rows={3}
            disabled={isPosting}
            maxLength={400}
          />

          {/* Media Preview */}
          {selectedMedia && (
            <div className="mt-4 relative">
              {mediaType === 'image' && (
                <img
                  src={selectedMedia}
                  alt="Selected image"
                  className="rounded-2xl max-w-full h-auto max-h-96 object-cover border border-slate-700/50"
                />
              )}
              {mediaType === 'gif' && (
                <img
                  src={selectedMedia}
                  alt="Selected GIF"
                  className="rounded-2xl max-w-full h-auto max-h-96 object-cover border border-slate-700/50"
                />
              )}
              {mediaType === 'video' && (
                <video
                  src={selectedMedia}
                  controls
                  className="rounded-2xl max-w-full h-auto max-h-96 object-cover border border-slate-700/50"
                />
              )}
              <button
                onClick={removeSelectedImage}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Upload Error Message */}
          {uploadError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{uploadError}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">            <div className="flex items-center gap-4 text-blue-400">
            {/* Media Upload */}
            <label className={`p-2 rounded-full transition-colors duration-200 ${isPosting
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-500/10 cursor-pointer'
              }`} title="Add photo, video or GIF">
              <input
                type="file"
                accept="image/*,video/*,.gif"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isPosting}
              />
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </label>

            {/* Emoji Picker */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                onClick={() => !isPosting && setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors duration-200 ${isPosting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-500/10'
                  }`}
                title="Add emoji"
                disabled={isPosting}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Emoji Picker Modal */}              {/* Emoji Picker */}
              {showEmojiPicker && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div className="relative" ref={emojiPickerRef}>
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
                </div>,
                document.body
              )}            </div>          </div>

            <div className="flex items-center justify-between gap-4">
              {/* Storage Type Toggle */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium transition-colors duration-200 ${storageType === 'database' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
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
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${storageType === 'oblivion' ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                  />
                </button>
                <span className={`text-sm font-medium transition-colors duration-200 ${storageType === 'oblivion' ? 'text-purple-400' : 'text-slate-400'
                  }`}>                  Oblivion
                </span>
              </div>

              {/* Character Count */}
              {tweetText && (
                <span className={`text-sm ${400 - tweetText.length < 0 ? 'text-red-400' : 400 - tweetText.length < 20 ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {400 - tweetText.length}
                </span>
              )}

              <button
                onClick={handlePost}
                disabled={(!tweetText.trim() && !selectedMedia) || isPosting}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-lg flex items-center gap-2 ${(tweetText.trim() || selectedMedia) && !isPosting
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

      {/* Mention Autocomplete */}
      {showMentionAutocomplete && mentionSearchTerm !== undefined && (
        <MentionAutocomplete
          searchTerm={mentionSearchTerm}
          onSelectUser={handleMentionSelect}
          onClose={() => setShowMentionAutocomplete(false)}
          currentUserId={address || undefined}
          position={mentionPosition}
        />
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEmojiPicker(false)} />
          <div ref={emojiPickerRef} className="relative z-10">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={Theme.DARK}
              width={350}
              height={400}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Input;