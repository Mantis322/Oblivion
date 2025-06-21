"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  XBULL_ID,
} from "@creit.tech/stellar-wallets-kit"
import { getUserByWallet, createUser, UserData } from '../services/userService'
import { passkeyService, PasskeyWalletData } from '../services/passkeyService'
import { paymentService, PaymentData, PaymentResult } from '../services/paymentService'
import { LaunchtubeService, LaunchtubeResult, getLaunchtubeService } from '../services/launchtubeService'
import { HybridTransactionService } from '../services/hybridTransactionService'
import * as OblivionContract from "../../../packages/oblivion/src"

export type WalletType = 'stellar' | 'passkey';

interface WalletContextType {
  kit: StellarWalletsKit | null
  address: string | null
  connecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isConnected: boolean
  user: UserData | null
  userLoading: boolean
  needsSetup: boolean
  refreshUser: () => Promise<void>
  contract: OblivionContract.Client | null
  signTxForOblivion: (xdr: string, opts?: any) => Promise<{ 
    signedTxXdr: string; 
    signerAddress?: string;
    submissionResult?: any;
  }>
  processPayment: (paymentData: PaymentData) => Promise<PaymentResult>
  
  // Passkey özellikleri
  walletType: WalletType | null
  passkeyWallet: PasskeyWalletData | null
  passkeyConnecting: boolean
  isPasskeySupported: boolean
  connectPasskeyWallet: () => Promise<void>
  createPasskeyWallet: () => Promise<void>
  disconnectPasskeyWallet: () => void
  
  // Launchtube özellikleri
  launchtubeService: LaunchtubeService | null
  launchtubeCredits: number
  submitViaLaunchtube: (xdr: string) => Promise<LaunchtubeResult>
  refreshLaunchtubeCredits: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [kit, setKit] = useState<StellarWalletsKit | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [contract, setContract] = useState<OblivionContract.Client | null>(null)
  const [walletType, setWalletType] = useState<WalletType | null>(null)
  const [passkeyWallet, setPasskeyWallet] = useState<PasskeyWalletData | null>(null)
  const [passkeyConnecting, setPasskeyConnecting] = useState(false)
  const [isPasskeySupported, setIsPasskeySupported] = useState(false)
  
  // Launchtube state
  const [launchtubeService, setLaunchtubeService] = useState<LaunchtubeService | null>(null)
  const [launchtubeCredits, setLaunchtubeCredits] = useState<number>(0)

  // Transaction signing function for Oblivion - works with both Stellar and Passkey wallets
  const signTxForOblivion = async (xdr: string, opts?: any) => {
    console.log('signTxForOblivion called with XDR:', xdr);
    console.log('signTxForOblivion opts:', opts);
    console.log('Wallet type:', walletType);
    
    // For passkey wallets, use hybrid submission (Launchtube)
    if (walletType === 'passkey' && passkeyWallet) {
      try {
        // Sign the transaction with passkey
        const signedXdr = await passkeyService.signTransaction(xdr);
        
        // Submit via hybrid service (will use Launchtube for passkey)
        const result = await HybridTransactionService.submitTransaction(
          signedXdr,
          walletType,
          launchtubeService
        );
        
        if (result.success) {
          console.log(`Transaction submitted via ${result.method}:`, result.transactionHash);
          return {
            signedTxXdr: signedXdr,
            signerAddress: passkeyWallet.address,
            submissionResult: result
          };
        } else {
          throw new Error(result.error || 'Transaction submission failed');
        }
      } catch (error) {
        console.error('Error with passkey transaction:', error);
        throw new Error(`Passkey transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // For Stellar wallets, use existing signing method
    if (!kit) {
      throw new Error('Wallet kit not initialized');
    }
    
    try {
      const result = await kit.signTransaction(xdr, opts);
      console.log('Wallet signTransaction result:', result);
      console.log('Full result object:', JSON.stringify(result, null, 2));
      
      // Handle different wallet response formats
      let signedXdr: string | null = null;
      let signerAddress: string | undefined = address || undefined;
      
      if (typeof result === 'string') {
        // Some wallets return the signed XDR directly as a string
        signedXdr = result;
        console.log('Direct string result:', signedXdr);
      } else if (result && typeof result === 'object') {
        // Check various possible property names that wallets might use
        const resultAny = result as any;
        if (resultAny.signedTxXdr) {
          signedXdr = resultAny.signedTxXdr;
          console.log('Found signedTxXdr:', signedXdr);
        } else if (resultAny.signedTransactionXDR) {
          signedXdr = resultAny.signedTransactionXDR;
          console.log('Found signedTransactionXDR:', signedXdr);
        } else if (resultAny.signed) {
          signedXdr = resultAny.signed;
          console.log('Found signed:', signedXdr);
        } else if (resultAny.xdr) {
          signedXdr = resultAny.xdr;
          console.log('Found xdr:', signedXdr);
        } else if (resultAny.result && typeof resultAny.result === 'string') {
          signedXdr = resultAny.result;
          console.log('Found result.result:', signedXdr);
        }
        
        // Try to extract signer address if available
        if (resultAny.signerAddress) {
          signerAddress = resultAny.signerAddress;
        } else if (resultAny.publicKey) {
          signerAddress = resultAny.publicKey;
        }
      }
      
      if (!signedXdr || typeof signedXdr !== 'string') {
        throw new Error('Wallet did not return a valid signed transaction XDR');
      }
      
      if (signedXdr.length < 50) {
        throw new Error('Invalid signed transaction XDR received from wallet');
      }
      
      console.log('Final signed XDR to return:', signedXdr);
      return {
        signedTxXdr: signedXdr,
        signerAddress: signerAddress
      };
      
    } catch (error) {
      console.error('Error in signTxForOblivion:', error);
      throw new Error(`Transaction signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Kullanıcı verilerini Firebase'den yükle
  const loadUser = async (walletAddress: string) => {
    setUserLoading(true)
    try {
      const userData = await getUserByWallet(walletAddress)
      
      setUser(userData)
      
      // Eğer kullanıcı yoksa veya name/username eksikse setup gerekli
      if (!userData || !userData.name || !userData.username) {
        setNeedsSetup(true)
      } else {
        setNeedsSetup(false)
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setNeedsSetup(true)
    } finally {
      setUserLoading(false)
    }
  }

  const refreshUser = async () => {
    if (address) {
      await loadUser(address)
    }
  }

  // Passkey fonksiyonları
  const createPasskeyWallet = async () => {
    setPasskeyConnecting(true)
    try {
      const walletData = await passkeyService.createWallet()
      setPasskeyWallet(walletData)
      setAddress(walletData.address)
      setWalletType('passkey')
      
      // Passkey wallet bilgilerini localStorage'a kaydet
      localStorage.setItem('walletType', 'passkey')
      localStorage.setItem('walletAddress', walletData.address)
      
      await loadUser(walletData.address)
    } catch (error) {
      console.error('Error creating passkey wallet:', error)
      throw error
    } finally {
      setPasskeyConnecting(false)
    }
  }

  const connectPasskeyWallet = async () => {
    setPasskeyConnecting(true)
    try {
      console.log('Starting manual passkey wallet connection...')
      const walletData = await passkeyService.manualConnectWallet()
      console.log('Manual connect successful:', walletData)
      
      setPasskeyWallet(walletData)
      setAddress(walletData.address)
      setWalletType('passkey')
      
      // Passkey wallet bilgilerini localStorage'a kaydet
      localStorage.setItem('walletType', 'passkey')
      localStorage.setItem('walletAddress', walletData.address)
      
      await loadUser(walletData.address)
    } catch (error) {
      console.error('Error connecting passkey wallet:', error)
      throw error
    } finally {
      setPasskeyConnecting(false)
    }
  }

  const disconnectPasskeyWallet = () => {
    setPasskeyWallet(null)
    setAddress(null)
    setWalletType(null)
    setUser(null)
    setNeedsSetup(false)
    passkeyService.disconnect()
    localStorage.removeItem('walletType')
    localStorage.removeItem('walletAddress')
  }

  // Initialize basic contract on mount
  useEffect(() => {
    // Sadece client ortamında başlat
    if (typeof window === "undefined") return;

    // Passkey desteği kontrolü
    setIsPasskeySupported(passkeyService.isPasskeySupported());

    // Initialize contract
    const contractInstance = new OblivionContract.Client({
      ...OblivionContract.networks.testnet,
      rpcUrl: "https://soroban-testnet.stellar.org:443",
      allowHttp: true,
    });
    setContract(contractInstance);

    // Check if wallet was previously connected (from localStorage)
    const savedAddress = localStorage.getItem('walletAddress')
    const savedWalletType = localStorage.getItem('walletType') as WalletType | null
    
    if (savedAddress && savedWalletType) {
      setAddress(savedAddress)
      setWalletType(savedWalletType)
      
      // Eğer passkey wallet ise, passkey service ile yeniden bağlan
      if (savedWalletType === 'passkey') {
        passkeyService.connectWallet()
          .then(walletData => {
            setPasskeyWallet(walletData)
            loadUser(savedAddress)
          })
          .catch(error => {
            console.error('Failed to reconnect passkey wallet:', error)
            // Hata durumunda localStorage'ı temizle
            localStorage.removeItem('walletAddress')
            localStorage.removeItem('walletType')
          })
      } else {
        loadUser(savedAddress)
      }
    }
  }, [])

  // Address değiştiğinde kullanıcı verilerini yükle ve contract'ı güncelle
  useEffect(() => {
    if (address && walletType === 'stellar' && kit) {
      loadUser(address)
      // Contract'ı Stellar wallet ile güncel adresle oluştur
      kit.getAddress().then(walletInfo => {
        const contractWithSigner = new OblivionContract.Client({
          ...OblivionContract.networks.testnet,
          rpcUrl: "https://soroban-testnet.stellar.org:443",
          allowHttp: true,
          publicKey: address, // Doğru invoker
          ...walletInfo,
        });
        setContract(contractWithSigner);
      }).catch(() => {
        const contractWithSigner = new OblivionContract.Client({
          ...OblivionContract.networks.testnet,
          rpcUrl: "https://soroban-testnet.stellar.org:443",
          allowHttp: true,
          publicKey: address,
        });
        setContract(contractWithSigner);
      });
    } else if (address && walletType === 'passkey') {
      loadUser(address)
      // Contract'ı Passkey wallet için oluştur - publicKey parametresi kullanma
      // çünkü passkey wallet'lar smart contract'lardır ve kendi signing logic'ini yönetir
      const contractWithPasskey = new OblivionContract.Client({
        ...OblivionContract.networks.testnet,
        rpcUrl: "https://soroban-testnet.stellar.org:443",
        allowHttp: true,
        // publicKey parametresi yok - passkey wallet smart contract olarak çalışır
      });
      setContract(contractWithPasskey);
    } else {
      setUser(null)
      setNeedsSetup(false)
      // Disconnected durumda read-only contract
      const readOnlyContract = new OblivionContract.Client({
        ...OblivionContract.networks.testnet,
        rpcUrl: "https://soroban-testnet.stellar.org:443",
        allowHttp: true,
      });
      setContract(readOnlyContract);
    }
  }, [address, kit, walletType, passkeyWallet])

  const connectWallet = async (): Promise<void> => {
    setConnecting(true)

    try {
      // Kit'i connect sırasında başlat (geçici olarak xBull id ile ama modal ile kullanıcıya seçim ekranı açılacak)
      const newKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        modules: allowAllModules(),
        selectedWalletId: XBULL_ID, // Geçici, modal ile değişecek
      })
      setKit(newKit)

      await newKit.openModal({
        onWalletSelected: async (wallet) => {
          await newKit.setWallet(wallet.id) // Kullanıcının seçtiği cüzdan kullanılacak
          const { address } = await newKit.getAddress()
          setAddress(address) // useEffect will handle contract update
          setWalletType('stellar')
          
          // Save Stellar wallet address to localStorage for persistence
          localStorage.setItem('walletAddress', address)
          localStorage.setItem('walletType', 'stellar')
          setConnecting(false)
        },
        onClosed: () => setConnecting(false),
      })
    } catch (e) {
      console.error("Wallet connection failed", e)
      setConnecting(false)
    }
  }

  const disconnectWallet = () => {
    // Stellar wallet'ı kapat
    setKit(null)
    setAddress(null)
    setWalletType(null)
    setUser(null)
    setNeedsSetup(false)
    
    // Passkey wallet'ı da temizle
    setPasskeyWallet(null)
    passkeyService.disconnect()
    
    // LocalStorage'ı temizle
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletType')
  }

  // Process payment using the payment service
  const processPayment = async (paymentData: PaymentData): Promise<PaymentResult> => {
    if (!address) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    try {
      if (walletType === 'stellar' && kit) {
        // Use Stellar wallet for payment
        return await paymentService.processPathPayment(kit, paymentData, address);
      } else if (walletType === 'passkey' && passkeyWallet) {
        // For passkey wallets, we'll need to implement payment through Stellar operations
        // For now, simulate the payment (this should be implemented properly)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          success: true,
          transactionHash: 'passkey_' + Date.now().toString(16)
        };
      } else {
        return {
          success: false,
          error: 'No compatible wallet found for payment'
        };
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
      };
    }
  };

  // Launchtube fonksiyonları
  const submitViaLaunchtube = async (xdr: string): Promise<LaunchtubeResult> => {
    if (!launchtubeService) {
      return {
        success: false,
        error: 'Launchtube service not initialized'
      };
    }

    try {
      const result = await launchtubeService.submitTransaction(xdr);
      
      // Kredi güncellemesi
      if (result.credits !== undefined) {
        setLaunchtubeCredits(result.credits);
      }
      
      return result;
    } catch (error) {
      console.error('Launchtube submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Launchtube submission failed'
      };
    }
  };

  const refreshLaunchtubeCredits = async (): Promise<void> => {
    if (launchtubeService) {
      try {
        const credits = await launchtubeService.getCredits();
        setLaunchtubeCredits(credits);
      } catch (error) {
        console.error('Error refreshing credits:', error);
      }
    }
  };

  // Initialize Launchtube service when passkey wallet is connected
  useEffect(() => {
    if (walletType === 'passkey' && passkeyWallet) {
      const service = getLaunchtubeService('testnet'); // or 'mainnet'
      setLaunchtubeService(service);
      
      // Load initial credits
      service.getCredits().then(credits => {
        setLaunchtubeCredits(credits);
      }).catch(error => {
        console.error('Error loading initial credits:', error);
      });
    } else {
      setLaunchtubeService(null);
      setLaunchtubeCredits(0);
    }
  }, [walletType, passkeyWallet]);

  const value: WalletContextType = {
    kit,
    address,
    connecting,
    connectWallet,
    disconnectWallet,
    isConnected: !!address,
    user,
    userLoading,
    needsSetup,
    refreshUser,
    contract,
    signTxForOblivion,
    processPayment,
    walletType,
    passkeyWallet,
    passkeyConnecting,
    isPasskeySupported,
    connectPasskeyWallet,
    createPasskeyWallet,
    disconnectPasskeyWallet,
    launchtubeService,
    launchtubeCredits,
    submitViaLaunchtube,
    refreshLaunchtubeCredits
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}
