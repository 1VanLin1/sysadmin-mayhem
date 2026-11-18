import React, { useState, useEffect } from 'react';
import { Server, Users, Bot, Play, Zap, Shield, Sparkles, Trophy, LogIn, UserCheck, LogOut, X, RefreshCw, Award, Copy, Check, Lock, User, Wrench, Radio } from 'lucide-react';
import { audio } from '../game/audio.js';
import { getCareerTitle } from '../game/constants.js';

const COLORS = [
  { name: 'Cyber Indigo', hex: '#6366f1' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Ruby Red', hex: '#e11d48' },
  { name: 'Purple Neon', hex: '#a855f7' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Cyan Tech', hex: '#06b6d4' }
];

export function Lobby({ onJoinGame }) {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sysadmin_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [username, setUsername] = useState(() => {
    const storedAuth = localStorage.getItem('sysadmin_auth_user');
    if (storedAuth) {
      try {
        return JSON.parse(storedAuth).username;
      } catch (e) {}
    }
    return localStorage.getItem('sysadmin_name') || `Админ_${Math.floor(100 + Math.random() * 900)}`;
  });

  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [mode, setMode] = useState('coop');
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const r = urlParams.get('room');
      if (r) return r.toUpperCase();
    }
    return 'DATA-1';
  });
  const [withBot, setWithBot] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const openLeaderboard = () => {
    fetchLeaderboard();
    setShowLeaderboardModal(true);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authTab === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
          color: selectedColor
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Произошла ошибка при авторизации');
      } else {
        audio.playSuccess();
        setCurrentUser(data.user);
        setUsername(data.user.username);
        if (data.user.color) setSelectedColor(data.user.color);
        localStorage.setItem('sysadmin_auth_user', JSON.stringify(data.user));
        localStorage.setItem('sysadmin_name', data.user.username);
        setShowAuthModal(false);
        setAuthUsername('');
        setAuthPassword('');
      }
    } catch (err) {
      setAuthError('Не удалось соединиться с сервером');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sysadmin_auth_user');
  };

  const handleStart = () => {
    audio.playSuccess();
    const finalName = username.trim() || 'Админ';
    localStorage.setItem('sysadmin_name', finalName);
    onJoinGame({
      roomId: roomCode.trim() || 'DATA-1',
      username: finalName,
      color: selectedColor,
      mode,
      withBot,
      dbUsername: currentUser ? currentUser.username : finalName
    });
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomCode.trim()}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl w-full space-y-6 my-auto">
        {/* Top Navbar: Auth status & Leaderboard button */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> 2D Мультиплеерный экшен-симулятор дата-центра
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openLeaderboard}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold shadow-lg transition-all active:scale-95"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Таблица лидеров</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">{currentUser.username}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  {getCareerTitle(currentUser.highScore || 0).icon} {getCareerTitle(currentUser.highScore || 0).title}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-bold">{currentUser.highScore || 0} XP</span>
                <button
                  onClick={handleLogout}
                  title="Выйти из аккаунта"
                  className="ml-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500 hover:bg-indigo-600/30 text-indigo-300 text-xs font-mono font-bold transition-all active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти / Регистрация</span>
              </button>
            )}
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
            <Server className="w-10 h-10 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            SysAdmin Mayhem
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Бегайте по серверной и двору вместе с друзьями, меняйте диски, собирайте сервера, тушите стойки и держите SLA компании на высоте!
          </p>
        </div>

        {/* Main Configuration Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {/* Left Column: Player Customization & Room Code */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Имя сисадмина
                </label>
                {currentUser && (
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Авторизован
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={18}
                value={username}
                disabled={!!currentUser}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Имя или позывной"
                className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 ${
                  currentUser ? 'opacity-80 cursor-not-allowed bg-slate-900' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Цвет униформы
              </label>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      audio.playPickup();
                      setSelectedColor(c.hex);
                    }}
                    className={`w-10 h-10 rounded-full transition-transform border-2 ${
                      selectedColor === c.hex ? 'scale-115 border-white shadow-lg shadow-indigo-500/30' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Room Code & Share Link */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Код комнаты
                </label>
                <button
                  onClick={handleCopyLink}
                  type="button"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Ссылка скопирована!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Скопировать ссылку для друга</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                maxLength={10}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="DATA-1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1.5 block">
                👥 Отправьте ссылку друзьям: в одной комнате вы сможете работать в команде или соревноваться!
              </span>
            </div>
          </div>

          {/* Right Column: Game Mode & Bot */}
          <div className="space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Режим игры
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('coop')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === 'coop'
                      ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/20 text-white ring-1 ring-emerald-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-1.5 mb-1 text-emerald-400">
                    <Shield className="w-4 h-4" /> 🤝 Кооператив
                  </div>
                  <div className="text-xs text-slate-300">
                    Общий дата-центр и общий SLA. Совместное устранение аварий и выход по голосованию.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('pvp')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === 'pvp'
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white ring-1 ring-indigo-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center gap-1.5 mb-1 text-indigo-400">
                    <Zap className="w-4 h-4" /> ⚔️ PvP Дуэль
                  </div>
                  <div className="text-xs text-slate-400">
                    Битва за Премию. Кто решит больше задач! Саботаж противника [C] и кнопка сдачи.
                  </div>
                </button>
              </div>

              {/* Bot Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={withBot}
                  onChange={(e) => setWithBot(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-700"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-rose-400" /> Сбалансированный AI-бот (Васильич)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Отрегулированная человеческая скорость ремонта. Помощник в коопе или соперник в PvP!
                  </div>
                </div>
              </label>

              {/* SLA Banner */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-300 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" /> SLA дата-центра
                </div>
                <div className="text-[11px] leading-relaxed">
                  Ремонтируйте серверные стойки и уличное оборудование (генератор, чиллер, спутник), восстанавливая SLA!
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStart}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-extrabold text-lg shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              Войти в серверную (Начать игру)
            </button>
          </div>
        </div>

        {/* Game Rules / Instructions Banner */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-indigo-400" /> Управление: W,A,S,D / Стрелочки | [E] Ремонт | [R] Спринт | [F] Оверклок | [C] Саботаж
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xl">💾</span>
              <div className="font-bold text-slate-200">NVMe SSD</div>
              <div className="text-[11px] text-slate-400">Стойка [E] с диском в руках</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xl">🧯</span>
              <div className="font-bold text-slate-200">Пожар стойки</div>
              <div className="text-[11px] text-slate-400">Огнетушитель [2] → Тушить [E]</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xl">📡</span>
              <div className="font-bold text-slate-200">Двор: Спутник</div>
              <div className="text-[11px] text-slate-400">Выход на улицу → Патч-корд [E]</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xl">❄️</span>
              <div className="font-bold text-slate-200">Двор: Чиллер</div>
              <div className="text-[11px] text-slate-400">Охлаждение дата-центра во дворе</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xl">🚜</span>
              <div className="font-bold text-slate-200">Дизель-генератор</div>
              <div className="text-[11px] text-slate-400">Резервное питание при аварии PDU</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-xl">⚡</span>
              <div className="font-bold text-slate-200">Способности</div>
              <div className="text-[11px] text-slate-400">[R] Турбо-бег | [F] 2.5x Ремонт</div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal (Login & Registration) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 pb-3 gap-6">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
                className={`text-base font-bold pb-1 transition-colors relative ${
                  authTab === 'login' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Вход
                {authTab === 'login' && <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                }}
                className={`text-base font-bold pb-1 transition-colors relative ${
                  authTab === 'register' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Регистрация
                {authTab === 'register' && <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-indigo-500" />}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Логин / Позывной
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Например: admin_pro"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={3}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Минимум 3 символа"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {authError && (
                <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800/80 rounded-xl p-2.5">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : authTab === 'login' ? (
                  'Войти в систему'
                ) : (
                  'Зарегистрироваться'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Leaderboard Modal */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-black text-white">Таблица лидеров дата-центра</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLeaderboard}
                  disabled={loadingLeaderboard}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Обновить"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono px-3 flex justify-between">
                <span>Сисадмин</span>
                <span className="flex gap-6">
                  <span>Починок</span>
                  <span>Побед</span>
                  <span>Рекорд XP</span>
                </span>
              </div>

              {leaderboard.map((u, idx) => (
                <div
                  key={u.id || idx}
                  className={`p-3 rounded-xl flex items-center justify-between border transition-colors ${
                    currentUser && currentUser.username.toLowerCase() === u.username.toLowerCase()
                      ? 'bg-indigo-950/60 border-indigo-500/50 text-white font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: u.color || '#6366f1' }}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate max-w-[130px]">{u.username}</span>
                        {idx === 0 && <Award className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {getCareerTitle(u.highScore || 0).icon} {getCareerTitle(u.highScore || 0).title}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-mono flex items-center gap-6">
                    <span className="text-slate-400 w-12 text-right">{u.totalRepairs || 0}</span>
                    <span className="text-slate-400 w-10 text-right">{u.wins || 0}</span>
                    <span className="font-bold text-amber-400 w-16 text-right">{u.highScore || 0} XP</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowLeaderboardModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
