import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

export interface LaunchtubeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  credits?: number;
}

export interface LaunchtubeConfig {
  baseUrl: string;
  token: string;
}

export class LaunchtubeService {
  private config: LaunchtubeConfig;

  constructor(config: LaunchtubeConfig) {
    this.config = config;
  }

  /**
   * Submit a transaction via Launchtube
   */
  async submitTransaction(xdr: string): Promise<LaunchtubeResult> {
    try {
      const formData = new FormData();
      formData.append('xdr', xdr);

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        },
        body: formData
      });

      const result = await response.json();
      const creditsRemaining = response.headers.get('X-Credits-Remaining');

      if (response.ok) {
        return {
          success: true,
          transactionHash: result.hash,
          credits: creditsRemaining ? parseInt(creditsRemaining) : undefined
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Transaction submission failed',
          credits: creditsRemaining ? parseInt(creditsRemaining) : undefined
        };
      }
    } catch (error) {
      console.error('Launchtube submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Submit a Soroban function call via Launchtube
   */
  async submitSorobanFunction(
    func: string, 
    auth: string[], 
    simulate: boolean = true
  ): Promise<LaunchtubeResult> {
    try {
      const formData = new FormData();
      formData.append('func', func);
      formData.append('auth', JSON.stringify(auth));
      formData.append('sim', simulate.toString());

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        },
        body: formData
      });

      const result = await response.json();
      const creditsRemaining = response.headers.get('X-Credits-Remaining');

      if (response.ok) {
        return {
          success: true,
          transactionHash: result.hash,
          credits: creditsRemaining ? parseInt(creditsRemaining) : undefined
        };
      } else {
        return {
          success: false,
          error: result.message || result.error || 'Function call failed',
          credits: creditsRemaining ? parseInt(creditsRemaining) : undefined
        };
      }
    } catch (error) {
      console.error('Launchtube function call error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get remaining credits
   */
  async getCredits(): Promise<number> {
    try {
      const response = await fetch(`${this.config.baseUrl}/info`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        }
      });

      if (response.ok) {
        const credits = await response.text();
        return parseInt(credits) || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching credits:', error);
      return 0;
    }
  }

  /**
   * Check if Launchtube should be used for this wallet type
   */
  static shouldUseLaunchtube(walletType: string | null): boolean {
    return walletType === 'passkey';
  }
}

// Singleton instances for different environments
export const testnetLaunchtube = new LaunchtubeService({
  baseUrl: 'https://testnet.launchtube.xyz',
  token: process.env.NEXT_PUBLIC_LAUNCHTUBE_TESTNET_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZGIyYjM4OTA2OTYxNDY5YjIwYWIxNTUyZjg2Mjg3NGUxYWQ2MmU2NTg3Njc3YTA5ZTZiZDYzOWMxYjlhMjU1IiwiZXhwIjoxNzU3Nzc4ODExLCJjcmVkaXRzIjoxMDAwMDAwMDAwLCJpYXQiOjE3NTA1MjEyMTF9.RLsqj4WLoi1sMvyMPu86qJqRb63zfSxLICFtXxYTERs'
});

export const mainnetLaunchtube = new LaunchtubeService({
  baseUrl: 'https://launchtube.xyz',
  token: process.env.NEXT_PUBLIC_LAUNCHTUBE_MAINNET_TOKEN || ''
});

// Get appropriate instance based on network
export function getLaunchtubeService(network: 'testnet' | 'mainnet' = 'testnet'): LaunchtubeService {
  return network === 'mainnet' ? mainnetLaunchtube : testnetLaunchtube;
}
