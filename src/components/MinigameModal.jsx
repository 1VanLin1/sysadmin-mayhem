import React, { useState, useEffect } from 'react';
import { X, Check, RefreshCw, Cpu, HardDrive, Zap, Sparkles } from 'lucide-react';
import { audio } from '../game/audio.js';

const WIRE_COLORS = [
  { id: 'orange', name: 'Оранжевый', hex: '#f97316' },
  { id: 'blue', name: 'Синий', hex: '#3b82f6' },
  { id: 'green', name: 'Зеленый', hex: '#22c55e' },
  { id: 'purple', name: 'Фиолетовый', hex: '#a855f7' }
];

export function MinigameModal({ incident, onClose, onComplete }) {
  const isWireGame = incident?.type === 'cable_disconnect' || incident?.type === 'satellite_align';
  const isRaidGame = !isWireGame;

  // --- WIRE CONNECT STATE ---
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [connections, setConnections] = useState({}); // { [colorId]: colorId }
  const [shuffledRight, setShuffledRight] = useState([]);

  useEffect(() => {
    // Shuffle right terminals
    const shuffled = [...WIRE_COLORS].sort(() => Math.random() - 0.5);
    setShuffledRight(shuffled);
  }, []);

  const handleWireLeftClick = (colorId) => {
    if (connections[colorId]) return;
    audio.playPickup();
    setSelectedLeft(colorId);
  };

  const handleWireRightClick = (colorId) => {
    if (!selectedLeft) return;
    if (selectedLeft === colorId) {
      audio.playSuccess();
      const updated = { ...connections, [colorId]: colorId };
      setConnections(updated);
      setSelectedLeft(null);

      if (Object.keys(updated).length === WIRE_COLORS.length) {
        setTimeout(() => {
          onComplete?.('wires');
        }, 350);
      }
    } else {
      audio.playError();
      setSelectedLeft(null);
    }
  };

  // --- RAID REBUILD STATE ---
  const [slotsFilled, setSlotsFilled] = useState([]);
  const [scrambledDrives, setScrambledDrives] = useState([]);

  useEffect(() => {
    const drives = [0, 1, 2].sort(() => Math.random() - 0.5);
    setScrambledDrives(drives);
  }, []);

  const handleInsertDrive = (driveIndex) => {
    const nextSlot = slotsFilled.length;
    if (driveIndex === nextSlot) {
      audio.playSuccess();
      const nextFilled = [...slotsFilled, driveIndex];
      setSlotsFilled(nextFilled);

      if (nextFilled.length === 3) {
        setTimeout(() => {
          onComplete?.('raid');
        }, 350);
      }
    } else {
      audio.playError();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-2"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Экспресс-починка (+60 Бонус XP)
          </div>
          <h2 className="text-xl font-black text-white">
            {isWireGame ? '🔌 Обжим витой пары (Патч-корд)' : '💾 Сборка RAID-массива (NVMe)'}
          </h2>
          <p className="text-xs text-slate-400">
            {isWireGame
              ? 'Кликните провод слева, затем сопоставьте разъем нужного цвета справа!'
              : 'Вставьте NVMe накопители по порядку: [Диск 0] → [Диск 1] → [Диск 2]!'}
          </p>
        </div>

        {/* MINIGAME 1: WIRE CONNECT */}
        {isWireGame && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex justify-between items-center relative">
            {/* Left Wires */}
            <div className="space-y-4 z-10">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Контакты RJ-45</div>
              {WIRE_COLORS.map((w) => {
                const isConnected = !!connections[w.id];
                const isSelected = selectedLeft === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleWireLeftClick(w.id)}
                    disabled={isConnected}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                      isConnected
                        ? 'opacity-40 border-slate-800 bg-slate-900 text-slate-500'
                        : isSelected
                        ? 'border-white bg-slate-800 ring-2 ring-white scale-105'
                        : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: w.hex }} />
                    <span>{w.name}</span>
                    {isConnected && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Visual SVG Connecting lines */}
            <div className="flex-1 px-4 flex items-center justify-center">
              <div className="text-center font-mono text-xs text-slate-400">
                {Object.keys(connections).length === WIRE_COLORS.length ? (
                  <span className="text-emerald-400 font-bold animate-bounce block">✅ Линк восстановлен!</span>
                ) : (
                  <span>
                    Подключено: <strong className="text-indigo-400">{Object.keys(connections).length}/4</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Right Terminals */}
            <div className="space-y-4 z-10">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-right">Патч-панель</div>
              {shuffledRight.map((w) => {
                const isConnected = !!connections[w.id];
                return (
                  <button
                    key={w.id}
                    onClick={() => handleWireRightClick(w.id)}
                    disabled={isConnected}
                    className={`flex items-center justify-end gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                      isConnected
                        ? 'opacity-40 border-slate-800 bg-slate-900 text-slate-500'
                        : selectedLeft
                        ? 'border-indigo-500/80 bg-slate-900 hover:bg-indigo-900/40 text-slate-200 hover:scale-105'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {isConnected && <Check className="w-3.5 h-3.5 text-emerald-400 mr-auto" />}
                    <span>{w.name}</span>
                    <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: w.hex }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MINIGAME 2: RAID REBUILD */}
        {isRaidGame && (
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            {/* Drive Bays */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Слоты дисковой корзины:</div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((slotIdx) => {
                  const isFilled = slotsFilled.includes(slotIdx);
                  const isNext = slotsFilled.length === slotIdx;
                  return (
                    <div
                      key={slotIdx}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        isFilled
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                          : isNext
                          ? 'bg-indigo-950/40 border-indigo-500 border-dashed animate-pulse text-indigo-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <HardDrive className={`w-6 h-6 mx-auto mb-1 ${isFilled ? 'text-emerald-400' : isNext ? 'text-indigo-400' : 'text-slate-600'}`} />
                      <div className="font-mono text-xs font-bold">Слот #{slotIdx}</div>
                      <div className="text-[10px]">{isFilled ? '✅ NVMe установлен' : isNext ? '👉 Вставьте диск' : 'Пусто'}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drives pool to click */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Выберите следующий диск (Нужен: <strong>NVMe #{slotsFilled.length}</strong>):
              </div>
              <div className="grid grid-cols-3 gap-3">
                {scrambledDrives.map((dIdx) => {
                  const alreadyInserted = slotsFilled.includes(dIdx);
                  return (
                    <button
                      key={dIdx}
                      onClick={() => handleInsertDrive(dIdx)}
                      disabled={alreadyInserted}
                      className={`p-3.5 rounded-xl border text-center transition-all font-mono font-bold text-xs ${
                        alreadyInserted
                          ? 'opacity-30 border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
                          : 'bg-indigo-600/20 border-indigo-500 text-white hover:bg-indigo-600/40 hover:scale-105 active:scale-95 shadow-lg'
                      }`}
                    >
                      <span className="text-xl block mb-1">💾</span>
                      NVMe #{dIdx}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 font-mono">
          Нажмите <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">ESC</kbd> для отмены
        </div>
      </div>
    </div>
  );
}
