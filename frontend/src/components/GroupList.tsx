/** Group list panel — middle column. */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users, X, Loader2 } from 'lucide-react';
import { groupApi, type Group } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface GroupListProps {
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
}

export default function GroupList({ selectedGroupId, onSelectGroup }: GroupListProps) {
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!token) return;
    groupApi.getMyGroups(token)
      .then(setGroups)
      .catch(() => { /* Network failure is visible via empty list */ })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      const group = await groupApi.createGroup(
        { name: newName.trim(), description: newDesc.trim() || undefined },
        token,
      );
      setGroups((prev) => [group, ...prev]);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      onSelectGroup(group.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-r border-surface-100 bg-white/70 backdrop-blur-lg">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-800">Groups</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-xs font-semibold text-white shadow-md shadow-primary-500/25 transition-all hover:bg-primary-600"
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showCreate ? 'Cancel' : 'New'}
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full rounded-xl border border-surface-200 bg-surface-50/50 py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-surface-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      {/* Create Group Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="border-b border-surface-100 px-4 pb-4"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setCreateError(''); }}
              placeholder="Group name"
              required
              className="mb-2 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="mb-2 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
            />
            {createError && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{createError}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-600 disabled:opacity-50"
            >
              {creating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Create Group'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <Users className="mb-2 h-8 w-8 text-surface-300" />
            <p className="text-sm text-surface-400">
              {search ? 'No groups match your search' : 'No groups yet — create one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((group) => {
              const isActive = group.id === selectedGroupId;
              return (
                <motion.button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-primary-50 shadow-sm'
                      : 'hover:bg-surface-50'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    isActive ? 'bg-primary-500' : 'bg-gradient-to-br from-primary-300 to-primary-500'
                  }`}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${isActive ? 'text-primary-700' : 'text-surface-800'}`}>
                      {group.name}
                    </p>
                    <p className="truncate text-xs text-surface-400">
                      {group.description || 'No description'}
                    </p>
                  </div>
                  {group._count && (
                    <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-500">
                      {group._count.members} <Users className="inline h-2.5 w-2.5" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
