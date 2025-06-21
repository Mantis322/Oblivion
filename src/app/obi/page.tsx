'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar';
import { useWallet } from '../contexts/WalletContext';
import { OblivionVenture } from '../types/obi';
import { obiService } from '../services/obiService';
import { FaSearch, FaBuilding, FaEye, FaPlus, FaStar, FaUser } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function OBIPage() {
  const { user } = useWallet();
  const router = useRouter();
  const [ventures, setVentures] = useState<OblivionVenture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OblivionVenture[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadVentures();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm]);

  const loadVentures = async () => {
    try {
      setLoading(true);
      const publicVentures = await obiService.getAllPublicVentures(20);
      
      // Dynamically load repository and path counts for each venture
      const venturesWithCounts = await Promise.all(
        publicVentures.map(async (venture) => {
          try {
            const repositories = await obiService.getRepositoriesByVenture(venture.id!);
            
            // Get path counts for all repositories in parallel
            const pathCounts = await Promise.all(
              repositories.map(async (repo) => {
                try {
                  const paths = await obiService.getRepositoryPaths(repo.id!);
                  return paths.length;
                } catch (error) {
                  console.error(`Error loading paths for repository ${repo.id}:`, error);
                  return 0;
                }
              })
            );
            
            const totalPaths = pathCounts.reduce((sum, count) => sum + count, 0);
            
            return {
              ...venture,
              repositories,
              totalPaths
            };
          } catch (error) {
            console.error(`Error loading data for venture ${venture.id}:`, error);
            return {
              ...venture,
              repositories: venture.repositories || [],
              totalPaths: 0
            };
          }
        })
      );
      
      setVentures(venturesWithCounts);
    } catch (error) {
      console.error('Error loading ventures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await obiService.searchVentures(searchTerm.trim());
      
      // Dynamically load repository and path counts for search results too
      const resultsWithCounts = await Promise.all(
        results.map(async (venture) => {
          try {
            const repositories = await obiService.getRepositoriesByVenture(venture.id!);
            
            // Get path counts for all repositories in parallel
            const pathCounts = await Promise.all(
              repositories.map(async (repo) => {
                try {
                  const paths = await obiService.getRepositoryPaths(repo.id!);
                  return paths.length;
                } catch (error) {
                  console.error(`Error loading paths for repository ${repo.id}:`, error);
                  return 0;
                }
              })
            );
            
            const totalPaths = pathCounts.reduce((sum, count) => sum + count, 0);
            
            return {
              ...venture,
              repositories,
              totalPaths
            };
          } catch (error) {
            console.error(`Error loading data for venture ${venture.id}:`, error);
            return {
              ...venture,
              repositories: venture.repositories || [],
              totalPaths: 0
            };
          }
        })
      );
      
      setSearchResults(resultsWithCounts);
    } catch (error) {
      console.error('Error searching ventures:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const displayedVentures = searchTerm.trim() ? searchResults : ventures;

  const handleCreateVenture = () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }
    router.push('/obi/create-venture');
  };

  const handleVentureClick = (venture: OblivionVenture) => {
    router.push(`/obi/venture/${venture.id}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        
        <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-6 z-10 mb-8">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                      <HiSparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-extrabold text-white tracking-tight">O.B.I.</h1>
                      <p className="text-slate-300 text-sm font-medium">
                        Oblivion Business Interface
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-lg font-medium">
                    Discover and explore business ventures, repositories, and learning paths
                  </p>
                </div>
                
                {user && (
                  <button
                    onClick={handleCreateVenture}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                  >
                    <FaPlus className="w-4 h-4" />
                    Create Venture
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {ventures.length}
                  </div>
                  <div className="text-sm text-slate-400">Active Ventures</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {ventures.reduce((acc, v) => acc + v.repositories.length, 0)}
                  </div>
                  <div className="text-sm text-slate-400">Repositories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {ventures.reduce((acc, v) => 
                      acc + v.repositories.reduce((racc, r) => racc + r.paths.length, 0), 0
                    )}
                  </div>
                  <div className="text-sm text-slate-400">Learning Paths</div>
                </div>
              </div>
              
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search ventures, repositories, and paths..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading ventures...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && displayedVentures.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-slate-800/40 rounded-2xl p-12 border border-slate-700/50 max-w-md mx-auto">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FaBuilding className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  {searchTerm ? 'No ventures found' : 'No ventures yet'}
                </h3>
                <p className="text-slate-400 mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search terms or explore other ventures.'
                    : 'Be the first to create a venture and start building your business presence.'
                  }
                </p>
                {!searchTerm && user && (
                  <button
                    onClick={handleCreateVenture}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    Create Your First Venture
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ventures Grid */}
          {!loading && displayedVentures.length > 0 && (
            <div className="grid gap-6 pb-8">
              {displayedVentures.map((venture) => (
                <div
                  key={venture.id}
                  onClick={() => handleVentureClick(venture)}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:bg-slate-800/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 cursor-pointer group"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Venture Image */}
                    <div className="lg:w-1/3">
                      <div className="relative h-48 lg:h-full min-h-[200px]">
                        {venture.photo ? (
                          <Image
                            src={venture.photo}
                            alt={venture.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <FaBuilding className="w-12 h-12 text-white/80" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-purple-600/90 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                            Venture
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Venture Content */}
                    <div className="lg:w-2/3 p-6 lg:p-8 flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                              {venture.name}
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-3">
                              {venture.description}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm text-slate-400 mb-4">
                          <div className="flex items-center gap-2">
                            <FaBuilding className="text-purple-400 w-4 h-4" />
                            <span>{venture.repositories?.length || 0} repositories</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaEye className="text-blue-400 w-4 h-4" />
                            <span>
                              {venture.totalPaths || 0} paths
                            </span>
                          </div>
                        </div>

                        {/* Links Preview */}
                        {venture.links.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {venture.links.slice(0, 3).map((link) => (
                              <span
                                key={link.id}
                                className="px-3 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full border border-slate-600/50"
                              >
                                {link.title}
                              </span>
                            ))}
                            {venture.links.length > 3 && (
                              <span className="px-3 py-1 bg-slate-700/50 text-slate-400 text-xs rounded-full border border-slate-600/50">
                                +{venture.links.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                        <div className="text-sm text-slate-400">
                          Updated {formatDate(venture.updatedAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <FaStar className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-slate-400">Featured</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
