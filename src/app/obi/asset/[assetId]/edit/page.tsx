'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../../contexts/WalletContext';
import { obiService } from '../../../../services/obiService';
import { obiStorageService } from '../../../../services/obiStorageService';
import { OblivionAsset } from '../../../../types/obi';
import RichTextEditor from '../../../../components/RichTextEditor';
import { 
  FileText, 
  Image, 
  Video, 
  Upload,
  ArrowLeft,
  Save,
  Eye,
  Trash2
} from 'lucide-react';

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<OblivionAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  useEffect(() => {
    loadAssetData();
  }, [assetId]);

  const loadAssetData = async () => {
    try {
      setLoading(true);
      const assetData = await obiService.getAsset(assetId);
      setAsset(assetData);
      
      // Check if user is the owner
      if (!user || user.walletAddress !== assetData.creatorId) {
        router.push(`/obi/asset/${assetId}`);
        return;
      }

      // Populate form data
      setAssetData({
        title: assetData.title || '',
        description: assetData.description || '',
        type: assetData.type || 'document',
        content: assetData.content || '',
        duration: assetData.duration || '',
        mediaUrl: assetData.mediaUrl || '',
        downloadUrl: assetData.downloadUrl || '',
        isPublic: assetData.isPublic !== undefined ? assetData.isPublic : true
      });

      if (assetData.mediaUrl) {
        setMediaPreview(assetData.mediaUrl);
      }
    } catch (error) {
      console.error('Error loading asset:', error);
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
        alert(`File size must be less than ${file.type.startsWith('video/') ? '100MB' : '10MB'}`);
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
    if (!user || !asset || !assetData.title.trim()) return;

    try {
      setSaving(true);
      
      let mediaUrl = assetData.mediaUrl;
      let downloadUrl = assetData.downloadUrl;
      
      // Upload new media file if present
      if (mediaFile) {
        try {
          setUploadingMedia(true);
          
          // Delete old media if it exists and is from Firebase Storage
          if (assetData.mediaUrl && assetData.mediaUrl.includes('firebase')) {
            try {
              await obiStorageService.deleteImage(assetData.mediaUrl);
            } catch (error) {
              console.error('Error deleting old media:', error);
              // Don't fail the update if deletion fails
            }
          }
          
          // Upload new media
          const uploadedUrl = await obiStorageService.uploadAssetMedia(assetId, mediaFile);
          mediaUrl = uploadedUrl;
          downloadUrl = uploadedUrl;
        } catch (error) {
          console.error('Error uploading media:', error);
          alert('Failed to upload media. Please try again.');
          return;
        } finally {
          setUploadingMedia(false);
        }
      }

      const updatedAsset = {
        ...asset,
        title: assetData.title,
        description: assetData.description,
        type: assetData.type,
        content: assetData.content,
        duration: assetData.duration,
        mediaUrl,
        downloadUrl,
        isPublic: assetData.isPublic,
        updatedAt: new Date()
      };

      await obiService.updateAsset(assetId, updatedAsset);
      router.push(`/obi/asset/${assetId}`);
    } catch (error) {
      console.error('Error updating asset:', error);
      alert('Failed to update asset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !asset) return;

    const confirmed = confirm('Are you sure you want to delete this asset? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeleting(true);
      
      // Delete associated media from Firebase Storage if it exists
      if (asset.mediaUrl && asset.mediaUrl.includes('firebase')) {
        try {
          await obiStorageService.deleteImage(asset.mediaUrl);
        } catch (error) {
          console.error('Error deleting media from storage:', error);
          // Don't fail the deletion if media cleanup fails
        }
      }
      
      await obiService.deleteAsset(assetId);
      router.push(`/obi/path/${asset.pathId}`);
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Asset not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/obi/asset/${assetId}`)}
            className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Asset
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Edit Asset
              </h1>
              <p className="text-slate-300 mt-1">{asset.title}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
              
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
                    Save Changes
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
                            className="max-w-md mx-auto rounded-lg border border-slate-700"
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                        {assetData.type === 'image' && (
                          <img 
                            src={mediaPreview} 
                            alt="Preview"
                            className="max-w-md mx-auto rounded-lg border border-slate-700"
                          />
                        )}
                        <div className="flex justify-center space-x-4">
                          <label className="cursor-pointer text-purple-400 hover:text-purple-300 transition-colors">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept={assetData.type === 'video' ? 'video/*' : 'image/*'}
                              onChange={handleMediaFileChange}
                              disabled={uploadingMedia}
                            />
                          </label>
                          <button
                            onClick={() => {
                              setMediaFile(null);
                              setMediaPreview(assetData.mediaUrl || '');
                            }}
                            className="text-slate-400 hover:text-slate-300 transition-colors"
                            disabled={uploadingMedia}
                          >
                            Reset
                          </button>
                        </div>
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
                onChange={(content) => setAssetData({ ...assetData, content })}
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
    </div>
  );
}
