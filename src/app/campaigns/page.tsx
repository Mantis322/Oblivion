'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar';
import DonateModal from '../components/DonateModal';
import CreateCampaignModal from '../components/CreateCampaignModal';
import WithdrawModal from '../components/WithdrawModal';
import UserLink from '../components/UserLink';
import Image from 'next/image';
import { Heart, Users, Search, Plus, RefreshCw, Wallet } from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";
import { useWallet } from '../contexts/WalletContext';
import { Campaign } from "../../../packages/oblivion/src";
import { 
  getUserByWallet, 
  saveCampaignFinalAmount, 
  getCampaignFinalAmount, 
  getMultipleCampaignFinalAmounts,
  likeCampaign,
  checkCampaignLike,
  getCampaignLikeCount,
  getMultipleCampaignLikeCounts,
  checkMultipleCampaignLikes
} from '../services/userService';
import { createNotification } from '../services/notificationService';

export default function CampaignsPage() {// Use wallet context
  const { address, kit, contract, isConnected, signTxForOblivion, user, walletType, submitViaLaunchtube } = useWallet();// UI states
  const [searchTerm, setSearchTerm] = useState("");  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
  }>({ isOpen: false, campaign: null });
  // Campaign states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignCount, setCampaignCount] = useState<number>(0);
  const [campaignBalances, setCampaignBalances] = useState<{[key: number]: string}>({});
  const [campaignStatuses, setCampaignStatuses] = useState<{[key: number]: boolean}>({});
  // Store final raised amounts for closed campaigns
  const [finalRaisedAmounts, setFinalRaisedAmounts] = useState<{[key: number]: bigint}>({});  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [creatorUsernames, setCreatorUsernames] = useState<{[key: string]: string}>({});
  const [creatorAvatars, setCreatorAvatars] = useState<{[key: string]: string}>({});
  const [withdrawing, setWithdrawing] = useState<{[key: number]: boolean}>({});
  
  // Like states
  const [campaignLikes, setCampaignLikes] = useState<{[key: number]: number}>({});
  const [userLikes, setUserLikes] = useState<{[key: number]: boolean}>({});
  const [likingCampaign, setLikingCampaign] = useState<{[key: number]: boolean}>({});
  // Helper function to parse Stellar contract responses
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
    
    return result;  };
  const loadCreatorUsername = async (walletAddress: string) => {
    if (!walletAddress || creatorUsernames[walletAddress]) return;
    
    try {
      const userData = await getUserByWallet(walletAddress);
      if (userData && userData.username) {
        setCreatorUsernames(prev => ({
          ...prev,
          [walletAddress]: userData.username!
        }));        // Also load avatar if available
        if (userData.avatar) {
          setCreatorAvatars(prev => ({
            ...prev,
            [walletAddress]: userData.avatar!
          }));
        }
      }
    } catch (error) {
      console.error(`Error loading username for ${walletAddress}:`, error);
    }
  };
  // Load final amounts from Firebase for closed campaigns
  const loadFinalAmountsFromFirebase = async (campaigns: Campaign[]) => {
    try {
      const campaignIds = campaigns.map(c => Number(c.id));
      const finalAmounts = await getMultipleCampaignFinalAmounts(campaignIds);
        if (Object.keys(finalAmounts).length > 0) {
        setFinalRaisedAmounts(prev => ({
          ...prev,
          ...finalAmounts
        }));
      }
    } catch (error) {
      console.error('Error loading final amounts from Firebase:', error);
    }
  };

  // Load campaign like data
  const loadCampaignLikes = async (campaigns: Campaign[]) => {
    try {
      const campaignIds = campaigns.map(c => Number(c.id));
      
      // Load like counts
      const likeCounts = await getMultipleCampaignLikeCounts(campaignIds);
      setCampaignLikes(likeCounts);
      
      // Load user likes if logged in
      if (address) {
        const userLikeStatus = await checkMultipleCampaignLikes(campaignIds, address);
        setUserLikes(userLikeStatus);
      }
    } catch (error) {
      console.error('Error loading campaign likes:', error);
    }
  };

  // Handle campaign like
  const handleCampaignLike = async (campaign: Campaign) => {
    if (!address) {
      toast.error('Please connect your wallet to like campaigns');
      return;
    }

    const campaignId = Number(campaign.id);
    setLikingCampaign(prev => ({ ...prev, [campaignId]: true }));

    try {      const result = await likeCampaign(
        campaignId,
        address,
        user?.username || 'user',
        user?.name || 'User'
      );

      if (result.success) {
        // Update local state
        setCampaignLikes(prev => ({ ...prev, [campaignId]: result.likeCount }));
        setUserLikes(prev => ({ ...prev, [campaignId]: result.isLiked }));

        // Send notification if liked (not unliked) and user is not the campaign creator
        if (result.isLiked && campaign.creator !== address) {
          try {            await createNotification({
              type: 'campaign_like',
              fromUserId: address,
              fromUserName: user?.username || 'user',
              fromUserDisplayName: user?.name || 'User',
              toUserId: campaign.creator,
              campaignId: campaignId,
              campaignTitle: campaign.title || 'Untitled Campaign'
            });
          } catch (notificationError) {
            console.error('Error creating campaign like notification:', notificationError);
          }        }

      } else {
        toast.error('Failed to update like status');
      }
    } catch (error) {
      console.error('Error liking campaign:', error);
      toast.error('Failed to like campaign');
    } finally {
      setLikingCampaign(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const loadCampaigns = async () => {
    if (!contract) return;
    
    setLoading(prev => ({ ...prev, loadCampaigns: true }));
    try {
      const countResult = await contract.get_campaign_count();      const count = Number(countResult.result);
      setCampaignCount(count);

      if (count === 0) {
        setCampaigns([]);
        return;
      }

      let campaignsArray: Campaign[] = [];

      // Try get_all_campaigns first
      try {
        const allCampaignsResult = await contract.get_all_campaigns();
        if (allCampaignsResult.result && Array.isArray(allCampaignsResult.result)) {
          for (const campaignData of allCampaignsResult.result) {
            let campaign: Campaign | null = null;
            if (typeof campaignData === 'object' && campaignData !== null) {
              if ('creator' in campaignData && 'title' in campaignData) {
                campaign = campaignData as Campaign;              } else {
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
                  }                } catch (parseError) {
                  console.error('Error parsing campaign:', parseError);                }
              }
            }            if (campaign) {
              campaignsArray.push(campaign);
              loadCampaignBalance(Number(campaign.id));
              loadCampaignStatus(Number(campaign.id));
              loadCreatorUsername(campaign.creator);
            }
          }        }        setCampaigns(campaignsArray.reverse());
        
        // Load final amounts from Firebase after campaigns are loaded
        await loadFinalAmountsFromFirebase(campaignsArray);
        
        // Load campaign likes
        await loadCampaignLikes(campaignsArray);
      } catch (getAllError) {
        console.error('Error with get_all_campaigns:', getAllError);
        
        // Fallback: load campaigns one by one
        campaignsArray = [];
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
                }              }              if (campaign) {
                campaignsArray.push(campaign);
                loadCampaignBalance(Number(campaign.id));
                loadCampaignStatus(Number(campaign.id));
                loadCreatorUsername(campaign.creator);
              }
            }
          } catch (singleCampaignError) {
            console.error(`Error loading campaign ${i}:`, singleCampaignError);
          }        }        setCampaigns(campaignsArray.reverse());
        
        // Load final amounts from Firebase after campaigns are loaded
        await loadFinalAmountsFromFirebase(campaignsArray);
        
        // Load campaign likes
        await loadCampaignLikes(campaignsArray);
      }
    } catch (error) {
      console.error('Load campaigns error:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(prev => ({ ...prev, loadCampaigns: false }));
    }
  };  // Save campaign's final raised amount before withdrawal
  const saveFinalRaisedAmount = async (campaignId: number) => {
    try {
      if (!contract || !address) return;
      
      const balanceResult = await contract.get_campaign_balance({campaign_id: BigInt(campaignId)});
      const balanceValue = balanceResult.result ? balanceResult.result : BigInt(0);
      
      // Save to local state for immediate UI update
      setFinalRaisedAmounts(prev => ({
        ...prev,
        [campaignId]: balanceValue
      }));
        // Save to Firebase for persistence
      await saveCampaignFinalAmount(campaignId, balanceValue, address);
      
    } catch (error) {
      console.error('Error saving final raised amount:', error);
    }
  };
  // Get the display amount for a campaign (final amount if closed, current balance if active)
  const getCampaignDisplayAmount = (campaignId: number): string => {
    const isClosedByCampaign = isCampaignClosed(campaignId);
    
    if (isClosedByCampaign && finalRaisedAmounts[campaignId] !== undefined) {
      // Show final amount for closed campaigns
      return formatAmount(finalRaisedAmounts[campaignId]);
    } else {
      // Show current balance for active campaigns
      const balance = campaignBalances[campaignId];
      if (balance) {
        const balanceInStroops = BigInt(Math.floor(parseFloat(balance) * 10_000_000));
        return formatAmount(balanceInStroops);
      }
      return '0.00 XLM';
    }
  };

  const loadCampaignBalance = async (campaignId: number) => {
    if (!contract) return;    try {
      const balanceResult = await contract.get_campaign_balance({ campaign_id: BigInt(campaignId) });
      
      if (balanceResult.result) {
        if (typeof balanceResult.result === 'object' && balanceResult.result !== null) {
          if ((balanceResult.result as any)._arm === 'some') {
            const balance = Number((balanceResult.result as any)._value) / 10_000_000;
            setCampaignBalances(prev => ({ ...prev, [campaignId]: balance.toFixed(7) }));
          } else {
            setCampaignBalances(prev => ({ ...prev, [campaignId]: '0.0000000' }));
          }
        } else if (typeof balanceResult.result === 'bigint') {
          const balance = Number(balanceResult.result) / 10_000_000;
          setCampaignBalances(prev => ({ ...prev, [campaignId]: balance.toFixed(7) }));
        }
      } else {
        setCampaignBalances(prev => ({ ...prev, [campaignId]: '0.0000000' }));
      }
    } catch (error) {
      console.error(`Error loading balance for campaign ${campaignId}:`, error);
      setCampaignBalances(prev => ({ ...prev, [campaignId]: '0.0000000' }));
    }
  };
  // Helper function to extract boolean value from various contract response formats
  const extractBooleanFromContractResult = (result: any): boolean | null => {
    if (typeof result === 'boolean') {
      return result;
    }
    
    if (typeof result === 'object' && result !== null) {
      // Check for Ok/Err format
      if ('_tag' in result) {
        if (result._tag === 'ok') {
          return extractBooleanFromContractResult(result._value);
        } else if (result._tag === 'err') {
          return false; // Error means campaign is likely closed/inactive
        }
      }
      
      // Check for {value: boolean} format
      if ('value' in result && typeof result.value === 'boolean') {
        return result.value;
      }
      
      // Check for {_value: boolean} format
      if ('_value' in result && typeof result._value === 'boolean') {
        return result._value;
      }
      
      // Try to find any boolean property
      for (const key of Object.keys(result)) {
        if (typeof result[key] === 'boolean') {
          return result[key];
        }
      }
    }
    
    return null; // Unable to extract boolean
  };

  const loadCampaignStatus = async (campaignId: number) => {
    if (!contract) return;    try {
      const statusResult = await contract.get_campaign_status({ campaign_id: BigInt(campaignId) });
      
      if (statusResult.result) {
        const isActive = extractBooleanFromContractResult(statusResult.result);
        
        if (isActive !== null) {
          setCampaignStatuses(prev => ({ ...prev, [campaignId]: isActive }));
        } else {
          setCampaignStatuses(prev => ({ ...prev, [campaignId]: false }));
        }
      } else {
        setCampaignStatuses(prev => ({ ...prev, [campaignId]: false }));
      }
    } catch (error) {
      console.error(`Error loading status for campaign ${campaignId}:`, error);
      setCampaignStatuses(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // Load campaigns when contract is available
  useEffect(() => {
    if (contract) {
      loadCampaigns();
    }
  }, [contract]);  // Helper function to check if campaign is closed using smart contract status
  const isCampaignClosed = (campaignId: bigint | number): boolean => {
    const id = typeof campaignId === 'bigint' ? Number(campaignId) : campaignId;
    
    // First check if we have the status from smart contract
    const contractStatus = campaignStatuses[id];
    if (contractStatus !== undefined) {
      return !contractStatus; // If status is false, campaign is closed
    }
    
    // Fallback: Check if it has received donations but balance is 0 (withdrawn)
    const balance = campaignBalances[id];
    const totalDonated = Number(campaigns.find(c => c.id === BigInt(id))?.total_donated || 0);
    return totalDonated > 0 && balance !== undefined && parseFloat(balance) === 0;
  };
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });const handleDonate = (campaign: Campaign) => {
    // Check if campaign is closed
    if (isCampaignClosed(campaign.id)) {
      toast.error('This campaign has been closed and no longer accepts donations');
      return;
    }
    
    setSelectedCampaign(campaign);
    setDonateModalOpen(true);
  };  const handleWithdraw = async (campaign: Campaign) => {
    if (!contract || !kit || !address) {
      toast.error('Wallet or contract not initialized');
      return;
    }

    const campaignId = Number(campaign.id);
    const balance = campaignBalances[campaignId];
    
    if (!balance || parseFloat(balance) <= 0) {
      toast.error('No funds available for withdrawal');
      return;
    }

    // Show withdraw modal with wallet selection
    setWithdrawModal({
      isOpen: true,
      campaign: campaign
    });
  };  const confirmWithdraw = async (targetWallet: string) => {
    const campaign = withdrawModal.campaign;
    if (!campaign || !contract || !kit || !address) return;

    const campaignId = Number(campaign.id);
    const balance = campaignBalances[campaignId];

    // Use current user's wallet if targetWallet is empty
    const finalTargetWallet = targetWallet || address;

    // Save final raised amount before withdrawal
    await saveFinalRaisedAmount(campaignId);

    // Convert XLM to stroops (multiply by 10^7)
    const amountInStroops = BigInt(Math.floor(parseFloat(balance) * 10_000_000));

    setWithdrawing(prev => ({ ...prev, [campaignId]: true }));    try {
      const withdrawTx = await contract.withdraw_campaign_funds({
        campaign_id: BigInt(campaignId),
        creator: address,
        target_wallet: finalTargetWallet, // Use selected wallet address
        amount: amountInStroops
      });

      const signedResult = await signTxForOblivion(withdrawTx.toXDR());
      
      // For passkey wallets, transaction is already submitted via Launchtube
      if (walletType === 'passkey') {
        if (signedResult.submissionResult && signedResult.submissionResult.success) {
          toast.success(`Transaction submitted via Launchtube! Hash: ${signedResult.submissionResult.transactionHash}`);
        } else {
          throw new Error('Transaction submission failed');
        }
      } else {
        // For stellar wallets, continue with normal flow
        await withdrawTx.signAndSend({
          signTransaction: async (xdr) => signedResult
        });
      }

      // Success message with target wallet info
      const walletInfo = targetWallet 
        ? `to ${targetWallet.slice(0, 6)}...${targetWallet.slice(-6)}`
        : 'to your wallet';
      
      toast.success(`Successfully withdrew ${balance} XLM ${walletInfo}!`);
        
      // Close withdraw modal
      setWithdrawModal({ isOpen: false, campaign: null });
      
      // Refresh campaigns and balances
      setTimeout(() => {
        loadCampaigns();
        loadCampaignBalance(campaignId);
        loadCampaignStatus(campaignId);      }, 2000);

    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('Failed to withdraw funds. Please try again.');
    } finally {
      setWithdrawing(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const formatAmount = (amount: number | bigint) => {
    const numAmount = typeof amount === 'bigint' ? Number(amount) : amount;
    const xlmAmount = numAmount / 10_000_000; // Convert from stroops to XLM (10^7)
    return `${xlmAmount.toFixed(2)} XLM`;
  };
  
  const getTotalRaised = () => {
    return campaigns.reduce((sum, campaign) => {
      const campaignId = Number(campaign.id);
      const isClosedByCampaign = isCampaignClosed(campaignId);
      
      if (isClosedByCampaign && finalRaisedAmounts[campaignId] !== undefined) {
        // Use final amount for closed campaigns
        return sum + Number(finalRaisedAmounts[campaignId]);
      } else {
        // Use current balance for active campaigns
        const balance = campaignBalances[campaignId];
        return sum + (balance ? parseFloat(balance) * 10_000_000 : 0); // Convert XLM to stroops for consistency
      }
    }, 0);
  };

  return (
    <div className="bg-slate-900 min-h-screen">
      <Toaster position="top-right" />
      
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        
        <div className="flex-1 ml-20 lg:ml-72 max-w-6xl px-4 lg:px-6">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-8 pt-8 pb-6 z-10 mb-8">
            <div className="flex flex-col space-y-4">              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight">Campaigns</h1>
                  <p className="text-slate-300 text-lg font-medium mt-2">
                    Support meaningful causes on Stellar blockchain
                  </p>
                </div>                <div className="flex items-center gap-4">
                  {/* Show create campaign button and stats if wallet is connected */}
                  {address ? (
                    <div className="flex items-center gap-3">                      <div className="text-right">
                        <div className="text-xl font-bold text-green-400">
                          {formatAmount(getTotalRaised())}
                        </div>
                        <div className="text-sm text-slate-400">Total Raised</div>
                      </div>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                      >
                        <Plus size={20} />
                        Create Campaign
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-lg">
                      Connect your wallet to create campaigns and donate
                    </div>
                  )}
                </div>
              </div>
                {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={loadCampaigns}
                  disabled={loading.loadCampaigns}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading.loadCampaigns ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Campaigns Grid */}
          <div className="grid gap-8 pb-8">
            {loading.loadCampaigns && campaigns.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-slate-800/40 rounded-2xl p-12 border border-slate-700/50">
                  <RefreshCw className="w-16 h-16 mx-auto mb-4 text-slate-500 animate-spin" />
                  <h3 className="text-xl font-semibold text-slate-200 mb-2">Loading campaigns...</h3>
                  <p className="text-slate-400">
                    Fetching campaigns from Stellar blockchain
                  </p>
                </div>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-slate-800/40 rounded-2xl p-12 border border-slate-700/50">
                  <Search className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                  <h3 className="text-xl font-semibold text-slate-200 mb-2">No campaigns found</h3>
                  <p className="text-slate-400">
                    {campaigns.length === 0 
                      ? "No campaigns have been created yet. Connect your wallet to create the first one!"
                      : "Try adjusting your search terms or category filters."}
                  </p>
                </div>
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <div
                  key={Number(campaign.id)}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:bg-slate-800/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Campaign Image */}
                    <div className="lg:w-2/5">
                      <div className="relative h-64 lg:h-full min-h-[280px]">                        <Image
                          src={campaign.image_url || `https://picsum.photos/600/300?random=${Number(campaign.id)}`}
                          alt={campaign.title || 'Campaign'}
                          fill
                          className="object-cover"
                          unoptimized={!!campaign.image_url} // Disable optimization for uploaded images
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://picsum.photos/600/300?random=${Number(campaign.id)}`;
                          }}
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-purple-600/90 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                            Blockchain Campaign
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Campaign Content */}
                    <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col justify-between">
                      <div>                        {/* Creator Info */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            {creatorAvatars[campaign.creator] ? (
                              <Image
                                src={creatorAvatars[campaign.creator]}
                                alt={creatorUsernames[campaign.creator] || 'Creator'}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {creatorUsernames[campaign.creator] 
                                    ? creatorUsernames[campaign.creator].charAt(0).toUpperCase()
                                    : campaign.creator?.charAt(0) || 'C'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {creatorUsernames[campaign.creator] ? (
                                <UserLink 
                                  username={creatorUsernames[campaign.creator]}
                                  className="text-white font-medium text-sm hover:text-purple-400 transition-colors cursor-pointer"
                                  showAt={true}
                                />
                              ) : (
                                <span className="text-white font-medium text-sm">
                                  {campaign.creator ? 
                                    `${campaign.creator.slice(0, 6)}...${campaign.creator.slice(-6)}` : 
                                    'Anonymous'}
                                </span>
                              )}
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                              {/* Show "Your Campaign" badge if user is the creator */}
                              {address && campaign.creator === address && (
                                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs font-medium rounded-full border border-purple-400/30">
                                  Your Campaign
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Title and Description */}
                        <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                          {campaign.title || 'Untitled Campaign'}
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                          {campaign.description || 'No description provided.'}
                        </p>                        {/* Donation Amount */}
                        <div className="mb-6">
                          <div className="mb-4">
                            <span className="text-white font-semibold text-2xl">
                              {getCampaignDisplayAmount(Number(campaign.id))}
                            </span>
                            <span className="text-slate-400 text-sm ml-2">raised</span>
                          </div>{/* Stats */}
                          <div className="flex items-center gap-6 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <Users className="text-blue-400 w-4 h-4" />
                              <span>On blockchain</span>
                            </div>
                            {/* Show campaign status */}
                            {isCampaignClosed(campaign.id) && (
                              <div className="flex items-center gap-2">
                                <span className="text-red-400 font-medium">⚠️ Campaign Closed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>                      {/* Action Buttons */}
                      <div className="flex items-center gap-4">
                        {/* Show withdraw button if user is the campaign creator */}
                        {address && campaign.creator === address ? (
                          <button
                            onClick={() => handleWithdraw(campaign)}
                            disabled={withdrawing[Number(campaign.id)] || !campaignBalances[Number(campaign.id)] || parseFloat(campaignBalances[Number(campaign.id)] || '0') <= 0}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {withdrawing[Number(campaign.id)] ? (
                              <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Withdrawing...
                              </>
                            ) : (
                              <>
                                <Wallet className="w-5 h-5" />
                                {campaignBalances[Number(campaign.id)] && parseFloat(campaignBalances[Number(campaign.id)]) > 0 
                                  ? `Withdraw ${campaignBalances[Number(campaign.id)]} XLM`
                                  : 'No Funds to Withdraw'
                                }
                              </>
                            )}                          </button>
                        ) : (
                          <button
                            onClick={() => handleDonate(campaign)}
                            disabled={!address || isCampaignClosed(campaign.id)}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!address ? 'Connect Wallet to Donate' : 
                             isCampaignClosed(campaign.id) ? 'Campaign Closed' : 
                             'Donate Now'}
                          </button>
                        )}
                        <button 
                          onClick={() => handleCampaignLike(campaign)}
                          disabled={likingCampaign[Number(campaign.id)]}
                          className={`p-3 rounded-xl transition-colors duration-200 flex items-center gap-2 ${
                            userLikes[Number(campaign.id)]
                              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${userLikes[Number(campaign.id)] ? 'fill-current' : ''}`} />
                          {campaignLikes[Number(campaign.id)] > 0 && (
                            <span className="text-sm font-medium">
                              {campaignLikes[Number(campaign.id)]}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}          </div>
        </div>
      </main>

      {/* Donate Modal */}
      {selectedCampaign && address && (
        <DonateModal
          isOpen={donateModalOpen}
          onClose={() => {
            setDonateModalOpen(false);
            setSelectedCampaign(null);
          }}          campaign={{
            id: Number(selectedCampaign.id),
            title: selectedCampaign.title || 'Untitled Campaign',
            creator: {
              name: creatorUsernames[selectedCampaign.creator] 
                ? `@${creatorUsernames[selectedCampaign.creator]}`
                : selectedCampaign.creator ? 
                  `${selectedCampaign.creator.slice(0, 6)}...${selectedCampaign.creator.slice(-6)}` : 
                  'Anonymous',
              verified: true
            },
            raised: Number(selectedCampaign.total_donated || 0)
          }}
          walletKit={kit}
          contract={contract}
          userAddress={address}
        />
      )}      {/* Create Campaign Modal */}
      {address && (
        <CreateCampaignModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          walletKit={kit}
          contract={contract}
          userAddress={address}
          onCampaignCreated={() => {
            setShowCreateModal(false);
            // Refresh campaigns after creation
            setTimeout(() => {
              loadCampaigns();
            }, 2000);
          }}
        />      )}

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={withdrawModal.isOpen}
        onClose={() => setWithdrawModal({ isOpen: false, campaign: null })}
        onConfirm={confirmWithdraw}
        campaign={withdrawModal.campaign ? {
          title: withdrawModal.campaign.title || 'Untitled Campaign',
          balance: campaignBalances[Number(withdrawModal.campaign.id)] || '0.00'
        } : null}
        isWithdrawing={withdrawModal.campaign ? withdrawing[Number(withdrawModal.campaign.id)] || false : false}
      />
    </div>
  );
}
