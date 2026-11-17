import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Award, AlertTriangle, Home } from 'lucide-react';
import { audio } from '../game/audio.js';

export function GameOverModal({ gameOverData, myPlayerId, onPlayAgain, onReturnToLobby }) {
  const isWinner = gameOverData.winner?.id === myPlayerId;
  const isSlaSuccess = gameOverData.finalSla > 0;

  useEffect(() => {
    if (isWinner || (gameOverData.mode === 'coop' && isSlaSuccess)) {
      audio.playSuccess();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } else {
      audio.playAlarm();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-center">
        {/* Badge Icon */}
        <div className="inline-flex p-4 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl">
          {isWinner || (gameOverData.mode === 'coop' && isSlaSuccess) ? (
            <Trophy className="w-16 h-16 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-bounce" />
          ) : (
            <AlertTriangle className="w-16 h-16 text-rose-500 animate-pulse" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {gameOverData.reason === 'surrender' ? (
              isWinner ? (
                <span className="text-amber-400">Соперник сдался! Ваша чистая победа! 🏆</span>
              ) : (
                <span className="text-rose-400">Вы признали поражение 🏳️</span>
              )
            ) : gameOverData.reason === 'coop_agreed_exit' || gameOverData.reason === 'solo_exit' ? (
              <span className="text-slate-200">Смена досрочно завершена 🚪</span>
            ) : gameOverData.mode === 'coop' ? (
              isSlaSuccess ? (
                <span className="text-emerald-400">Смена успешно отработана!</span>
              ) : (
                <span className="text-rose-400">SLA упал до нуля. Дата-центр лег!</span>
              )
            ) : isWinner ? (
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Вы — Сисадмин месяца! 🏆
              </span>
            ) : (
              <span className="text-slate-200">Смена завершена</span>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Итоговый SLA компании: <strong className={gameOverData.finalSla > 50 ? 'text-emerald-400' : 'text-rose-400'}>{gameOverData.finalSla}%</strong>
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono px-2 flex justify-between">
            <span>Сотрудник</span>
            <span>Починок / Очки</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {gameOverData.leaderboard?.map((p, idx) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl flex items-center justify-between transition-colors ${
                  p.id === myPlayerId
                    ? 'bg-indigo-950/60 border border-indigo-500/40 text-white font-bold'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                    #{idx + 1}
                  </span>
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm truncate max-w-[150px]">{p.name}</span>
                  {idx === 0 && <Award className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>

                <div className="text-xs font-mono flex items-center gap-2">
                  <span className="text-slate-400">{p.repairsCount} инц.</span>
                  <span className="font-bold text-indigo-400">{p.score} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons: Play Again & Return to Lobby */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Выйти на новую смену
          </button>

          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            В главное меню
          </button>
        </div>
      </div>
    </div>
  );
}
