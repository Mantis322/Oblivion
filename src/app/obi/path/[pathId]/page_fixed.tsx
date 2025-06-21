'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { obiService } from '../../../services/obiService';
import { OblivionPath, OblivionAsset } from '../../../types/obi';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Play,
  Image,
  Video,
  Download,
  Lock,
  Unlock,
  DollarSign,
  Users,
  Clock,
  Star,
  ArrowLeft,
  BookOpen,
  ShoppingCart,
  CheckCircle
} from 'lucide-react';

export default function PathDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useWallet();
  const pathId = params.pathId as string;

  const [path, setPath] = useState<OblivionPath | null>(null);
  const [assets, setAssets] = useState<OblivionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadPathData();
  }, [pathId, user]);

  const loadPathData = async () => {
    try {
      setLoading(true);
      const pathData = await obiService.getPath(pathId);
      setPath(pathData);

      // Check if user has access to this path
      if (user) {
        const access = await obiService.checkPathAccess(pathId, user.walletAddress);
        setHasAccess(access || pathData.isFree || pathData.creatorId === user.walletAddress);
        
        // Load assets if user has access
        if (access || pathData.isFree || pathData.creatorId === user.walletAddress) {
          const assetsData = await obiService.getPathAssets(pathId);
          setAssets(assetsData);
        }
      } else if (pathData.isFree) {
        const assetsData = await obiService.getPathAssets(pathId);
        setAssets(assetsData);
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Error loading path data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user && path && user.walletAddress === path.creatorId;

  const handlePurchasePath = async () => {
    if (!user || !path) return;

    // For now, just show pricing information without actual purchase
    alert(`This path costs $${path.price}. Payment processing will be implemented in a future update.`);
    
    // Uncomment below when payment processing is ready:
    /*
    try {
      setIsPurchasing(true);
      // In a real implementation, this would integrate with a payment processor
      await obiService.purchasePath(pathId, user.walletAddress);
      await loadPathData(); // Reload to get access
    } catch (error) {
      console.error('Error purchasing path:', error);
    } finally {
      setIsPurchasing(false);
    }
    */
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      return;
    }

    try {
      await obiService.deleteAsset(assetId);
      await loadPathData();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Repository
        </button>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Path Cover Image */}
          {path.photo && (
            <div className="h-48 overflow-hidden">
              <img 
                src={path.photo} 
                alt={path.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{path.name}</h1>
                  {path.isFree ? (
                    <span className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <Unlock className="h-4 w-4 mr-1" />
                      Free
                    </span>
                  ) : (
                    <span className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ${path.price}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">{path.description}</p>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {assets.length} Assets
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {path.enrolledCount} Enrolled
                  </span>
                  {path.estimatedDuration && (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {path.estimatedDuration}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    path.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                    path.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {path.difficulty ? path.difficulty.charAt(0).toUpperCase() + path.difficulty.slice(1) : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {!hasAccess && !path.isFree && (
                <button
                  onClick={handlePurchasePath}
                  disabled={isPurchasing}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPurchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View Pricing - ${path.price}
                    </>
                  )}
                </button>
              )}
              
              {hasAccess && !isOwner && (
                <span className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enrolled
                </span>
              )}
              
              {isOwner && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/obi/path/${pathId}/edit`)}
                    className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Path
                  </button>
                  <button
                    onClick={() => router.push(`/obi/path/${pathId}/create-asset`)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Required Message */}
      {!hasAccess && !path.isFree && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <Lock className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Premium Content</h3>
              <p className="text-sm text-blue-700 mt-1">
                This path is priced at ${path.price}. Payment processing coming soon!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assets Section */}
      {hasAccess && (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Assets List */}
          <div className="space-y-4">
            {filteredAssets.map((asset, index) => (
              <div key={asset.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                        {getAssetIcon(asset.type || 'document')}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm text-gray-500 font-medium">#{index + 1}</span>
                        <h3 className="text-lg font-semibold text-gray-900">{asset.title}</h3>
                        {asset.type && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                          </span>
                        )}
                      </div>
                      
                      {asset.description && (
                        <p className="text-gray-600 mb-3">{asset.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created {new Date(asset.createdAt.seconds * 1000).toLocaleDateString()}</span>
                        {asset.duration && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {asset.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => router.push(`/obi/asset/${asset.id}`)}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      View
                    </button>
                    
                    {isOwner && (
                      <>
                        <button
                          onClick={() => router.push(`/obi/asset/${asset.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id!)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm 
                  ? 'No assets match your search' 
                  : 'No assets created yet'}
              </p>
              {isOwner && !searchTerm && (
                <button
                  onClick={() => router.push(`/obi/path/${pathId}/create-asset`)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Asset
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
