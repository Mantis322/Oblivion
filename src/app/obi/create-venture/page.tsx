'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/sidebar';
import { useWallet } from '../../contexts/WalletContext';
import { obiService } from '../../services/obiService';
import { obiStorageService } from '../../services/obiStorageService';
import { FaArrowLeft, FaBuilding, FaImage, FaPlus, FaTrash, FaUpload, FaExternalLinkAlt } from 'react-icons/fa';
import Image from 'next/image';

interface VentureLink {
  title: string;
  url: string;
  icon?: string;
}

export default function CreateVenturePage() {
  const router = useRouter();
  const { user } = useWallet();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [links, setLinks] = useState<VentureLink[]>([]);
  const [newLink, setNewLink] = useState<VentureLink>({ title: '', url: '', icon: '' });
  const [showAddLink, setShowAddLink] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) {
    router.push('/');
    return null;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Venture name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Venture name must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else    if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, photo: 'Please select a valid image file' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, photo: 'Image size must be less than 5MB' });
        return;
      }

      setPhotoFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      
      // Clear any photo errors
      setErrors({ ...errors, photo: '' });
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview('');
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      return;
    }

    if (!isValidUrl(newLink.url)) {
      setErrors({ ...errors, linkUrl: 'Please enter a valid URL' });
      return;
    }

    setLinks([...links, { ...newLink }]);
    setNewLink({ title: '', url: '', icon: '' });
    setShowAddLink(false);
    setErrors({ ...errors, linkUrl: '' });
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let photoUrl = '';
      
      // Upload photo to Firebase Storage if provided
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          // Create a temporary venture ID for the upload
          const tempVentureId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          photoUrl = await obiStorageService.uploadVentureImage(tempVentureId, photoFile, 'cover');
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          setErrors({ photo: uploadError instanceof Error ? uploadError.message : 'Failed to upload photo' });
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      const result = await obiService.createVenture(
        user.walletAddress,
        name.trim(),
        description.trim(),
        photoUrl || undefined
      );

      if (result.success && result.ventureId) {
        // TODO: Add links to the venture
        router.push(`/obi/venture/${result.ventureId}`);
      } else {
        setErrors({ submit: result.error || 'Failed to create venture' });
      }
    } catch (error) {
      console.error('Error creating venture:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        
        <div className="flex-1 ml-20 lg:ml-72 max-w-4xl px-4 lg:px-6">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
            <div className="flex items-center mb-1">
              <button
                onClick={() => router.back()}
                className="mr-4 p-3 hover:bg-slate-700/50 rounded-xl transition-colors duration-200 group"
              >
                <FaArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Venture</h1>
                <p className="text-slate-300 text-base font-medium mt-1">
                  Start your business journey on Oblivion
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto pb-16">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaBuilding className="w-5 h-5 text-purple-400" />
                  Basic Information
                </h2>
                
                <div className="space-y-6">
                  {/* Venture Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Venture Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your venture name"
                      className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        errors.name 
                          ? 'border-red-500 focus:ring-red-500/50' 
                          : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-400">{errors.name}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your venture and what you offer"
                      rows={4}
                      className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                        errors.description 
                          ? 'border-red-500 focus:ring-red-500/50' 
                          : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.description && (
                      <p className="mt-2 text-sm text-red-400">{errors.description}</p>
                    )}
                  </div>

                  {/* Cover Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Cover Photo
                    </label>
                    
                    {photoPreview ? (
                      /* Photo Preview */
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Cover preview"
                          className="w-full h-48 object-cover rounded-xl border border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                          {photoFile?.name}
                        </div>
                      </div>
                    ) : (
                      /* Upload Area */
                      <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors">
                        <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                          <FaUpload className="h-12 w-12" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-300">
                            Upload a cover photo for your venture
                          </p>
                          <p className="text-xs text-slate-400">
                            PNG, JPG, JPEG up to 5MB
                          </p>
                          <label className="cursor-pointer">
                            <span className="mt-2 inline-block rounded-lg border border-purple-500 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-colors">
                              Choose File
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handlePhotoFileChange}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                    
                    {errors.photo && (
                      <p className="mt-2 text-sm text-red-400">{errors.photo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <FaExternalLinkAlt className="w-5 h-5 text-blue-400" />
                    Links
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddLink(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Link
                  </button>
                </div>

                {/* Existing Links */}
                {links.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {links.map((link, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex-1">
                          <div className="font-medium text-white">{link.title}</div>
                          <div className="text-sm text-slate-400">{link.url}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Link Form */}
                {showAddLink && (
                  <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 space-y-4">
                    <div>
                      <input
                        type="text"
                        value={newLink.title}
                        onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                        placeholder="Link title"
                        className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <input
                        type="url"
                        value={newLink.url}
                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                        placeholder="https://example.com"
                        className={`w-full px-3 py-2 bg-slate-600/50 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          errors.linkUrl 
                            ? 'border-red-500 focus:ring-red-500/50' 
                            : 'border-slate-500 focus:ring-blue-500/50'
                        }`}
                      />
                      {errors.linkUrl && (
                        <p className="mt-1 text-sm text-red-400">{errors.linkUrl}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addLink}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddLink(false);
                          setNewLink({ title: '', url: '', icon: '' });
                          setErrors({ ...errors, linkUrl: '' });
                        }}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingPhoto}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading Photo...
                    </>
                  ) : loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Venture'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
