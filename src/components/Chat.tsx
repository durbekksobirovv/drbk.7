import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { syncService, MessageData } from '../lib/syncService';

interface ChatProps {
  roomId: string;
  fontFamily: 'Inter' | 'Space Grotesk' | 'JetBrains Mono' | 'Playfair Display';
  chatBubbleStyle: 'modern' | 'classic' | 'neumorphic';
}

export default function Chat({ roomId, fontFamily, chatBubbleStyle }: ChatProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const loadedCountRef = useRef<number>(0);

  // Load and listen to messages in real-time
  useEffect(() => {
    const unsub = syncService.subscribeMessages(roomId, (remoteMsgs) => {
      if (remoteMsgs.length > loadedCountRef.current) {
        // Only trigger unread badge if there was an existing database list, preventing alerting on initial render
        if (!isOpen && loadedCountRef.current > 0) {
          const newMessagesAdded = remoteMsgs.length - loadedCountRef.current;
          setUnreadCount((prev) => prev + newMessagesAdded);
        }
      }
      loadedCountRef.current = remoteMsgs.length;
      setMessages(remoteMsgs);
    });
    return () => unsub();
  }, [roomId, isOpen]);

  // Handle auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleOpenToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Fetch active local/auth user info
    syncService.onAuthStateChange(async (user) => {
      if (user) {
        try {
          await syncService.addMessage(
            roomId, 
            user.uid, 
            user.displayName || 'Mehmon', 
            inputText.trim()
          );
        } catch (error) {
          console.error("Xabar yuborishda xato:", error);
        }
      }
    })();

    setInputText('');
  };

  // Styled helper for chat bubble themes
  const getBubbleStyleClass = (isOwn: boolean) => {
    if (isOwn) {
      switch (chatBubbleStyle) {
        case 'classic':
          return 'bg-blue-600 text-white border-2 border-slate-900 rounded-lg rounded-tr-none font-bold shadow-md';
        case 'neumorphic':
          return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-none shadow-[inset_2px_2px_4px_rgba(255,255,255,0.2),3px_3px_6px_rgba(0,0,0,0.15)]';
        default: // modern
          return 'bg-blue-600/90 text-white rounded-2xl rounded-tr-none shadow-sm';
      }
    } else {
      switch (chatBubbleStyle) {
        case 'classic':
          return 'bg-slate-100 text-slate-900 border-2 border-slate-900 rounded-lg rounded-tl-none font-semibold shadow-md';
        case 'neumorphic':
          return 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-[inset_1px_1px_3px_rgba(255,255,255,0.8),3px_3px_6px_rgba(0,0,0,0.06)] border border-slate-200/50';
        default: // modern
          return 'bg-slate-50 text-slate-800 rounded-2xl rounded-tl-none border border-slate-250/30';
      }
    }
  };

  return (
    <div className="fixed bottom-24 right-5 z-50 pointer-events-none select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 w-80 h-[420px] flex flex-col overflow-hidden mb-4 pointer-events-auto"
            style={{ fontFamily }}
          >
            {/* Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center border-b border-slate-800">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500 animate-pulse" />
                Xabarlar Chat
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Messages Log */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-4">
                  <ArrowUpRight size={24} className="mb-1" />
                  <p className="text-xs font-semibold leading-relaxed">Xabarlar hali yo'q. Birinchi bo'lib boshlang!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  // Better user check directly via local state
                  const matchesActiveUser = msg.userId === JSON.parse(localStorage.getItem('collab_painter_authenticated_user') || '{"uid":""}').uid;

                  return (
                    <div 
                      key={msg.id || index}
                      className={`flex flex-col ${matchesActiveUser ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sub-label with Nickname and formatting */}
                      <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                        {matchesActiveUser ? "Siz" : msg.userName || "Noma'lum"}
                      </span>
                      <div className={`max-w-[85%] px-4 py-2.5 text-xs font-medium leading-relaxed ${getBubbleStyleClass(matchesActiveUser)}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200/65 flex gap-2">
              <input
                type="text"
                required
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Xabar yozing (Enter)..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
                maxLength={240}
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Button */}
      <button
        onClick={handleOpenToggle}
        className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-all active:scale-95 border border-slate-800 pointer-events-auto relative flex items-center justify-center"
      >
        <MessageSquare size={22} className="text-white" />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono font-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
