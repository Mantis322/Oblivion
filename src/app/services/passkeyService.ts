import { PasskeyKit } from 'passkey-kit';
import { db } from '../../../firebase'; // Import Firestore database instance
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Firestore functions

export interface PasskeyWalletData {
  address: string;
  contractId: string;
  passkeysRegistered: Array<{
    id: string;
    publicKey: string;
  }>;
}

class PasskeyService {
  private passkeyKit: PasskeyKit | null = null;
  private isInitialized = false;
  private currentContractId: string | null = null;
  private currentKeyId: string | null = null;  // Stellar Testnet configuration
  private readonly config = {
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    // Smart wallet WASM hash for testnet - using the working hash from working example
    walletWasmHash: "ecd990f0b45ca6817149b6175f79b32efb442f35731985a084131e8265c4cd90", // Working hash from passkey-calisanornek
    // Mercury configuration for contract ID lookup
    mercuryUrl: "https://api.mercurydata.app",
    mercuryProjectName: "smart-wallets-next-dima",
    // Launchtube configuration
    launchtubeUrl: "https://testnet.launchtube.xyz"
  };
  constructor() {
    // Auto-restore keyId from localStorage and auto-connect if available (check both key formats)
    if (typeof window !== 'undefined') {
      const keyId = localStorage.getItem('sp:keyId') || localStorage.getItem('oblivion:keyId');
      if (keyId) {
        this.currentKeyId = keyId;
        // Auto-connect when keyId is available
        this.autoConnect();
      }
    }
  }
  private async autoConnect() {
    try {
      if (this.currentKeyId && !this.currentContractId) {
        console.log('Attempting auto-connect for keyId:', this.currentKeyId);
        await this.connectWallet();
      }
    } catch (error) {
      console.log('Auto-connect failed (this is normal on first load):', error);
      // Auto-connect failure is not critical, just clear the stored keyId if it's invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sp:keyId');
        localStorage.removeItem('oblivion:keyId');
        this.currentKeyId = null;
      }
    }
  }
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.passkeyKit = new PasskeyKit({
        rpcUrl: this.config.rpcUrl,
        networkPassphrase: this.config.networkPassphrase,
        walletWasmHash: this.config.walletWasmHash,
      });
      
      this.isInitialized = true;
      console.log('Passkey Kit initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Passkey Kit:', error);
      throw new Error('Passkey initialization failed');
    }
  }  async createWallet(): Promise<PasskeyWalletData> {
    if (!this.passkeyKit) {
      await this.initialize();
    }

    try {
      // Generate a unique user identifier - using the same pattern as working example
      const user = 'Oblivion User';
      
      // Create passkey wallet following the working example pattern
      const {
        keyId: kid,
        keyIdBase64,
        contractId: cid,
        signedTx,
      } = await this.passkeyKit!.createWallet(user, user);
      
      // Store the contractId and keyId for later use
      this.currentContractId = cid;
      this.currentKeyId = keyIdBase64;      // Save keyId to localStorage for auto-connect (use working example's key format)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sp:keyId', keyIdBase64);  // Use same key as working example
        localStorage.setItem('oblivion:contractId', cid);
        localStorage.setItem('oblivion:keyId', keyIdBase64);  // Keep our key for compatibility
        console.log('Saved keyId to localStorage:', keyIdBase64);
        console.log('Saved contractId to localStorage:', cid);
      }      // Save mapping to Firestore for multi-device support
      try {
        await this.saveContractIdToFirestore(keyIdBase64, cid);
        console.log('Passkey mapping saved to Firestore successfully');
      } catch (error) {
        console.error('Failed to save passkey mapping to Firestore:', error);
        // Don't throw error here - localStorage backup is still available
      }
      
      // In a real app, you'd want to send the transaction to the network
      // await this.sendTransaction(signedTx.toXDR());
      
      return {
        address: cid,
        contractId: cid,
        passkeysRegistered: [{
          id: keyIdBase64,
          publicKey: kid.toString('hex')
        }]
      };
    } catch (error) {
      console.error('Failed to create passkey wallet:', error);
      throw new Error('Wallet creation failed');
    }
  }  async connectWallet(): Promise<PasskeyWalletData> {
    if (!this.passkeyKit) {
      await this.initialize();
    }

    try {
      // Helper function to get contractId from keyId using Firestore
      const getContractId = async (signer: string) => {
        console.log('getContractId called with signer:', signer);
        
        try {
          // Try to get contractId from Firestore
          const contractId = await this.getContractIdFromFirestore(signer);
          if (contractId) {
            console.log('Found contractId in Firestore:', contractId);
            return contractId;
          }
        } catch (error) {
          console.log('Failed to fetch from Firestore:', error);
        }

        // If not found in Firestore, try localStorage as fallback
        if (typeof window !== 'undefined') {
          const storedContractId = localStorage.getItem('oblivion:contractId');
          if (storedContractId) {
            console.log('Found contractId in localStorage:', storedContractId);
            return storedContractId;
          }
        }
        
        console.log('No contractId found anywhere, throwing error');
        throw new Error('Contract not found');
      };

      // If we have a stored keyId, use it for connection
      const connectOptions: any = { getContractId };
      if (this.currentKeyId) {
        connectOptions.keyId = this.currentKeyId;
        console.log('Using stored keyId for connection:', this.currentKeyId);
      } else {
        console.log('No stored keyId found');
      }

      console.log('Calling connectWallet with options:', connectOptions);
      
      // Connect to existing passkey wallet
      const { keyId: kid, keyIdBase64, contractId: cid } = await this.passkeyKit!.connectWallet(connectOptions);
      
      console.log('Connect wallet result:', { keyIdBase64, contractId: cid });
      
      // Store the contractId and keyId for later use
      this.currentContractId = cid;
      this.currentKeyId = keyIdBase64;
      
      // Save both keyId and contractId to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('sp:keyId', keyIdBase64);
        localStorage.setItem('oblivion:keyId', keyIdBase64);
        localStorage.setItem('oblivion:contractId', cid);
      }
      
      return {
        address: cid,
        contractId: cid,
        passkeysRegistered: [{
          id: keyIdBase64,
          publicKey: kid.toString('hex')
        }]
      };
    } catch (error) {
      console.error('Failed to connect passkey wallet:', error);
      throw new Error('Wallet connection failed');
    }
  }async manualConnectWallet(): Promise<PasskeyWalletData> {
    if (!this.passkeyKit) {
      await this.initialize();
    }

    try {
      console.log('Starting manual connect wallet process...');
        // Check if there's already a stored keyId and contractId pair (check both key formats)
      const storedKeyId = localStorage.getItem('sp:keyId') || localStorage.getItem('oblivion:keyId');
      const storedContractId = localStorage.getItem('oblivion:contractId');
      
      console.log('Stored credentials:', { storedKeyId, storedContractId });      // Helper function to get contractId from keyId
      const getContractId = async (signer: string) => {
        console.log('getContractId called with signer:', signer);
        
        // Priority 1: Check localStorage first (fastest)
        if (storedContractId) {
          console.log('Returning stored contractId from localStorage:', storedContractId);
          return storedContractId;
        }        // Priority 2: Check Firestore database
        try {
          console.log('Attempting to fetch contractId from Firestore...');
          const contractId = await this.getContractIdFromFirestore(signer);
          
          if (contractId) {
            console.log('Found contractId in Firestore:', contractId);
            
            // Save to localStorage for faster future access
            if (typeof window !== 'undefined') {
              localStorage.setItem('oblivion:contractId', contractId);
            }
            
            return contractId;
          } else {
            console.log('No contractId found in Firestore for keyId:', signer);
          }
        } catch (error) {
          console.log('Failed to fetch from Firestore:', error);
        }

        // Priority 3: Try external APIs as fallback (for testing/compatibility)
        try {
          console.log('Attempting to fetch contractId from working example API...');
          const apiUrl = `https://superpeach.pages.dev/api/contract-id/${signer}`;
          console.log('API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const contractId = await response.text();
            console.log('Found contractId from external API:', contractId);
            
            // Save both to localStorage and Firestore
            if (typeof window !== 'undefined' && contractId) {
              localStorage.setItem('oblivion:contractId', contractId);
            }
              // Also save to our Firestore for future use
            try {
              await this.saveContractIdToFirestore(signer, contractId);
              console.log('Saved external API result to Firestore');
            } catch (firestoreError) {
              console.log('Failed to save to Firestore:', firestoreError);
            }
            
            return contractId;
          } else {
            console.log('No contractId found in external API, status:', response.status);
          }
        } catch (error) {
          console.log('Failed to fetch from external API:', error);
        }        // If still no contractId found, throw an error like the working example API does
        console.log('No contractId found anywhere, throwing error like working example...');
        
        throw new Error('Contract not found');
      };

      // Prepare connect options
      const connectOptions: any = { getContractId };
      
      // If we have stored keyId, use it
      if (storedKeyId) {
        connectOptions.keyId = storedKeyId;
        console.log('Using stored keyId for connection:', storedKeyId);
      }
        console.log('Calling connectWallet for manual connect...');
      
      // Connect to existing passkey wallet
      const result = await this.passkeyKit!.connectWallet(connectOptions);
      console.log('Raw connect result:', result);
      
      const { keyId: kid, keyIdBase64, contractId: cid } = result;
      
      console.log('Manual connect result:', { keyIdBase64, contractId: cid });
      
      // If we get a valid result but no contractId, it might mean the wallet exists in passkey
      // but hasn't been deployed as a smart contract yet
      if (!cid) {
        console.log('Connected to passkey but no smart contract found. Creating new smart contract...');
        // For now, we'll throw an error suggesting to create a new wallet
        // In the future, this could automatically deploy a new smart contract
        throw new Error('Passkey found but no smart contract wallet deployed. Please create a new passkey wallet to deploy the smart contract.');
      }
      
      // Store the contractId and keyId for later use
      this.currentContractId = cid;
      this.currentKeyId = keyIdBase64;      // Save both keyId and contractId to localStorage (use working example format)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sp:keyId', keyIdBase64);  // Working example format
        localStorage.setItem('oblivion:keyId', keyIdBase64);  // Our format for compatibility
        localStorage.setItem('oblivion:contractId', cid);
        console.log('Manual connect - Saved keyId and contractId to localStorage');
      }      // Also save to Firestore for multi-device support
      try {
        await this.saveContractIdToFirestore(keyIdBase64, cid);
        console.log('Manual connect - Passkey mapping saved to Firestore successfully');
      } catch (error) {
        console.error('Manual connect - Failed to save passkey mapping to Firestore:', error);
        // Don't throw error here - localStorage backup is still available
      }
      
      return {
        address: cid,
        contractId: cid,
        passkeysRegistered: [{
          id: keyIdBase64,
          publicKey: kid.toString('hex')
        }]
      };
    } catch (error: any) {
      console.error('Failed to manually connect passkey wallet:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause
      });
        // PasskeyKit'den gelen spesifik hataları yakalayalım
      if (error?.message?.includes('No credential available') || error?.message?.includes('NotAllowedError: The operation either timed out or was not allowed')) {
        throw new Error('No passkey found for this device. Please create a new passkey wallet first, or try on a device where you previously created a passkey.');
      } else if (error?.message?.includes('User cancelled') || error?.message?.includes('cancelled')) {
        throw new Error('Passkey authentication was cancelled.');
      } else if (error?.message?.includes('NotAllowedError')) {
        throw new Error('Passkey access denied. Please check your browser settings and ensure passkeys are enabled.');
      } else if (error?.message?.includes('no smart contract wallet deployed')) {
        throw new Error('Your passkey exists but no smart contract wallet is deployed yet. Please create a new passkey wallet to complete the setup.');
      } else if (error?.message?.includes('NetworkError') || error?.message?.includes('fetch')) {
        throw new Error('Network error while connecting to wallet services. Please check your internet connection and try again.');
      }
      
      throw new Error(`Manual wallet connection failed: ${error?.message || 'Unknown error'}`);
    }
  }
  async getAddress(): Promise<string | null> {
    // In the working example, the address is stored from the connection/creation result
    // We'll need to store the contractId from the wallet creation/connection
    return this.currentContractId || null;
  }
  async signTransaction(xdr: string): Promise<string> {
    if (!this.passkeyKit || !this.currentKeyId) {
      throw new Error('Passkey Kit not initialized or wallet not connected');
    }

    try {
      // Simply pass the XDR string directly to the passkey kit sign method
      // The passkey kit will handle the proper signing internally
      await this.passkeyKit.sign(xdr, { keyId: this.currentKeyId });
      
      // Return the original XDR - the signing is done in-place
      return xdr;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw new Error('Transaction signing failed');
    }
  }

  async addSigner(): Promise<void> {
    // This functionality would need to be implemented based on the smart wallet contract
    // For now, we'll throw an error indicating it's not yet implemented
    throw new Error('Add signer functionality not yet implemented');
  }

  async removeSigner(signerId: string): Promise<void> {
    // This functionality would need to be implemented based on the smart wallet contract
    // For now, we'll throw an error indicating it's not yet implemented
    throw new Error('Remove signer functionality not yet implemented');
  }

  isPasskeySupported(): boolean {
    // Passkey desteği kontrolü
    return typeof window !== 'undefined' && 
           'navigator' in window && 
           'credentials' in navigator &&
           typeof navigator.credentials.create === 'function';
  }  disconnect(): void {
    this.passkeyKit = null;
    this.isInitialized = false;
    this.currentContractId = null;
    this.currentKeyId = null;
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oblivion:keyId');
      localStorage.removeItem('oblivion:contractId');
    }
  }

  // Firestore helper methods for keyId <-> contractId mapping
  private async saveContractIdToFirestore(keyId: string, contractId: string): Promise<void> {
    try {
      const docRef = doc(db, 'passkey_mappings', keyId);
      await setDoc(docRef, {
        keyId,
        contractId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('Saved passkey mapping to Firestore:', { keyId, contractId });
    } catch (error) {
      console.error('Failed to save passkey mapping to Firestore:', error);
      throw error;
    }
  }

  private async getContractIdFromFirestore(keyId: string): Promise<string | null> {
    try {
      const docRef = doc(db, 'passkey_mappings', keyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Retrieved passkey mapping from Firestore:', data);
        return data.contractId;
      } else {
        console.log('No passkey mapping found in Firestore for keyId:', keyId);
        return null;
      }
    } catch (error) {
      console.error('Failed to get passkey mapping from Firestore:', error);
      return null;
    }
  }
}

export const passkeyService = new PasskeyService();
