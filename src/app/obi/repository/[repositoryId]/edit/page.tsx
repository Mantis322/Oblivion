'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../../contexts/WalletContext';
import { obiService } from '../../../../services/obiService';
import { obiStorageService } from '../../../../services/obiStorageService';
import { OblivionRepository } from '../../../../types/obi';
import { 
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';

export default function EditRepositoryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const repositoryId = params.repositoryId as string;

  const [repository, setRepository] = useState<OblivionRepository | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [repositoryData, setRepositoryData] = useState({
    name: '',
    description: '',
    photo: '',
    isActive: true
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadRepositoryData();
  }, [repositoryId]);

  const loadRepositoryData = async () => {
    try {
      setLoading(true);
      const repoData = await obiService.getRepository(repositoryId);
      setRepository(repoData);
      
      // Check if user is the owner
      if (!user || user.walletAddress !== repoData.creatorId) {
        router.push(`/obi/repository/${repositoryId}`);
        return;
      }

      // Populate form data
      setRepositoryData({
        name: repoData.name || '',
        description: repoData.description || '',
        photo: repoData.photo || '',
        isActive: repoData.isActive !== undefined ? repoData.isActive : true
      });

      if (repoData.photo) {
        setImagePreview(repoData.photo);
      }
    } catch (error) {
      console.error('Error loading repository:', error);
      router.push('/obi');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
        return;
      }

      setImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSave = async () => {
    if (!user || !repository || !repositoryData.name.trim()) return;

    try {
      setSaving(true);
      
      let photoUrl = repositoryData.photo;
      
      // Upload new image file if present
      if (imageFile) {
        try {
          setUploadingImage(true);
          
          // Delete old image if it exists and is from Firebase Storage
          if (repositoryData.photo && repositoryData.photo.includes('firebase')) {
            try {
              await obiStorageService.deleteImage(repositoryData.photo);
            } catch (error) {
              console.error('Error deleting old image:', error);
              // Don't fail the update if deletion fails
            }
          }
          
          // Upload new image
          photoUrl = await obiStorageService.uploadVentureImage(repositoryId, imageFile, 'repository');
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image. Please try again.');
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const updates = {
        name: repositoryData.name,
        description: repositoryData.description,
        photo: photoUrl,
        isActive: repositoryData.isActive,
        updatedAt: new Date()
      };

      const result = await obiService.updateRepository(repositoryId, updates);
      
      if (result.success) {
        router.push(`/obi/repository/${repositoryId}`);
      } else {
        alert(result.error || 'Failed to update repository. Please try again.');
      }
    } catch (error) {
      console.error('Error updating repository:', error);
      alert('Failed to update repository. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !repository) return;

    const confirmed = confirm('Are you sure you want to delete this repository? This action cannot be undone and will also delete all paths and assets within it.');
    if (!confirmed) return;

    try {
      setDeleting(true);
      
      // Delete associated image from Firebase Storage if it exists
      if (repository.photo && repository.photo.includes('firebase')) {
        try {
          await obiStorageService.deleteImage(repository.photo);
        } catch (error) {
          console.error('Error deleting image from storage:', error);
          // Don't fail the deletion if image cleanup fails
        }
      }
      
      await obiService.deleteRepository(repositoryId);
      router.push(`/obi/venture/${repository.ventureId}`);
    } catch (error) {
      console.error('Error deleting repository:', error);
      alert('Failed to delete repository. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(repositoryData.photo || '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/obi/repository/${repositoryId}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Repository
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Repository</h1>
            <p className="text-gray-600 mt-1">{repository.name}</p>
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
                  Delete
                </>
              )}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || uploadingImage || !repositoryData.name.trim()}
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

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
              <input
                type="text"
                value={repositoryData.name}
                onChange={(e) => setRepositoryData({ ...repositoryData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600"
                placeholder="Enter repository name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={repositoryData.description}
                onChange={(e) => setRepositoryData({ ...repositoryData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600"
                placeholder="Describe your repository..."
              />
            </div>
          </div>
        </div>

        {/* Repository Image */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Image</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              {uploadingImage ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-600">Uploading image...</p>
                </div>
              ) : imagePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Repository preview"
                      className="max-w-md max-h-64 mx-auto rounded-lg object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-center space-x-4">
                    <label className="cursor-pointer text-blue-600 hover:text-blue-800">
                      Replace Image
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={uploadingImage}
                      />
                    </label>
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(repositoryData.photo || '');
                      }}
                      className="text-gray-600 hover:text-gray-800"
                      disabled={uploadingImage}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Upload a repository image
                    </p>
                    <p className="text-xs text-gray-400">
                      Max size: 10MB • Supported formats: JPEG, PNG, WebP, GIF
                    </p>
                    <label className="cursor-pointer">
                      <span className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100">
                        <Upload className="h-4 w-4 inline mr-2" />
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={repositoryData.isActive}
                onChange={(e) => setRepositoryData({ ...repositoryData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Repository is active and visible to users
              </span>
            </label>
            
            {!repositoryData.isActive && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <strong>Note:</strong> Inactive repositories are hidden from public view but remain accessible to you as the owner.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
