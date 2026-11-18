import React, { useState, useEffect } from 'react';
import { Timer, ShieldCheck, Volume2, VolumeX, AlertTriangle, ChevronDown, ChevronUp, Swords, Zap, BatteryCharging, Bomb, LogOut, Flag, Radio, Wifi } from 'lucide-react';
import { SHIFT_LEVELS, ABILITIES, getCareerTitle } from '../game/constants.js';
import { MiniMap } from './MiniMap.jsx';

export function HUD({
  myPlayer,
  players,
  gameTime,
  sla,
  mode,
  currentLevel = 1,
  levelRepairs = 0,
  targetRepairs = 5,
  activeIncidents,
  powerOnline,
  onSelectTool,
  onUseAbility,
  onSurrenderPvp,
  onRequestCoopExit,
  onRespondCoopExit,
  coopExitPrompt,
  onOpenPingWheel,
  quickPings = [],
  ping = 25,
  isMuted,
  onToggleMute
}) {
  const [tasksCollapsed, setTasksCollapsed] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const levelInfo = SHIFT_LEVELS.find((l) => l.level === currentLevel) || SHIFT_LEVELS[0];

  const TOOLS = [
    { id: 'hdd', key: '1', name: 'NVMe SSD', icon: '💾' },
    { id: 'extinguisher', key: '2', name: 'Огнетушитель', icon: '🧯' },
    { id: 'cable', key: '3', name: 'Патч-корд', icon: '🔌' },
    { id: 'chassis', key: '4', name: 'Шасси 1U', icon: '📦' },
    { id: 'server', key: '5', name: 'Собранный сервер', icon: '🚀' }
  ];

  const currentTool = myPlayer?.heldItem || myPlayer?.activeTool || 'hdd';

  // PvP Leaderboard & Opponent calculation
  const opponent = players?.find((p) => p.id !== myPlayer?.id);
  const myScore = myPlayer?.score || 0;
  const oppScore = opponent?.score || 0;
  const totalDuelScore = Math.max(1, myScore + oppScore);
  const myPercent = Math.round((myScore / totalDuelScore) * 100);

  const careerRank = getCareerTitle(myScore);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    if (mode === 'pvp') {
      onSurrenderPvp?.();
    } else {
      onRequestCoopExit?.();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-40">
      {/* Top Header Bar */}
      <div className="flex flex-row items-center justify-between gap-4 pointer-events-auto">
        {/* Left: SLA or PvP Score Duel */}
        {mode === 'pvp' ? (
          <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-3 px-5 shadow-xl backdrop-blur-md flex items-center gap-4">
            <Swords className="w-5 h-5 text-indigo-400 animate-pulse" />
            <div>
              <div className="text-[10px] text-indigo-300 font-mono uppercase tracking-wider">
                ⚔️ PvP Битва за Премию
              </div>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <span>Вы: <strong className="text-indigo-400">{myScore} XP</strong></span>
                <span className="text-slate-500">vs</span>
                <span>{opponent?.name || 'Соперник'}: <strong className="text-rose-400">{oppScore} XP</strong></span>
              </div>
            </div>

            {/* Duel Score Tug of War Bar */}
            <div className="w-32 bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden flex">
              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${myPercent}%` }} />
              <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${100 - myPercent}%` }} />
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 px-5 shadow-xl backdrop-blur-md flex items-center gap-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <span>🤝 Кооператив</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{levelInfo.badge}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <ShieldCheck className={`w-4 h-4 ${sla < 40 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                <span className={`font-mono font-bold text-sm ${sla < 40 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
                  SLA: {sla}%
                </span>
                <span className="text-xs text-slate-400 font-mono ml-2">
                  Смена: {levelRepairs}/{targetRepairs} тикетов
                </span>
              </div>
            </div>

            <div className="w-24 bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  sla > 60 ? 'bg-emerald-500' : sla > 30 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${sla}%` }}
              />
            </div>
          </div>
        )}

        {/* Center: Game Timer & Network Ping Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 px-6 shadow-xl backdrop-blur-md flex items-center gap-3">
            <Timer className={`w-5 h-5 ${gameTime <= 30 ? 'text-rose-400 animate-spin' : 'text-indigo-400'}`} />
            <span className={`font-mono text-xl font-black ${gameTime <= 30 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {formatTime(gameTime)}
            </span>
          </div>

          {/* Network Ping Indicator with Color Quality */}
          <div
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 px-3.5 shadow-xl backdrop-blur-md flex items-center gap-2 font-mono text-xs"
            title={`Задержка сети (Ping): ${ping} ms`}
          >
            <Wifi className={`w-4 h-4 ${ping < 65 ? 'text-emerald-400' : ping < 130 ? 'text-amber-400' : 'text-rose-400 animate-pulse'}`} />
            <span className={`font-bold ${ping < 65 ? 'text-emerald-400' : ping < 130 ? 'text-amber-400' : 'text-rose-400'}`}>
              {ping} ms
            </span>
          </div>
        </div>

        {/* Right: Quick Ping Button, Sound Toggle & Exit/Surrender Button */}
        <div className="flex items-center gap-2.5">
          {/* Quick Ping Wheel Button */}
          <button
            onClick={onOpenPingWheel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-700/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white text-xs font-mono font-bold shadow-xl backdrop-blur-md transition-all active:scale-95"
            title="Открыть колесо быстрых команд (Клавиша G)"
          >
            <span className="text-base">📢</span>
            <span className="hidden sm:inline">Команды [G]</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shadow-xl backdrop-blur-md pointer-events-auto"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Exit / Surrender Action Button */}
          {mode === 'pvp' ? (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-950/70 border border-rose-800 hover:bg-rose-900/80 text-rose-300 hover:text-white text-xs font-mono font-bold shadow-xl backdrop-blur-md transition-all active:scale-95"
              title="Признать поражение и завершить дуэль"
            >
              <Flag className="w-4 h-4 text-rose-400" />
              <span>Сдаться</span>
            </button>
          ) : (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono font-bold shadow-xl backdrop-blur-md transition-all active:scale-95"
              title="Завершить смену"
            >
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>Выйти</span>
            </button>
          )}
        </div>
      </div>

      {/* Side Tasks Panel (Rendered on top-right, NOT blocking the center) */}
      {activeIncidents?.length > 0 && (
        <div className="absolute top-20 right-4 w-72 sm:w-80 pointer-events-auto z-30 space-y-2">
          {/* Header toggle */}
          <button
            onClick={() => setTasksCollapsed(!tasksCollapsed)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-rose-500/40 text-xs font-mono text-rose-300 backdrop-blur-md shadow-lg"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              Аварии: Серверная & Улица ({activeIncidents.length})
            </span>
            {tasksCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {/* Incident cards list */}
          {!tasksCollapsed && (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {activeIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`bg-slate-900/95 border rounded-xl p-3 shadow-xl backdrop-blur-md space-y-1.5 transition-colors ${
                    inc.isOutdoor ? 'border-amber-500/50 hover:border-amber-400' : 'border-rose-500/40 hover:border-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="text-base">{inc.icon}</span>
                      <span>{inc.title}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-800">
                      +{inc.points} XP
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono">
                    {inc.desc}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    {inc.isOutdoor ? (
                      <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                        🌲 На улице во дворе
                      </span>
                    ) : (
                      <span className="text-[10px] text-cyan-300 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        🖥️ В серверной
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exit / Surrender Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            {mode === 'pvp' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl">
                  🏳️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Признать поражение?</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Вы сдадитесь в соревновательном режиме. Победа и премия будут присуждены вашему сопернику.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
                  >
                    Сдаться
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl">
                  🚪
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Завершить смену?</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    В кооперативе с напарником потребуется его подтверждение для досрочного выхода.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30"
                  >
                    Завершить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Co-op Partner Vote Prompt Modal */}
      {coopExitPrompt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
              🤝
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Запрос на выход</h3>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                Сисадмин <strong className="text-indigo-400">{coopExitPrompt.initiatorName}</strong> предлагает досрочно завершить смену. Подтвердить выход из игры?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onRespondCoopExit?.(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Отклонить
              </button>
              <button
                onClick={() => onRespondCoopExit?.(true)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
              >
                Подтвердить выход
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar: MiniMap, Profile with Rank, Abilities with CD & Toolbelt */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Mini-Map Radar & Profile Badge with Career Rank */}
        <div className="flex items-center gap-3">
          {/* Mini-Map Radar */}
          <MiniMap
            players={players}
            myPlayerId={myPlayer?.id}
            activeIncidents={activeIncidents}
            quickPings={quickPings}
          />

          {/* Profile & Career Rank */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 px-4 shadow-xl backdrop-blur-md flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: myPlayer?.color || '#6366f1' }}
            >
              👨‍💻
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                <span>{myPlayer?.name || 'Админ'}</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  {careerRank.icon} {careerRank.title}
                </span>
              </div>
              <div className="text-xs text-indigo-400 font-mono mt-0.5">
                Очки: <span className="font-bold text-white">{myScore} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: ACTIVE ABILITIES WITH COOLDOWN BAR [R, F, C] */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 px-3 shadow-xl backdrop-blur-md flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 mr-1 hidden lg:inline">
            Способности:
          </span>

          {ABILITIES.map((ab) => {
            if (ab.id === 'sabotage' && mode !== 'pvp') return null; // Sabotage only in PvP!

            const cdUntil = myPlayer?.cooldowns?.[ab.id] || 0;
            const cdLeft = Math.max(0, Math.ceil((cdUntil - now) / 1000));
            const isReady = cdLeft === 0;

            return (
              <button
                key={ab.id}
                disabled={!isReady}
                onClick={() => onUseAbility(ab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  isReady
                    ? 'bg-indigo-600/30 hover:bg-indigo-600/50 border-indigo-500 text-white shadow-md shadow-indigo-500/20 active:scale-95'
                    : 'bg-slate-950/80 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title={`${ab.name} (Клавиша ${ab.key}) - ${ab.desc}`}
              >
                <span className="text-[10px] bg-slate-900 px-1 rounded text-slate-400">{ab.key}</span>
                <span className="text-base">{ab.icon}</span>
                <span className="hidden md:inline">{ab.name}</span>

                {/* Cooldown Timer Overlay */}
                {!isReady && (
                  <span className="ml-1 text-[11px] text-amber-400 font-black animate-pulse">
                    {cdLeft}s
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Toolbelt Quick Inventory (Keys 1-5 or Click) */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 px-3 shadow-xl backdrop-blur-md flex items-center gap-1.5">
          {TOOLS.map((tool) => {
            const isActive = currentTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600/40 border-indigo-500 ring-2 ring-indigo-500/40 text-white scale-105 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
                title={`${tool.name} (Клавиша ${tool.key})`}
              >
                <span className="text-[10px] text-slate-500 bg-slate-900 px-1 rounded">{tool.key}</span>
                <span className="text-base">{tool.icon}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
