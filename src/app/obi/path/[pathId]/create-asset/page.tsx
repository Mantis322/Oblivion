'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../../contexts/WalletContext';
import { obiService } from '../../../../services/obiService';
import { obiStorageService } from '../../../../services/obiStorageService';
import { OblivionPath } from '../../../../types/obi';
import RichTextEditor from '../../../../components/RichTextEditor';
import { 
  FileText, 
  Image, 
  Video, 
  Upload,
  ArrowLeft,
  Save,
  Eye,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

export default function CreateAssetPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const pathId = params.pathId as string;

  const [path, setPath] = useState<OblivionPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [assetData, setAssetData] = useState({
    title: '',
    description: '',
    type: 'document' as 'document' | 'video' | 'image',
    content: '',
    duration: '',
    mediaUrl: '',
    downloadUrl: '',
    isPublic: true
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  // Modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    loadPathData();
  }, [pathId]);

  const loadPathData = async () => {
    try {
      setLoading(true);
      const pathData = await obiService.getPath(pathId);
      setPath(pathData);
      
      // Check if user is the owner
      if (!user || user.walletAddress !== pathData.creatorId) {
        router.push(`/obi/path/${pathId}`);
        return;
      }
    } catch (error) {
      console.error('Error loading path:', error);
      router.push('/obi');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for videos, 10MB for images
      if (file.size > maxSize) {
        setModalMessage(`File size must be less than ${file.type.startsWith('video/') ? '100MB' : '10MB'}`);
        setShowErrorModal(true);
        return;
      }

      setMediaFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
      
      // Set asset type based on file type
      if (file.type.startsWith('video/')) {
        setAssetData({ ...assetData, type: 'video' });
      } else if (file.type.startsWith('image/')) {
        setAssetData({ ...assetData, type: 'image' });
      }
    }
  };

  const handleSave = async () => {
    if (!user || !path || !assetData.title.trim()) return;

    try {
      setSaving(true);
      
      let mediaUrl = '';
      let downloadUrl = '';
      
      // Upload media file if present
      if (mediaFile) {
        try {
          setUploadingMedia(true);
          // Generate a temporary asset ID for file organization
          const tempAssetId = `${user.walletAddress}_${Date.now()}`;
          const uploadedUrl = await obiStorageService.uploadAssetMedia(tempAssetId, mediaFile);
          mediaUrl = uploadedUrl;
          downloadUrl = uploadedUrl;
        } catch (error) {
          console.error('Error uploading media:', error);
          setModalMessage('Failed to upload media. Please try again.');
          setShowErrorModal(true);
          return;
        } finally {
          setUploadingMedia(false);
        }
      }

      const newAsset = {
        title: assetData.title,
        description: assetData.description,
        type: assetData.type,
        content: assetData.content,
        duration: assetData.duration,
        mediaUrl,
        downloadUrl,
        isPublic: assetData.isPublic,
        pathId,
        creatorId: user.walletAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0,
        likeCount: 0
      };

      await obiService.createAsset(newAsset);
      setModalMessage('Asset created successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating asset:', error);
      setModalMessage('Failed to create asset. Please try again.');
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push(`/obi/path/${pathId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Path not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Path
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Create New Asset
              </h1>
              <p className="text-slate-300 mt-1">for {path.name}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center px-4 py-2 border border-slate-600 bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving || uploadingMedia || !assetData.title.trim()}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {saving || uploadingMedia ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {uploadingMedia ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Asset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {previewMode ? (
          /* Preview Mode */
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">{assetData.title || 'Untitled Asset'}</h2>
              {assetData.description && (
                <p className="text-slate-300">{assetData.description}</p>
              )}
            </div>

            {/* Media Preview */}
            {mediaPreview && (
              <div className="mb-6">
                {assetData.type === 'video' && (
                  <video 
                    src={mediaPreview} 
                    controls 
                    className="w-full max-w-2xl rounded-lg border border-slate-700"
                    poster=""
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                {assetData.type === 'image' && (
                  <img 
                    src={mediaPreview} 
                    alt={assetData.title}
                    className="w-full max-w-2xl rounded-lg border border-slate-700"
                  />
                )}
              </div>
            )}

            {/* Content Preview */}
            <div 
              className="prose prose-slate max-w-none text-slate-300 prose-headings:text-white prose-strong:text-white prose-a:text-purple-400"
              dangerouslySetInnerHTML={{ __html: assetData.content || '<p>No content yet...</p>' }}
            />
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Asset Title</label>
                  <input
                    type="text"
                    value={assetData.title}
                    onChange={(e) => setAssetData({ ...assetData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Enter asset title..."
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={assetData.description}
                    onChange={(e) => setAssetData({ ...assetData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="Describe this asset..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Asset Type</label>
                  <select
                    value={assetData.type}
                    onChange={(e) => setAssetData({ ...assetData, type: e.target.value as 'document' | 'video' | 'image' })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                  >
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration (optional)</label>
                  <input
                    type="text"
                    value={assetData.duration}
                    onChange={(e) => setAssetData({ ...assetData, duration: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                    placeholder="e.g., 15 minutes, 2 hours"
                  />
                </div>
              </div>
            </div>

            {/* Media Upload */}
            {(assetData.type === 'video' || assetData.type === 'image') && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Media Upload</h3>
                
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6">
                  <div className="text-center">
                    {uploadingMedia ? (
                      <div className="space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="text-sm text-slate-300">Uploading media...</p>
                    </div>
                  ) : mediaPreview ? (
                    <div className="space-y-4">
                      {assetData.type === 'video' && (
                        <video 
                          src={mediaPreview} 
                          controls 
                          className="max-w-md mx-auto rounded-lg"
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {assetData.type === 'image' && (
                        <img 
                          src={mediaPreview} 
                          alt="Preview"
                          className="max-w-md mx-auto rounded-lg"
                        />
                      )}
                      <button
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview('');
                        }}
                        className="text-red-600 hover:text-red-800"
                        disabled={uploadingMedia}
                      >
                        Remove
                      </button>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                          {assetData.type === 'video' ? <Video className="h-12 w-12" /> : <Image className="h-12 w-12" />}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-300">
                            Upload a {assetData.type} file
                          </p>
                          <p className="text-xs text-slate-400">
                            Max size: {assetData.type === 'video' ? '100MB' : '10MB'}
                          </p>
                          <label className="cursor-pointer">
                            <span className="mt-2 block w-full rounded-md border border-slate-600 px-3 py-2 text-sm bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200">
                              Choose File
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept={assetData.type === 'video' ? 'video/*' : 'image/*'}
                              onChange={handleMediaFileChange}
                              disabled={uploadingMedia}
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content Editor */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Content</h3>
              <RichTextEditor
                content={assetData.content}
                onChange={(content: string) => setAssetData({ ...assetData, content })}
                placeholder="Write your asset content here..."
              />
            </div>

            {/* Settings */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={assetData.isPublic}
                    onChange={(e) => setAssetData({ ...assetData, isPublic: e.target.checked })}
                    className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-800"
                  />
                  <span className="ml-2 text-sm text-slate-300">
                    Make this asset publicly visible in the path
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Success!</h3>
              <p className="text-slate-300 mb-6">{modalMessage}</p>
              <button
                onClick={handleSuccessClose}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
              >
                Continue to Path
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Error</h3>
              <p className="text-slate-300 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
