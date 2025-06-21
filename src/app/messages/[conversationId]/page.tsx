"use client"
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../contexts/WalletContext';
import MessagesList from '../../components/MessagesList';
import { FaArrowLeft } from 'react-icons/fa';

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = use(params);
  const { user, address } = useWallet();
  const router = useRouter();

  // Redirect if not authenticated
  if (!user || !address) {
    router.push('/');
    return null;
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <main className="flex flex-col h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-4 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-white"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">Conversation</h1>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1">
          <MessagesList conversationId={conversationId} />
        </div>
      </main>
    </div>
  );
}
