// Migration script to add usernameLower field to existing users
import { db } from "../../../firebase";
import { collection, query, getDocs, updateDoc, doc, where } from "@firebase/firestore";

export async function migrateUsernames() {
  try {
    console.log('Starting username migration...');
    
    const usersRef = collection(db, "users");
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    
    let updatedCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      const userData = docSnapshot.data();
      
      // Eğer username var ama usernameLower yoksa, ekle
      if (userData.username && !userData.usernameLower) {
        try {
          await updateDoc(doc(db, "users", docSnapshot.id), {
            usernameLower: userData.username.toLowerCase()
          });
          updatedCount++;
          console.log(`Updated user: ${userData.username} -> ${userData.username.toLowerCase()}`);
        } catch (error) {
          console.error(`Error updating user ${userData.username}:`, error);
        }
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} users.`);
    return updatedCount;
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Tek bir kullanıcıyı güncelle (test için)
export async function migrateUser(walletAddress: string) {
  try {
    const userDoc = await getDocs(query(collection(db, "users"), where("walletAddress", "==", walletAddress)));
    
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      
      if (userData.username && !userData.usernameLower) {
        await updateDoc(doc(db, "users", userDoc.docs[0].id), {
          usernameLower: userData.username.toLowerCase()
        });
        console.log(`Updated user: ${userData.username} -> ${userData.username.toLowerCase()}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error migrating user:', error);
    return false;
  }
}
