'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getUserByUsername } from '../../../services/userService';
import { getUserEnrolledPaths, getUserCompletedPaths } from '../../../services/obiService';
import Sidebar from '../../../components/sidebar';
import ProfileHeader from '../ProfileHeader';
import { OblivionPath } from '../../../types/obi';
import { FaGraduationCap, FaBook, FaDollarSign, FaStar, FaUsers } from 'react-icons/fa';
import { ArrowLeft } from 'lucide-react';

interface ProfilePathsPageProps {
  params: Promise<{ userId: string }>;
}

export default function ProfilePathsPage({ params }: ProfilePathsPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [enrolledPaths, setEnrolledPaths] = useState<OblivionPath[]>([]);
  const [completedPaths, setCompletedPaths] = useState<OblivionPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'completed'>('enrolled');

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
      
      // Load paths
      const [enrolledData, completedData] = await Promise.all([
        getUserEnrolledPaths(userData.walletAddress),
        getUserCompletedPaths(userData.walletAddress)
      ]);
      
      setEnrolledPaths(enrolledData);
      setCompletedPaths(completedData);
      
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
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

  const PathCard = ({ path }: { path: OblivionPath }) => (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-white font-semibold text-sm group-hover:text-indigo-400 transition-colors duration-300">
          {path.name}
        </h4>
        {path.price > 0 && (
          <div className="flex items-center gap-1 text-green-400 text-xs">
            <FaDollarSign className="text-xs" />
            <span>{path.price}</span>
          </div>
        )}
      </div>
      <p className="text-slate-400 text-xs line-clamp-2 mb-3">
        {path.description}
      </p>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <FaUsers className="text-xs" />
          <span>{path.assetCount || 0} assets</span>
        </div>
        {path.rating && path.rating > 0 && (
          <div className="flex items-center gap-1 text-yellow-400">
            <FaStar className="text-xs" />
            <span>{path.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );

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
                onClick={() => router.push(`/profile/${resolvedParams.userId}/ventures`)}
                className="flex items-center py-4 px-1 border-b-2 border-transparent text-slate-400 hover:text-white font-medium text-sm transition-colors"
              >
                <span>O.B.I Ventures</span>
              </button>
              <button
                className="flex items-center py-4 px-1 border-b-2 border-indigo-500 text-indigo-400 font-medium text-sm"
              >
                <span>Learning Paths</span>
                <span className="ml-2 px-2 py-0.5 bg-indigo-900/50 text-indigo-400 rounded-full text-xs">
                  {enrolledPaths.length + completedPaths.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Learning Paths Content */}
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FaGraduationCap className="text-indigo-400 text-2xl" />
                <h2 className="text-2xl font-bold text-white">
                  {isOwnProfile ? 'My Learning Paths' : `${user.name || user.username}'s Learning Paths`}
                </h2>
              </div>
            </div>

            {/* Sub Navigation */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'enrolled'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <FaBook className="inline mr-2" />
                Currently Learning ({enrolledPaths.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'completed'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <FaGraduationCap className="inline mr-2" />
                Completed ({completedPaths.length})
              </button>
            </div>

            {/* Paths Grid */}
            {activeTab === 'enrolled' ? (
              enrolledPaths.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledPaths.map((path) => (
                    <PathCard key={path.id} path={path} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <FaBook className="text-slate-600 text-6xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">
                    {isOwnProfile ? 'No enrolled paths yet' : `${user.name || user.username} hasn't enrolled in any paths yet`}
                  </h3>
                  <p className="text-slate-500">
                    {isOwnProfile 
                      ? 'Explore the marketplace to find learning paths that interest you.' 
                      : 'Check back later for new learning activities.'}
                  </p>
                </div>
              )
            ) : (
              completedPaths.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedPaths.map((path) => (
                    <div key={path.id} className="bg-slate-900/60 backdrop-blur-sm border border-green-800/30 rounded-xl p-4 hover:bg-slate-800/60 hover:border-green-700/50 transition-all duration-300 group cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-white font-semibold text-sm group-hover:text-green-400 transition-colors duration-300">
                          {path.name}
                        </h4>
                        <FaGraduationCap className="text-green-400 text-sm" />
                      </div>
                      <p className="text-slate-400 text-xs line-clamp-2 mb-3">
                        {path.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-green-500">
                          <span>Completed</span>
                        </div>
                        {path.rating && path.rating > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <FaStar className="text-xs" />
                            <span>{path.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <FaGraduationCap className="text-slate-600 text-6xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">
                    {isOwnProfile ? 'No completed paths yet' : `${user.name || user.username} hasn't completed any paths yet`}
                  </h3>
                  <p className="text-slate-500">
                    {isOwnProfile 
                      ? 'Complete your first learning path to see it here.' 
                      : 'Check back later for completed achievements.'}
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
