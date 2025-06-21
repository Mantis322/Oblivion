'use client';

import { useState, useEffect } from 'react';
import { X, Heart, Coins, Star } from 'lucide-react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { Client, networks } from '../../../packages/oblivion/src';
import toast from 'react-hot-toast';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: number;
    title: string;
    creator: {
      name: string;
      verified: boolean;
    };
    raised: number;
  };
  walletKit?: StellarWalletsKit | null;
  contract?: Client | null;
  userAddress?: string | null;
}

const quickAmounts = [5, 10, 25, 50, 100, 250];

export default function DonateModal({ 
  isOpen, 
  onClose, 
  campaign, 
  walletKit, 
  contract, 
  userAddress 
}: DonateModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedAmount(numValue);
    } else {
      setSelectedAmount(null);
    }
    setCustomAmount(value);
  };  const handleDonate = async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      toast.error('Please select a valid amount');
      return;
    }

    if (!contract || !walletKit || !userAddress) {
      toast.error('Wallet not connected');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert amount to stroops (1 XLM = 10,000,000 stroops)
      const amountInStroops = BigInt(Math.floor(selectedAmount * 10_000_000));
      
      // Create donation transaction
      const donationTx = await contract.donate({
        campaign_id: BigInt(campaign.id),
        donor: userAddress,
        amount: amountInStroops
      });

      // Submit the transaction with wallet signing
      const result = await donationTx.signAndSend({
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

      // Check if transaction was successful
      if (result && result.result) {
        toast.success(`Successfully donated ${selectedAmount} XLM to ${campaign.title}!`);
        onClose();
        
        // Refresh page after successful donation
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('Transaction failed or was rejected');
      }
      
    } catch (error) {
      console.error('Donation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Donation failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };
  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2)} XLM`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Make a Donation</h2>
              <p className="text-sm text-slate-400">Support this campaign</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Campaign Info */}
        <div className="p-6 border-b border-slate-700">
          <h3 className="font-semibold text-white mb-2 line-clamp-2">{campaign.title}</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-slate-300">by {campaign.creator.name}</span>
            {campaign.creator.verified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
          <div className="text-sm text-slate-400">
            <span className="text-green-400 font-semibold">{formatAmount(campaign.raised)}</span> raised so far
          </div>
        </div>

        {/* Donation Amount */}
        <div className="p-6 space-y-6">
          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Choose an amount
            </label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((amount) => (                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className={`p-3 rounded-xl border font-semibold transition-all duration-200 ${
                    selectedAmount === amount
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  {amount} XLM
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Or enter custom amount
            </label>            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                min="0"
                step="0.01"
              />
            </div>          </div>

          {/* Donation Summary */}
          {selectedAmount && selectedAmount > 0 && (
            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Donation Amount:</span>
                <span className="text-white font-semibold">{formatAmount(selectedAmount)}</span>
              </div>              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Network Fee:</span>
                <span className="text-slate-400 text-sm">Minimal (≈0.00001 XLM)</span>
              </div>
              <div className="border-t border-slate-600 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Total:</span>
                  <span className="text-purple-400 font-bold text-lg">{formatAmount(selectedAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDonate}
              disabled={!selectedAmount || selectedAmount <= 0 || isProcessing}
              className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedAmount && selectedAmount > 0 && !isProcessing
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5" />
                  Donate {selectedAmount ? formatAmount(selectedAmount) : ''}
                </>
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
            <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p>
              Your donation will be processed securely through the Stellar blockchain. 
              All transactions are transparent and immutable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
