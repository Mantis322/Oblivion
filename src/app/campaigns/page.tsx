'use client';

import { useState, useEffect } from 'react';
import { StrKey } from '@stellar/stellar-sdk';
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
    
    try {
      // If it's already in the correct format
      if (response.creator && response.title) {
        return response;
      }

      // Handle Option type (Some/None)
      if (response._arm === 'some' && response._value) {
        return parseContractResponse(response._value);
      } else if (response._arm === 'none') {
        return null;
      }
      
      // Handle Map type
      if (response._arm === 'map' && response._value && Array.isArray(response._value)) {
        return parseMapResponse(response._value);
      }

      // Handle Instance type with nested values
      if (response._arm === 'instance' && response._value && Array.isArray(response._value)) {
        return parseMapResponse(response._value);
      }

      // Handle direct array (map entries)
      if (Array.isArray(response)) {
        return parseMapResponse(response);
      }
      
      // Handle nested structures
      if (response._value && typeof response._value === 'object') {
        return parseContractResponse(response._value);
      }

      // If it has map-like structure, try to parse it
      if (typeof response === 'object') {
        const keys = Object.keys(response);
        if (keys.length > 0) {
          // Check if it looks like campaign data
          const hasValidFields = keys.some(key => 
            ['creator', 'title', 'description', 'image_url', 'created_at', 'total_donated', 'is_active'].includes(key)
          );
          if (hasValidFields) {
            return response;
          }
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in parseContractResponse:', error);
      return null;
    }
  };

  // Contract health check
  const checkContractHealth = async () => {
    if (!contract) return false;
    
    try {
      // Simple test call to verify contract is working
      const countResult = await contract.get_campaign_count();
      return countResult && countResult.result !== undefined;
    } catch (error) {
      console.error('Contract health check failed:', error);
      return false;
    }
  };

  const parseMapResponse = (mapArray: any[]): any => {
    const result: any = {};
    
    console.log('[parseMapResponse] Input mapArray:', JSON.stringify(mapArray, null, 2));
    
    try {
      if (!Array.isArray(mapArray)) {
        console.warn('parseMapResponse: Input is not an array');
        return result;
      }

      for (let i = 0; i < mapArray.length; i++) {
        const item = mapArray[i];
        console.log(`[parseMapResponse] Processing item ${i}:`, JSON.stringify(item, null, 2));
        
        if (!item || !item._attributes) {
          console.warn(`parseMapResponse: Invalid item structure at index ${i}:`, item);
          continue;
        }

        const { key, val } = item._attributes;
        
        if (!key || !val) {
          console.warn(`parseMapResponse: Missing key or val in item ${i}:`, item);
          continue;
        }

        // Extract key name with comprehensive handling
        let keyName = '';
        try {
          // Handle symbol keys with Buffer data
          if (key._arm === 'sym' && key._value) {
            if (key._value.type === 'Buffer' && Array.isArray(key._value.data)) {
              keyName = Buffer.from(key._value.data).toString('utf8');
              console.log(`[parseMapResponse] Extracted Buffer key: "${keyName}"`);
            } else if (key._value instanceof Uint8Array) {
              // Handle Uint8Array format
              keyName = Buffer.from(key._value).toString('utf8');
              console.log(`[parseMapResponse] Extracted Uint8Array key: "${keyName}"`);
            } else if (typeof key._value === 'string') {
              keyName = key._value;
              console.log(`[parseMapResponse] Extracted string key: "${keyName}"`);
            } else {
              console.warn(`[parseMapResponse] Unhandled sym key format:`, key._value);
              continue;
            }
          } else {
            console.warn(`[parseMapResponse] Unhandled key format:`, key);
            continue;
          }
        } catch (keyError) {
          console.error(`[parseMapResponse] Error extracting key from item ${i}:`, keyError);
          continue;
        }

        // Extract value based on type
        let value = null;
        try {
          if (val._arm === 'str') {
            if (val._value && val._value.type === 'Buffer' && Array.isArray(val._value.data)) {
              value = Buffer.from(val._value.data).toString('utf8');
              console.log(`[parseMapResponse] Extracted Buffer string value: "${value}"`);
            } else if (val._value instanceof Uint8Array) {
              // Handle Uint8Array format
              value = Buffer.from(val._value).toString('utf8');
              console.log(`[parseMapResponse] Extracted Uint8Array string value: "${value}"`);
            } else if (typeof val._value === 'string') {
              value = val._value;
              console.log(`[parseMapResponse] Extracted direct string value: "${value}"`);
            } else {
              console.warn(`[parseMapResponse] Unhandled str value format:`, val._value);
            }
          } else if (val._arm === 'u64') {
            // Handle u64 values - they can be nested or direct
            if (val._value) {
              if (val._value._value !== undefined) {
                value = BigInt(val._value._value);
                console.log(`[parseMapResponse] Extracted nested u64 value: ${value}`);
              } else if (typeof val._value === 'string' || typeof val._value === 'number') {
                value = BigInt(val._value);
                console.log(`[parseMapResponse] Extracted direct u64 value: ${value}`);
              } else {
                console.warn(`[parseMapResponse] Unhandled u64 value format:`, val._value);
              }
            }
          } else if (val._arm === 'i128') {
            // Handle i128 values with hi/lo components
            if (val._value && val._value._attributes) {
              const hi = val._value._attributes.hi?._value || '0';
              const lo = val._value._attributes.lo?._value || '0';
              if (hi === '0') {
                value = BigInt(lo);
              } else {
                value = (BigInt(hi) << BigInt(64)) + BigInt(lo);
              }
              console.log(`[parseMapResponse] Extracted i128 value: ${value}`);
            } else if (val._value && typeof val._value === 'string') {
              value = BigInt(val._value);
              console.log(`[parseMapResponse] Extracted direct i128 value: ${value}`);
            } else {
              console.warn(`[parseMapResponse] Unhandled i128 value format:`, val._value);
            }
          } else if (val._arm === 'b' || val._arm === 'bool') {
            if (val._value !== null && val._value !== undefined) {
              value = Boolean(val._value);
              console.log(`[parseMapResponse] Extracted boolean value: ${value}`);
            } else {
              console.warn(`[parseMapResponse] Null/undefined boolean value:`, val._value);
            }
          } else if (val._arm === 'address') {
            try {
              if (val._value && val._value._arm === 'accountId' && val._value._value) {
                const addressAccount = val._value._value;
                if (addressAccount._value && addressAccount._value.type === 'Buffer' && Array.isArray(addressAccount._value.data)) {
                  try {
                    const addressBytes = Buffer.from(addressAccount._value.data);
                    value = StrKey.encodeEd25519PublicKey(addressBytes);
                    console.log(`[parseMapResponse] Extracted address value: ${value}`);
                  } catch (strKeyError) {
                    console.error('Error converting address with StrKey:', strKeyError);
                    const addressHex = addressAccount._value.data.map((b: number) => b.toString(16).padStart(2, '0')).join('');
                    value = `Address_${addressHex.substring(0, 16)}...`;
                    console.log(`[parseMapResponse] Extracted fallback address: ${value}`);
                  }
                } else if (addressAccount._value instanceof Uint8Array) {
                  // Handle Uint8Array format
                  try {
                    const addressBytes = Buffer.from(addressAccount._value);
                    value = StrKey.encodeEd25519PublicKey(addressBytes);
                    console.log(`[parseMapResponse] Extracted Uint8Array address value: ${value}`);
                  } catch (strKeyError) {
                    console.error('Error converting Uint8Array address with StrKey:', strKeyError);
                    const addressHex = Array.from(addressAccount._value).map((b: any) => (b as number).toString(16).padStart(2, '0')).join('');
                    value = `Address_${addressHex.substring(0, 16)}...`;
                    console.log(`[parseMapResponse] Extracted fallback Uint8Array address: ${value}`);
                  }
                } else if (typeof addressAccount === 'string') {
                  value = addressAccount;
                  console.log(`[parseMapResponse] Extracted string address: ${value}`);
                } else {
                  console.warn(`[parseMapResponse] Unhandled address format:`, addressAccount);
                }
              } else {
                console.warn(`[parseMapResponse] Unhandled address value format:`, val._value);
              }
            } catch (error) {
              console.error(`[parseMapResponse] Error parsing address:`, error);
            }
          } else {
            console.warn(`[parseMapResponse] Unhandled value type "${val._arm}":`, val);
          }

          if (keyName && value !== null && value !== undefined) {
            result[keyName] = value;
            console.log(`[parseMapResponse] ✅ Successfully added: ${keyName} = ${value}`);
          } else if (keyName) {
            console.warn(`[parseMapResponse] ❌ Failed to extract value for key "${keyName}" - value:`, value);
          }
        } catch (valueError) {
          console.error(`[parseMapResponse] Error extracting value for key "${keyName}":`, valueError);
          continue;
        }
      }
    } catch (error) {
      console.error('[parseMapResponse] Fatal error:', error);
    }
    
    console.log('[parseMapResponse] Final result:', result);
    console.log('[parseMapResponse] Result keys:', Object.keys(result));
    return result;
  };

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
      // Get campaign count with better error handling
      let count = 0;
      try {
        const countResult = await contract.get_campaign_count();
        count = Number(countResult.result || 0);
        console.log('Campaign count:', count);
        setCampaignCount(count);
      } catch (countError) {
        console.error('Error getting campaign count:', countError);
        toast.error('Failed to load campaign count');
        return;
      }

      if (count === 0) {
        setCampaigns([]);
        return;
      }

      let campaignsArray: Campaign[] = [];

      // Try to get all campaigns at once first (more efficient)
      try {
        console.log('Attempting to load all campaigns using get_all_campaigns...');
        const allCampaignsResult = await contract.get_all_campaigns();
        
        if (allCampaignsResult.result && Array.isArray(allCampaignsResult.result)) {
          console.log('get_all_campaigns successful, processing campaigns...', allCampaignsResult.result.length, 'campaigns found');
          
          for (let i = 0; i < allCampaignsResult.result.length; i++) {
            const campaignData = allCampaignsResult.result[i];
            let campaign: Campaign | null = null;
            
            console.log(`Processing campaign ${i + 1}:`, JSON.stringify(campaignData, null, 2));
            
            if (typeof campaignData === 'object' && campaignData !== null) {
              // Check if it's already in the correct format
              if ('creator' in campaignData && 'title' in campaignData) {
                campaign = campaignData as Campaign;
                console.log(`Campaign ${i + 1} - Direct format detected`);
              } else {
                // Try to parse the campaign data using our robust parsing function
                try {
                  const parsedData = parseContractResponse(campaignData);
                  if (parsedData && parsedData.creator && parsedData.title) {
                    campaign = {
                      id: parsedData.id ? BigInt(parsedData.id) : BigInt(i + 1),
                      creator: parsedData.creator,
                      title: parsedData.title,
                      description: parsedData.description || '',
                      image_url: parsedData.image_url || '',
                      created_at: parsedData.created_at ? BigInt(parsedData.created_at) : BigInt(0),
                      total_donated: parsedData.total_donated || BigInt(0),
                      is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                    };
                    console.log(`Campaign ${i + 1} - Successfully parsed from get_all_campaigns`);
                  } else {
                    console.warn(`Campaign ${i + 1} - Parse failed: creator=${parsedData?.creator}, title=${parsedData?.title}`);
                  }
                } catch (parseError) {
                  console.error(`Campaign ${i + 1} - Error parsing:`, parseError);
                }
              }
            }
            
            if (campaign) {
              campaignsArray.push(campaign);
            } else {
              console.warn(`Campaign ${i + 1} could not be parsed properly from get_all_campaigns`);
            }
          }
          
          console.log(`Successfully loaded ${campaignsArray.length} campaigns using get_all_campaigns`);
        } else {
          throw new Error('get_all_campaigns returned empty or invalid result');
        }
      } catch (getAllError) {
        console.error('Error with get_all_campaigns, falling back to individual fetch:', getAllError);
        
        // Fallback: Load campaigns one by one (previous implementation)
        for (let i = 1; i <= count; i++) {
          try {
            let campaign: Campaign | null = null;
            
            // Try different approaches to get campaign data
            try {
              // Method 1: Try normal SDK call first
              const campaignResult = await contract.get_campaign({ campaign_id: BigInt(i) });
              const campaignData = campaignResult.result;
              
              console.log(`Campaign ${i} SDK call successful, data:`, JSON.stringify(campaignData, null, 2));
              
              if (campaignData && typeof campaignData === 'object') {
                // Enhanced response format handling
                try {
                  // Check if it's already in the correct format
                  if ('creator' in campaignData && 'title' in campaignData) {
                    campaign = campaignData as Campaign;
                    console.log(`Campaign ${i} - Direct format detected`);
                  } 
                  // Handle direct map format FIRST (this is the most common case now)
                  else if ((campaignData as any)._arm === 'map' && (campaignData as any)._value && Array.isArray((campaignData as any)._value)) {
                    console.log(`Campaign ${i} - Direct Map format detected`);
                    const parsedData = parseMapResponse((campaignData as any)._value);
                    if (parsedData && parsedData.creator && parsedData.title) {
                      campaign = {
                        id: parsedData.id ? BigInt(parsedData.id) : BigInt(i),
                        creator: parsedData.creator,
                        title: parsedData.title,
                        description: parsedData.description || '',
                        image_url: parsedData.image_url || '',
                        created_at: parsedData.created_at ? BigInt(parsedData.created_at) : BigInt(0),
                        total_donated: parsedData.total_donated || BigInt(0),
                        is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                      };
                      console.log(`Campaign ${i} - Successfully parsed from direct map`);
                    }
                  }
                  // Handle Option type (Some/None)
                  else if ((campaignData as any)._arm === 'some' && (campaignData as any)._value) {
                    console.log(`Campaign ${i} - Option(Some) format detected`);
                    const campaignValue = (campaignData as any)._value;
                    
                    if (campaignValue.creator && campaignValue.title) {
                      campaign = {
                        id: campaignValue.id ? BigInt(campaignValue.id) : BigInt(i),
                        creator: campaignValue.creator,
                        title: campaignValue.title,
                        description: campaignValue.description || '',
                        image_url: campaignValue.image_url || '',
                        created_at: campaignValue.created_at ? BigInt(campaignValue.created_at) : BigInt(0),
                        total_donated: campaignValue.total_donated || BigInt(0),
                        is_active: campaignValue.is_active !== undefined ? campaignValue.is_active : true
                      };
                    } else if (campaignValue._arm === 'map' && campaignValue._value && Array.isArray(campaignValue._value)) {
                      console.log(`Campaign ${i} - Nested Map format detected`);
                      const parsedData = parseMapResponse(campaignValue._value);
                      if (parsedData && parsedData.creator && parsedData.title) {
                        campaign = {
                          id: parsedData.id ? BigInt(parsedData.id) : BigInt(i),
                          creator: parsedData.creator,
                          title: parsedData.title,
                          description: parsedData.description || '',
                          image_url: parsedData.image_url || '',
                          created_at: parsedData.created_at ? BigInt(parsedData.created_at) : BigInt(0),
                          total_donated: parsedData.total_donated || BigInt(0),
                          is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                        };
                      }
                    } else {
                      console.log(`Campaign ${i} - Trying generic parsing for Option value`);
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
                          is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                        };
                      }
                    }
                  }
                  // Handle None case
                  else if ((campaignData as any)._arm === 'none') {
                    console.log(`Campaign ${i} - None format detected, skipping`);
                    continue;
                  }
                  // Try to handle any other format
                  else {
                    console.log(`Campaign ${i} - Unknown format, trying fallback parsing`);
                    const parsedData = parseContractResponse(campaignData);
                    if (parsedData && parsedData.creator && parsedData.title) {
                      campaign = {
                        id: parsedData.id || BigInt(i),
                        creator: parsedData.creator,
                        title: parsedData.title,
                        description: parsedData.description || '',
                        image_url: parsedData.image_url || '',
                        created_at: parsedData.created_at || BigInt(0),
                        total_donated: parsedData.total_donated || BigInt(0),
                        is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                      };
                    }
                  }
                } catch (parseError) {
                  console.error(`Campaign ${i} - Error parsing normal call:`, parseError);
                }
              }
            } catch (sdkError: any) {
              console.warn(`Campaign ${i} - SDK parsing failed:`, sdkError);
              
              // Method 2: Try to extract map data directly from the SDK error
              if (sdkError?.message && typeof sdkError.message === 'string' && sdkError.message.includes('ScSpecType scSpecTypeOption was not map')) {
                try {
                  console.log(`Campaign ${i} - Attempting to extract map data from SDK error`);
                  
                  // Try to extract the map data directly from the error object
                  let mapData = null;
                  
                  // Check if the error object contains the actual data we need
                  if (sdkError && typeof sdkError === 'object') {
                    // Look for map data in various places in the error object
                    const findMapData = (obj: any): any => {
                      if (!obj || typeof obj !== 'object') return null;
                      
                      // Check if this object is a map
                      if (obj._arm === 'map' && obj._value && Array.isArray(obj._value)) {
                        return obj._value;
                      }
                      
                      // Recursively search in all properties
                      for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                          const result = findMapData(obj[key]);
                          if (result) return result;
                        }
                      }
                      return null;
                    };
                    
                    mapData = findMapData(sdkError);
                    
                    if (mapData) {
                      console.log(`Campaign ${i} - Found map data in error object:`, mapData);
                      const parsedData = parseMapResponse(mapData);
                      if (parsedData && parsedData.creator && parsedData.title) {
                        campaign = {
                          id: parsedData.id ? BigInt(parsedData.id) : BigInt(i),
                          creator: parsedData.creator,
                          title: parsedData.title,
                          description: parsedData.description || '',
                          image_url: parsedData.image_url || '',
                          created_at: parsedData.created_at ? BigInt(parsedData.created_at) : BigInt(0),
                          total_donated: parsedData.total_donated || BigInt(0),
                          is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                        };
                        console.log(`Campaign ${i} - Successfully parsed from error object`);
                      }
                    }
                  }
                  
                  // If we couldn't extract from error, try simulation as fallback
                  if (!campaign) {
                    try {
                      const simTx = await contract.get_campaign({ campaign_id: BigInt(i) }, { simulate: true });
                      if (simTx && (simTx as any).simulation) {
                        console.log(`Campaign ${i} - Got simulation result:`, (simTx as any).simulation);
                        
                        // Try to parse the simulation result
                        const simulation = (simTx as any).simulation;
                        let simResult = null;
                        
                        // Check different possible locations for the result
                        if (simulation.result && simulation.result.retval) {
                          simResult = simulation.result.retval;
                          console.log(`Campaign ${i} - Found retval:`, simResult);
                        } else if (simulation.result) {
                          simResult = simulation.result;
                          console.log(`Campaign ${i} - Found result:`, simResult);
                        } else if (simulation.transactionData && simulation.transactionData.result) {
                          simResult = simulation.transactionData.result;
                          console.log(`Campaign ${i} - Found transactionData result:`, simResult);
                        }
                        
                        if (simResult) {
                          // Handle different result formats
                          if (simResult._arm === 'map' && simResult._value && Array.isArray(simResult._value)) {
                            console.log(`Campaign ${i} - Parsing simulation map data`);
                            const parsedData = parseMapResponse(simResult._value);
                            console.log(`Campaign ${i} - Parsed data result:`, parsedData);
                            if (parsedData && parsedData.creator && parsedData.title) {
                              campaign = {
                                id: parsedData.id ? BigInt(parsedData.id) : BigInt(i),
                                creator: parsedData.creator,
                                title: parsedData.title,
                                description: parsedData.description || '',
                                image_url: parsedData.image_url || '',
                                created_at: parsedData.created_at ? BigInt(parsedData.created_at) : BigInt(0),
                                total_donated: parsedData.total_donated || BigInt(0),
                                is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                              };
                              console.log(`Campaign ${i} - Successfully parsed from simulation`);
                            } else {
                              console.log(`Campaign ${i} - Parse failed: creator=${parsedData?.creator}, title=${parsedData?.title}`);
                            }
                          } else if (simResult._arm === 'some' && simResult._value && simResult._value._arm === 'map') {
                            // Handle Option(Some(Map)) format
                            console.log(`Campaign ${i} - Parsing simulation Option(Some(Map)) data`);
                            const parsedData = parseMapResponse(simResult._value._value);
                            console.log(`Campaign ${i} - Parsed data result:`, parsedData);
                            if (parsedData && parsedData.creator && parsedData.title) {
                              campaign = {
                                id: parsedData.id ? BigInt(parsedData.id) : BigInt(i),
                                creator: parsedData.creator,
                                title: parsedData.title,
                                description: parsedData.description || '',
                                image_url: parsedData.image_url || '',
                                created_at: parsedData.created_at ? BigInt(parsedData.created_at) : BigInt(0),
                                total_donated: parsedData.total_donated || BigInt(0),
                                is_active: parsedData.is_active !== undefined ? parsedData.is_active : true
                              };
                              console.log(`Campaign ${i} - Successfully parsed from simulation Option(Some(Map))`);
                            } else {
                              console.log(`Campaign ${i} - Parse failed: creator=${parsedData?.creator}, title=${parsedData?.title}`);
                            }
                          } else {
                            console.log(`Campaign ${i} - Unexpected simulation result format:`, simResult);
                          }
                        } else {
                          console.log(`Campaign ${i} - No valid result found in simulation`);
                        }
                      }
                    } catch (simError) {
                      console.error(`Campaign ${i} - Simulation also failed:`, simError);
                    }
                  }
                } catch (extractionError) {
                  console.error(`Campaign ${i} - Error extraction failed:`, extractionError);
                }
              } else {
                // Skip this campaign if we can't handle the error
                continue;
              }
            }

            if (campaign) {
              console.log(`Campaign ${i} successfully parsed:`, campaign);
              campaignsArray.push(campaign);
            } else {
              console.warn(`Campaign ${i} could not be parsed properly`);
            }
          } catch (singleCampaignError) {
            console.error(`Error loading campaign ${i}:`, singleCampaignError);
            console.log(`Campaign ${i} error details:`, singleCampaignError);
            // Continue with other campaigns instead of failing completely
            continue;
          }
        }
      }

      console.log(`Total campaigns loaded: ${campaignsArray.length}`);
      setCampaigns(campaignsArray.reverse());
      
      // Load additional data for each campaign
      for (const campaign of campaignsArray) {
        loadCampaignBalance(Number(campaign.id));
        loadCampaignStatus(Number(campaign.id));
        loadCreatorUsername(campaign.creator);
      }
      
      // Load final amounts from Firebase after campaigns are loaded
      await loadFinalAmountsFromFirebase(campaignsArray);
      
      // Load campaign likes
      await loadCampaignLikes(campaignsArray);
    } catch (error) {
      console.error('Load campaigns error:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(prev => ({ ...prev, loadCampaigns: false }));
    }
  };

  // Save campaign's final raised amount before withdrawal
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
