'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/sidebar';
import { useWallet } from '../../../contexts/WalletContext';
import { obiService } from '../../../services/obiService';
import { obiStorageService } from '../../../services/obiStorageService';
import { OblivionVenture, OblivionRepository } from '../../../types/obi';
import { 
  FaArrowLeft, 
  FaBuilding, 
  FaExternalLinkAlt, 
  FaPlus, 
  FaEdit, 
  FaEye,
  FaLock,
  FaGlobe,
  FaUpload,
  FaTrash
} from 'react-icons/fa';
import Image from 'next/image';

interface VenturePageProps {
  params: Promise<{ ventureId: string }>;
}

export default function VenturePage({ params }: VenturePageProps) {
  const router = useRouter();
  const { user } = useWallet();
  const resolvedParams = use(params);
  
  const [venture, setVenture] = useState<OblivionVenture | null>(null);
  const [repositories, setRepositories] = useState<OblivionRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [repoImageFile, setRepoImageFile] = useState<File | null>(null);
  const [repoImagePreview, setRepoImagePreview] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [uploadingRepoImage, setUploadingRepoImage] = useState(false);

  useEffect(() => {
    loadVentureData();
  }, [resolvedParams.ventureId]);

  const loadVentureData = async () => {
    try {
      setLoading(true);
      const [ventureData, repoData] = await Promise.all([
        obiService.getVentureById(resolvedParams.ventureId),
        obiService.getRepositoriesByVenture(resolvedParams.ventureId)
      ]);
      
      setVenture(ventureData);
      
      // Load path counts for each repository dynamically in parallel
      const repositoriesWithPathCounts = await Promise.all(
        repoData.map(async (repository) => {
          try {
            const paths = await obiService.getRepositoryPaths(repository.id!);
            return {
              ...repository,
              paths,
              pathCount: paths.length
            };
          } catch (error) {
            console.error(`Error loading paths for repository ${repository.id}:`, error);
            return {
              ...repository,
              paths: repository.paths || [],
              pathCount: repository.paths?.length || 0
            };
          }
        })
      );
      
      setRepositories(repositoriesWithPathCounts);
    } catch (error) {
      console.error('Error loading venture data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user && venture && user.walletAddress === venture.creatorId;

  const handleRepoImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setRepoImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setRepoImagePreview(previewUrl);
    }
  };

  const removeRepoImage = () => {
    setRepoImageFile(null);
    setRepoImagePreview('');
  };

  const handleCreateRepository = async () => {
    if (!newRepoName.trim() || !newRepoDescription.trim() || !user) return;
    
    try {
      setCreating(true);
      
      let photoUrl = '';
      
      // Upload image file if present
      if (repoImageFile) {
        try {
          setUploadingRepoImage(true);
          // Create a temporary repository ID for the upload
          const tempRepoId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          photoUrl = await obiStorageService.uploadVentureImage(tempRepoId, repoImageFile, 'repository');
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image. Please try again.');
          return;
        } finally {
          setUploadingRepoImage(false);
        }
      }

      const result = await obiService.createRepository(
        resolvedParams.ventureId,
        newRepoName.trim(),
        newRepoDescription.trim(),
        user.walletAddress,
        photoUrl || undefined
      );

      if (result.success) {
        await loadVentureData(); // Reload data
        setShowCreateRepo(false);
        setNewRepoName('');
        setNewRepoDescription('');
        setRepoImageFile(null);
        setRepoImagePreview('');
      }
    } catch (error) {
      console.error('Error creating repository:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleRepositoryClick = (repository: OblivionRepository) => {
    router.push(`/obi/repository/${repository.id}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        
        <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-4 z-10 mb-8">
            <div className="flex items-center mb-1">
              <button
                onClick={() => router.push('/obi')}
                className="mr-4 p-3 hover:bg-slate-700/50 rounded-xl transition-colors duration-200 group"
                title="Back to O.B.I. Home"
              >
                <FaArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </button>
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">{venture.name}</h1>
                <p className="text-slate-300 text-base font-medium mt-1">
                  {venture.description}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => router.push(`/obi/venture/${venture.id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <FaEdit className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Venture Details */}
          <div className="space-y-8 pb-16">
            {/* Cover and Info */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
              {venture.photo && (
                <div className="relative h-64 w-full">
                  <Image
                    src={venture.photo}
                    alt={venture.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                </div>
              )}
              
              <div className="p-6">
                {/* Links */}
                {venture.links.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Links</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {venture.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200 group"
                        >
                          <FaExternalLinkAlt className="w-4 h-4 text-slate-400 group-hover:text-white" />
                          <span className="text-slate-300 group-hover:text-white truncate">
                            {link.title}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{repositories.length}</div>
                    <div className="text-sm text-slate-400">Repositories</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {repositories.reduce((acc, r) => acc + r.paths.length, 0)}
                    </div>
                    <div className="text-sm text-slate-400">Paths</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatDate(venture.createdAt)}
                    </div>
                    <div className="text-sm text-slate-400">Created</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Repositories */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FaBuilding className="w-6 h-6 text-purple-400" />
                  Oblivion Repositories
                </h2>
                {isOwner && (
                  <button
                    onClick={() => setShowCreateRepo(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <FaPlus className="w-4 h-4" />
                    Create Repository
                  </button>
                )}
              </div>

              {/* Create Repository Form */}
              {showCreateRepo && (
                <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Create New Repository</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="Repository name"
                      className="w-full px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <textarea
                      value={newRepoDescription}
                      onChange={(e) => setNewRepoDescription(e.target.value)}
                      placeholder="Repository description"
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                    
                    {/* Repository Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Repository Image (optional)
                      </label>
                      
                      {repoImagePreview ? (
                        /* Image Preview */
                        <div className="relative">
                          <img
                            src={repoImagePreview}
                            alt="Repository preview"
                            className="w-full h-32 object-cover rounded-lg border border-slate-500"
                          />
                          <button
                            type="button"
                            onClick={removeRepoImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <FaTrash className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        /* Upload Area */
                        <div className="border-2 border-dashed border-slate-500 rounded-lg p-4 text-center hover:border-purple-500/50 transition-colors">
                          <div className="mx-auto h-8 w-8 text-slate-400 mb-2">
                            <FaUpload className="h-8 w-8" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-slate-300">
                              Upload repository image
                            </p>
                            <p className="text-xs text-slate-400">
                              PNG, JPG, WebP up to 10MB
                            </p>
                            <label className="cursor-pointer">
                              <span className="mt-2 inline-block rounded-lg border border-purple-500 px-3 py-1 text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-colors">
                                Choose File
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleRepoImageFileChange}
                                disabled={uploadingRepoImage}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleCreateRepository}
                        disabled={creating || uploadingRepoImage || !newRepoName.trim() || !newRepoDescription.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {creating || uploadingRepoImage ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {uploadingRepoImage ? 'Uploading...' : 'Creating...'}
                          </>
                        ) : (
                          'Create Repository'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateRepo(false);
                          setNewRepoName('');
                          setNewRepoDescription('');
                          setRepoImageFile(null);
                          setRepoImagePreview('');
                        }}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Repositories List */}
              {repositories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FaBuilding className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-2">No repositories yet</h3>
                  <p className="text-slate-400 mb-6">
                    {isOwner 
                      ? 'Create your first repository to organize your content and learning paths.'
                      : 'This venture hasn\'t created any repositories yet.'
                    }
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setShowCreateRepo(true)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                    >
                      Create First Repository
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6">
                  {repositories.map((repository) => (
                    <div
                      key={repository.id}
                      onClick={() => handleRepositoryClick(repository)}
                      className="bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 rounded-xl p-6 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        {repository.photo ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={repository.photo}
                              alt={repository.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FaBuilding className="w-8 h-8 text-white" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors mb-2">
                            {repository.name}
                          </h3>
                          <p className="text-slate-300 mb-4 line-clamp-2">
                            {repository.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <FaEye className="w-4 h-4" />
                              <span>{repository.pathCount ?? repository.paths?.length ?? 0} paths</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FaGlobe className="w-4 h-4" />
                              <span>Updated {formatDate(repository.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
