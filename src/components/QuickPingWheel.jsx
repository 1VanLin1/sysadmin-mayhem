import React, { useEffect } from 'react';
import { QUICK_PINGS } from '../game/constants.js';
import { X } from 'lucide-react';

export function QuickPingWheel({ onSelectPing, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'KeyG' || e.key === 'г' || e.key === 'Г') {
        // Toggle or close
        onClose();
        return;
      }
      // Keys 1-6
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= QUICK_PINGS.length) {
        onSelectPing(QUICK_PINGS[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectPing, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <span className="font-bold text-white text-sm">Команды напарнику [G]</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_PINGS.map((ping, idx) => (
            <button
              key={ping.id}
              onClick={() => onSelectPing(ping)}
              className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 text-left transition-all active:scale-95 group shadow-md"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{ping.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{ping.label}</div>
                <div className="text-[10px] text-slate-500 font-mono">Клавиша {idx + 1}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center text-[11px] text-slate-500 font-mono">
          Нажмите цифру 1-6 или кликните мышкой
        </div>
      </div>
    </div>
  );
}
