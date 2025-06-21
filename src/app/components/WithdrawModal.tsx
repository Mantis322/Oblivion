'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Wallet, ExternalLink } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetWallet: string) => void;
  campaign: {
    title: string;
    balance: string;
  } | null;
  isWithdrawing: boolean;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  onConfirm,
  campaign,
  isWithdrawing
}: WithdrawModalProps) {
  const [targetWallet, setTargetWallet] = useState('');
  const [useOwnWallet, setUseOwnWallet] = useState(true);
  const [isValidAddress, setIsValidAddress] = useState(true);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTargetWallet('');
      setUseOwnWallet(true);
      setIsValidAddress(true);
    }
  }, [isOpen]);

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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isWithdrawing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isWithdrawing, onClose]);

  // Validate Stellar address format
  const validateStellarAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Basic Stellar address validation
    // Stellar addresses start with 'G' and are 56 characters long
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  };

  const handleTargetWalletChange = (value: string) => {
    setTargetWallet(value);
    if (value) {
      setIsValidAddress(validateStellarAddress(value));
    } else {
      setIsValidAddress(true);
    }
  };

  const handleConfirm = () => {
    let finalTargetWallet = '';
    
    if (useOwnWallet) {
      // Use current user's wallet - will be set in parent component
      finalTargetWallet = '';
    } else {
      if (!targetWallet) {
        setIsValidAddress(false);
        return;
      }
      if (!validateStellarAddress(targetWallet)) {
        setIsValidAddress(false);
        return;
      }
      finalTargetWallet = targetWallet;
    }
    
    onConfirm(finalTargetWallet);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isWithdrawing ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Withdraw Campaign Funds</h3>
          </div>
          {!isWithdrawing && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {campaign && (
            <>
              {/* Warning Message */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-200">
                    <p className="font-medium mb-1">Important Notice</p>
                    <p>Withdrawing funds will permanently close this campaign and prevent any future donations. This action cannot be undone.</p>
                  </div>
                </div>
              </div>

              {/* Campaign Info */}
              <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700/50">
                <h4 className="text-white font-semibold mb-2">Campaign Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Campaign:</span>
                    <span className="text-white font-medium">{campaign.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Withdrawal Amount:</span>
                    <span className="text-green-400 font-bold">{campaign.balance} XLM</span>
                  </div>
                </div>
              </div>

              {/* Wallet Selection */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Destination Wallet
                </h4>
                
                {/* Option 1: Own Wallet */}
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="walletOption"
                      checked={useOwnWallet}
                      onChange={() => setUseOwnWallet(true)}
                      className="text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                      disabled={isWithdrawing}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">My Connected Wallet</div>
                      <div className="text-slate-400 text-sm">Withdraw to your currently connected wallet</div>
                    </div>
                  </label>

                  {/* Option 2: Custom Wallet */}
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="walletOption"
                      checked={!useOwnWallet}
                      onChange={() => setUseOwnWallet(false)}
                      className="text-purple-600 focus:ring-purple-500 focus:ring-offset-0 mt-1"
                      disabled={isWithdrawing}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">Custom Stellar Address</div>
                      <div className="text-slate-400 text-sm mb-3">Withdraw to a different Stellar wallet</div>
                      
                      {!useOwnWallet && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={targetWallet}
                            onChange={(e) => handleTargetWalletChange(e.target.value)}
                            placeholder="Enter Stellar address (G...)"
                            className={`w-full px-3 py-2 bg-slate-700/50 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors text-sm font-mono ${
                              !isValidAddress 
                                ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' 
                                : 'border-slate-600/50 focus:ring-purple-500/50 focus:border-purple-500/50'
                            }`}
                            disabled={isWithdrawing}
                          />
                          {!isValidAddress && (
                            <p className="text-red-400 text-xs mt-1">
                              Please enter a valid Stellar address (starts with 'G' and 56 characters long)
                            </p>
                          )}
                          <p className="text-slate-500 text-xs mt-1">
                            Make sure you have access to this wallet address
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Stellar Address Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                <div className="flex items-start space-x-2">
                  <ExternalLink className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-200">
                    <p className="font-medium mb-1">Stellar Address Format</p>
                    <p>Stellar addresses start with 'G' and are exactly 56 characters long. Double-check the address before proceeding.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-slate-700/50">
          <button
            onClick={onClose}
            disabled={isWithdrawing}
            className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isWithdrawing || (!useOwnWallet && (!targetWallet || !isValidAddress))}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            {isWithdrawing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Withdrawing...</span>
              </div>
            ) : (
              'Confirm Withdrawal'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
