"use client"
import { useState } from "react";
import Sidebar from "../components/sidebar";
import Feed from "../components/feed";
import UserSetup from "../components/UserSetup";
import { useWallet } from "../contexts/WalletContext";

export default function Home() {
  const { address, user, userLoading, needsSetup, refreshUser } = useWallet();
  const [showUserSetup, setShowUserSetup] = useState(false);

  // UserSetup modal'ını göster
  const shouldShowSetup = address && needsSetup && !userLoading;

  const handleUserSetupComplete = async (userData: { name: string; username: string }) => {
    await refreshUser();
    setShowUserSetup(false);
  };

  const handleUserSetupCancel = () => {
    setShowUserSetup(false);
  };

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex max-w-[1600px] mx-auto">
        <Sidebar />
        <div className="flex-1 ml-20 lg:ml-72 max-w-3xl px-4 lg:px-6">
          <Feed />
        </div>
        {/* Right widgets area - can be added later */}
      </main>

      {/* UserSetup Modal */}
      {shouldShowSetup && (
        <UserSetup
          walletAddress={address}
          existingUser={user ? {
            name: user.name,
            username: user.username,
            avatar: user.avatar
          } : undefined}
          onComplete={handleUserSetupComplete}
          onCancel={handleUserSetupCancel}
        />
      )}
    </div>
  );
}