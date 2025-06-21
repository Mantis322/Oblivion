import { 
  Keypair, 
  Networks, 
  Operation, 
  TransactionBuilder, 
  Asset,
  BASE_FEE,
  Memo,
  MemoType,
  Horizon
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface PaymentData {
  pathId: string;
  amount: string;
  currency: string;
  recipientAddress: string;
  memo?: string;
}

export class PaymentService {
  private server: Horizon.Server;
  private networkPassphrase: string;

  constructor() {
    // Use testnet for now - in production, use horizon server
    this.networkPassphrase = Networks.TESTNET;
    this.server = new Horizon.Server('https://horizon-testnet.stellar.org');
  }

  /**
   * Process a path purchase payment using Stellar network
   */
  async processPathPayment(
    walletKit: StellarWalletsKit,
    paymentData: PaymentData,
    userPublicKey: string
  ): Promise<PaymentResult> {
    try {
      // Validate inputs
      if (!userPublicKey) {
        return { success: false, error: 'User wallet not connected' };
      }

      if (!paymentData.recipientAddress) {
        return { success: false, error: 'Invalid recipient address' };
      }

      // Validate Stellar addresses
      if (!PaymentService.isValidStellarAddress(userPublicKey)) {
        return { success: false, error: 'Invalid user address' };
      }

      if (!PaymentService.isValidStellarAddress(paymentData.recipientAddress)) {
        return { success: false, error: 'Invalid recipient address' };
      }

      try {
        // Load the user's account from Stellar network
        const account = await this.server.loadAccount(userPublicKey);
        
        // Create the payment asset (XLM by default)
        const asset = paymentData.currency === 'XLM' 
          ? Asset.native() 
          : new Asset(paymentData.currency, paymentData.recipientAddress);

        // Create payment operation
        const operation = Operation.payment({
          destination: paymentData.recipientAddress,
          asset: asset,
          amount: paymentData.amount,
        });

        // Build transaction
        const transaction = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(operation)
          .addMemo(Memo.text(paymentData.memo || `O.B.I. Path: ${paymentData.pathId}`))
          .setTimeout(30)
          .build();

        // Sign transaction with user's wallet
        const signResult = await walletKit.signTransaction(transaction.toXDR());
        
        // Parse the signed transaction - handle different wallet response formats
        let signedXdr: string;
        if (typeof signResult === 'string') {
          signedXdr = signResult;
        } else if (signResult && typeof signResult === 'object' && 'signedTxXdr' in signResult) {
          signedXdr = signResult.signedTxXdr;
        } else {
          throw new Error('Invalid signature response from wallet');
        }
        
        const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
        
        // Submit to Stellar network
        const result = await this.server.submitTransaction(signedTx);
        
        return {
          success: true,
          transactionHash: result.hash
        };

      } catch (error) {
        console.error('Stellar payment error:', error);
        
        // Handle specific Stellar errors
        if (error instanceof Error) {
          if (error.message.includes('insufficient')) {
            return { success: false, error: 'Insufficient balance for payment' };
          } else if (error.message.includes('destination')) {
            return { success: false, error: 'Invalid destination address' };
          } else if (error.message.includes('timeout')) {
            return { success: false, error: 'Transaction timeout - please try again' };
          }
        }
        
        return { success: false, error: 'Payment failed - please try again' };
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }



  /**
   * Validate Stellar address format
   */
  static isValidStellarAddress(address: string): boolean {
    try {
      Keypair.fromPublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format amount for Stellar (7 decimal places max)
   */
  static formatStellarAmount(amount: number): string {
    return amount.toFixed(7).replace(/\.?0+$/, '');
  }

  /**
   * Get payment details for a path
   */
  static getPathPaymentDetails(path: any, creatorAddress: string) {
    return {
      pathId: path.id,
      amount: PaymentService.formatStellarAmount(path.price),
      currency: path.currency || 'XLM',
      recipientAddress: creatorAddress,
      memo: `O.B.I. Path: ${path.name}`
    };
  }
}

export const paymentService = new PaymentService();