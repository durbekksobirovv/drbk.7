import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Paintbrush, ArrowRight, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { syncService } from '../lib/syncService';

export default function Auth() {
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Iltimos, ismingizni kiriting.");
      return;
    }
    if (pin.length < 4) {
      setError("Xavfsizlik PIN kodi kamida 4 ta raqam bo'lishi lozim.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await syncService.loginWithPIN(displayName.trim(), pin.trim());
    } catch (err: any) {
      setError(err?.message || "Tizimga kirishda xatolik yuz berdi. Iltimos PINingizni tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-6 select-none overflow-hidden relative font-sans">
      {/* Dynamic background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Radiant glow spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-slate-900/75 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-800/80 relative z-10"
      >
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.8, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 text-white"
          >
            <Paintbrush size={32} className="animate-pulse" />
          </motion.div>
          
          <h1 className="text-2xl font-black text-white tracking-tight mb-1.5 uppercase">
            Hamkorlikda Chizish
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-[280px] mx-auto">
            Haqiqiy vaqt rejimida do'stlaringiz bilan birgalikda rasm chizing va chatlashing
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Input field: User Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
              Sizning Ismingiz (Yoki Nikneym)
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Masalan: Iskandar"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-semibold"
              maxLength={15}
              disabled={loading}
            />
          </div>

          {/* Input field: Security PIN Code */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block flex items-center gap-1">
              <KeyRound size={12} className="text-indigo-400" />
              Xavfsizlik PIN kodi (4 ta raqam)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Masalan: 4892"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-4 text-white text-center text-lg font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all font-black"
              maxLength={4}
              disabled={loading}
            />
            <span className="text-[9px] text-slate-500 block leading-normal px-1">
              PIN kod o'z sozlamalaringiz va chizmalaringizni keyinchalik qayta kirganda saqlab qolish uchun ishlatiladi. Istalgan yangi PIN yozishingiz mumkin.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !displayName.trim() || pin.length < 4}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-indigo-950/50 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm uppercase tracking-wide"
          >
            {loading ? "Kirilmoqda..." : "Yaratish yoki Kirish"}
            <ArrowRight size={16} />
          </button>
        </form>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2 text-left leading-relaxed"
          >
            <AlertCircle size={15} className="shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="mt-8 pt-5 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-bold">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            Xavfsiz Kirish
          </span>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>Sinxronlash</span>
        </div>
      </motion.div>
    </div>
  );
}
