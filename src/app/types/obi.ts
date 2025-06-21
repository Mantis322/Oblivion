// O.B.I. (Oblivion Business Interface) Type Definitions

export interface OblivionVenture {
  id?: string;
  creatorId: string; // Wallet address of the creator
  name: string;
  description: string;
  photo?: string;
  links: VentureLink[];
  repositories: OblivionRepository[];
  followerCount?: number;
  totalPaths?: number; // Dynamically calculated total paths across all repositories
  createdAt: any; // Firebase Timestamp or Date
  updatedAt: any; // Firebase Timestamp or Date
  isActive?: boolean;
}

export interface VentureLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface OblivionRepository {
  id?: string;
  ventureId: string;
  creatorId: string; // Wallet address of the creator
  name: string;
  description: string;
  photo?: string;
  paths: OblivionPath[];
  pathCount?: number; // Dynamically calculated path count
  followerCount?: number;
  createdAt: any; // Firebase Timestamp or Date
  updatedAt: any; // Firebase Timestamp or Date
  isActive?: boolean;
}

export interface OblivionPath {
  id?: string;
  repositoryId: string;
  name: string;
  description: string;
  photo?: string;
  price: number; // 0 for free paths
  isFree: boolean;
  currency: string; // 'USD', 'XLM', etc.
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration?: string;
  creatorId: string; // Wallet address of the creator
  assets: OblivionAsset[];
  assetCount?: number;
  enrolledCount?: number;
  rating?: number;
  reviewCount?: number;
  purchasedBy: string[]; // Array of user wallet addresses who purchased this path
  createdAt: any; // Firebase Timestamp or Date
  updatedAt: any; // Firebase Timestamp or Date
  isActive?: boolean;
}

export interface OblivionAsset {
  id?: string;
  pathId: string;
  title: string;
  description?: string;
  type?: 'document' | 'video' | 'image';
  content: string; // Rich text content (JSON from Tiptap editor)
  mediaUrl?: string;
  downloadUrl?: string;
  duration?: string;
  isPublic?: boolean;
  creatorId: string; // Wallet address of the creator
  media: AssetMedia[];
  order?: number; // For ordering assets within a path
  viewCount?: number;
  likeCount?: number;
  createdAt: any; // Firebase Timestamp or Date
  updatedAt: any; // Firebase Timestamp or Date
}

export interface AssetMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  order: number; // For ordering media within an asset
}

// Purchase record for tracking who bought what
export interface PathPurchase {
  id: string;
  pathId: string;
  buyerId: string;
  buyerWalletAddress: string;
  price: number;
  currency: string;
  transactionHash?: string; // Stellar transaction hash
  purchaseDate: any; // Firebase Timestamp or Date
  isActive: boolean;
}

// User enrollment in a path (for tracking progress)
export interface PathEnrollment {
  id: string;
  pathId: string;
  userId: string;
  userWalletAddress: string;
  enrollmentDate: any; // Firebase Timestamp or Date
  progress: number; // Percentage completed (0-100)
  completedAssets: string[]; // Array of asset IDs
  isCompleted: boolean;
  completionDate?: any; // Firebase Timestamp or Date
}

// Review system for paths
export interface PathReview {
  id: string;
  pathId: string;
  reviewerId: string;
  reviewerWalletAddress: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: any; // Firebase Timestamp or Date
  updatedAt: any; // Firebase Timestamp or Date
  isVerified?: boolean;
}
