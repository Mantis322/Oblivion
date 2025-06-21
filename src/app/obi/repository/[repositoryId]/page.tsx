'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { obiService } from '../../../services/obiService';
import { OblivionRepository, OblivionPath } from '../../../types/obi';
import Sidebar from '../../../components/sidebar';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock,
  Users,
  Calendar,
  ArrowLeft,
  Star,
  Clock
} from 'lucide-react';

export default function RepositoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const repositoryId = params.repositoryId as string;

  const [repository, setRepository] = useState<OblivionRepository | null>(null);
  const [paths, setPaths] = useState<OblivionPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');
  const [showCreatePath, setShowCreatePath] = useState(false);
  const [newPath, setNewPath] = useState({
    name: '',
    description: '',
    price: 0,
    isFree: true,
    category: '',
    estimatedDuration: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  });

  useEffect(() => {
    loadRepositoryData();
  }, [repositoryId]);

  const loadRepositoryData = async () => {
    try {
      setLoading(true);
      const [repoData, pathsData] = await Promise.all([
        obiService.getRepository(repositoryId),
        obiService.getRepositoryPaths(repositoryId)
      ]);
      
      setRepository(repoData);
      setPaths(pathsData);
    } catch (error) {
      console.error('Error loading repository data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user && repository && user.walletAddress === repository.creatorId;

  const handleCreatePath = async () => {
    if (!user || !repository) return;

    try {
      const pathData = {
        ...newPath,
        repositoryId,
        creatorId: user.walletAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
        assetCount: 0,
        enrolledCount: 0,
        rating: 0,
        reviewCount: 0
      };

      await obiService.createPath(pathData);
      await loadRepositoryData();
      setShowCreatePath(false);
      setNewPath({
        name: '',
        description: '',
        price: 0,
        isFree: true,
        category: '',
        estimatedDuration: '',
        difficulty: 'beginner'
      });
    } catch (error) {
      console.error('Error creating path:', error);
    }
  };

  const handleDeletePath = async (pathId: string) => {
    if (!confirm('Are you sure you want to delete this path? This action cannot be undone.')) {
      return;
    }

    try {
      await obiService.deletePath(pathId);
      await loadRepositoryData();
    } catch (error) {
      console.error('Error deleting path:', error);
    }
  };

  const filteredPaths = paths.filter(path => {
    const matchesSearch = path.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'free' && path.isFree) ||
                         (filterType === 'paid' && !path.isFree);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading repository...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Repository Not Found</h2>
              <p className="text-slate-400 mb-4">The repository you're looking for doesn't exist.</p>
              <button
                onClick={() => router.push('/obi')}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                Go to OBI
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
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 py-6 z-10 mb-6">
            <button
              onClick={() => router.push(`/obi/venture/${repository.ventureId}`)}
              className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Venture
            </button>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-3">{repository.name}</h1>
                <p className="text-slate-300 mb-4 text-lg leading-relaxed">{repository.description}</p>
                <div className="flex items-center flex-wrap gap-6 text-sm">
                  <span className="flex items-center text-slate-400">
                    <BookOpen className="h-4 w-4 mr-2 text-purple-400" />
                    <span className="text-purple-400 font-medium">{paths.length}</span>
                    <span className="ml-1">Paths</span>
                  </span>
                  <span className="flex items-center text-slate-400">
                    <Users className="h-4 w-4 mr-2 text-blue-400" />
                    <span className="text-blue-400 font-medium">{repository.followerCount || 0}</span>
                    <span className="ml-1">Followers</span>
                  </span>
                  <span className="flex items-center text-slate-400">
                    <Calendar className="h-4 w-4 mr-2 text-green-400" />
                    <span>Created</span>
                    <span className="ml-1 text-green-400 font-medium">
                      {repository.createdAt ? 
                        (repository.createdAt.seconds ? 
                          new Date(repository.createdAt.seconds * 1000).toLocaleDateString() :
                          new Date(repository.createdAt).toLocaleDateString()
                        ) : 
                        'Recently'
                      }
                    </span>
                  </span>
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center space-x-3 ml-6">
                  <button
                    onClick={() => router.push(`/obi/repository/${repositoryId}/edit`)}
                    className="flex items-center px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all duration-200"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Repository
                  </button>
                  <button
                    onClick={() => setShowCreatePath(true)}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Path
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'free' | 'paid')}
                className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              >
                <option value="all">All Paths</option>
                <option value="free">Free Paths</option>
                <option value="paid">Paid Paths</option>
              </select>
            </div>
          </div>

          {/* Paths Grid */}
          {filteredPaths.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Paths Found</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                {searchTerm ? 'No paths match your search criteria.' : 'This repository doesn\'t have any learning paths yet.'}
              </p>
              {isOwner && !searchTerm && (
                <button
                  onClick={() => setShowCreatePath(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  Create First Path
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPaths.map((path) => (
                <div 
                  key={path.id} 
                  onClick={() => router.push(`/obi/path/${path.id}`)}
                  className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 flex-1 mr-3">
                      {path.name}
                    </h3>
                    {isOwner && (
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/obi/path/${path.id}/edit`);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-600/50 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePath(path.id!);
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-600/50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {path.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {path.isFree ? (
                        <div className="flex items-center px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
                          <Unlock className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">Free</span>
                        </div>
                      ) : (
                        <div className="flex items-center px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          <Star className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">{path.price} XLM</span>
                        </div>
                      )}
                    </div>
                    {path.difficulty && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        path.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        path.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {path.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-slate-400">
                      <span className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1 text-purple-400" />
                        <span className="text-purple-400 font-medium">{path.assetCount || 0}</span>
                        <span className="ml-1">Assets</span>
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-blue-400" />
                        <span className="text-blue-400 font-medium">{path.enrolledCount || 0}</span>
                        <span className="ml-1">Enrolled</span>
                      </span>
                    </div>
                    {path.estimatedDuration && (
                      <div className="flex items-center text-slate-400">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-xs">{path.estimatedDuration}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Path Modal */}
          {showCreatePath && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl max-w-md w-full p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Create New Path</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Path Name</label>
                    <input
                      type="text"
                      value={newPath.name}
                      onChange={(e) => setNewPath({ ...newPath, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="Enter path name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea
                      value={newPath.description}
                      onChange={(e) => setNewPath({ ...newPath, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="Describe your path..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                      <input
                        type="text"
                        value={newPath.category}
                        onChange={(e) => setNewPath({ ...newPath, category: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                        placeholder="e.g., Tech, Business"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
                      <select
                        value={newPath.difficulty}
                        onChange={(e) => setNewPath({ ...newPath, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Duration</label>
                    <input
                      type="text"
                      value={newPath.estimatedDuration}
                      onChange={(e) => setNewPath({ ...newPath, estimatedDuration: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="e.g., 4 weeks, 10 hours"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPath.isFree}
                        onChange={(e) => setNewPath({ ...newPath, isFree: e.target.checked, price: e.target.checked ? 0 : newPath.price })}
                        className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-slate-300">Free Path</span>
                    </label>
                    {!newPath.isFree && (
                      <div className="flex items-center">
                        <span className="text-sm text-slate-300 mr-2">Price (XLM):</span>
                        <input
                          type="number"
                          value={newPath.price}
                          onChange={(e) => setNewPath({ ...newPath, price: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-3 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-white"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    onClick={() => setShowCreatePath(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePath}
                    disabled={!newPath.name.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Create Path
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
