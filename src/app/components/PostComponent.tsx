"use client"
import { FaHeart, FaComment, FaShare, FaEllipsisH, FaTrash, FaImage, FaSmile, FaTimes, FaBookmark } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { storage } from "../../../firebase";
import { getDownloadURL, ref, uploadString } from "@firebase/storage";
import { PostData, formatPostDate, deletePost, addComment, getCommentsByPostId, CommentData, togglePostLike, checkUserLikedPost, getPostLikes, togglePostRepost, checkUserRepostedPost, getPostReposts } from '../services/postService';
import { getUserByWallet, toggleBookmark, checkUserBookmarked } from '../services/userService';
import { useWallet } from '../contexts/WalletContext';
import { createNotification } from '../services/notificationService';
import { generateLucyResponse, isLucyMention } from '../services/aiService';
import { 
  MentionUser, 
  getCursorMentionContext, 
  insertMention, 
  sendMentionNotifications 
} from '../services/mentionService';
import UserLink from './UserLink';
import MentionAutocomplete from './MentionAutocomplete';
import MentionText from './MentionText';

interface PostComponentProps {
  post: PostData;
  onPostDeleted?: (postId: string) => void;
  onBookmarkChanged?: (postId: string, isBookmarked: boolean) => void;
}

export default function PostComponent({ post, onPostDeleted, onBookmarkChanged }: PostComponentProps) {  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [isReposting, setIsReposting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  // Mention system states
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const [mentionContext, setMentionContext] = useState<{
    isInMention: boolean;
    mentionStart: number;
    mentionText: string;
  } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const commentModalRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useWallet();
  const router = useRouter();
    // Post sahibi mi kontrol et
  const isOwnPost = currentUser?.walletAddress === post.userId;
  
  // Orijinal post sahibi mi kontrol et (repost durumları için)
  const isOriginalPostOwner = post.isRepost && currentUser?.walletAddress === post.originalUserId;
  // Load comments for this post
  const loadComments = async () => {
    try {
      // For reposts, get comments from the original post; for regular posts, use the post itself
      const targetPostId = post.isRepost ? post.originalPostId! : post.id;
      const postComments = await getCommentsByPostId(targetPostId);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };
  useEffect(() => {
    setIsClient(true);
    setFormattedDate(formatPostDate(post.timestamp));
    // Load comments when component mounts
    loadComments();
  }, [post.timestamp, post.id, post.isRepost, post.originalPostId]);

  // Fetch current user avatar for the post author
  useEffect(() => {
    const fetchUserAvatar = async () => {
      try {
        const userData = await getUserByWallet(post.userId);
        setCurrentUserAvatar(userData?.avatar || null);
      } catch (error) {
        console.error('Error fetching user avatar:', error);
        setCurrentUserAvatar(null);
      }
    };

    if (post.userId) {
      fetchUserAvatar();
    }
  }, [post.userId]);  // Handle ESC key and outside click for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
        } else if (showDeleteModal) {
          setShowDeleteModal(false);
        } else if (showCommentModal) {
          setShowCommentModal(false);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Handle emoji picker click outside
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showDeleteModal || showCommentModal || showEmojiPicker) {
      document.addEventListener('keydown', handleEscape);
      if (showEmojiPicker) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showDeleteModal, showCommentModal, showEmojiPicker]);  // Fetch like state and count
  useEffect(() => {
    const fetchLikeState = async () => {
      if (currentUser && post.id) {
        // For reposts, check the original post; for regular posts, check the post itself
        const targetPostId = post.isRepost ? post.originalPostId! : post.id;
        const [liked, count] = await Promise.all([
          checkUserLikedPost(targetPostId, currentUser.walletAddress),
          getPostLikes(targetPostId)
        ]);
        setIsLiked(liked);
        setLikeCount(count);
      } else if (post.id) {
        // If no user logged in, just get the count
        const targetPostId = post.isRepost ? post.originalPostId! : post.id;
        const count = await getPostLikes(targetPostId);
        setLikeCount(count);
      }
    };
    fetchLikeState();
  }, [currentUser, post.id, post.isRepost, post.originalPostId]);  // Fetch repost state and count
  useEffect(() => {
    const fetchRepostState = async () => {
      if (currentUser && post.id) {
        // For reposts, check the original post; for regular posts, check the post itself
        const targetPostId = post.isRepost ? post.originalPostId! : post.id;
        const [reposted, count] = await Promise.all([
          checkUserRepostedPost(targetPostId, currentUser.walletAddress),
          getPostReposts(targetPostId)
        ]);
        setIsReposted(reposted);
        setRepostCount(count);
      } else if (post.id) {
        // If no user logged in, just get the count
        const targetPostId = post.isRepost ? post.originalPostId! : post.id;
        const count = await getPostReposts(targetPostId);
        setRepostCount(count);
      }
    };    fetchRepostState();
  }, [currentUser, post.id, post.isRepost, post.originalPostId]);
  // Fetch bookmark state
  useEffect(() => {
    const fetchBookmarkState = async () => {
      if (currentUser && post.id) {
        // For reposts, check the original post; for regular posts, check the post itself
        const targetPostId = post.isRepost ? post.originalPostId! : post.id;
        const bookmarked = await checkUserBookmarked(currentUser.walletAddress, targetPostId);
        setIsBookmarked(bookmarked);
      }
    };
    fetchBookmarkState();
  }, [currentUser, post.id, post.isRepost, post.originalPostId]);
  // Like button handler
  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser || !post) return;
    setIsLiking(true);
    try {
      // For reposts, like the original post; for regular posts, like the post itself
      const targetPostId = post.isRepost ? post.originalPostId! : post.id;
      const targetUserId = post.isRepost ? post.originalUserId! : post.userId;
      
      const result = await togglePostLike(targetPostId, currentUser.walletAddress);
      setIsLiked(result.isLiked);
      setLikeCount(result.likeCount);
      
      // Send notification if liked and not own post
      if (result.isLiked && currentUser.walletAddress !== targetUserId) {
        await createNotification({
          type: 'like',
          fromUserId: currentUser.walletAddress,
          fromUserName: currentUser.username || 'anonymous',
          fromUserDisplayName: currentUser.name || 'Anonymous User',
          toUserId: targetUserId,
          postId: targetPostId
        });
      }
    } catch (error) {
      // Optionally show error
    } finally {
      setIsLiking(false);
    }
  };// Repost button handler
  const handleRepost = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser || !post) return;
    setIsReposting(true);
    try {
      // For reposts, use the original post ID; for regular posts, use the post ID
      const targetPostId = post.isRepost ? post.originalPostId! : post.id;
      const targetUserId = post.isRepost ? post.originalUserId! : post.userId;
      
      const result = await togglePostRepost(targetPostId, currentUser.walletAddress);
      setIsReposted(result.isReposted);
      setRepostCount(result.repostCount);
      
      // Send notification if reposted and not own post
      if (result.isReposted && currentUser.walletAddress !== targetUserId) {
        try {
          await createNotification({
            type: 'repost',
            fromUserId: currentUser.walletAddress,
            fromUserName: currentUser.username || 'anonymous',
            fromUserDisplayName: currentUser.name || 'Anonymous User',
            toUserId: targetUserId,
            postId: targetPostId
          });
        } catch (notificationError) {
          console.error('Error creating repost notification:', notificationError);
          // Don't fail the repost if notification fails
        }
      }
    } catch (error) {
      // Optionally show error    } finally {
      setIsReposting(false);
    }
  };  // Bookmark button handler
  const handleBookmark = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser || !post) return;
    
    setIsBookmarking(true);
    try {
      // For reposts, bookmark the original post; for regular posts, bookmark the post itself
      const targetPostId = post.isRepost ? post.originalPostId! : post.id;
      
      const result = await toggleBookmark(currentUser.walletAddress, targetPostId);
      setIsBookmarked(result.isBookmarked);
      
      // Notify parent component about bookmark change
      if (onBookmarkChanged) {
        onBookmarkChanged(targetPostId, result.isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarking(false);
    }
  };const handleComment = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent post click when comment button is clicked
    }
    setShowCommentModal(true);
    // Reset comment modal state
    setCommentText('');
    setSelectedMedia(null);
    setMediaType(null);
    setUploadError(null);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      if (commentTextareaRef.current) {
        commentTextareaRef.current.focus();
      }
    }, 100);
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    const textarea = commentTextareaRef.current;
    
    if (!textarea) {
      setCommentText(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const textBefore = commentText.substring(0, start);
    const textAfter = commentText.substring(end);
    const newText = textBefore + emoji + textAfter;

    setCommentText(newText);
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

  // Handle mention detection and autocomplete for comments
  const handleCommentTextChange = (newText: string) => {
    setCommentText(newText);
    
    const textarea = commentTextareaRef.current;
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

  // Handle mention user selection for comments
  const handleMentionSelect = (user: MentionUser) => {
    if (!mentionContext || !commentTextareaRef.current) return;

    const { newText, newCursorPosition } = insertMention(
      commentText,
      mentionContext.mentionStart,
      mentionContext.mentionText.length,
      user.username
    );

    setCommentText(newText);
    setShowMentionAutocomplete(false);
    setMentionContext(null);
    setMentionSearchTerm('');

    // Focus and set cursor position
    setTimeout(() => {
      if (commentTextareaRef.current) {
        commentTextareaRef.current.focus();
        commentTextareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        setCursorPosition(newCursorPosition);
      }
    }, 0);
  };  const handleCommentSubmit = async () => {
    if ((!commentText.trim() && !selectedMedia) || isCommenting || !currentUser?.walletAddress) return;
    
    setIsCommenting(true);
    setUploadError(null);
    
    try {
      // For reposts, comment on the original post; for regular posts, comment on the post itself
      const targetPostId = post.isRepost ? post.originalPostId! : post.id;
      const targetUserId = post.isRepost ? post.originalUserId! : post.userId;

      console.log('Current user avatar:', currentUser.avatar);
      console.log('Current user data:', currentUser);

      // Build commentData - always include userImg field, even if empty
      const commentData: any = {
        postId: targetPostId,
        userId: currentUser.walletAddress,
        username: currentUser.username || 'anonymous',
        userDisplayName: currentUser.name || 'Anonymous User',
        text: commentText.trim(),
        userImg: currentUser.avatar || '',
      };
      
      if (mediaType) commentData.mediaType = mediaType;

      console.log('Comment data being sent:', commentData);

      // If there's media, upload it first
      if (selectedMedia && mediaType) {
        const mediaRef = ref(storage, `comments/${Date.now()}_${Math.random()}/media`);
        const snapshot = await uploadString(mediaRef, selectedMedia, "data_url");
        const downloadURL = await getDownloadURL(snapshot.ref);
        commentData.media = downloadURL;
      }

      const success = await addComment(commentData);
      
      if (success) {
        // Create notification for post owner (if not commenting on own post)
        if (currentUser.walletAddress !== targetUserId) {
          try {
            await createNotification({
              type: 'comment',
              fromUserId: currentUser.walletAddress,
              fromUserName: currentUser.username || 'anonymous',
              fromUserDisplayName: currentUser.name || 'Anonymous User',
              toUserId: targetUserId,
              postId: targetPostId
            });
          } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        }

        // Send mention notifications for any mentioned users
        try {
          await sendMentionNotifications(
            commentText.trim(),
            currentUser.walletAddress,
            currentUser.username || 'anonymous',
            currentUser.name || 'Anonymous User',
            targetPostId,
            'comment'
          );
        } catch (mentionError) {
          console.error('Error sending mention notifications:', mentionError);
          // Don't fail the comment if mention notifications fail
        }
        
        // Check if @Lucy was mentioned and generate AI response
        if (isLucyMention(commentText.trim())) {
          try {
            console.log('Generating Lucy response...');
            const lucyResponse = await generateLucyResponse(
              post.isRepost ? (post.originalText || '') : post.text,
              commentText.trim(),
              post.isRepost ? (post.originalUsername || 'user') : post.username,
              currentUser.username || 'anonymous'
            );

            if (lucyResponse.success && lucyResponse.content) {
              // Add Lucy's response as a comment
              const lucyCommentData = {
                postId: targetPostId,
                userId: 'lucy-ai-assistant',
                username: 'lucy',
                userDisplayName: 'Lucy',
                text: `@${currentUser.username || 'anonymous'} ${lucyResponse.content}`,
                userImg: '/lucy.jpeg',
              };

              console.log('Adding Lucy response comment:', lucyCommentData);
              await addComment(lucyCommentData);
            }
          } catch (aiError) {
            console.error('Error generating Lucy response:', aiError);
            // Don't fail the original comment if AI response fails
          }
        }
        
        // Reload comments to show both user comment and Lucy's response
        await loadComments();
        setCommentText('');
        setSelectedMedia(null);
        setMediaType(null);
        setUploadError(null);
        setShowEmojiPicker(false);
      } else {
        setUploadError('Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      setUploadError('Failed to add comment. Please try again.');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setShowDeleteModal(false);
    try {
      const success = await deletePost(post.id);
      if (success && onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.right - 120, // Adjust for tooltip width
        y: rect.top - 50
      });
      setShowTooltip(true);
    }
  };
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };
  const handlePostClick = (e: React.MouseEvent) => {
    // Don't navigate if user clicked on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
      return;
    }
    
    // For reposts, navigate to the original post; for regular posts, navigate to the post itself
    const targetPostId = post.isRepost ? post.originalPostId! : post.id;
    router.push(`/post/${targetPostId}`);
  };return (
    <article 
      className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-3xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group relative overflow-hidden cursor-pointer"
      onClick={handlePostClick}
    >
      {/* Gradient hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        {/* Repost Header - Show who reposted */}
      {post.isRepost && (
        <div className="flex items-center gap-2 mb-3 text-slate-400 text-sm relative z-10">
          <FaShare className="text-green-400" />
          <span>
            <UserLink
              username={post.username}
              displayName={post.userDisplayName}
              className="font-medium text-green-400"
            /> reposted
          </span>
        </div>
      )}
      
      <div className="flex gap-4 relative z-10">
        {/* User Avatar - Show original post author for reposts */}
        <div className="flex-shrink-0">
          <div className="relative group/avatar">            {(post.isRepost ? post.originalUserImg : currentUserAvatar) ? (
              <img 
                src={(post.isRepost ? post.originalUserImg : currentUserAvatar) || ''} 
                alt={post.isRepost ? (post.originalUserDisplayName || 'User') : post.userDisplayName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-700/50 group-hover/avatar:ring-blue-500/50 transition-all duration-300"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-slate-700/50 group-hover/avatar:ring-blue-500/50 transition-all duration-300">
                {(post.isRepost ? (post.originalUserDisplayName || 'User') : post.userDisplayName)?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300"></div>
          </div>
        </div>

        {/* Post Content */}
        <div className="flex-1 min-w-0">          {/* Header - Show original post author for reposts */}
          <div className="flex items-center justify-between mb-3">            <div className="flex items-center gap-3 min-w-0">
              <UserLink
                username={post.isRepost ? (post.originalUsername || 'user') : post.username}
                displayName={post.isRepost ? (post.originalUserDisplayName || 'User') : post.userDisplayName}
                className="font-bold text-white truncate hover:text-blue-400 transition-colors duration-200"
              />
              <UserLink
                username={post.isRepost ? (post.originalUsername || 'user') : post.username}
                className="text-slate-400 text-sm truncate hover:text-slate-300 transition-colors duration-200"
                showAt={true}
              />
              <span className="text-slate-600">·</span>
              <span className="text-slate-500 text-sm hover:text-slate-400 transition-colors duration-200" suppressHydrationWarning>
                {isClient ? (post.isRepost ? formatPostDate(post.originalTimestamp!) : formattedDate) : '...'}
              </span>
              {/* Oblivion Badge */}
              {post.storageType === 'oblivion' && (
                <div className="flex items-center gap-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-full px-2 py-1 ml-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-purple-300 tracking-wide">OBLIVION</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Oblivion Icon - Top Right */}
              {post.storageType === 'oblivion' && (
                <div 
                  ref={iconRef}
                  className="group/oblivion relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-purple-400/20 group-hover/oblivion:ring-purple-400/40 transition-all duration-300">
                    <span className="text-white text-xs font-bold">∅</span>
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Post Text - Show original post text for reposts */}
          <MentionText 
            text={post.isRepost ? (post.originalText || '') : post.text}
            className="text-slate-100 mb-4 leading-relaxed text-base"
          />

          {/* Post Image - Show original post image for reposts */}
          {(post.isRepost ? post.originalImage : post.image) && (
            <div className="mb-4 group/image">
              <img 
                src={(post.isRepost ? post.originalImage : post.image) || ''} 
                alt="Post content"
                className="w-full rounded-2xl border border-slate-700/50 max-h-96 object-cover group-hover/image:border-slate-600/50 transition-all duration-300 cursor-pointer"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between max-w-md">            {/* Comment */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleComment();
              }}
              className="flex items-center gap-2 text-slate-500 hover:text-blue-400 transition-colors duration-200 group/btn"
            >
              <div className="p-2 rounded-full group-hover/btn:bg-blue-500/10 transition-colors duration-200">
                <FaComment className="text-sm" />
              </div>
              <span className="text-sm font-medium">{comments.length}</span>
            </button>            {/* Like */}
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 transition-all duration-200 group/btn ${
                isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-400'
              }`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <div className="p-2 rounded-full group-hover/btn:bg-pink-500/10 transition-colors duration-200">
                <FaHeart className={`text-sm transition-transform duration-200 ${isLiked ? 'fill-current scale-110' : 'group-hover/btn:scale-110'}`} />
              </div>
              <span className="text-sm font-medium">{likeCount}</span>
              {isLiking && <span className="ml-2 w-3 h-3 border-2 border-pink-400/30 border-t-pink-500 rounded-full animate-spin"></span>}
            </button>            {/* Repost */}
            <button 
              onClick={handleRepost}
              disabled={isReposting}
              className={`flex items-center gap-2 transition-colors duration-200 group/btn disabled:opacity-50 ${
                isReposted ? 'text-green-500' : 'text-slate-500 hover:text-green-400'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors duration-200 ${
                isReposted 
                  ? 'bg-green-500/20' 
                  : 'group-hover/btn:bg-green-500/10'
              }`}>
                <FaShare className={`text-sm transition-transform duration-200 ${
                  isReposted ? 'fill-current scale-110' : 'group-hover/btn:scale-110'
                }`} />
              </div>
              <span className="text-sm font-medium">{repostCount}</span>
              {isReposting && <span className="ml-2 w-3 h-3 border-2 border-green-400/30 border-t-green-500 rounded-full animate-spin"></span>}            </button>

            {/* Bookmark/Delete */}
            {isOwnPost && post.storageType !== 'oblivion' ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors duration-200 group/btn disabled:opacity-50"
              >
                <div className="p-2 rounded-full group-hover/btn:bg-red-500/10 transition-colors duration-200">
                  <FaTrash className={`text-sm transition-transform duration-200 ${isDeleting ? 'animate-pulse' : 'group-hover/btn:scale-110'}`} />
                </div>
              </button>
            ) : (!isOriginalPostOwner ? (
              <button 
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`flex items-center gap-2 transition-colors duration-200 group/btn disabled:opacity-50 ${
                  isBookmarked ? 'text-yellow-500' : 'text-slate-500 hover:text-yellow-400'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <div className={`p-2 rounded-full transition-colors duration-200 ${
                  isBookmarked 
                    ? 'bg-yellow-500/20' 
                    : 'group-hover/btn:bg-yellow-500/10'
                }`}>
                  <FaBookmark className={`text-sm transition-transform duration-200 ${
                    isBookmarked ? 'fill-current scale-110' : 'group-hover/btn:scale-110'
                  }`} />
                </div>
                {isBookmarking && <span className="ml-2 w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-500 rounded-full animate-spin"></span>}
              </button>
            ) : null)}
          </div>
        </div>
      </div>

      {/* Tooltip Portal */}
      {showTooltip && isClient && createPortal(
        <div 
          className="fixed bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700 z-[9999] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          Stored on Oblivion
          {/* Arrow pointer */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
        </div>,
        document.body
      )}      {/* Comment Modal */}
      {showCommentModal && isClient && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          onClick={(e) => {
            // Only close if clicking on the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              setShowCommentModal(false);
            }
          }}
          onMouseDown={(e) => {
            // Prevent any mouse events from bubbling up
            e.stopPropagation();
          }}
        >
          <div 
            ref={commentModalRef}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl border border-slate-700/50 p-6 max-w-2xl w-full mx-4 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => {
              // Prevent clicks on modal content from bubbling up
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Prevent mouse events on modal content from bubbling up
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-2xl font-bold text-white">
                Reply to {post.userDisplayName}
              </h3>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>            {/* Original Post Preview */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50 flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {currentUserAvatar ? (
                    <img 
                      src={currentUserAvatar} 
                      alt={post.userDisplayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {post.userDisplayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                </div>                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <UserLink
                      username={post.isRepost ? (post.originalUsername || 'user') : post.username}
                      displayName={post.isRepost ? (post.originalUserDisplayName || 'User') : post.userDisplayName}
                      className="font-semibold text-white text-sm"
                    />
                    <UserLink
                      username={post.isRepost ? (post.originalUsername || 'user') : post.username}
                      className="text-slate-400 text-sm"
                      showAt={true}
                    />
                  </div>
                  <div 
                    className="text-slate-300 text-sm leading-relaxed overflow-hidden"
                    style={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    <MentionText
                      text={post.text}
                      className=""
                    />
                  </div>
                  {post.image && (
                    <div className="mt-3">
                      <img 
                        src={post.image} 
                        alt="Post preview" 
                        className="w-full h-32 object-cover rounded-xl border border-slate-700/50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Display Section */}
            {comments.length > 0 && (
              <div className="flex-shrink-0 mb-4 max-h-64 overflow-y-auto">
                <h4 className="text-lg font-semibold text-white mb-3">
                  {comments.length} {comments.length === 1 ? 'Reply' : 'Replies'}
                </h4>
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          {comment.userImg ? (
                            <img 
                              src={comment.userImg} 
                              alt={comment.userDisplayName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                              {comment.userDisplayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <UserLink
                              username={comment.username}
                              displayName={comment.userDisplayName}
                              className="font-semibold text-white text-sm"
                            />
                            <UserLink
                              username={comment.username}
                              className="text-slate-400 text-xs"
                              showAt={true}
                            />
                            <span className="text-slate-500 text-xs">
                              {formatPostDate(comment.timestamp)}
                            </span>
                          </div>
                          <MentionText 
                            text={comment.text}
                            className="text-slate-300 text-sm leading-relaxed"
                          />
                          {comment.media && (
                            <div className="mt-2">
                              {comment.mediaType === 'image' ? (
                                <img 
                                  src={comment.media} 
                                  alt="Comment media" 
                                  className="w-full max-h-32 object-cover rounded-lg border border-slate-700/50"
                                />
                              ) : (
                                <video 
                                  src={comment.media} 
                                  controls 
                                  className="w-full max-h-32 rounded-lg border border-slate-700/50"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Input Section */}
            <div className="flex gap-4 flex-1 min-h-0">
              <div className="flex-shrink-0">
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt="Your Avatar"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {currentUser?.name ? 
                      currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'YU'
                    }
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 flex flex-col">
                  <textarea
                    ref={commentTextareaRef}
                    value={commentText}
                    onChange={(e) => {
                      handleCommentTextChange(e.target.value);
                    }}
                    onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
                    onKeyUp={(e) => {
                      const textarea = e.target as HTMLTextAreaElement;
                      setCursorPosition(textarea.selectionStart || 0);
                    }}
                    placeholder="Post your reply"
                    className="flex-1 bg-transparent text-white text-lg placeholder-slate-400 resize-none outline-none leading-relaxed min-h-[120px]"
                    maxLength={400}
                    disabled={isCommenting}
                  />

                  {/* Mention Autocomplete */}
                  {showMentionAutocomplete && (
                    <MentionAutocomplete
                      searchTerm={mentionSearchTerm}
                      position={mentionPosition}
                      onSelectUser={handleMentionSelect}
                      onClose={() => {
                        setShowMentionAutocomplete(false);
                        setMentionContext(null);
                        setMentionSearchTerm('');
                      }}
                    />
                  )}

                  {/* Media Preview */}
                  {selectedMedia && (
                    <div className="mt-4 relative">
                      <div className="relative rounded-2xl overflow-hidden border border-slate-700/50">
                        {mediaType === 'image' ? (
                          <img 
                            src={selectedMedia} 
                            alt="Selected media" 
                            className="w-full max-h-64 object-cover"
                          />
                        ) : (
                          <video 
                            src={selectedMedia} 
                            controls 
                            className="w-full max-h-64"
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
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm">{uploadError}</p>
                    </div>
                  )}
                </div>
                
                {/* Character Count & Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-3 relative">
                    {/* Media Upload */}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                      id="comment-media-upload"
                    />
                    <label
                      htmlFor="comment-media-upload"
                      className="p-2 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors duration-200 cursor-pointer"
                      title="Add media"
                    >
                      <FaImage className="text-lg" />
                    </label>

                    {/* Emoji Picker */}
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 rounded-full hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                      title="Add emoji"
                    >
                      <FaSmile className="text-lg" />
                    </button>

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full mb-2 left-0 z-[10001]">
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

                    {/* Character Count */}
                    {commentText && (
                      <span className={`text-sm ml-2 ${400 - commentText.length < 0 ? 'text-red-400' : 400 - commentText.length < 20 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        {400 - commentText.length}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={handleCommentSubmit}
                    disabled={(!commentText.trim() && !selectedMedia) || isCommenting || !currentUser?.walletAddress || (commentText.length > 400)}
                    className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 shadow-lg flex items-center gap-2 ${
                      (commentText.trim() || selectedMedia) && !isCommenting && currentUser?.walletAddress && commentText.length <= 400
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-blue-500/25'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isCommenting && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                    {isCommenting ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && isClient && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl border border-slate-700/50 p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 flex items-center justify-center">
                <FaTrash className="text-2xl text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Delete Post
              </h3>
              <p className="text-slate-400 leading-relaxed">
                This action cannot be undone. Your post will be permanently deleted and will no longer be visible to anyone.
              </p>
            </div>{/* Post Preview */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
              <div 
                className="text-slate-300 text-sm leading-relaxed overflow-hidden"
                style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                <MentionText text={post.text} className="" />
              </div>
              {post.image && (
                <div className="mt-3">
                  <img 
                    src={post.image} 
                    alt="Post preview" 
                    className="w-full h-24 object-cover rounded-xl border border-slate-700/50"
                  />
                </div>
              )}
            </div>            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-semibold rounded-2xl border border-slate-600/50 hover:border-slate-500/50 transition-all duration-300 transform hover:scale-105"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </article>
  );
}
