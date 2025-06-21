import { db } from "../../../firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp
} from "@firebase/firestore";

export interface PasskeyMapping {
  keyId: string;           // Base64 encoded passkey ID
  contractId: string;      // Stellar contract ID
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save keyId -> contractId mapping to Firestore
 * This enables multi-device passkey wallet recovery
 */
export async function savePasskeyMapping(keyId: string, contractId: string): Promise<void> {
  try {
    const now = new Date();
    const mappingData: PasskeyMapping = {
      keyId,
      contractId,
      createdAt: now,
      updatedAt: now
    };

    // Use keyId as document ID for easy lookup
    const docRef = doc(db, 'passkey-mappings', keyId);
    
    await setDoc(docRef, mappingData);
    
    console.log(`Passkey mapping saved: ${keyId} -> ${contractId}`);
  } catch (error) {
    console.error('Error saving passkey mapping:', error);
    throw new Error('Failed to save passkey mapping');
  }
}

/**
 * Get contractId by keyId from Firestore
 * Used when connecting existing passkey wallet from different device
 */
export async function getContractIdByKeyId(keyId: string): Promise<string | null> {
  try {
    const docRef = doc(db, 'passkey-mappings', keyId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as PasskeyMapping;
      console.log(`Found contract ID for keyId ${keyId}: ${data.contractId}`);
      return data.contractId;
    } else {
      console.log(`No contract ID found for keyId: ${keyId}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting contract ID by keyId:', error);
    return null;
  }
}

/**
 * Check if a passkey mapping exists
 */
export async function passkeyMappingExists(keyId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'passkey-mappings', keyId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking passkey mapping existence:', error);
    return false;
  }
}

/**
 * Get all passkey mappings for debugging (admin use only)
 */
export async function getAllPasskeyMappings(): Promise<PasskeyMapping[]> {
  try {
    const q = query(collection(db, 'passkey-mappings'));
    const querySnapshot = await getDocs(q);
    
    const mappings: PasskeyMapping[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      mappings.push({
        keyId: data.keyId,
        contractId: data.contractId,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      });
    });
    
    return mappings;
  } catch (error) {
    console.error('Error getting all passkey mappings:', error);
    return [];
  }
}
