/** Chat panel — message display and input. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Users, ChevronDown } from 'lucide-react';
import { messageApi, groupApi, type Message, type GroupDetail } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';

interface ChatPanelProps {
  groupId: string;
}

export default function ChatPanel({ groupId }: ChatPanelProps) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupDetail | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages and group info
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setMessages([]);

    const socket = getSocket(token);
    socket.emit('room:join', { groupId });

    Promise.all([
      messageApi.getMessages(groupId, token),
      groupApi.getGroup(groupId, token),
    ])
      .then(([msgData, group]) => {
        setMessages(msgData.messages.reverse()); // API returns newest-first
        setGroupInfo(group);
      })
      .catch(() => {
        setSendError('Failed to load messages. Please refresh.');
        setTimeout(() => setSendError(null), 4_000);
      })
      .finally(() => setLoading(false));
      
    return () => {
      socket.emit('room:leave', { groupId });
    };
  }, [groupId, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Socket.io real-time listeners
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    function handleNewMessage(payload: {
      id: string; content: string; createdAt: string;
      sender: { id: string; username: string };
      groupId: string; tags: { name: string }[];
    }) {
      if (payload.groupId === groupId) {
        setMessages((prev) => [...prev, payload]);
      }
    }

    function handleTypingStart(payload: { groupId: string; userId: string; username: string }) {
      if (payload.groupId === groupId && payload.userId !== user?.id) {
        setTypingUsers((prev) => new Map(prev).set(payload.userId, payload.username));
      }
    }

    function handleTypingStop(payload: { groupId: string; userId: string }) {
      if (payload.groupId === groupId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(payload.userId);
          return next;
        });
      }
    }

    function handleError(payload: { message: string }) {
      setSendError(payload.message);
      // Auto-clear error toast after 4 seconds
      setTimeout(() => setSendError(null), 4_000);
    }

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('error', handleError);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('error', handleError);
    };
  }, [groupId, token, user?.id]);

  // Handle sending messages
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !token) return;
    setSending(true);
    setInput('');

    // Stop typing indicator
    if (isTypingRef.current) {
      const socket = getSocket(token);
      socket.emit('typing:stop', { groupId });
      isTypingRef.current = false;
    }

    try {
      await messageApi.sendMessage({ groupId, content }, token);
    } catch {
      setSendError('Failed to send message. Please try again.');
      setTimeout(() => setSendError(null), 4_000);
    } finally {
      setSending(false);
    }
  }

  // Handle typing indicators
  function handleInputChange(value: string) {
    setInput(value);
    if (!token) return;
    const socket = getSocket(token);

    if (!isTypingRef.current && value.length > 0) {
      socket.emit('typing:start', { groupId });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        socket.emit('typing:stop', { groupId });
        isTypingRef.current = false;
      }
    }, 2000);
  }

  // Format timestamp
  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const typingDisplay = Array.from(typingUsers.values());

  if (!groupId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-50/30">
        <div className="text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-surface-300" />
          <p className="text-sm text-surface-400">Select a group to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white/40 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-100 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
          {groupInfo?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-surface-800">
            {groupInfo?.name ?? 'Loading...'}
          </h3>
          <p className="text-xs text-surface-400">
            {groupInfo ? `${groupInfo.members.length} members` : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ChevronDown className="mb-2 h-8 w-8 text-surface-300" />
            <p className="text-sm text-surface-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isMine = msg.sender.id === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && (
                        <p className="mb-1 text-[11px] font-semibold text-primary-600">{msg.sender.username}</p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? 'rounded-br-md bg-primary-500 text-white'
                            : 'rounded-bl-md bg-surface-100 text-surface-800'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className={`mt-1 flex items-center gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-surface-400">{formatTime(msg.createdAt)}</span>
                        {msg.tags.length > 0 && (
                          <div className="flex gap-1">
                            {msg.tags.map((tag) => (
                              <span key={tag.name} className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-medium text-primary-500">
                                #{tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingDisplay.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6"
          >
            <p className="pb-1 text-xs italic text-surface-400">
              {typingDisplay.join(', ')} {typingDisplay.length === 1 ? 'is' : 'are'} typing...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {sendError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6"
          >
            <div className="mb-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {sendError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-surface-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 rounded-xl border border-surface-200 bg-surface-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-surface-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
          <motion.button
            type="submit"
            disabled={sending || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-md shadow-primary-500/25 transition-all hover:bg-primary-600 disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
