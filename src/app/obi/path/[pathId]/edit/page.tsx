'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../../contexts/WalletContext';
import { obiService } from '../../../../services/obiService';
import { obiStorageService } from '../../../../services/obiStorageService';
import { OblivionPath } from '../../../../types/obi';
import { 
  ArrowLeft,
  Save,
  Trash2,
  Star,
  Unlock,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';

export default function EditPathPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const pathId = params.pathId as string;

  const [path, setPath] = useState<OblivionPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [pathData, setPathData] = useState({
    name: '',
    description: '',
    photo: '',
    price: 0,
    isFree: true,
    category: '',
    estimatedDuration: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

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

      // Populate form data
      setPathData({
        name: pathData.name || '',
        description: pathData.description || '',
        photo: pathData.photo || '',
        price: pathData.price || 0,
        isFree: pathData.isFree !== undefined ? pathData.isFree : true,
        category: pathData.category || '',
        estimatedDuration: pathData.estimatedDuration || '',
        difficulty: pathData.difficulty || 'beginner'
      });

      if (pathData.photo) {
        setImagePreview(pathData.photo);
      }
    } catch (error) {
      console.error('Error loading path:', error);
      router.push('/obi');
    } finally {
      setLoading(false);    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only JPEG, PNG, WebP, and GIF files are allowed.');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size too large. Maximum size is 10MB.');
        return;
      }

      setImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSave = async () => {
    if (!user || !path || !pathData.name.trim()) return;

    try {
      setSaving(true);
      
      let photoUrl = pathData.photo;
      
      // Upload new image file if present
      if (imageFile) {
        try {
          setUploadingImage(true);
          
          // Delete old image if it exists and is from Firebase Storage
          if (pathData.photo && pathData.photo.includes('firebase')) {
            try {
              await obiStorageService.deleteImage(pathData.photo);
            } catch (error) {
              console.error('Error deleting old image:', error);
              // Don't fail the update if deletion fails
            }
          }
          
          // Upload new image using repository type since paths are under repositories
          photoUrl = await obiStorageService.uploadVentureImage(pathId, imageFile, 'repository');
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image. Please try again.');
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const updatedPath = {
        ...path,
        name: pathData.name,
        description: pathData.description,
        photo: photoUrl,
        price: pathData.price,
        isFree: pathData.isFree,
        category: pathData.category,
        estimatedDuration: pathData.estimatedDuration,
        difficulty: pathData.difficulty,
        updatedAt: new Date()
      };

      const result = await obiService.updatePath(pathId, updatedPath);
      
      if (result.success) {
        router.push(`/obi/path/${pathId}`);
      } else {
        alert(result.error || 'Failed to update path. Please try again.');
      }
    } catch (error) {
      console.error('Error updating path:', error);
      alert('Failed to update path. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !path) return;

    const confirmed = confirm('Are you sure you want to delete this path? This will also delete all associated assets. This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeleting(true);
      
      // Delete associated image from Firebase Storage if it exists
      if (path.photo && path.photo.includes('firebase')) {
        try {
          await obiStorageService.deleteImage(path.photo);
        } catch (error) {
          console.error('Error deleting image from storage:', error);
          // Don't fail the deletion if image cleanup fails
        }
      }
      
      const result = await obiService.deletePath(pathId);
      if (result.success) {
        router.push(`/obi/repository/${path.repositoryId}`);
      }
    } catch (error) {
      console.error('Error deleting path:', error);
      alert('Failed to delete path. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(pathData.photo || '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Path not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/obi/path/${pathId}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Path
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Path</h1>
            <p className="text-gray-600 mt-1">{path.name}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Path
                </>
              )}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || uploadingImage || !pathData.name.trim()}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || uploadingImage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadingImage ? 'Uploading...' : 'Saving...'}
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

      {/* Edit Form */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Path Name</label>
              <input
                type="text"
                value={pathData.name}
                onChange={(e) => setPathData({ ...pathData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter path name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={pathData.description}
                onChange={(e) => setPathData({ ...pathData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your path..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={pathData.category}
                  onChange={(e) => setPathData({ ...pathData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Yoga, Business"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={pathData.difficulty}
                  onChange={(e) => setPathData({ ...pathData, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
              <input
                type="text"
                value={pathData.estimatedDuration}
                onChange={(e) => setPathData({ ...pathData, estimatedDuration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 4 weeks, 10 hours"
              />
            </div>
          </div>
        </div>

        {/* Path Image */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Path Image</h3>
          
          <div className="space-y-4">
            {uploadingImage ? (
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Uploading image...</p>
                </div>
              </div>
            ) : imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Path preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Add a cover image for your path</p>
                  <p className="text-xs text-gray-400 mb-4">PNG, JPG, GIF up to 10MB</p>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>
            )}
            
            {imagePreview && !uploadingImage && (
              <div className="flex justify-center space-x-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Replace Image
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={pathData.isFree}
                onChange={(e) => setPathData({ ...pathData, isFree: e.target.checked, price: e.target.checked ? 0 : pathData.price })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 flex items-center">
                <Unlock className="h-4 w-4 mr-1" />
                Make this path free
              </span>
            </label>
            
            {!pathData.isFree && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (XLM)
                </label>
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="number"
                    value={pathData.price}
                    onChange={(e) => setPathData({ ...pathData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Set a price for access to this path and its content
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Path Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Path Statistics</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{path.assetCount || 0}</p>
              <p className="text-sm text-gray-500">Assets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{path.enrolledCount || 0}</p>
              <p className="text-sm text-gray-500">Enrolled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{path.rating || 0}</p>
              <p className="text-sm text-gray-500">Rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
