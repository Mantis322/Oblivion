'use client';

import { useState, useEffect } from 'react';
import { X, Shield, DollarSign, RefreshCw, ArrowUpRight, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../contexts/WalletContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { contract, address, signTxForOblivion } = useWallet();
  
  // States
  const [commissionBalance, setCommissionBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && contract && address) {
      checkAdminStatus();
    }
  }, [isOpen, address, contract]);

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
      if (e.key === 'Escape' && !loading.withdrawCommission) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, loading.withdrawCommission, onClose]);

  // Check if current user is admin
  const checkAdminStatus = async () => {
    if (!contract || !address) return;
    
    try {
      setLoading(prev => ({ ...prev, checkAdmin: true }));
      
      // Get admin address from contract
      const adminResult = await contract.get_admin();
      
      let adminAddress = null;
      
      // Use the result property which should contain the parsed value
      if (adminResult.result !== undefined && adminResult.result !== null) {
        console.log('📋 AdminModal: Using result:', adminResult.result);
        
        if (typeof adminResult.result === 'string') {
          adminAddress = adminResult.result;
        } else if (adminResult.result && typeof adminResult.result === 'object') {
          // Handle Option type (Some/None)
          if ((adminResult.result as any)._arm === 'some' && (adminResult.result as any)._value) {
            adminAddress = (adminResult.result as any)._value;
          } else if ((adminResult.result as any)._arm === 'none') {
            // No admin set
          }
        }
      }
      
      // Check if current user is admin
      const isUserAdmin = adminAddress === address;
      
      if (isUserAdmin) {
        setIsAdmin(true);
        // Load commission balance if user is admin
        await loadCommissionBalance();
      } else {
        setIsAdmin(false);
        setCommissionBalance('0.00');
      }
      
    } catch (error) {
      console.error('💥 AdminModal: Error checking admin status:', error);
      setIsAdmin(false);
      setCommissionBalance('0.00');
    } finally {
      setLoading(prev => ({ ...prev, checkAdmin: false }));
    }
  };

  // Load commission balance
  const loadCommissionBalance = async () => {
    if (!contract || !address || !isAdmin) return;

    try {
      setLoading(prev => ({ ...prev, loadCommission: true }));
      
      const balanceResult = await contract.get_commission_balance();
      const balance = Number(balanceResult.result) / 10_000_000; // Convert stroops to XLM
      setCommissionBalance(balance.toFixed(7));
      
    } catch (error) {
      console.error('Error loading commission balance:', error);
      toast.error('Failed to load commission balance');
      setCommissionBalance('0.00');
    } finally {
      setLoading(prev => ({ ...prev, loadCommission: false }));
    }
  };

  // Withdraw commission
  const withdrawCommission = async () => {
    if (!contract || !address || !signTxForOblivion) {
      toast.error('Wallet or contract not initialized');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, withdrawCommission: true }));

      const withdrawTx = await contract.withdraw_commission({
        admin: address
      });

      const signedResult = await signTxForOblivion(withdrawTx.toXDR());
      
      await withdrawTx.signAndSend({
        signTransaction: async (xdr) => signedResult
      });
      
      toast.success(`Successfully withdrew ${commissionBalance} XLM to your wallet!`);
      
      // Refresh commission balance
      setTimeout(() => {
        loadCommissionBalance();
      }, 2000);

    } catch (error) {
      console.error('Commission withdrawal error:', error);
      toast.error('Failed to withdraw commission. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, withdrawCommission: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!loading.withdrawCommission ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Admin Panel</h3>
          </div>
          {!loading.withdrawCommission && (
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
          {!isAdmin ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">Access Denied</h4>
              <p className="text-slate-400">You don't have admin privileges for this contract.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Commission Balance */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    Commission Balance
                  </h4>
                  <button
                    onClick={loadCommissionBalance}
                    disabled={loading.loadCommission}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading.loadCommission ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {commissionBalance} XLM
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  Available for withdrawal to your connected wallet
                </div>
              </div>

              {/* Admin Stats */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h4 className="text-white font-semibold mb-3">Admin Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Admin Address:</span>
                    <span className="text-white font-mono text-xs">
                      {address?.slice(0, 8)}...{address?.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Withdrawal Destination:</span>
                    <span className="text-blue-400 font-medium">Connected Wallet</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="flex space-x-3 p-6 border-t border-slate-700/50">
            <button
              onClick={onClose}
              disabled={loading.withdrawCommission}
              className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close
            </button>
            <button
              onClick={withdrawCommission}
              disabled={
                loading.withdrawCommission || 
                parseFloat(commissionBalance) <= 0
              }
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center gap-2"
            >
              {loading.withdrawCommission ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Withdrawing...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4" />
                  Withdraw Commission
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
