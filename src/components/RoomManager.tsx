import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Plus, Users, Globe, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { syncService, AppUser } from '../lib/syncService';

interface RoomManagerProps {
  user: AppUser;
  onJoinRoom: (roomId: string) => void;
}

export default function RoomManager({ user, onJoinRoom }: RoomManagerProps) {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const newRoomId = await syncService.createRoom(user);
      onJoinRoom(newRoomId);
    } catch (err: any) {
      setError(err?.message || "Xona yaratishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomIdInput.trim().toUpperCase();
    if (!cleanCode) {
      setError("Iltimos, ulanish uchun 6 xonali kodni kiriting.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await syncService.joinRoom(cleanCode, user);
      onJoinRoom(cleanCode);
    } catch (err: any) {
      setError(err?.message || "Ushbu xonaga ulanib bo'lmadi. IDni tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-6 relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Dynamic Background elements */}
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full bg-slate-900/65 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-800 z-10"
      >
        {/* User Card */}
        <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 mb-8">
          <img 
            src={user.photoURL} 
            alt={user.displayName} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl ring-2 ring-blue-500/30"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Sizning Profilingiz</span>
            <span className="text-white font-bold truncate block">{user.displayName}</span>
          </div>
          <button 
            onClick={() => syncService.logout()}
            className="text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 bg-slate-900/40 transition-all font-semibold"
          >
            Chiqish
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-blue-600 to-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg text-white">
            <Users size={22} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Hamkorlik Rejimi</h2>
          <p className="text-slate-400 text-xs mt-1">Ulanish uchun xona yarating yoki do'stingiz bergan xona ID kodini kiriting</p>
        </div>

        <div className="space-y-5">
          {/* Create Button */}
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl py-4 font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Yangi Xona Yaratish
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800/80"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-slate-900 px-3 text-slate-500">yoki xonaga qo'shilish</span>
            </div>
          </div>

          {/* Connect Form */}
          <form onSubmit={handleJoinByCode} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                required
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.slice(0, 6))}
                placeholder="6 XONALI KOD (MASALAN: AK4R92)"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-4 text-center text-xl font-mono tracking-widest font-black text-emerald-400 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all uppercase"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || roomIdInput.length < 4}
              className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-950/90 text-slate-300 hover:text-emerald-400 rounded-2xl py-4 font-bold transition-all active:scale-[0.98] disabled:opacity-30 disabled:border-slate-900 disabled:text-slate-600 flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Xonaga Ulanish
            </button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-center text-xs"
            >
              {error}
            </motion.div>
          )}

          <div className="pt-6 border-t border-slate-800/60 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Maksimal 2 kishi</span>
            </div>
            <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
            <div className="flex items-center gap-1.5">
              <Globe size={14} className="text-blue-500" />
              <span>Real-vaqt sinxron</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
