/** Left sidebar — user profile and navigation. */

import { motion } from 'framer-motion';
import { MessageSquare, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: 'chats' | 'groups';
  onTabChange: (tab: 'chats' | 'groups') => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'chats' as const, icon: MessageSquare, label: 'Chats', sub: 'conversations' },
    { id: 'groups' as const, icon: Users, label: 'Groups', sub: 'manage' },
  ];

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col bg-gradient-to-b from-primary-50/80 to-white/60 backdrop-blur-md">
      {/* User Profile */}
      <div className="flex flex-col items-center px-4 pt-8 pb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-500/30">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <h2 className="mt-3 text-sm font-bold text-surface-800">{user?.username}</h2>
        <span className="text-xs text-surface-400">{user?.role?.toLowerCase()}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                  : 'text-surface-600 hover:bg-white/70'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className={`text-[11px] ${isActive ? 'text-primary-100' : 'text-surface-400'}`}>{item.sub}</p>
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <motion.button
          onClick={logout}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition-all hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </motion.button>
      </div>
    </div>
  );
}
