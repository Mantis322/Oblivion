import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCVWHSYCOQ7D2EFFMZNEJJTXLHYYOT7NSVLSOHMLTYIXGDFWJSBHTPIC",
  }
} as const


export interface Post {
  author: string;
  content: string;
  id: u64;
  image_url: string;
  timestamp: u64;
}


export interface Campaign {
  created_at: u64;
  creator: string;
  description: string;
  id: u64;
  image_url: string;
  is_active: boolean;
  title: string;
  total_donated: i128;
}

export const Errors = {
  1: {message:"CampaignNotFound"},

  2: {message:"InvalidAmount"},

  3: {message:"TransferFailed"},

  4: {message:"Unauthorized"},

  5: {message:"CampaignClosed"}
}

export interface Client {
  /**
   * Construct and simulate a create_post transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new post on the blockchain
   */
  create_post: ({author, content, image_url}: {author: string, content: string, image_url: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_post transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get a post by ID
   */
  get_post: ({post_id}: {post_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<Post>>>

  /**
   * Construct and simulate a get_post_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total number of posts
   */
  get_post_count: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_posts_by_author transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get posts by author address
   */
  get_posts_by_author: ({author}: {author: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<Post>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize contract with default admin or custom admin
   */
  initialize: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_campaign transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new donation campaign
   */
  create_campaign: ({creator, title, description, image_url}: {creator: string, title: string, description: string, image_url: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a donate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Donate to a campaign
   */
  donate: ({campaign_id, donor, amount}: {campaign_id: u64, donor: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_campaign transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get campaign details
   */
  get_campaign: ({campaign_id}: {campaign_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<Campaign>>>

  /**
   * Construct and simulate a get_campaign_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total number of campaigns
   */
  get_campaign_count: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_campaigns_by_creator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get campaigns by creator address
   */
  get_campaigns_by_creator: ({creator}: {creator: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<Campaign>>>

  /**
   * Construct and simulate a withdraw_commission transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin function to withdraw accumulated commission
   */
  withdraw_commission: ({admin}: {admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_commission_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get accumulated commission amount
   */
  get_commission_balance: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the default admin address
   */
  get_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a change_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Change admin address (only current admin can do this)
   */
  change_admin: ({current_admin, new_admin}: {current_admin: string, new_admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_initialized transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if contract is initialized (has admin)
   */
  is_initialized: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a withdraw_campaign_funds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Campaign creator can withdraw donations to specified wallet
   */
  withdraw_campaign_funds: ({campaign_id, creator, target_wallet, amount}: {campaign_id: u64, creator: string, target_wallet: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_campaign_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get campaign funds available for withdrawal
   */
  get_campaign_balance: ({campaign_id}: {campaign_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<i128>>>

  /**
   * Construct and simulate a get_campaign_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if a campaign is active/open
   */
  get_campaign_status: ({campaign_id}: {campaign_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a get_all_campaigns transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all campaigns
   */
  get_all_campaigns: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<Campaign>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initalizing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAABFBvc3QAAAAFAAAAAAAAAAZhdXRob3IAAAAAABMAAAAAAAAAB2NvbnRlbnQAAAAAEAAAAAAAAAACaWQAAAAAAAYAAAAAAAAACWltYWdlX3VybAAAAAAAABAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAACENhbXBhaWduAAAACAAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAtkZXNjcmlwdGlvbgAAAAAQAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAJaW1hZ2VfdXJsAAAAAAAAEAAAAAAAAAAJaXNfYWN0aXZlAAAAAAAAAQAAAAAAAAAFdGl0bGUAAAAAAAAQAAAAAAAAAA10b3RhbF9kb25hdGVkAAAAAAAACw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABQAAAAAAAAAQQ2FtcGFpZ25Ob3RGb3VuZAAAAAEAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAACAAAAAAAAAA5UcmFuc2ZlckZhaWxlZAAAAAAAAwAAAAAAAAAMVW5hdXRob3JpemVkAAAABAAAAAAAAAAOQ2FtcGFpZ25DbG9zZWQAAAAAAAU=",
        "AAAAAAAAACNDcmVhdGUgYSBuZXcgcG9zdCBvbiB0aGUgYmxvY2tjaGFpbgAAAAALY3JlYXRlX3Bvc3QAAAAAAwAAAAAAAAAGYXV0aG9yAAAAAAATAAAAAAAAAAdjb250ZW50AAAAABAAAAAAAAAACWltYWdlX3VybAAAAAAAABAAAAABAAAABg==",
        "AAAAAAAAABBHZXQgYSBwb3N0IGJ5IElEAAAACGdldF9wb3N0AAAAAQAAAAAAAAAHcG9zdF9pZAAAAAAGAAAAAQAAA+gAAAfQAAAABFBvc3Q=",
        "AAAAAAAAABlHZXQgdG90YWwgbnVtYmVyIG9mIHBvc3RzAAAAAAAADmdldF9wb3N0X2NvdW50AAAAAAAAAAAAAQAAAAY=",
        "AAAAAAAAABtHZXQgcG9zdHMgYnkgYXV0aG9yIGFkZHJlc3MAAAAAE2dldF9wb3N0c19ieV9hdXRob3IAAAAAAQAAAAAAAAAGYXV0aG9yAAAAAAATAAAAAQAAA+oAAAfQAAAABFBvc3Q=",
        "AAAAAAAAADZJbml0aWFsaXplIGNvbnRyYWN0IHdpdGggZGVmYXVsdCBhZG1pbiBvciBjdXN0b20gYWRtaW4AAAAAAAppbml0aWFsaXplAAAAAAAAAAAAAA==",
        "AAAAAAAAAB5DcmVhdGUgYSBuZXcgZG9uYXRpb24gY2FtcGFpZ24AAAAAAA9jcmVhdGVfY2FtcGFpZ24AAAAABAAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAV0aXRsZQAAAAAAABAAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAACWltYWdlX3VybAAAAAAAABAAAAABAAAABg==",
        "AAAAAAAAABREb25hdGUgdG8gYSBjYW1wYWlnbgAAAAZkb25hdGUAAAAAAAMAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAAAAAAABWRvbm9yAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAABRHZXQgY2FtcGFpZ24gZGV0YWlscwAAAAxnZXRfY2FtcGFpZ24AAAABAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAQAAA+gAAAfQAAAACENhbXBhaWdu",
        "AAAAAAAAAB1HZXQgdG90YWwgbnVtYmVyIG9mIGNhbXBhaWducwAAAAAAABJnZXRfY2FtcGFpZ25fY291bnQAAAAAAAAAAAABAAAABg==",
        "AAAAAAAAACBHZXQgY2FtcGFpZ25zIGJ5IGNyZWF0b3IgYWRkcmVzcwAAABhnZXRfY2FtcGFpZ25zX2J5X2NyZWF0b3IAAAABAAAAAAAAAAdjcmVhdG9yAAAAABMAAAABAAAD6gAAB9AAAAAIQ2FtcGFpZ24=",
        "AAAAAAAAADFBZG1pbiBmdW5jdGlvbiB0byB3aXRoZHJhdyBhY2N1bXVsYXRlZCBjb21taXNzaW9uAAAAAAAAE3dpdGhkcmF3X2NvbW1pc3Npb24AAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAACFHZXQgYWNjdW11bGF0ZWQgY29tbWlzc2lvbiBhbW91bnQAAAAAAAAWZ2V0X2NvbW1pc3Npb25fYmFsYW5jZQAAAAAAAAAAAAEAAAAL",
        "AAAAAAAAAB1HZXQgdGhlIGRlZmF1bHQgYWRtaW4gYWRkcmVzcwAAAAAAAAlnZXRfYWRtaW4AAAAAAAAAAAAAAQAAABA=",
        "AAAAAAAAADVDaGFuZ2UgYWRtaW4gYWRkcmVzcyAob25seSBjdXJyZW50IGFkbWluIGNhbiBkbyB0aGlzKQAAAAAAAAxjaGFuZ2VfYWRtaW4AAAACAAAAAAAAAA1jdXJyZW50X2FkbWluAAAAAAAAEwAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAACxDaGVjayBpZiBjb250cmFjdCBpcyBpbml0aWFsaXplZCAoaGFzIGFkbWluKQAAAA5pc19pbml0aWFsaXplZAAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAADtDYW1wYWlnbiBjcmVhdG9yIGNhbiB3aXRoZHJhdyBkb25hdGlvbnMgdG8gc3BlY2lmaWVkIHdhbGxldAAAAAAXd2l0aGRyYXdfY2FtcGFpZ25fZnVuZHMAAAAABAAAAAAAAAALY2FtcGFpZ25faWQAAAAABgAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAA10YXJnZXRfd2FsbGV0AAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAACtHZXQgY2FtcGFpZ24gZnVuZHMgYXZhaWxhYmxlIGZvciB3aXRoZHJhd2FsAAAAABRnZXRfY2FtcGFpZ25fYmFsYW5jZQAAAAEAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAABAAAD6AAAAAs=",
        "AAAAAAAAACJDaGVjayBpZiBhIGNhbXBhaWduIGlzIGFjdGl2ZS9vcGVuAAAAAAATZ2V0X2NhbXBhaWduX3N0YXR1cwAAAAABAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAQAAA+kAAAABAAAAAw==",
        "AAAAAAAAABFHZXQgYWxsIGNhbXBhaWducwAAAAAAABFnZXRfYWxsX2NhbXBhaWducwAAAAAAAAAAAAABAAAD6gAAB9AAAAAIQ2FtcGFpZ24=" ]),
      options
    )
  }
  public readonly fromJSON = {
    create_post: this.txFromJSON<u64>,
        get_post: this.txFromJSON<Option<Post>>,
        get_post_count: this.txFromJSON<u64>,
        get_posts_by_author: this.txFromJSON<Array<Post>>,
        initialize: this.txFromJSON<null>,
        create_campaign: this.txFromJSON<u64>,
        donate: this.txFromJSON<Result<void>>,
        get_campaign: this.txFromJSON<Option<Campaign>>,
        get_campaign_count: this.txFromJSON<u64>,
        get_campaigns_by_creator: this.txFromJSON<Array<Campaign>>,
        withdraw_commission: this.txFromJSON<Result<void>>,
        get_commission_balance: this.txFromJSON<i128>,
        get_admin: this.txFromJSON<string>,
        change_admin: this.txFromJSON<Result<void>>,
        is_initialized: this.txFromJSON<boolean>,
        withdraw_campaign_funds: this.txFromJSON<Result<void>>,
        get_campaign_balance: this.txFromJSON<Option<i128>>,
        get_campaign_status: this.txFromJSON<Result<boolean>>,
        get_all_campaigns: this.txFromJSON<Array<Campaign>>
  }
}