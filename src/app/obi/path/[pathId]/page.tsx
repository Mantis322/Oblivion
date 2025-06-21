'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { PaymentService } from '../../../services/paymentService';
import { obiService } from '../../../services/obiService';
import { OblivionPath, OblivionAsset } from '../../../types/obi';
import Sidebar from '../../../components/sidebar';
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
  Users,
  Clock,
  Star,
  ArrowLeft,
  BookOpen,
  ShoppingCart,
  CheckCircle,
  X,
  AlertTriangle,
  CreditCard,
  File
} from 'lucide-react';

export default function PathDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, processPayment } = useWallet();
  const pathId = params.pathId as string;

  const [path, setPath] = useState<OblivionPath | null>(null);
  const [assets, setAssets] = useState<OblivionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [totalAssetCount, setTotalAssetCount] = useState(0);

  // Modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadPathData();
  }, [pathId, user]);

  const loadPathData = async () => {
    try {
      setLoading(true);
      const pathData = await obiService.getPath(pathId);
      setPath(pathData);

      // Load real-time enrolled count
      const currentEnrolledCount = await obiService.getPathEnrolledCount(pathId);
      setEnrolledCount(currentEnrolledCount);

      // Load real-time total asset count (for everyone, regardless of access)
      const allAssets = await obiService.getPathAssets(pathId);
      setTotalAssetCount(allAssets.length);

      // Check if user has access to this path
      if (user) {
        const access = await obiService.checkPathAccess(pathId, user.walletAddress);
        
        // If it's a free path and user doesn't have access, auto-enroll them
        if (pathData.isFree && !access && pathData.creatorId !== user.walletAddress) {
          try {
            const enrollResult = await obiService.purchasePath(pathId, user.walletAddress);
            if (enrollResult.success) {
              // Reload the page data to reflect the enrollment
              await loadPathData();
              return;
            }
          } catch (error) {
            console.error('Auto-enrollment error:', error);
          }
        }
        
        const finalAccess = access || pathData.isFree || pathData.creatorId === user.walletAddress;
        setHasAccess(finalAccess);
        
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

    // Show purchase confirmation modal instead of confirm dialog
    if (!path.isFree) {
      setShowPurchaseModal(true);
      return;
    }

    // Handle free path enrollment directly
    try {
      setIsPurchasing(true);
      const result = await obiService.purchasePath(pathId, user.walletAddress);
      if (result.success) {
        await loadPathData(); // Reload to get updated access and count
        setModalMessage(`Successfully enrolled in "${path.name}"!`);
        setShowSuccessModal(true);
      } else {
        setModalMessage(result.error || 'Failed to enroll in path');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error enrolling in free path:', error);
      setModalMessage('Failed to enroll. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!user || !path) return;

    try {
      setIsPurchasing(true);
      setShowPurchaseModal(false);
      
      // Handle paid path with Stellar payment
      const paymentData = PaymentService.getPathPaymentDetails(path, path.creatorId);

      // Process payment through Stellar network
      const paymentResult = await processPayment(paymentData);
      
      if (paymentResult.success) {
        // Payment successful, enroll user in path
        const enrollResult = await obiService.purchasePath(
          pathId, 
          user.walletAddress, 
          paymentResult.transactionHash
        );
        
        if (enrollResult.success) {
          setModalMessage(`Payment successful! You are now enrolled in "${path.name}".`);
          setTransactionHash(paymentResult.transactionHash || '');
          setShowSuccessModal(true);
          await loadPathData(); // Reload to get updated access and count
        } else {
          setModalMessage('Payment processed but enrollment failed. Please contact support.');
          setShowErrorModal(true);
        }
      } else {
        setModalMessage(`Payment failed: ${paymentResult.error}`);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error purchasing path:', error);
      setModalMessage('Failed to process purchase. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    setAssetToDelete(assetId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;

    try {
      await obiService.deleteAsset(assetToDelete);
      await loadPathData();
      setModalMessage('Asset deleted successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting asset:', error);
      setModalMessage('Failed to delete asset. Please try again.');
      setShowErrorModal(true);
    } finally {
      setShowDeleteModal(false);
      setAssetToDelete(null);
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
      <div className="bg-slate-900 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading path...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="bg-slate-900 min-h-screen">
        <main className="flex max-w-[1600px] mx-auto">
          <Sidebar />
          <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">Path Not Found</h2>
                <p className="text-slate-400 mb-4">The learning path you're looking for doesn't exist.</p>
                <button
                  onClick={() => router.push('/obi')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  Go to OBI
                </button>
              </div>
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
              onClick={() => router.push(`/obi/repository/${path.repositoryId}`)}
              className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Repository
            </button>
            
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
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
                      <h1 className="text-3xl font-bold text-white">{path.name}</h1>
                      {path.isFree ? (
                        <span className="flex items-center px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                          <Unlock className="h-4 w-4 mr-1" />
                          Free
                        </span>
                      ) : (
                        <span className="flex items-center px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                          <Star className="h-4 w-4 mr-1" />
                          {path.price} XLM
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-300 mb-4 text-lg leading-relaxed">{path.description}</p>
                    
                    <div className="flex items-center flex-wrap gap-6 text-sm">
                      <span className="flex items-center text-slate-400">
                        <BookOpen className="h-4 w-4 mr-2 text-purple-400" />
                        <span className="text-purple-400 font-medium">{totalAssetCount}</span>
                        <span className="ml-1">Assets</span>
                      </span>
                      <span className="flex items-center text-slate-400">
                        <Users className="h-4 w-4 mr-2 text-blue-400" />
                        <span className="text-blue-400 font-medium">{enrolledCount}</span>
                        <span className="ml-1">Enrolled</span>
                      </span>
                      {path.estimatedDuration && (
                        <span className="flex items-center text-slate-400">
                          <Clock className="h-4 w-4 mr-2 text-green-400" />
                          {path.estimatedDuration}
                        </span>
                      )}
                      {path.difficulty && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          path.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                          path.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {path.difficulty.charAt(0).toUpperCase() + path.difficulty.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-6">
                    {!hasAccess && !path?.isFree && (
                      <button
                        onClick={handlePurchasePath}
                        disabled={isPurchasing}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isPurchasing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Purchase ({path?.price} XLM)
                          </>
                        )}
                      </button>
                    )}
                    
                    {hasAccess && (
                      <div className="flex items-center px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enrolled
                      </div>
                    )}
                    
                    {isOwner && (
                      <button
                        onClick={() => router.push(`/obi/path/${pathId}/edit`)}
                        className="flex items-center px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-600/50 hover:text-white transition-all duration-200"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Path
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Access Required Message */}
          {!hasAccess && !path?.isFree && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-blue-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-blue-300">Premium Content</h3>
                  <p className="text-sm text-blue-200 mt-1">
                    This path is priced at {path?.price} XLM. Payment processing coming soon!
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Assets List */}
          <div className="space-y-4">
            {filteredAssets.map((asset, index) => (
              <div key={asset.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 hover:bg-slate-700/30 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-400">
                        {getAssetIcon(asset.type || 'document')}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm text-slate-400 font-medium">#{index + 1}</span>
                        <h3 className="text-lg font-semibold text-white">{asset.title}</h3>
                        {asset.type && (
                          <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full">
                            {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                          </span>
                        )}
                      </div>
                      
                      {asset.description && (
                        <p className="text-slate-300 mb-3">{asset.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span>Created{' '}
                          {asset.createdAt ? 
                            (asset.createdAt.seconds ? 
                              new Date(asset.createdAt.seconds * 1000).toLocaleDateString() :
                              new Date(asset.createdAt).toLocaleDateString()
                            ) : 
                            'Recently'
                          }
                        </span>
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
                      className="flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      View
                    </button>
                    
                    {isOwner && (
                      <>
                        <button
                          onClick={() => router.push(`/obi/asset/${asset.id}/edit`)}
                          className="p-2 text-slate-400 hover:text-purple-400 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id!)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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
      </main>

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && path && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Purchase Path</h3>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-2">{path.name}</h4>
              <p className="text-slate-300 mb-4">{path.description}</p>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Price:</span>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-xl font-bold text-white">{path.price} XLM</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-3">
                This will initiate a Stellar payment to the path creator.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={isPurchasing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isPurchasing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Success!</h3>
              <p className="text-slate-300 mb-4">{modalMessage}</p>
              {transactionHash && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 mb-4">
                  <p className="text-sm text-slate-400 mb-1">Transaction Hash:</p>
                  <p className="text-xs text-green-400 font-mono break-all">{transactionHash}</p>
                </div>
              )}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setTransactionHash('');
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowErrorModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Error</h3>
              <p className="text-slate-300 mb-6">{modalMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Delete Asset</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-300">
                Are you sure you want to delete this asset? This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
