'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPostById, getCommentsByPostId, addComment, deleteComment, PostData, CommentData, togglePostLike, checkUserLikedPost, getPostLikes } from '../../services/postService';
import { getUserByWallet } from '../../services/userService';
import { createNotification } from '../../services/notificationService';
import { generateLucyResponse, isLucyMention } from '../../services/aiService';
import { 
  MentionUser, 
  getCursorMentionContext, 
  insertMention, 
  sendMentionNotifications 
} from '../../services/mentionService';
import { useWallet } from '../../contexts/WalletContext';
import Sidebar from '../../components/sidebar';
import UserLink from '../../components/UserLink';
import MentionAutocomplete from '../../components/MentionAutocomplete';
import MentionText from '../../components/MentionText';
import Image from 'next/image';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { FaHeart, FaComment, FaShare, FaArrowLeft, FaImage, FaTimes, FaTrash, FaSmile } from 'react-icons/fa';
import { storage } from '../../../../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useWallet();
  const postId = params.postId as string;
    const [post, setPost] = useState<PostData | null>(null);  
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [postAuthorAvatar, setPostAuthorAvatar] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | null>(null);  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);  const [imageModal, setImageModal] = useState<{ src: string; alt: string } | null>(null);
  const [deletingComments, setDeletingComments] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  // Mention system states
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const [mentionContext, setMentionContext] = useState<{
    isInMention: boolean;
    mentionStart: number;
    mentionText: string;
  } | null>(null);

  // Mention handling functions
  const handleCommentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setNewComment(text);
    
    if (!textareaRef.current) return;
    
    const context = getCursorMentionContext(text, cursorPosition);
    setMentionContext(context);
    
    if (context?.isInMention) {
      setMentionSearchTerm(context.mentionText);
      setShowMentionAutocomplete(true);
      
      // Calculate position for autocomplete
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();
      const textBeforeCursor = text.substring(0, cursorPosition);
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineText = lines[currentLineIndex];
      
      // Estimate position (this is approximate)
      const lineHeight = 24;
      const charWidth = 8;
      const x = rect.left + (currentLineText.length * charWidth);
      const y = rect.top + (currentLineIndex * lineHeight) - textarea.scrollTop;
      
      setMentionPosition({ x, y });
    } else {
      setShowMentionAutocomplete(false);
      setMentionSearchTerm('');
    }
  };

  const handleMentionSelect = (user: MentionUser) => {
    if (!textareaRef.current || !mentionContext) return;
    
    const { newText, newCursorPosition } = insertMention(
      newComment, 
      mentionContext.mentionStart, 
      mentionContext.mentionText.length, 
      user.username
    );
    
    setNewComment(newText);
    setShowMentionAutocomplete(false);
    setMentionContext(null);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  useEffect(() => {
    const loadPostAndComments = async () => {
      try {
        setLoading(true);
        const [postData, commentsData] = await Promise.all([
          getPostById(postId),
          getCommentsByPostId(postId)
        ]);
        
        setPost(postData);
        setComments(commentsData);
      } catch (error) {
        console.error('Error loading post and comments:', error);
      } finally {
        setLoading(false);
      }
    };    if (postId) {
      loadPostAndComments();
    }
  }, [postId]);

  // Fetch post author's current avatar
  useEffect(() => {
    const fetchPostAuthorAvatar = async () => {
      if (post?.userId) {
        try {
          const userData = await getUserByWallet(post.userId);
          setPostAuthorAvatar(userData?.avatar || null);
        } catch (error) {
          console.error('Error fetching post author avatar:', error);
          setPostAuthorAvatar(null);
        }
      }
    };    fetchPostAuthorAvatar();
  }, [post?.userId]);  // Handle ESC key for modal close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmDelete) {
          cancelDelete();
        } else if (imageModal) {
          closeImageModal();
        }
      }
    };

    if (imageModal || confirmDelete) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [imageModal, confirmDelete]);

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

  // Fetch like state and count
  useEffect(() => {
    const fetchLikeState = async () => {
      if (user && postId) {
        const [liked, count] = await Promise.all([
          checkUserLikedPost(postId, user.walletAddress),
          getPostLikes(postId)
        ]);
        setIsLiked(liked);
        setLikeCount(count);
      }
    };
    fetchLikeState();
  }, [user, postId]);

  // Like button handler
  const handleLike = async () => {
    if (!user || !post) return;
    setIsLiking(true);
    try {
      const result = await togglePostLike(post.id, user.walletAddress);
      setIsLiked(result.isLiked);
      setLikeCount(result.likeCount);
      // Send notification if liked and not own post
      if (result.isLiked && user.walletAddress !== post.userId) {
        await createNotification({
          type: 'like',
          fromUserId: user.walletAddress,
          fromUserName: user.username || 'anonymous',
          fromUserDisplayName: user.name || 'Anonymous User',
          toUserId: post.userId,
          postId: post.id
        });
      }
    } catch (error) {
      // Optionally show error
    } finally {
      setIsLiking(false);
    }
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadError(null);

      // File size limits
      const maxVideoSize = 50 * 1024 * 1024; // 50 MB for videos
      const maxImageSize = 10 * 1024 * 1024; // 10 MB for images

      if (file.type.startsWith('video/') && file.size > maxVideoSize) {
        setUploadError('Video files must be under 50 MB');
        return;
      }

      if (file.type.startsWith('image/') && file.size > maxImageSize) {
        setUploadError('Image files must be under 10 MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedMedia(e.target?.result as string);

        // Determine file type
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
  };  const removeSelectedMedia = () => {
    setSelectedMedia(null);
    setMediaType(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emojiObject: any) => {
    const emoji = emojiObject.emoji;
    const textarea = textareaRef.current;
    
    if (!textarea) {
      setNewComment(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const textBefore = newComment.substring(0, start);
    const textAfter = newComment.substring(end);
    const newText = textBefore + emoji + textAfter;

    setNewComment(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = start + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const openImageModal = (src: string, alt: string) => {
    setImageModal({ src, alt });
  };
  const closeImageModal = () => {
    setImageModal(null);
  };
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    // Add to deleting state
    setDeletingComments(prev => new Set(prev).add(commentId));
    
    try {
      const success = await deleteComment(commentId);
      
      if (success) {
        // Remove comment from local state
        setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
        setConfirmDelete(null);
      } else {
        // Show error if deletion failed
        setUploadError('Failed to delete comment. Please try again.');
        setTimeout(() => setUploadError(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setUploadError('Failed to delete comment. Please try again.');
      setTimeout(() => setUploadError(null), 3000);
    } finally {
      // Remove from deleting state
      setDeletingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const confirmDeleteComment = (commentId: string) => {
    setConfirmDelete(commentId);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || (!newComment.trim() && !selectedMedia)) {
      return;
    }

    try {
      setSubmittingComment(true);
      
      let mediaUrl = '';
      
      // Upload media if selected
      if (selectedMedia) {
        const timestamp = Date.now();
        const mediaRef = ref(storage, `comments/${postId}/${user.walletAddress}-${timestamp}`);
        
        try {
          await uploadString(mediaRef, selectedMedia, 'data_url');
          mediaUrl = await getDownloadURL(mediaRef);
        } catch (uploadError) {
          console.error('Error uploading media:', uploadError);
          setUploadError('Failed to upload media. Please try again.');
          setSubmittingComment(false);
          return;
        }
      }

      console.log('=== COMMENT DEBUG ===');
      console.log('User object:', user);
      console.log('User avatar:', user.avatar);
      console.log('User avatar type:', typeof user.avatar);

      const commentData: any = {
        postId: postId,
        userId: user.walletAddress,
        username: user.username || 'anonymous',
        userDisplayName: user.name || 'Anonymous User',
        text: newComment.trim(),
        userImg: user.avatar || '', // Ensure userImg is always included
        ...(mediaUrl && { media: mediaUrl, mediaType: mediaType as 'image' | 'video' | 'gif' })
      };
      
      console.log('Comment data being sent to Firebase:', commentData);
      console.log('userImg value:', commentData.userImg);
      console.log('userImg type:', typeof commentData.userImg);
      
      const success = await addComment(commentData);
      
      if (success) {
        console.log('Comment added successfully');
        
        // Create notification for post owner (if not commenting on own post)
        if (user.walletAddress !== post?.userId) {
          try {
            await createNotification({
              type: 'comment',
              fromUserId: user.walletAddress,
              fromUserName: user.username || 'anonymous',
              fromUserDisplayName: user.name || 'Anonymous User',
              toUserId: post!.userId,
              postId: postId
            });
          } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        }
        
        // Send mention notifications
        if (user) {
          try {
            await sendMentionNotifications(
              newComment.trim(),
              user.walletAddress,
              user.username || 'anonymous',
              user.name || 'Anonymous User',
              postId,
              'comment'
            );
          } catch (mentionError) {
            console.error('Error sending mention notifications:', mentionError);
          }
        }
        
        // Check if @Lucy was mentioned and generate AI response
        if (isLucyMention(newComment.trim())) {
          try {
            const lucyResponse = await generateLucyResponse(
              post!.text,
              newComment.trim(),
              post!.username,
              user.username || 'anonymous'
            );

            if (lucyResponse.success && lucyResponse.content) {
              // Add Lucy's response as a comment
              const lucyCommentData = {
                postId: postId,
                userId: 'lucy-ai-assistant',
                username: 'lucy',
                userDisplayName: 'Lucy',
                text: `@${user.username || 'anonymous'} ${lucyResponse.content}`,
                userImg: '/lucy.jpeg',
              };

              await addComment(lucyCommentData);
            }
          } catch (aiError) {
            console.error('Error generating Lucy response:', aiError);
            // Don't fail the original comment if AI response fails
          }
        }
          
        // Reload comments to show both user comment and Lucy's response
        const updatedComments = await getCommentsByPostId(postId);
        console.log('Updated comments from Firebase:', updatedComments);
        console.log('First comment userImg:', updatedComments[0]?.userImg);
        setComments(updatedComments);
        setNewComment('');
        removeSelectedMedia();
        setShowEmojiPicker(false);
      } else {
        console.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setUploadError('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    // Handle Firebase timestamp format
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };  if (loading) {
    return (
      <div className="bg-slate-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-purple-400">
            Loading post...
          </div>
        </div>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="bg-slate-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-xl font-semibold text-slate-200 mb-2">Post not found</div>
          <div className="text-slate-400">The post you're looking for doesn't exist or has been removed.</div>
        </div>
      </div>
    );
  }return (
    <div className="bg-slate-900 min-h-screen"><main className="flex max-w-[1600px] mx-auto">
        <Sidebar />        <div className="flex-1 ml-20 lg:ml-72 max-w-3xl px-4 lg:px-6">            {/* Modern Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
              <div className="flex items-center mb-1">
                <button
                  onClick={() => router.back()}
                  className="mr-4 p-3 hover:bg-slate-700/50 rounded-xl transition-colors duration-200 group"
                >
                  <FaArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                </button>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Post Detail</h1>
              </div>
              <p className="text-slate-300 text-base font-medium ml-16">View and engage with this post and its replies.</p>
            </div>{/* Modern Post Card */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mt-6">
              <div className="flex space-x-4">
                <div className="w-14 h-14 bg-slate-700 rounded-full flex-shrink-0 overflow-hidden">
                  {postAuthorAvatar ? (
                    <Image
                      src={postAuthorAvatar}
                      alt={post.username}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold bg-purple-600">
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <UserLink 
                      username={post.username}
                      displayName={post.userDisplayName || undefined}
                      walletAddress={post.userId}
                      className="font-semibold text-slate-100 hover:text-purple-400 transition-colors"
                    />
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-sm">{formatTimestamp(post.timestamp)}</span>
                  </div>
                  <MentionText 
                    text={post.text}
                    className="text-lg leading-relaxed text-slate-100 mb-4"
                  />                  {post.image && (
                    <div 
                      className="mb-4 rounded-xl overflow-hidden border border-slate-600/30 cursor-pointer hover:border-slate-500/50 transition-colors duration-200"
                      onClick={() => openImageModal(post.image!, 'Post image')}
                    >
                      <Image
                        src={post.image}
                        alt="Post image"
                        width={600}
                        height={400}
                        className="w-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between max-w-md">                    <button className="flex items-center space-x-2 text-slate-400 hover:text-blue-400 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-500/10">
                      <FaComment className="w-5 h-5" />
                      <span className="font-medium">{comments.length}</span>
                    </button>
                    <button
                      className={`flex items-center space-x-2 transition-colors duration-200 p-2 rounded-lg hover:bg-red-500/10 ${isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-red-400'}`}
                      onClick={handleLike}
                      disabled={isLiking}
                      title={isLiked ? 'Unlike' : 'Like'}
                      type="button"
                    >
                      <FaHeart className={`w-5 h-5 ${isLiked ? 'fill-current scale-110' : ''}`} />
                      <span className="font-medium">{likeCount}</span>
                      {isLiking && <span className="ml-2 w-3 h-3 border-2 border-pink-400/30 border-t-pink-500 rounded-full animate-spin"></span>}
                    </button>
                    <button className="flex items-center space-x-2 text-slate-400 hover:text-green-400 transition-colors duration-200 p-2 rounded-lg hover:bg-green-500/10">
                      <FaShare className="w-5 h-5" />
                      <span className="font-medium">0</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>            {/* Modern Comment Form */}
            {user && (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6 mt-6">
                <form onSubmit={handleSubmitComment} className="flex space-x-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex-shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name || 'User'}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (                      <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold bg-purple-600">
                        {(user.name || 'A').charAt(0).toUpperCase()
                        }
                      </div>
                    )}
                  </div>                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={newComment}
                      onChange={handleCommentTextChange}
                      placeholder="Share your thoughts..."
                      className="w-full bg-transparent text-lg placeholder-slate-400 border-none outline-none resize-none text-slate-100 leading-relaxed"
                      rows={3}
                      maxLength={400}
                    />
                    
                    {/* Mention Autocomplete */}
                    {showMentionAutocomplete && (
                      <MentionAutocomplete
                        searchTerm={mentionSearchTerm}
                        onSelectUser={handleMentionSelect}
                        onClose={() => setShowMentionAutocomplete(false)}
                        currentUserId={user?.walletAddress}
                        position={mentionPosition}
                      />
                    )}
                      {/* Media Preview */}
                    {selectedMedia && (
                      <div className="mt-4 relative">
                        <div className="relative rounded-xl overflow-hidden border border-slate-600/30 max-w-md">
                          {mediaType === 'image' || mediaType === 'gif' ? (
                            <div 
                              className="cursor-pointer"
                              onClick={() => openImageModal(selectedMedia, 'Selected media')}
                            >
                              <Image
                                src={selectedMedia}
                                alt="Selected media"
                                width={400}
                                height={300}
                                className="w-full max-h-60 object-cover hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          ) : (
                            <video
                              src={selectedMedia}
                              controls
                              className="w-full max-h-60"
                            />
                          )}
                          <button
                            onClick={removeSelectedMedia}
                            className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-full hover:bg-slate-800/80 transition-colors duration-200 text-white z-10"
                            type="button"
                          >
                            <FaTimes className="text-sm" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Upload Error */}
                    {uploadError && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-red-400 text-sm">{uploadError}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">                      <div className="flex items-center space-x-3 relative">
                        {/* Media Upload Button */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleMediaSelect}
                          className="hidden"
                          id="comment-media-upload"
                        />
                        <label
                          htmlFor="comment-media-upload"
                          className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors duration-200 cursor-pointer"
                          title="Add media"
                        >
                          <FaImage className="text-lg" />
                        </label>

                        {/* Emoji Picker Button */}
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 rounded-lg hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                          title="Add emoji"
                        >
                          <FaSmile className="text-lg" />
                        </button>

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                          <div className="absolute z-[10000] bottom-full mb-2 left-0">
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
                        
                        <span className="text-sm text-slate-500">
                          {newComment.length}/400
                        </span>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={(!newComment.trim() && !selectedMedia) || submittingComment}
                        className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors duration-200"
                      >
                        {submittingComment ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>            )}

            {/* Modern Comments Section */}
            <div className="pl-2 pr-4 mt-8">{comments.length > 0 ? (
                <div className="space-y-6">
                  {comments.map((comment) => (                    <div 
                      key={comment.id} 
                      className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 hover:bg-slate-800/30 transition-colors duration-200"
                    >
                      <div className="flex space-x-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex-shrink-0 overflow-hidden">
                          {comment.userImg ? (
                            <Image
                              src={comment.userImg}
                              alt={comment.username}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold bg-purple-600">
                              {comment.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <UserLink 
                                username={comment.username}
                                displayName={comment.userDisplayName || undefined}
                                walletAddress={comment.userId}
                                className="font-semibold text-sm text-slate-200 hover:text-purple-400 transition-colors"
                              />
                              <span className="text-slate-500 text-sm">•</span>
                              <span className="text-slate-400 text-sm">{formatTimestamp(comment.timestamp)}</span>
                            </div>
                              {/* Delete button for own comments */}
                            {user && comment.userId === user.walletAddress && (
                              <button
                                onClick={() => confirmDeleteComment(comment.id)}
                                disabled={deletingComments.has(comment.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete comment"
                              >
                                {deletingComments.has(comment.id) ? (
                                  <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                                ) : (
                                  <FaTrash className="text-xs" />
                                )}
                              </button>
                            )}
                          </div>
                          
                          {comment.text && (
                            <MentionText 
                              text={comment.text}
                              className="text-slate-100 leading-relaxed text-sm mb-2"
                            />
                          )}
                            {/* Comment Media */}
                          {comment.media && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-slate-600/30 max-w-sm">
                              {comment.mediaType === 'image' || comment.mediaType === 'gif' ? (
                                <div 
                                  className="cursor-pointer hover:border-slate-500/50 transition-colors duration-200"
                                  onClick={() => openImageModal(comment.media!, 'Comment media')}
                                >
                                  <Image
                                    src={comment.media}
                                    alt="Comment media"
                                    width={300}
                                    height={200}
                                    className="w-full max-h-48 object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                              ) : comment.mediaType === 'video' ? (
                                <video
                                  src={comment.media}
                                  controls
                                  className="w-full max-h-48"
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (                <div className="p-12 text-center">
                  <div className="bg-slate-800/20 rounded-2xl p-8 border border-slate-700/30">
                    <FaComment className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400 text-lg">No replies yet</p>
                    <p className="text-slate-500 text-sm mt-2">Be the first to share your thoughts!</p>
                  </div>
                </div>
              )}
            </div>
        </div>      </main>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={cancelDelete}
        >
          <div 
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Delete Comment</h3>
            <p className="text-slate-300 mb-6">Are you sure you want to delete this comment? This action cannot be undone.</p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteComment(confirmDelete)}
                disabled={deletingComments.has(confirmDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingComments.has(confirmDelete) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 rounded-full hover:bg-slate-800/80 transition-colors duration-200 text-white z-10"
            >
              <FaTimes className="text-lg" />
            </button>
            <Image
              src={imageModal.src}
              alt={imageModal.alt}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}