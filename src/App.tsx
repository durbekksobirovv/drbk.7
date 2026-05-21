import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Share2, Copy, Check, Settings2, Palette, FileText, Globe, RefreshCw, Layers } from 'lucide-react';
import { syncService, AppUser, UserSettings } from './lib/syncService';
import Auth from './components/Auth';
import RoomManager from './components/RoomManager';
import DrawingCanvas from './components/DrawingCanvas';
import Toolbar from './components/Toolbar';
import Chat from './components/Chat';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Drawing States (restored from synced user settings)
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'line'>('pen');
  const [copied, setCopied] = useState(false);

  // Custom Settings Pane Toggle & Values
  const [showSettings, setShowSettings] = useState(false);
  const [canvasBg, setCanvasBg] = useState<'white' | 'grid' | 'sepia' | 'dark'>('white');
  const [fontFamily, setFontFamily] = useState<'Inter' | 'Space Grotesk' | 'JetBrains Mono' | 'Playfair Display'>('Inter');
  const [chatBubbleStyle, setChatBubbleStyle] = useState<'modern' | 'classic' | 'neumorphic'>('modern');

  // Monitor Authentication
  useEffect(() => {
    const unsub = syncService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.settings) {
        // Hydrate saved settings from Firestore or LocalStorage as requested!
        setColor(currentUser.settings.defaultColor || '#ef4444');
        setBrushSize(currentUser.settings.defaultBrushSize || 6);
        setCanvasBg(currentUser.settings.canvasBg || 'white');
        setFontFamily(currentUser.settings.fontFamily || 'Inter');
        setChatBubbleStyle(currentUser.settings.chatBubbleStyle || 'modern');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Sync settings back to Firebase / Local Storage on change (debounce)
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => {
        syncService.updateSettings(user.uid, {
          defaultColor: color,
          defaultBrushSize: brushSize,
          canvasBg,
          fontFamily,
          chatBubbleStyle
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [color, brushSize, canvasBg, fontFamily, chatBubbleStyle, user, loading]);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans select-none">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          />
          <p className="text-slate-400 font-semibold font-mono text-xs tracking-widest uppercase animate-pulse">
            Yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!roomId) {
    return <RoomManager user={user} onJoinRoom={setRoomId} />;
  }

  // Get background color utility class depending on state
  const getBgClass = () => {
    switch (canvasBg) {
      case 'grid': return 'bg-slate-50 relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]';
      case 'sepia': return 'bg-[#f4efe2]';
      case 'dark': return 'bg-slate-900 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]';
      default: return 'bg-white';
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${getBgClass()} transition-colors duration-300`}>
      {/* Header Panel */}
      <div className="fixed top-5 left-5 right-5 flex justify-between items-start z-50 pointer-events-none">
        {/* Left: Room Status & Share Code */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-slate-900/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-800/80 pointer-events-auto flex items-center gap-4"
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Xona ID</span>
            <span className="font-mono text-lg font-black text-emerald-400 tracking-wider leading-none">{roomId}</span>
          </div>
          <button 
            onClick={copyRoomId}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center border border-slate-700/50"
            title="Xona kodini ulashish"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
          </button>
        </motion.div>

        {/* Right: Active User and System controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Settings trigger */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-2xl transition-all border shadow-lg flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider ${
              showSettings 
                ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                : 'bg-slate-900/95 text-slate-300 border-slate-850 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <Settings2 size={16} className={showSettings ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sozlamalar</span>
          </button>

          {/* User profile capsule */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800/80 flex items-center gap-3"
          >
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-xl border border-slate-700" 
            />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Foydalanuvchi</span>
              <span className="text-xs font-bold text-white leading-none truncate max-w-[100px]">{user.displayName}</span>
            </div>
            <button 
              onClick={() => setRoomId(null)}
              className="ml-2 p-1.5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/10"
              title="Xonadan chiqish"
            >
              <LogOut size={15} />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Main Realtime Canvas */}
      <DrawingCanvas
        roomId={roomId}
        userId={user.uid}
        color={color}
        brushSize={brushSize}
        tool={tool}
        canvasBg={canvasBg}
      />

      {/* Synchronized Real-time Chat (fully configurable bubble and font styling) */}
      <Chat 
        roomId={roomId} 
        fontFamily={fontFamily}
        chatBubbleStyle={chatBubbleStyle}
      />

      {/* Brush Tools Controller */}
      <Toolbar 
        color={color} 
        setColor={setColor} 
        brushSize={brushSize} 
        setBrushSize={setBrushSize}
        tool={tool}
        setTool={setTool}
        roomId={roomId}
        userId={user.uid}
      />

      {/* Customizable Settings Sidebar/Panel Overlay */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer pointer-events-auto"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 text-white shadow-2xl z-50 border-l border-slate-800 p-6 flex flex-col pointer-events-auto select-none overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-lg font-extrabold flex items-center gap-2">
                  <Settings2 size={20} className="text-blue-500" />
                  Sozlamalar paneli
                </h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 px-2.5 rounded-lg border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-bold transition-all"
                >
                  Yopish
                </button>
              </div>

              {/* Setting 1: Canvas Backgrounds */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Palette size={14} />
                  Kanuva Orqa Foni
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {(['white', 'grid', 'sepia', 'dark'] as const).map((bg) => {
                    const isSelected = canvasBg === bg;
                    return (
                      <button
                        key={bg}
                        onClick={() => setCanvasBg(bg)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-500 scale-102' 
                            : 'bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        {bg === 'white' && 'Oq rang'}
                        {bg === 'grid' && 'Kataklar'}
                        {bg === 'sepia' && 'Qog\'oz sarg\'ish'}
                        {bg === 'dark' && 'Tungi rejim'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Setting 2: Font Customization ("shriftlar sozlamalari sozlanishi kerak") */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={14} />
                  Xabarlar Shrifti (Font)
                </h4>
                <div className="space-y-1.5">
                  {(['Inter', 'Space Grotesk', 'JetBrains Mono', 'Playfair Display'] as const).map((font) => {
                    const isSelected = fontFamily === font;
                    return (
                      <button
                        key={font}
                        onClick={() => setFontFamily(font)}
                        className={`w-full py-2.5 px-4 rounded-xl border text-left transition-all flex justify-between items-center ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-500 font-bold' 
                            : 'bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                        style={{ fontFamily: font }}
                      >
                        <span className="text-xs">{font}</span>
                        <span className="text-[10px] opacity-75">Sinflash</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Setting 3: Chat Bubble Style */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} />
                  Chat Dizayni
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {(['modern', 'classic', 'neumorphic'] as const).map((style) => {
                    const isSelected = chatBubbleStyle === style;
                    return (
                      <button
                        key={style}
                        onClick={() => setChatBubbleStyle(style)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase text-center tracking-wider transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-500 font-bold' 
                            : 'bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        {style === 'modern' && 'Silliq zamonaviy'}
                        {style === 'classic' && 'Klassik ramka'}
                        {style === 'neumorphic' && 'Brutalist Neumorph'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-800 text-[10px] text-slate-500 font-black uppercase tracking-widest text-center">
                <span>Sozlamalar Saqlanadi</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
