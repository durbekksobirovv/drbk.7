import { motion } from "motion/react";
import { Eraser, Pencil, Trash2, Sliders, Square, Circle as CircleIcon, Slash, Undo2, Download } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { syncService } from "../lib/syncService";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ToolbarProps {
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line';
  setTool: (tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line') => void;
  roomId: string;
  userId: string;
}

const COLORS = [
  "#000000", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"
];

export default function Toolbar({ color, setColor, brushSize, setBrushSize, tool, setTool, roomId, userId }: ToolbarProps) {
  const handleClear = async () => {
    if (confirm("Haqiqatan ham butun kanuvani tozalamoqchimisiz? Uni qaytarib bo'lmaydi!")) {
      await syncService.clearCanvas(roomId);
    }
  };

  const handleUndo = async () => {
    try {
      await syncService.undoLastStroke(roomId, userId);
    } catch (e) {
      console.error("Undo failed:", e);
    }
  };

  const handleDownload = () => {
    window.dispatchEvent(new CustomEvent('download-canvas'));
  };

  return (
    <motion.div 
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap max-w-[95%] sm:max-w-none items-center gap-4 bg-slate-900/95 backdrop-blur-md px-5 py-3.5 rounded-3xl shadow-2xl border border-slate-800 z-40 select-none cursor-default"
    >
      {/* Tool Selection */}
      <div className="flex items-center gap-1.5 border-r border-slate-800 pr-4">
        <button
          onClick={() => setTool('pen')}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-95",
            tool === 'pen' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "hover:bg-slate-800 text-slate-400 hover:text-white"
          )}
          title="Qalam"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-95",
            tool === 'eraser' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "hover:bg-slate-800 text-slate-400 hover:text-white"
          )}
          title="O'chirg'ich"
        >
          <Eraser size={18} />
        </button>
        <button
          onClick={() => setTool('rectangle')}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-95",
            tool === 'rectangle' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "hover:bg-slate-800 text-slate-400 hover:text-white"
          )}
          title="To'g'ri to'rtburchak"
        >
          <Square size={18} />
        </button>
        <button
          onClick={() => setTool('circle')}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-95",
            tool === 'circle' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "hover:bg-slate-800 text-slate-400 hover:text-white"
          )}
          title="Aylana / Doira"
        >
          <CircleIcon size={18} />
        </button>
        <button
          onClick={() => setTool('line')}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-95",
            tool === 'line' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "hover:bg-slate-800 text-slate-400 hover:text-white"
          )}
          title="To'g'ri Chiziq"
        >
          <Slash size={18} />
        </button>
      </div>

      {/* Preset Colors */}
      <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              if (tool === 'eraser') setTool('pen');
            }}
            className={cn(
              "w-5.5 h-5.5 rounded-full border border-slate-800 transition-all hover:scale-115 active:scale-90",
              color === c && tool !== 'eraser' && "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-105"
            )}
            style={{ backgroundColor: c }}
            title={c === '#ffffff' ? "Oq" : c}
          />
        ))}
        {/* Custom Color Picker wrapper */}
        <div className="relative w-5.5 h-5.5 rounded-full overflow-hidden border border-slate-800 hover:scale-115 transition-all">
          <input 
            type="color" 
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              if (tool === 'eraser') setTool('pen');
            }}
            className="absolute inset-0 w-8 h-8 -translate-x-1 -translate-y-1 p-0 border-0 bg-transparent cursor-pointer"
            title="Maxsus rang tanlash"
          />
        </div>
      </div>

      {/* Brush Size Slider */}
      <div className="flex items-center gap-2.5 border-r border-slate-800 pr-4">
        <Sliders size={15} className="text-slate-500" />
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-16 sm:w-28 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs font-black font-mono text-slate-400 w-5 text-right">{brushSize}</span>
      </div>

      {/* Action Buttons group (Undo, Download, Clear) */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          className="p-2.5 rounded-xl border border-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-95"
          title="Orqaga qaytarish (Undo)"
        >
          <Undo2 size={18} />
        </button>

        <button
          onClick={handleDownload}
          className="p-2.5 rounded-xl border border-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-95"
          title="PNG formatida yuklab olish"
        >
          <Download size={18} />
        </button>

        <button
          onClick={handleClear}
          className="p-2.5 rounded-xl border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all active:scale-95"
          title="Kanuvani tozalash"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
