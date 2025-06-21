'use client';

import React, { useState, useEffect, use } from 'react';
import { getUserByUsername, getUserFollowerCount, getUserFollowingCount } from '../../services/userService';
import { getPostsByUser } from '../../services/postService';
import { getUserVentures, getUserEnrolledPaths, getUserCompletedPaths } from '../../services/obiService';
import { Campaign } from "../../../../packages/oblivion/src";
import { useRouter } from 'next/navigation';
import { useWallet } from '../../contexts/WalletContext';
import Sidebar from '../../components/sidebar';
import ProfilePosts from '../../components/ProfilePosts';
import ProfileActions from './ProfileActions';
import FollowersModal from '../../components/FollowersModal';
import { OblivionVenture, OblivionPath, PathEnrollment } from '../../types/obi';

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const { contract } = useWallet();
  const resolvedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [following, setFollowing] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [ventures, setVentures] = useState<OblivionVenture[]>([]);
  const [enrolledPaths, setEnrolledPaths] = useState<OblivionPath[]>([]);
  const [completedPaths, setCompletedPaths] = useState<OblivionPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'ventures' | 'paths' | 'campaigns'>('posts');

  // Function to get user's campaigns
  const getUserCampaigns = async (userWalletAddress: string): Promise<Campaign[]> => {
    if (!contract) return [];
    
    try {
      // Get all campaigns first
      const countResult = await contract.get_campaign_count();
      const count = Number(countResult.result);
      
      if (count === 0) return [];
      
      const userCampaigns: Campaign[] = [];
      
      // Try to get all campaigns first
      try {
        const allCampaignsResult = await contract.get_all_campaigns();
        if (allCampaignsResult.result && Array.isArray(allCampaignsResult.result)) {
          for (const campaignData of allCampaignsResult.result) {
            let campaign: Campaign | null = null;
            
            if (typeof campaignData === 'object' && campaignData !== null) {
              if ('creator' in campaignData && 'title' in campaignData) {
                campaign = campaignData as Campaign;
              } else {
                try {
                  const parsedData = parseContractResponse(campaignData);
                  if (parsedData && parsedData.creator && parsedData.title) {
                    campaign = {
                      id: parsedData.id || BigInt(0),
                      creator: parsedData.creator,
                      title: parsedData.title,
                      description: parsedData.description || '',
                      image_url: parsedData.image_url || '',
                      created_at: parsedData.created_at || BigInt(0),
                      total_donated: parsedData.total_donated || BigInt(0),
                      is_active: parsedData.is_active || true
                    };
                  }
                } catch (parseError) {
                  console.error('Error parsing campaign:', parseError);
                }
              }
            }
            
            // Check if this campaign belongs to the user
            if (campaign && campaign.creator === userWalletAddress) {
              userCampaigns.push(campaign);
            }
          }
        }
      } catch (getAllError) {
        console.error('Error with get_all_campaigns, falling back to individual fetch:', getAllError);
        
        // Fallback: Check each campaign individually
        for (let i = 1; i <= count; i++) {
          try {
            const campaignResult = await contract.get_campaign({ campaign_id: BigInt(i) });
            if (campaignResult.result) {
              let campaign: Campaign | null = null;
              const campaignData = campaignResult.result;
              
              if (typeof campaignData === 'object' && campaignData !== null) {
                if ((campaignData as any)._arm === 'some' && (campaignData as any)._value) {
                  const campaignValue = (campaignData as any)._value;
                  try {
                    const parsedData = parseContractResponse(campaignValue);
                    if (parsedData && parsedData.creator && parsedData.title) {
                      campaign = {
                        id: parsedData.id || BigInt(i),
                        creator: parsedData.creator,
                        title: parsedData.title,
                        description: parsedData.description || '',
                        image_url: parsedData.image_url || '',
                        created_at: parsedData.created_at || BigInt(0),
                        total_donated: parsedData.total_donated || BigInt(0),
                        is_active: parsedData.is_active || true
                      };
                    }
                  } catch (parseError) {
                    console.error(`Error parsing campaign ${i}:`, parseError);
                  }
                } else if ('creator' in campaignData && 'title' in campaignData) {
                  campaign = campaignData as Campaign;
                }
              }
              
              // Check if this campaign belongs to the user
              if (campaign && campaign.creator === userWalletAddress) {
                userCampaigns.push(campaign);
              }
            }
          } catch (error) {
            // Skip this campaign if there's an error
            continue;
          }
        }
      }
      
      return userCampaigns.reverse(); // Show newest first
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      return [];
    }
  };

  // Helper function to parse contract responses (same as campaigns page)
  const parseContractResponse = (response: any): any => {
    if (!response) return null;
    
    // Handle Option type (Some/None)
    if (response._arm === 'some' && response._value) {
      return parseContractResponse(response._value);
    } else if (response._arm === 'none') {
      return null;
    }
    
    // Handle direct Map format (when _arm is "map")
    if (response._arm === 'map' && response._value && Array.isArray(response._value)) {
      return parseMapResponse(response._value);
    }
    
    // Handle direct objects that might have been properly parsed already
    if (response.creator !== undefined && response.title !== undefined) {
      return response;
    }
    
    return response;
  };

  const parseMapResponse = (mapArray: any[]): any => {
    const result: any = {};
    
    for (const item of mapArray) {
      if (item._attributes && item._attributes.key && item._attributes.val) {
        const key = item._attributes.key;
        const val = item._attributes.val;
        
        // Extract key name
        let keyName = '';
        if (key._value && typeof key._value === 'string') {
          keyName = key._value;
        } else if (key._value && key._value.data) {
          keyName = Buffer.from(key._value.data).toString('utf8');
        }
        
        // Extract value based on type
        let value = null;
        if (val._arm === 'str') {
          if (val._value && typeof val._value === 'string') {
            value = val._value;
          } else if (val._value && val._value.data) {
            value = Buffer.from(val._value.data).toString('utf8');
          }
        } else if (val._arm === 'u64' || val._arm === 'i128') {
          if (val._value && val._value._value) {
            value = BigInt(val._value._value);
          } else if (typeof val._value === 'string' || typeof val._value === 'number') {
            value = BigInt(val._value);
          }
        } else if (val._arm === 'address') {
          try {
            if (val._value && typeof val._value === 'string') {
              value = val._value;
            }
          } catch (error) {
            console.error('Error parsing address:', error);
            value = 'Invalid Address';
          }
        }
        
        if (keyName && value !== null) {
          result[keyName] = value;
        }
      }
    }
    
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getUserByUsername(resolvedParams.userId);
        
        if (!userData) {
          router.push('/404');
          return;
        }

        setUser(userData);

        // Fetch user's posts and follow counts
        const [postsData, followingCount, followersCount, venturesData, enrolledPathsData, completedPathsData] = await Promise.all([
          getPostsByUser(userData.walletAddress, 20),
          getUserFollowingCount(userData.walletAddress),
          getUserFollowerCount(userData.walletAddress),
          getUserVentures(userData.walletAddress),
          getUserEnrolledPaths(userData.walletAddress),
          getUserCompletedPaths(userData.walletAddress)
        ]);

        setPosts(postsData);
        setFollowing(followingCount);
        setFollowers(followersCount);
        setVentures(venturesData);
        setEnrolledPaths(enrolledPathsData);
        setCompletedPaths(completedPathsData);

        // Fetch user's campaigns only if contract is available
        if (contract) {
          setCampaignsLoading(true);
          try {
            const userCampaigns = await getUserCampaigns(userData.walletAddress);
            setCampaigns(userCampaigns);
          } catch (campaignError) {
            console.error('Error fetching campaigns:', campaignError);
          } finally {
            setCampaignsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.userId, contract]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">User not found</div>
      </div>
    );
  }return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        <section className="flex-1 ml-20 lg:ml-72 px-4 lg:px-8 py-8">
          {/* Cover Image Area */}
          <div className="relative w-full h-48 lg:h-64 rounded-3xl overflow-hidden mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm"></div>
          </div>

          {/* Profile Content */}
          <div className="relative -mt-20 lg:-mt-24 z-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-8">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-6 lg:mb-0">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 shadow-2xl">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-4xl lg:text-5xl font-extrabold">{user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>                {/* Name & Username */}
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                    {user.name}
                  </h1>
                  <p className="text-xl text-slate-300 font-medium mb-4">@{user.username}</p>                  {user.bio && (
                    <div className="mb-4">
                      <p className="text-slate-300 max-w-md text-sm lg:text-base leading-relaxed bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/30">
                        {user.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>              {/* Action Buttons */}
              <ProfileActions 
                profileUser={{
                  username: user.username || '',
                  walletAddress: user.walletAddress
                }}
              />
            </div>            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              <button 
                onClick={() => setShowFollowingModal(true)}
                className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors duration-300">
                    {following}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">Following</div>
                </div>
              </button>

              <button 
                onClick={() => setShowFollowersModal(true)}
                className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors duration-300">
                    {followers >= 1000 ? `${(followers/1000).toFixed(1)}K` : followers}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">Followers</div>
                </div>
              </button>
              
              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors duration-300">
                    {posts.length}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">Posts</div>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors duration-300">
                    {ventures.length}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">Ventures</div>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors duration-300">
                    {enrolledPaths.length}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">Learning Paths</div>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300 group">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors duration-300">
                    {campaigns.length}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">Campaigns</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-800/50 mb-8">
            <nav className="flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>Posts</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'posts'
                    ? 'bg-blue-900/50 text-blue-400'
                    : 'bg-slate-800/50 text-slate-400'
                }`}>
                  {posts.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ventures')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'ventures'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>O.B.I Ventures</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'ventures'
                    ? 'bg-orange-900/50 text-orange-400'
                    : 'bg-slate-800/50 text-slate-400'
                }`}>
                  {ventures.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('paths')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'paths'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>Learning Paths</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'paths'
                    ? 'bg-indigo-900/50 text-indigo-400'
                    : 'bg-slate-800/50 text-slate-400'
                }`}>
                  {enrolledPaths.length + completedPaths.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'campaigns'
                    ? 'border-yellow-500 text-yellow-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>Campaigns</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'campaigns'
                    ? 'bg-yellow-900/50 text-yellow-400'
                    : 'bg-slate-800/50 text-slate-400'
                }`}>
                  {campaigns.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Content Section */}
          <div className="min-h-[400px]">
            {activeTab === 'posts' && (
              <ProfilePosts posts={posts} username={user.username || 'User'} />
            )}
            
            {activeTab === 'ventures' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">O.B.I Ventures</h3>
                {ventures.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 text-lg mb-2">No ventures yet</div>
                    <div className="text-slate-500 text-sm">This user hasn't created any ventures</div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {ventures.map((venture, index) => (
                      <div key={index} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300">
                        <h4 className="text-white font-semibold text-lg mb-2">{venture.name}</h4>
                        <p className="text-slate-400 text-sm mb-4">{venture.description}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Paths: {venture.totalPaths || 0}</span>
                          <span>Followers: {venture.followerCount || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'paths' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">Learning Paths</h3>
                {(enrolledPaths.length === 0 && completedPaths.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 text-lg mb-2">No learning paths yet</div>
                    <div className="text-slate-500 text-sm">This user hasn't enrolled in any learning paths</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {completedPaths.length > 0 && (
                      <div>
                        <h4 className="text-green-400 font-semibold mb-3">Completed Paths</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          {completedPaths.map((path, index) => (
                            <div key={`completed-${index}`} className="bg-slate-900/60 backdrop-blur-sm border border-green-800/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all duration-300">
                              <h5 className="text-white font-semibold mb-2">{path.name}</h5>
                              <p className="text-slate-400 text-sm mb-3">{path.description}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-green-400">✓ Completed</span>
                                <span className="text-slate-500">{path.difficulty || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {enrolledPaths.length > 0 && (
                      <div>
                        <h4 className="text-blue-400 font-semibold mb-3">Enrolled Paths</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          {enrolledPaths.map((path, index) => (
                            <div key={`enrolled-${index}`} className="bg-slate-900/60 backdrop-blur-sm border border-blue-800/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all duration-300">
                              <h5 className="text-white font-semibold mb-2">{path.name}</h5>
                              <p className="text-slate-400 text-sm mb-3">{path.description}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-blue-400">📚 In Progress</span>
                                <span className="text-slate-500">{path.difficulty || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">Campaigns</h3>
                {campaignsLoading ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 text-lg mb-2">Loading campaigns...</div>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 text-lg mb-2">No campaigns yet</div>
                    <div className="text-slate-500 text-sm">This user hasn't created any campaigns</div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id.toString()} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden hover:bg-slate-800/60 hover:border-slate-700/50 transition-all duration-300">
                        {campaign.image_url && (
                          <div className="aspect-video bg-slate-800 overflow-hidden">
                            <img 
                              src={campaign.image_url} 
                              alt={campaign.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <h4 className="text-white font-semibold text-lg mb-2 line-clamp-1">{campaign.title}</h4>
                          <p className="text-slate-400 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                          <div className="flex items-center justify-between text-xs mb-4">
                            <span className={`px-2 py-1 rounded-full ${
                              campaign.is_active 
                                ? 'bg-green-900/50 text-green-400' 
                                : 'bg-red-900/50 text-red-400'
                            }`}>
                              {campaign.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-slate-500">
                              Raised: {campaign.total_donated.toString()} XLM
                            </span>
                          </div>
                          <button
                            onClick={() => router.push(`/campaigns?highlight=${campaign.id}`)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 text-sm"
                          >
                            View Campaign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={user.walletAddress}
        type="followers"
        title={`${user.name || user.username}'s Followers`}
      />

      <FollowersModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userId={user.walletAddress}
        type="following"
        title={`${user.name || user.username} Following`}
      />
    </div>
  );
}
