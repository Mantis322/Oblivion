'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Camera } from 'lucide-react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { Client } from '../../../packages/oblivion/src';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletKit?: StellarWalletsKit | null;
  contract?: Client | null;
  userAddress?: string | null;
  onCampaignCreated?: () => void;
}

export default function CreateCampaignModal({ 
  isOpen, 
  onClose, 
  walletKit, 
  contract, 
  userAddress,
  onCampaignCreated 
}: CreateCampaignModalProps) {  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setSelectedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
    }
  };

  const uploadImageToFirebase = async (file: File): Promise<string> => {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `campaigns/${timestamp}-${file.name}`;
      const storageRef = ref(storage, filename);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Firebase upload error:', error);
      throw new Error('Failed to upload image to Firebase');
    }
  };
  const handleCreateCampaign = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!contract || !walletKit || !userAddress) {
      toast.error('Wallet not connected');
      return;
    }

    setIsCreating(true);
    
    try {
      let finalImageUrl = imageUrl;
      
      // Upload image to Firebase if a file is selected
      if (selectedFile) {
        setUploadingImage(true);
        toast.loading('Uploading image to Firebase...');
        try {
          finalImageUrl = await uploadImageToFirebase(selectedFile);
          toast.dismiss();
          toast.success('Image uploaded successfully!');
        } catch (uploadError) {
          toast.dismiss();
          toast.error('Image upload failed, using placeholder instead');
          finalImageUrl = `https://picsum.photos/600/300?random=${Date.now()}`;
        } finally {
          setUploadingImage(false);
        }
      }
      
      // Use placeholder if no image provided
      if (!finalImageUrl) {
        finalImageUrl = `https://picsum.photos/600/300?random=${Date.now()}`;
      }

      toast.loading('Creating campaign on Stellar blockchain...');
      
      // Create campaign transaction
      const createTx = await contract.create_campaign({
        creator: userAddress,
        title: title.trim(),
        description: description.trim(),
        image_url: finalImageUrl
      });

      // Submit the transaction with wallet signing
      const result = await createTx.signAndSend({
        signTransaction: async (xdr: string) => {
          try {
            const signed = await walletKit.signTransaction(xdr);
            const signedXdr = typeof signed === 'string' ? signed : signed.signedTxXdr;
            return {
              signedTxXdr: signedXdr,
              signerAddress: userAddress
            };
          } catch (error) {
            console.error('Signing error:', error);
            throw error;
          }
        }
      });

      toast.dismiss();

      // Check if transaction was successful
      if (result && result.result) {
        const campaignId = result.result;
        toast.success(`Campaign "${title}" created successfully! ID: ${campaignId}`);
        onClose();
        
        // Refresh campaigns list
        if (onCampaignCreated) {
          onCampaignCreated();
        }
      } else {
        throw new Error('Campaign creation failed');
      }
      
    } catch (error) {
      console.error('Campaign creation error:', error);
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Failed to create campaign. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Campaign</h2>
              <p className="text-sm text-slate-400">Launch your fundraising campaign on Stellar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Campaign Title */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Campaign Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your campaign title..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              maxLength={100}
            />
            <div className="text-xs text-slate-400 mt-1">
              {title.length}/100 characters
            </div>
          </div>

          {/* Campaign Description */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Campaign Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your campaign, what you're raising funds for, and how donations will be used..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 min-h-[120px] resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-slate-400 mt-1">
              {description.length}/1000 characters
            </div>
          </div>          {/* Campaign Image */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Campaign Image
            </label>
            <div className="space-y-4">
              {/* File Upload */}
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Camera size={16} />
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
                <span className="text-sm text-slate-400 flex items-center">
                  or enter URL below
                </span>
              </div>
              
              {/* URL Input */}
              <input
                type="url"
                value={selectedFile ? '' : imageUrl}
                onChange={(e) => {
                  if (!selectedFile) {
                    setImageUrl(e.target.value);
                  }
                }}
                disabled={!!selectedFile}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50"
              />
              
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <span>✓ File selected: {selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setImageUrl('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}
              
              <div className="text-xs text-slate-400">
                {selectedFile 
                  ? 'Image will be uploaded to Firebase and stored on IPFS for decentralized access'
                  : 'Upload an image file (max 5MB) or enter an image URL. If left empty, a placeholder will be used.'
                }
              </div>
              
              {/* Image Preview */}
              {(imageUrl || selectedFile) && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-200 mb-2">Preview:</div>
                  <div className="relative w-full h-48 bg-slate-700 rounded-xl overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="Campaign preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Info Box */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-slate-200">
                <p className="font-medium mb-1">About Stellar Campaigns</p>
                <ul className="text-slate-300 space-y-1 text-xs">
                  <li>• Campaign metadata is stored on the Stellar blockchain</li>
                  <li>• Images are uploaded to Firebase for reliable storage</li>
                  <li>• All donations are processed in XLM (Stellar Lumens)</li>
                  <li>• Campaign data is immutable once created</li>
                  <li>• Small network fees apply for blockchain transactions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            Campaign will be created on Stellar blockchain
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>            <button
              onClick={handleCreateCampaign}
              disabled={isCreating || uploadingImage || !title.trim() || !description.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating || uploadingImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {uploadingImage ? 'Uploading Image...' : 'Creating Campaign...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
