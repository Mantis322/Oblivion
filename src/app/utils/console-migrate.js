// Console helper script for username migration
// Bu scripti browser console'da çalıştırabilirsiniz

window.migrateCurrentUser = async function() {
  try {
    // Mevcut kullanıcının wallet address'ini al
    const walletAddress = localStorage.getItem('currentUser') || 
                         sessionStorage.getItem('currentUser');
    
    if (!walletAddress) {
      console.log('No current user found');
      return;
    }
    
    console.log('Migrating user:', walletAddress);
    
    // Firebase import (bu sadece örnektir, gerçek implementasyon farklı olabilir)
    const { migrateUser } = await import('../utils/migrateUsernames');
    
    const result = await migrateUser(walletAddress);
    
    if (result) {
      console.log('✅ User migration completed');
    } else {
      console.log('ℹ️ User already migrated or not found');
    }
    
    // Sayfayı yenile
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

console.log('Username migration helper loaded. Run: migrateCurrentUser()');
