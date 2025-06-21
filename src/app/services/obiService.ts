import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { 
  OblivionVenture, 
  OblivionRepository, 
  OblivionPath, 
  OblivionAsset, 
  PathPurchase,
  VentureLink 
} from '../types/obi';

// Venture Services
export const createVenture = async (
  creatorId: string, 
  name: string, 
  description: string, 
  photo?: string
): Promise<{ success: boolean; ventureId?: string; error?: string }> => {
  try {
    const venture: Partial<OblivionVenture> = {
      creatorId,
      name,
      description,
      photo: photo || '',
      links: [],
      repositories: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };

    const docRef = await addDoc(collection(db, 'oblivion_ventures'), venture);
    return { success: true, ventureId: docRef.id };
  } catch (error) {
    console.error('Error creating venture:', error);
    return { success: false, error: 'Failed to create venture' };
  }
};

export const getVenturesByOwner = async (creatorId: string): Promise<OblivionVenture[]> => {
  try {
    // Simplified query to avoid Firebase index requirement
    const q = query(
      collection(db, 'oblivion_ventures'),
      where('creatorId', '==', creatorId)
    );
    
    const querySnapshot = await getDocs(q);
    const ventures = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OblivionVenture));
    
    // Filter and sort in memory to avoid Firebase index requirement
    return ventures
      .filter(venture => venture.isActive !== false)
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.updatedAt || 0;
        const bTime = b.updatedAt?.seconds || b.updatedAt || 0;
        return bTime - aTime; // Descending order
      });
  } catch (error) {
    console.error('Error fetching ventures:', error);
    return [];
  }
};

export const getVentureById = async (ventureId: string): Promise<OblivionVenture | null> => {
  try {
    const docRef = doc(db, 'oblivion_ventures', ventureId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OblivionVenture;
    }
    return null;
  } catch (error) {
    console.error('Error fetching venture:', error);
    return null;
  }
};

export const updateVenture = async (
  ventureId: string, 
  updates: Partial<OblivionVenture>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'oblivion_ventures', ventureId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating venture:', error);
    return { success: false, error: 'Failed to update venture' };
  }
};

export const addVentureLink = async (
  ventureId: string, 
  link: Omit<VentureLink, 'id'>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const newLink: VentureLink = {
      id: `link_${Date.now()}`,
      ...link
    };

    const docRef = doc(db, 'oblivion_ventures', ventureId);
    await updateDoc(docRef, {
      links: arrayUnion(newLink),
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding venture link:', error);
    return { success: false, error: 'Failed to add link' };
  }
};

export const removeVentureLink = async (
  ventureId: string, 
  linkId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const venture = await getVentureById(ventureId);
    if (!venture) return { success: false, error: 'Venture not found' };

    const updatedLinks = venture.links.filter(link => link.id !== linkId);
    
    const docRef = doc(db, 'oblivion_ventures', ventureId);
    await updateDoc(docRef, {
      links: updatedLinks,
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error removing venture link:', error);
    return { success: false, error: 'Failed to remove link' };
  }
};

// Repository Services
export const createRepository = async (
  ventureId: string,
  name: string,
  description: string,
  creatorId: string,
  photo?: string
): Promise<{ success: boolean; repositoryId?: string; error?: string }> => {
  try {
    const repository: Partial<OblivionRepository> = {
      ventureId,
      name,
      description,
      creatorId,
      photo: photo || '',
      paths: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };

    const docRef = await addDoc(collection(db, 'oblivion_repositories'), repository);
    return { success: true, repositoryId: docRef.id };
  } catch (error) {
    console.error('Error creating repository:', error);
    return { success: false, error: 'Failed to create repository' };
  }
};

export const updateRepository = async (
  repositoryId: string, 
  updates: Partial<OblivionRepository>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'oblivion_repositories', repositoryId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating repository:', error);
    return { success: false, error: 'Failed to update repository' };
  }
};

export const deleteRepository = async (repositoryId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // TODO: In a full implementation, you would also delete all related paths and assets
    // For now, we'll just delete the repository document
    const docRef = doc(db, 'oblivion_repositories', repositoryId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting repository:', error);
    return { success: false, error: 'Failed to delete repository' };
  }
};

export const getRepositoriesByVenture = async (ventureId: string): Promise<OblivionRepository[]> => {
  try {
    // Simplified query to avoid index requirements
    const q = query(
      collection(db, 'oblivion_repositories'),
      where('ventureId', '==', ventureId)
    );
    
    const querySnapshot = await getDocs(q);
    const repositories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OblivionRepository));
    
    // Filter and sort in memory
    return repositories
      .filter(repo => repo.isActive !== false) // Include repos where isActive is undefined or true
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.updatedAt || 0;
        const bTime = b.updatedAt?.seconds || b.updatedAt || 0;
        return bTime - aTime; // Descending order
      });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return [];
  }
};

export const getRepositoryById = async (repositoryId: string): Promise<OblivionRepository | null> => {
  try {
    const docRef = doc(db, 'oblivion_repositories', repositoryId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OblivionRepository;
    }
    return null;
  } catch (error) {
    console.error('Error fetching repository:', error);
    return null;
  }
};

// Path Access and Purchase Services
export const checkPathAccess = async (pathId: string, userId: string): Promise<boolean> => {
  try {
    // Method 1: Check oblivion_path_access collection
    const accessQuery = query(
      collection(db, 'oblivion_path_access'),
      where('pathId', '==', pathId),
      where('userId', '==', userId)
    );
    const accessSnapshot = await getDocs(accessQuery);
    
    if (!accessSnapshot.empty) {
      return true;
    }

    // Method 2: Check if user is in path's purchasedBy array
    const pathDoc = await getDoc(doc(db, 'oblivion_paths', pathId));
    if (pathDoc.exists()) {
      const pathData = pathDoc.data();
      const purchasedBy = pathData.purchasedBy || [];
      return purchasedBy.includes(userId);
    }

    return false;
  } catch (error) {
    console.error('Error checking path access:', error);
    return false;
  }
};

export const purchasePath = async (
  pathId: string, 
  userId: string, 
  transactionHash?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if user is already enrolled to prevent duplicate enrollments
    const existingAccess = await checkPathAccess(pathId, userId);
    if (existingAccess) {
      return { success: false, error: 'Already enrolled in this path' };
    }

    // Create access record with optional transaction hash
    const accessData = {
      pathId,
      userId,
      purchasedAt: new Date(),
      accessType: 'purchased',
      transactionHash: transactionHash || null
    };

    await addDoc(collection(db, 'oblivion_path_access'), accessData);

    // Update path with enrolled count and add user to purchasedBy array
    const pathRef = doc(db, 'oblivion_paths', pathId);
    await updateDoc(pathRef, {
      enrolledCount: increment(1),
      purchasedBy: arrayUnion(userId)
    });

    return { success: true };
  } catch (error) {
    console.error('Error purchasing path:', error);
    return { success: false, error: 'Failed to purchase path' };
  }
};

// Asset Interaction Services
export const likeAsset = async (assetId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const likeData = {
      assetId,
      userId,
      likedAt: new Date()
    };

    await addDoc(collection(db, 'oblivion_asset_likes'), likeData);

    // Update asset like count
    const assetRef = doc(db, 'oblivion_assets', assetId);
    await updateDoc(assetRef, {
      likeCount: increment(1)
    });

    return { success: true };
  } catch (error) {
    console.error('Error liking asset:', error);
    return { success: false, error: 'Failed to like asset' };
  }
};

export const unlikeAsset = async (assetId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const q = query(
      collection(db, 'oblivion_asset_likes'),
      where('assetId', '==', assetId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();

    // Update asset like count
    const assetRef = doc(db, 'oblivion_assets', assetId);
    await updateDoc(assetRef, {
      likeCount: increment(-1)
    });

    return { success: true };
  } catch (error) {
    console.error('Error unliking asset:', error);
    return { success: false, error: 'Failed to unlike asset' };
  }
};

export const checkAssetLike = async (assetId: string, userId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'oblivion_asset_likes'),
      where('assetId', '==', assetId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking asset like:', error);
    return false;
  }
};

export const incrementAssetViews = async (assetId: string): Promise<void> => {
  try {
    const assetRef = doc(db, 'oblivion_assets', assetId);
    await updateDoc(assetRef, {
      viewCount: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing asset views:', error);
  }
};

// Repository Services
export const getRepository = async (repositoryId: string): Promise<OblivionRepository> => {
  try {
    const docRef = doc(db, 'oblivion_repositories', repositoryId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const repository = { id: docSnap.id, ...docSnap.data() } as OblivionRepository;
      
      // If creatorId is missing, try to get it from the venture
      if (!repository.creatorId && repository.ventureId) {
        try {
          const venture = await getVentureById(repository.ventureId);
          if (venture) {
            repository.creatorId = venture.creatorId;
          }
        } catch (error) {
          console.error('Error getting venture for repository creator fallback:', error);
        }
      }
      
      return repository;
    } else {
      throw new Error('Repository not found');
    }
  } catch (error) {
    console.error('Error getting repository:', error);
    throw error;
  }
};

export const getRepositoryPaths = async (repositoryId: string): Promise<OblivionPath[]> => {
  try {
    const q = query(
      collection(db, 'oblivion_paths'),
      where('repositoryId', '==', repositoryId)
    );
    
    const querySnapshot = await getDocs(q);
    const pathPromises = querySnapshot.docs.map(async (doc) => {
      const pathData = { id: doc.id, ...doc.data() } as OblivionPath;
      
      // Get real-time asset count
      const pathAssets = await getPathAssets(doc.id);
      const realTimeAssetCount = pathAssets.length;
      
      // Get real-time enrolled count
      const realTimeEnrolledCount = await getPathEnrolledCount(doc.id);
      
      return {
        ...pathData,
        assetCount: realTimeAssetCount,
        enrolledCount: realTimeEnrolledCount
      };
    });
    
    const paths = await Promise.all(pathPromises);
    
    // Sort in memory to avoid Firebase index requirement
    return paths.sort((a, b) => {
      const aTime = a.createdAt?.seconds || a.createdAt || 0;
      const bTime = b.createdAt?.seconds || b.createdAt || 0;
      return bTime - aTime; // Descending order
    });
  } catch (error) {
    console.error('Error fetching repository paths:', error);
    return [];
  }
};

// Path Services
export const createPath = async (pathData: Partial<OblivionPath>): Promise<{ success: boolean; pathId?: string; error?: string }> => {
  try {
    const docRef = await addDoc(collection(db, 'oblivion_paths'), pathData);
    return { success: true, pathId: docRef.id };
  } catch (error) {
    console.error('Error creating path:', error);
    return { success: false, error: 'Failed to create path' };
  }
};

export const getPath = async (pathId: string): Promise<OblivionPath> => {
  try {
    const docRef = doc(db, 'oblivion_paths', pathId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OblivionPath;
    } else {
      throw new Error('Path not found');
    }
  } catch (error) {
    console.error('Error getting path:', error);
    throw error;
  }
};

export const deletePath = async (pathId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'oblivion_paths', pathId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting path:', error);
    return { success: false, error: 'Failed to delete path' };
  }
};

export const getPathAssets = async (pathId: string): Promise<OblivionAsset[]> => {
  try {
    const q = query(
      collection(db, 'oblivion_assets'),
      where('pathId', '==', pathId)
    );
    
    const querySnapshot = await getDocs(q);
    const assets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OblivionAsset));
    
    // Sort in memory to avoid Firebase index requirement
    return assets.sort((a, b) => {
      const aTime = a.createdAt?.seconds || a.createdAt || 0;
      const bTime = b.createdAt?.seconds || b.createdAt || 0;
      return aTime - bTime; // Ascending order
    });
  } catch (error) {
    console.error('Error fetching path assets:', error);
    return [];
  }
};

export const updatePath = async (pathId: string, pathData: Partial<OblivionPath>): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'oblivion_paths', pathId);
    await updateDoc(docRef, pathData);
    return { success: true };
  } catch (error) {
    console.error('Error updating path:', error);
    return { success: false, error: 'Failed to update path' };
  }
};

// Get real-time enrolled count for a path
export const getPathEnrolledCount = async (pathId: string): Promise<number> => {
  try {
    // Method 1: Count from oblivion_path_access collection
    const accessQuery = query(
      collection(db, 'oblivion_path_access'),
      where('pathId', '==', pathId)
    );
    const accessSnapshot = await getDocs(accessQuery);
    let countFromAccess = accessSnapshot.size;

    // Method 2: Count from path's purchasedBy array
    const pathDoc = await getDoc(doc(db, 'oblivion_paths', pathId));
    let countFromArray = 0;
    if (pathDoc.exists()) {
      const pathData = pathDoc.data();
      const purchasedBy = pathData.purchasedBy || [];
      countFromArray = purchasedBy.length;
    }

    // Return the maximum of both counts (in case of inconsistency)
    return Math.max(countFromAccess, countFromArray);
  } catch (error) {
    console.error('Error getting path enrolled count:', error);
    return 0;
  }
};

// Additional utility functions
export const getUserVentures = async (userId: string): Promise<OblivionVenture[]> => {
  try {
    const q = query(
      collection(db, 'oblivion_ventures'),
      where('creatorId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const ventures = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OblivionVenture));
    
    // Sort in memory to avoid Firebase index requirement
    return ventures.sort((a, b) => {
      const aTime = a.updatedAt?.seconds || a.updatedAt || 0;
      const bTime = b.updatedAt?.seconds || b.updatedAt || 0;
      return bTime - aTime; // Descending order
    });
  } catch (error) {
    console.error('Error fetching user ventures:', error);
    return [];
  }
};

export const getAllPublicVentures = async (limit_count: number = 20): Promise<OblivionVenture[]> => {
  try {
    // Simplified query to avoid Firebase index requirement
    const q = query(
      collection(db, 'oblivion_ventures'),
      orderBy('updatedAt', 'desc'),
      limit(limit_count)
    );
    
    const querySnapshot = await getDocs(q);
    const ventures = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OblivionVenture));
    
    // Filter active ventures in memory to avoid Firebase index requirement
    return ventures.filter(venture => venture.isActive !== false);
  } catch (error) {
    console.error('Error fetching public ventures:', error);
    return [];
  }
};

export const searchVentures = async (searchTerm: string): Promise<OblivionVenture[]> => {
  try {
    // This is a simple search - in production, you might want to use Algolia or similar
    const q = query(
      collection(db, 'oblivion_ventures')
    );
    
    const querySnapshot = await getDocs(q);
    const ventures = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OblivionVenture));

    // Filter and sort in memory to avoid Firebase index requirement
    const filtered = ventures
      .filter(venture => venture.isActive !== false)
      .filter(venture => 
        venture.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venture.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Sort by updated date
    return filtered.sort((a, b) => {
      const aTime = a.updatedAt?.seconds || a.updatedAt || 0;
      const bTime = b.updatedAt?.seconds || b.updatedAt || 0;
      return bTime - aTime; // Descending order
    });
  } catch (error) {
    console.error('Error searching ventures:', error);
    return [];
  }
};

// Asset Services
export const createAsset = async (assetData: Partial<OblivionAsset>): Promise<{ success: boolean; assetId?: string; error?: string }> => {
  try {
    const docRef = await addDoc(collection(db, 'oblivion_assets'), assetData);
    return { success: true, assetId: docRef.id };
  } catch (error) {
    console.error('Error creating asset:', error);
    return { success: false, error: 'Failed to create asset' };
  }
};

export const getAsset = async (assetId: string): Promise<OblivionAsset> => {
  try {
    const docRef = doc(db, 'oblivion_assets', assetId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OblivionAsset;
    } else {
      throw new Error('Asset not found');
    }
  } catch (error) {
    console.error('Error getting asset:', error);
    throw error;
  }
};

export const updateAsset = async (assetId: string, assetData: Partial<OblivionAsset>): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'oblivion_assets', assetId);
    await updateDoc(docRef, assetData);
    return { success: true };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { success: false, error: 'Failed to update asset' };
  }
};

export const deleteAsset = async (assetId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'oblivion_assets', assetId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, error: 'Failed to delete asset' };
  }
};

export const deleteVenture = async (ventureId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // TODO: In a full implementation, you would also delete all related repositories, paths, and assets
    // For now, we'll just delete the venture document
    const docRef = doc(db, 'oblivion_ventures', ventureId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting venture:', error);
    return { success: false, error: 'Failed to delete venture' };
  }
};

// User Path Services
export const getUserEnrolledPaths = async (userId: string): Promise<OblivionPath[]> => {
  try {
    // Method 1: Check oblivion_path_access collection
    const accessQuery = query(
      collection(db, 'oblivion_path_access'),
      where('userId', '==', userId)
    );
    const accessSnapshot = await getDocs(accessQuery);
    let pathIdsFromAccess: string[] = [];
    
    if (!accessSnapshot.empty) {
      pathIdsFromAccess = accessSnapshot.docs.map(doc => doc.data().pathId);
    }

    // Method 2: Check paths where user is in purchasedBy array
    const pathsQuery = query(
      collection(db, 'oblivion_paths'),
      where('purchasedBy', 'array-contains', userId)
    );
    const pathsSnapshot = await getDocs(pathsQuery);
    let pathIdsFromArray: string[] = [];
    
    if (!pathsSnapshot.empty) {
      pathIdsFromArray = pathsSnapshot.docs.map(doc => doc.id);
    }

    // Combine both methods and remove duplicates
    const allPathIds = Array.from(new Set([...pathIdsFromAccess, ...pathIdsFromArray]));
    
    if (allPathIds.length === 0) {
      return [];
    }

    // Get the actual path documents in parallel
    const pathPromises = allPathIds.map(async (pathId) => {
      try {
        const pathData = await getPath(pathId);
        // Get real-time asset count
        const pathAssets = await getPathAssets(pathId);
        const realTimeAssetCount = pathAssets.length;
        // Get real-time enrolled count
        const realTimeEnrolledCount = await getPathEnrolledCount(pathId);
        return {
          ...pathData,
          assetCount: realTimeAssetCount,
          enrolledCount: realTimeEnrolledCount
        };
      } catch (error) {
        console.warn(`Failed to load path ${pathId}:`, error);
        return null;
      }
    });

    const paths = await Promise.all(pathPromises);
    return paths.filter(path => path !== null) as OblivionPath[];
  } catch (error) {
    console.error('Error getting user enrolled paths:', error);
    return [];
  }
};

export const getUserCompletedPaths = async (userId: string): Promise<OblivionPath[]> => {
  try {
    // For now, we'll consider a path completed if user has viewed all assets
    // In a full implementation, you'd track completion status separately
    const enrolledPaths = await getUserEnrolledPaths(userId);
    
    // TODO: Add actual completion tracking logic
    // For now, return empty array as completion tracking needs to be implemented
    return [];
  } catch (error) {
    console.error('Error getting user completed paths:', error);
    return [];
  }
};

export const getUserAvailablePaths = async (userId: string): Promise<OblivionPath[]> => {
  try {
    // Get all public paths
    const pathsQuery = query(
      collection(db, 'oblivion_paths'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const pathsSnapshot = await getDocs(pathsQuery);
    const allPaths = await Promise.all(
      pathsSnapshot.docs.map(async (doc) => {
        const pathData = { id: doc.id, ...doc.data() } as OblivionPath;
        // Get real-time asset count
        const pathAssets = await getPathAssets(doc.id);
        const realTimeAssetCount = pathAssets.length;
        // Get real-time enrolled count
        const realTimeEnrolledCount = await getPathEnrolledCount(doc.id);
        return {
          ...pathData,
          assetCount: realTimeAssetCount,
          enrolledCount: realTimeEnrolledCount
        };
      })
    );

    // Get user's enrolled paths to filter them out
    const enrolledPaths = await getUserEnrolledPaths(userId);
    const enrolledPathIds = enrolledPaths.map(path => path.id);

    // Return paths that user hasn't enrolled in yet
    return allPaths.filter(path => !enrolledPathIds.includes(path.id));
  } catch (error) {
    console.error('Error getting user available paths:', error);
    return [];
  }
};

// Export all functions as a single service object
export const obiService = {
  // Venture Services
  createVenture,
  getVentureById,
  updateVenture,
  deleteVenture,
  getVenturesByOwner,
  addVentureLink,
  removeVentureLink,
  getAllPublicVentures,
  searchVentures,
  getUserVentures,
  
  // Repository Services
  createRepository,
  updateRepository,
  deleteRepository,
  getRepositoriesByVenture,
  getRepositoryById,
  getRepository,
  getRepositoryPaths,
  
  // Path Services
  createPath,
  getPath,
  updatePath,
  deletePath,
  getPathAssets,
  checkPathAccess,
  purchasePath,
  getPathEnrolledCount,
  
  // Asset Services
  createAsset,
  getAsset,
  updateAsset,
  deleteAsset,
  likeAsset,
  unlikeAsset,
  checkAssetLike,
  incrementAssetViews,
  getUserEnrolledPaths,
  getUserCompletedPaths,
  getUserAvailablePaths
};
