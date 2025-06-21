"use client"

import { useState } from 'react';
import { FaFingerprint, FaPlus, FaSignInAlt, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';

interface PasskeyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasskeyLoginModal({ isOpen, onClose }: PasskeyLoginModalProps) {
  const { 
    isPasskeySupported, 
    createPasskeyWallet, 
    connectPasskeyWallet, 
    passkeyConnecting,
    launchtubeCredits,
    refreshLaunchtubeCredits 
  } = useWallet();
  
  const [loading, setLoading] = useState(false);

  const handleCreateWallet = async () => {
    if (passkeyConnecting) return;
    
    setLoading(true);    try {
      await createPasskeyWallet();
      toast.success('Passkey wallet created successfully!');
      await refreshLaunchtubeCredits(); // Refresh credits after wallet creation
      onClose();
    } catch (error) {
      console.error('Failed to create passkey wallet:', error);
      toast.error('Failed to create passkey wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleConnectWallet = async () => {
    if (passkeyConnecting) return;
    
    setLoading(true);    try {
      await connectPasskeyWallet();
      toast.success('Connected to passkey wallet!');
      await refreshLaunchtubeCredits(); // Refresh credits after wallet connection
      onClose();
    } catch (error: any) {
      console.error('Failed to connect passkey wallet:', error);
      
      // Show more specific error messages
      let errorMessage = 'Failed to connect to passkey wallet. Please try again.';
      
      if (error?.message?.includes('No passkey found')) {
        errorMessage = 'No passkey found on this device. Please create a new passkey wallet first.';
      } else if (error?.message?.includes('cancelled')) {
        errorMessage = 'Passkey authentication was cancelled.';
      } else if (error?.message?.includes('no smart contract wallet deployed')) {
        errorMessage = 'Please create a new passkey wallet to complete the setup.';
      } else if (error?.message?.includes('Network error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FaFingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Passkey Wallet</h2>
              <p className="text-sm text-slate-400">Secure authentication with biometrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {!isPasskeySupported ? (
          <div className="text-center py-8">
            <FaExclamationTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Passkey Not Supported
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Your browser or device doesn't support passkey authentication. 
              Please use a modern browser with WebAuthn support.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div className="text-sm text-slate-200">
                  <p className="font-medium mb-1">About Passkey Wallets</p>
                  <ul className="text-slate-300 space-y-1 text-xs">
                    <li>• Secure smart wallet on Stellar blockchain</li>
                    <li>• No seed phrases to remember or lose</li>
                    <li>• Protected by device biometrics (fingerprint, Face ID)</li>
                    <li>• Synced across your devices via cloud</li>
                    <li>• <span className="text-green-400">Fee-free transactions</span> via Launchtube</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Launchtube Info */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">🚀</span>
                </div>
                <div className="text-sm text-slate-200">
                  <p className="font-medium mb-1">Launchtube Integration</p>
                  <p className="text-slate-300 text-xs mb-2">
                    Passkey wallets use Launchtube for fee-free smart contract interactions.
                  </p>
                  {launchtubeCredits > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">Credits Available:</span>
                      <span className="font-mono text-green-300">{launchtubeCredits.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCreateWallet}
                disabled={loading || passkeyConnecting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || passkeyConnecting ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Creating Wallet...
                  </>
                ) : (
                  <>
                    <FaPlus className="w-4 h-4" />
                    Create New Passkey Wallet
                  </>
                )}
              </button>

              <button
                onClick={handleConnectWallet}
                disabled={loading || passkeyConnecting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || passkeyConnecting ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaSignInAlt className="w-4 h-4" />
                    Connect Existing Wallet
                  </>
                )}
              </button>
            </div>

            {/* Note */}
            <p className="text-xs text-slate-400 text-center mt-4">
              This is experimental technology. Do not use for large amounts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
