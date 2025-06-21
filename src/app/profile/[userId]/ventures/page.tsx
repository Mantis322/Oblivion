'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getUserByUsername } from '../../../services/userService';
import { getUserVentures } from '../../../services/obiService';
import Sidebar from '../../../components/sidebar';
import ProfileHeader from '../ProfileHeader';
import { OblivionVenture } from '../../../types/obi';
import { FaBuilding, FaUsers, FaExternalLinkAlt, FaPlus } from 'react-icons/fa';
import { ArrowLeft } from 'lucide-react';

interface ProfileVenturesPageProps {
  params: Promise<{ userId: string }>;
}

export default function ProfileVenturesPage({ params }: ProfileVenturesPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [ventures, setVentures] = useState<OblivionVenture[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadData();
    // Load current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, [resolvedParams.userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let userData = await getUserByUsername(resolvedParams.userId);
      
      if (!userData) {
        const { getUserByWallet } = await import('../../../services/userService');
        userData = await getUserByWallet(resolvedParams.userId);
      }
      
      if (!userData) {
        router.push('/404');
        return;
      }

      setUser(userData);
      
      // Load ventures
      const venturesData = await getUserVentures(userData.walletAddress);
      setVentures(venturesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/404');
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = currentUser && user && currentUser.walletAddress === user.walletAddress;

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 px-4 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 px-4 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">User Not Found</h2>
                <p className="text-slate-400 mb-4">
                  The user you're looking for doesn't exist.
                </p>
                <button
                  onClick={() => router.push('/home')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        <section className="flex-1 ml-20 lg:ml-72 px-4 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.push(`/profile/${resolvedParams.userId}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </button>

          {/* Profile Header */}
          <ProfileHeader user={user} />

          {/* Navigation Tabs */}
          <div className="border-b border-slate-800/50 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => router.push(`/profile/${resolvedParams.userId}`)}
                className="flex items-center py-4 px-1 border-b-2 border-transparent text-slate-400 hover:text-white font-medium text-sm transition-colors"
              >
                <span>Posts</span>
              </button>
              <button
                className="flex items-center py-4 px-1 border-b-2 border-orange-500 text-orange-400 font-medium text-sm"
              >
                <span>O.B.I Ventures</span>
                <span className="ml-2 px-2 py-0.5 bg-orange-900/50 text-orange-400 rounded-full text-xs">
                  {ventures.length}
                </span>
              </button>
              <button
                onClick={() => router.push(`/profile/${resolvedParams.userId}/paths`)}
                className="flex items-center py-4 px-1 border-b-2 border-transparent text-slate-400 hover:text-white font-medium text-sm transition-colors"
              >
                <span>Learning Paths</span>
              </button>
            </nav>
          </div>

          {/* Ventures Content */}
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FaBuilding className="text-orange-400 text-2xl" />
                <h2 className="text-2xl font-bold text-white">
                  {isOwnProfile ? 'My Ventures' : `${user.name || user.username}'s Ventures`}
                </h2>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/obi/create-venture')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  <FaPlus className="text-sm" />
                  Create Venture
                </button>
              )}
            </div>

            {/* Ventures Grid */}
            {ventures.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ventures.map((venture) => (
                  <div 
                    key={venture.id} 
                    className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group cursor-pointer"
                    onClick={() => router.push(`/obi/venture/${venture.id}`)}
                  >
                    {venture.photo && (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-slate-800">
                        <img src={venture.photo} alt={venture.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors duration-300">
                      {venture.name}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                      {venture.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>{new Date(venture.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <FaUsers className="text-xs" />
                        <span>{venture.repositories?.length || 0} repos</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-orange-400 text-sm">
                      <span>View Details</span>
                      <FaExternalLinkAlt className="text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FaBuilding className="text-slate-600 text-6xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  {isOwnProfile ? 'No ventures yet' : `${user.name || user.username} hasn't created any ventures yet`}
                </h3>
                <p className="text-slate-500 mb-6">
                  {isOwnProfile 
                    ? 'Create your first venture to get started with O.B.I.' 
                    : 'Check back later for new ventures.'}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => router.push('/obi/create-venture')}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors mx-auto"
                  >
                    <FaPlus className="text-sm" />
                    Create Your First Venture
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
