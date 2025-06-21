'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../../components/sidebar';
import { useWallet } from '../../../../contexts/WalletContext';
import { obiService } from '../../../../services/obiService';
import { obiStorageService } from '../../../../services/obiStorageService';
import { OblivionVenture } from '../../../../types/obi';
import { FaArrowLeft, FaBuilding, FaUpload, FaTrash, FaPlus } from 'react-icons/fa';

interface VentureLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export default function EditVenturePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const ventureId = params.ventureId as string;

  const [venture, setVenture] = useState<OblivionVenture | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [links, setLinks] = useState<VentureLink[]>([]);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showAddLink, setShowAddLink] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadVentureData();
  }, [ventureId]);

  const loadVentureData = async () => {
    try {
      setLoading(true);
      const ventureData = await obiService.getVentureById(ventureId);
      
      if (!ventureData) {
        router.push('/obi');
        return;
      }

      // Check if user is the owner
      if (!user || user.walletAddress !== ventureData.creatorId) {
        router.push(`/obi/venture/${ventureId}`);
        return;
      }

      setVenture(ventureData);
      setFormData({
        name: ventureData.name || '',
        description: ventureData.description || '',
      });

      if (ventureData.photo) {
        setPhotoPreview(ventureData.photo);
      }

      setLinks(ventureData.links || []);
    } catch (error) {
      console.error('Error loading venture:', error);
      router.push('/obi');
    } finally {
      setLoading(false);
    }
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
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview('');
  };

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      return;
    }

    try {
      new URL(newLink.url);
    } catch {
      setErrors({ ...errors, linkUrl: 'Please enter a valid URL' });
      return;
    }

    const link: VentureLink = {
      id: Date.now().toString(),
      title: newLink.title.trim(),
      url: newLink.url.trim(),
    };

    setLinks([...links, link]);
    setNewLink({ title: '', url: '' });
    setShowAddLink(false);
    setErrors({ ...errors, linkUrl: '' });
  };

  const removeLink = (linkId: string) => {
    setLinks(links.filter(link => link.id !== linkId));
  };

  const handleSave = async () => {
    if (!user || !venture) return;

    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Venture name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      
      let photoUrl = venture.photo;
      
      // Upload new photo to Firebase Storage if provided
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          // Delete old photo if it exists and is from Firebase
          if (venture.photo) {
            await obiStorageService.deleteImage(venture.photo);
          }
          
          // Upload new photo
          photoUrl = await obiStorageService.uploadVentureImage(ventureId, photoFile, 'cover');
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          setErrors({ photo: uploadError instanceof Error ? uploadError.message : 'Failed to upload photo' });
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      const updatedVenture = {
        ...venture,
        name: formData.name.trim(),
        description: formData.description.trim(),
        photo: photoUrl,
        links,
        updatedAt: new Date()
      };

      await obiService.updateVenture(ventureId, updatedVenture);
      router.push(`/obi/venture/${ventureId}`);
    } catch (error) {
      console.error('Error updating venture:', error);
      setErrors({ submit: 'Failed to update venture. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !venture) return;

    const confirmed = confirm('Are you sure you want to delete this venture? This will also delete all repositories, paths, and assets. This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeleting(true);
      await obiService.deleteVenture(ventureId);
      router.push('/obi');
    } catch (error) {
      console.error('Error deleting venture:', error);
      setErrors({ submit: 'Failed to delete venture. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading venture...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!venture) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Venture Not Found</h1>
              <p className="text-slate-400 mb-6">The venture you're looking for doesn't exist.</p>
              <button
                onClick={() => router.push('/obi')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
              >
                Back to O.B.I.
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        
        <div className="flex-1 ml-20 lg:ml-72 max-w-4xl px-4 lg:px-6">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
            <div className="flex items-center mb-1">
              <button
                onClick={() => router.push(`/obi/venture/${ventureId}`)}
                className="mr-4 p-3 hover:bg-slate-700/50 rounded-xl transition-colors duration-200 group"
              >
                <FaArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </button>
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Edit Venture</h1>
                <p className="text-slate-300 text-base font-medium mt-1">
                  Update your venture information
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-8 pb-16">
            {/* Basic Information */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Basic Information</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Venture Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      errors.name 
                        ? 'border-red-500 focus:ring-red-500/50' 
                        : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500/50'
                    }`}
                    placeholder="Enter venture name..."
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={`w-full px-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                      errors.description 
                        ? 'border-red-500 focus:ring-red-500/50' 
                        : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500/50'
                    }`}
                    placeholder="Describe your venture..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-red-400">{errors.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Photo */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Cover Photo</h3>
              
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Cover preview"
                    className="w-full h-64 object-cover rounded-xl border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <FaTrash className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                    {photoFile?.name || 'Current cover photo'}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-purple-500/50 transition-colors">
                  <div className="mx-auto h-16 w-16 text-slate-400 mb-4">
                    <FaUpload className="h-16 w-16" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg text-slate-300">
                      Upload a cover photo for your venture
                    </p>
                    <p className="text-sm text-slate-400">
                      PNG, JPG, JPEG up to 5MB
                    </p>
                    <label className="cursor-pointer">
                      <span className="mt-4 inline-block rounded-lg border border-purple-500 px-6 py-3 text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-colors">
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

            {/* Links */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Links</h3>
                <button
                  onClick={() => setShowAddLink(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add Link
                </button>
              </div>

              {/* Existing Links */}
              {links.length > 0 && (
                <div className="space-y-3 mb-6">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{link.title}</p>
                        <p className="text-slate-400 text-sm">{link.url}</p>
                      </div>
                      <button
                        onClick={() => removeLink(link.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Link Form */}
              {showAddLink && (
                <div className="space-y-4 p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Link Title
                    </label>
                    <input
                      type="text"
                      value={newLink.title}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., Website, Portfolio, GitHub"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="https://example.com"
                    />
                    {errors.linkUrl && (
                      <p className="mt-1 text-sm text-red-400">{errors.linkUrl}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={addLink}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Add Link
                    </button>
                    <button
                      onClick={() => {
                        setShowAddLink(false);
                        setNewLink({ title: '', url: '' });
                        setErrors({ ...errors, linkUrl: '' });
                      }}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400">{errors.submit}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
