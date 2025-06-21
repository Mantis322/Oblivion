'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { obiService } from '../../../services/obiService';
import { OblivionAsset, OblivionPath } from '../../../types/obi';
import { 
  ArrowLeft,
  Heart,
  Share2,
  Download,
  Edit3,
  Clock,
  Eye,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';

export default function AssetViewerPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<OblivionAsset | null>(null);
  const [path, setPath] = useState<OblivionPath | null>(null);
  const [allAssets, setAllAssets] = useState<OblivionAsset[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    loadAssetData();
  }, [assetId, user]);

  const loadAssetData = async () => {
    try {
      setLoading(true);
      const assetData = await obiService.getAsset(assetId);
      setAsset(assetData);
      setLikeCount(assetData.likeCount || 0);

      // Load path data
      const pathData = await obiService.getPath(assetData.pathId);
      setPath(pathData);

      // Check access
      let userHasAccess = false;
      if (user) {
        const access = await obiService.checkPathAccess(assetData.pathId, user.walletAddress);
        userHasAccess = access || pathData.isFree || pathData.creatorId === user.walletAddress;
        setHasAccess(userHasAccess);
        
        // Check if user has liked this asset
        if (userHasAccess) {
          const liked = await obiService.checkAssetLike(assetId, user.walletAddress);
          setIsLiked(liked);
        }
      } else {
        userHasAccess = pathData.isFree;
        setHasAccess(userHasAccess);
      }

      // Increment view count if user has access to the asset
      if (userHasAccess) {
        await obiService.incrementAssetViews(assetId);
        // Update local state immediately for better UX
        setAsset(prev => prev ? { ...prev, viewCount: (prev.viewCount || 0) + 1 } : prev);
      }

      // Load all assets in the path to enable navigation
      if (user && (pathData.isFree || pathData.creatorId === user.walletAddress)) {
        const pathAssets = await obiService.getPathAssets(assetData.pathId);
        setAllAssets(pathAssets);
        const index = pathAssets.findIndex((a: any) => a.id === assetId);
        setCurrentIndex(index);
      }

      // Increment view count
      if (hasAccess) {
        await obiService.incrementAssetViews(assetId);
      }
    } catch (error) {
      console.error('Error loading asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user && asset && user.walletAddress === asset.creatorId;

  const handleLike = async () => {
    if (!user || !asset) return;

    try {
      if (isLiked) {
        await obiService.unlikeAsset(assetId, user.walletAddress);
        setLikeCount(prev => prev - 1);
      } else {
        await obiService.likeAsset(assetId, user.walletAddress);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: asset?.title || 'Check out this asset',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  const navigateToAsset = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allAssets.length) {
      const newAsset = allAssets[newIndex];
      router.push(`/obi/asset/${newAsset.id}`);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!asset || !hasAccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-2">Access Required</h2>
          <p className="text-slate-300 mb-4">
            You need access to the path to view this asset.
          </p>
          <button
            onClick={() => router.push(`/obi/path/${asset?.pathId}`)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
          >
            Go to Path
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(`/obi/path/${asset.pathId}`)}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Path
            </button>
            
            {/* Navigation */}
            {allAssets.length > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateToAsset('prev')}
                  disabled={currentIndex === 0}
                  className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <span className="text-sm text-slate-300">
                  {currentIndex + 1} of {allAssets.length}
                </span>
                
                <button
                  onClick={() => navigateToAsset('next')}
                  disabled={currentIndex === allAssets.length - 1}
                  className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Asset Header */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  {asset.title}
                </h1>
                {asset.description && (
                  <p className="text-slate-300 mb-4">{asset.description}</p>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-slate-400">
                  <span className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {asset.viewCount || 0} views
                  </span>
                  {asset.duration && (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {asset.duration}
                    </span>
                  )}
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(asset.createdAt)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                    isLiked 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                  {likeCount}
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
                
                {asset.downloadUrl && (
                  <a
                    href={asset.downloadUrl}
                    download
                    className="flex items-center px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                )}
                
                {isOwner && (
                  <button
                    onClick={() => router.push(`/obi/asset/${assetId}/edit`)}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Media Content */}
        {asset.mediaUrl && (
          <div className="mb-8">
            {asset.type === 'video' && (
              <div className="bg-black rounded-xl overflow-hidden border border-slate-700">
                <video
                  src={asset.mediaUrl}
                  controls
                  className="w-full"
                  poster=""
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            
            {asset.type === 'image' && (
              <div className="text-center">
                <img
                  src={asset.mediaUrl}
                  alt={asset.title}
                  className="max-w-full h-auto rounded-xl shadow-2xl border border-slate-700"
                />
              </div>
            )}
          </div>
        )}

        {/* Text Content */}
        {asset.content && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
            <div 
              className="prose prose-slate max-w-none text-slate-300 prose-headings:text-white prose-strong:text-white prose-a:text-purple-400 prose-code:text-purple-300"
              dangerouslySetInnerHTML={{ __html: asset.content }}
            />
          </div>
        )}

        {/* Asset Navigation */}
        {allAssets.length > 1 && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Other Assets in this Path</h3>
            <div className="space-y-2">
              {allAssets.map((pathAsset, index) => (
                <button
                  key={pathAsset.id}
                  onClick={() => router.push(`/obi/asset/${pathAsset.id}`)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    pathAsset.id === assetId 
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30' 
                      : 'hover:bg-slate-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-slate-400 font-medium">#{index + 1}</span>
                      <span className={`font-medium ${pathAsset.id === assetId ? 'text-purple-300' : 'text-white'}`}>
                        {pathAsset.title}
                      </span>
                    </div>
                    {pathAsset.duration && (
                      <span className="text-sm text-slate-400">{pathAsset.duration}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
