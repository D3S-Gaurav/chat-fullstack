/** Main chat page — 3-column layout. */

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import GroupList from '../components/GroupList';
import ChatPanel from '../components/ChatPanel';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';

export default function ChatPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (token) {
      getSocket(token);
    }
  }, [token]);

  return (
    <div className="flex h-full overflow-hidden rounded-2xl bg-white/30 shadow-2xl shadow-surface-300/30 backdrop-blur-xl m-3">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <GroupList
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
      />

      {selectedGroupId ? (
        <ChatPanel groupId={selectedGroupId} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-surface-50/30">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50">
            <Users className="h-10 w-10 text-primary-300" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-surface-700">Welcome to ChatFlow</h3>
          <p className="mt-1 max-w-xs text-center text-sm text-surface-400">
            Select a group from the sidebar or create a new one to begin chatting.
          </p>
        </div>
      )}
    </div>
  );
}
