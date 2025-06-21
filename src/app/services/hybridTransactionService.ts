import { WalletType } from '../contexts/WalletContext';
import { LaunchtubeService, LaunchtubeResult } from './launchtubeService';

export interface HybridSubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  method: 'stellar' | 'launchtube';
}

/**
 * Smart transaction submission that automatically chooses between
 * Stellar network and Launchtube based on wallet type
 */
export class HybridTransactionService {
  /**
   * Submit transaction with automatic method selection
   */
  static async submitTransaction(
    xdr: string,
    walletType: WalletType | null,
    launchtubeService: LaunchtubeService | null,
    stellarSubmitFn?: (xdr: string) => Promise<any>
  ): Promise<HybridSubmissionResult> {
    
    // For passkey wallets, always use Launchtube
    if (walletType === 'passkey') {
      if (!launchtubeService) {
        return {
          success: false,
          error: 'Launchtube service not available for passkey wallet',
          method: 'launchtube'
        };
      }

      try {
        const result = await launchtubeService.submitTransaction(xdr);
        return {
          success: result.success,
          transactionHash: result.transactionHash,
          error: result.error,
          method: 'launchtube'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Launchtube submission failed',
          method: 'launchtube'
        };
      }
    }

    // For Stellar wallets, try Stellar network first, fallback to Launchtube if fee issues
    if (walletType === 'stellar') {
      if (stellarSubmitFn) {
        try {
          const result = await stellarSubmitFn(xdr);
          return {
            success: true,
            transactionHash: result.hash || result.transactionHash || result.id,
            method: 'stellar'
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if it's a fee-related error
          if (
            errorMessage.toLowerCase().includes('fee') ||
            errorMessage.toLowerCase().includes('insufficient') ||
            errorMessage.toLowerCase().includes('sponsor')
          ) {
            console.log('Fee error detected, falling back to Launchtube...');
            
            // Fallback to Launchtube
            if (launchtubeService) {
              try {
                const launchtubeResult = await launchtubeService.submitTransaction(xdr);
                return {
                  success: launchtubeResult.success,
                  transactionHash: launchtubeResult.transactionHash,
                  error: launchtubeResult.error,
                  method: 'launchtube'
                };
              } catch (launchtubeError) {
                return {
                  success: false,
                  error: `Stellar failed (${errorMessage}), Launchtube also failed: ${launchtubeError instanceof Error ? launchtubeError.message : 'Unknown error'}`,
                  method: 'launchtube'
                };
              }
            }
          }
          
          return {
            success: false,
            error: errorMessage,
            method: 'stellar'
          };
        }
      }
    }

    return {
      success: false,
      error: 'No compatible submission method available',
      method: 'stellar'
    };
  }

  /**
   * Check if wallet should use Launchtube by default
   */
  static shouldUseLaunchtube(walletType: WalletType | null): boolean {
    return walletType === 'passkey';
  }

  /**
   * Get user-friendly method description
   */
  static getMethodDescription(method: 'stellar' | 'launchtube'): string {
    switch (method) {
      case 'stellar':
        return 'Submitted directly to Stellar network';
      case 'launchtube':
        return 'Submitted via Launchtube (fee-sponsored)';
      default:
        return 'Unknown submission method';
    }
  }
}
