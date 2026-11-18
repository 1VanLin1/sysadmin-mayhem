import React, { useState } from 'react';
import { Terminal, ShieldAlert, Skull, CheckCircle, X, CornerDownLeft } from 'lucide-react';

export function NocTerminalModal({ hasDdos, hasRansomware, incidentId, onCommand, onClose }) {
  const [inputVal, setInputVal] = useState('');
  const [logs, setLogs] = useState(() => {
    const list = [
      'Linux 6.8.0-datacenter-noc x86_64',
      'Система мониторинга Prometheus & Grafana активна.'
    ];
    if (hasDdos) {
      list.push('⚠️ АЛЕРТ: Обнаружена SYN Flood DDoS атака на сетевой интерфейс eth0!');
    }
    if (hasRansomware) {
      list.push('💀 КРИТИЧЕСКИЙ АЛЕРТ: Обнаружен вирус-шифровальщик WannaCry.sys! Требуется восстановление из бэкапа.');
    }
    if (!hasDdos && !hasRansomware) {
      list.push('Все фоновые демоны работают в штатном режиме.');
    }
    return list;
  });

  const handleSubmit = (cmdToRun) => {
    const cmd = cmdToRun || inputVal;
    if (!cmd.trim()) return;

    setLogs((prev) => [...prev, `root@noc:~# ${cmd}`]);
    const lower = cmd.toLowerCase();

    if (lower.includes('kill') || lower.includes('iptables') || lower.includes('block') || lower.includes('mitigate')) {
      setLogs((prev) => [
        ...prev,
        '-> [OK] Сигнал SIGKILL отправлен процессу PID 666.',
        '-> [OK] Правило фильтрации пакетов iptables успешно применено.',
        '-> [OK] Нагрузка на CPU нормализована (CPU: 4.2%). DDoS угроза устранена!'
      ]);
      setTimeout(() => {
        onCommand(cmd);
        onClose();
      }, 700);
    } else if (lower.includes('restore') || lower.includes('backup') || lower.includes('decrypt') || lower.includes('clean')) {
      setLogs((prev) => [
        ...prev,
        '-> [OK] Холодный бэкап смонтирован из /mnt/backup_vault.',
        '-> [OK] Восстановление целостности файловой системы завершено.',
        '-> [OK] Вирус-шифровальщик удален, базы данных разблокированы!'
      ]);
      setTimeout(() => {
        onCommand(cmd);
        onClose();
      }, 700);
    } else {
      setLogs((prev) => [...prev, `-> bash: ${cmd}: команда выполнена, но угроза не устранена.`]);
    }

    setInputVal('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0b101b] border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-mono text-xs sm:text-sm">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-bold ml-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              NOC Admin Workstation — bash (pts/0)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Process Monitor (DDoS Alert) */}
        {hasDdos && (
          <div className="bg-rose-950/40 border-b border-rose-900/40 p-3 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <div className="font-bold text-rose-400 flex items-center gap-2">
                АНОМАЛЬНАЯ НАГРУЗКА НА СЕТЬ (SYN FLOOD DDoS)
              </div>
              <div className="text-xs text-rose-200/80">
                Процесс: <code className="bg-rose-950 px-1 py-0.5 rounded text-white">PID: 666</code> | 
                Имя: <code className="bg-rose-950 px-1 py-0.5 rounded text-white">ddos_botnet_flood</code> | 
                Трафик: <span className="text-amber-300 font-bold">14.8 Gbps</span>
              </div>
            </div>
          </div>
        )}

        {/* Ransomware Alert */}
        {hasRansomware && (
          <div className="bg-purple-950/40 border-b border-purple-900/40 p-3 flex items-start gap-3">
            <Skull className="w-5 h-5 text-purple-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <div className="font-bold text-purple-400 flex items-center gap-2">
                КРИТИЧЕСКИЙ СБОЙ: RANSOMWARE ШИФРОВАЛЬЩИК
              </div>
              <div className="text-xs text-purple-200/80">
                Зашифровано файлов: <span className="text-rose-400 font-bold">14,289</span> | 
                Требуется: <code className="bg-purple-900/60 px-1.5 py-0.5 rounded text-white">restore-backup</code>
              </div>
            </div>
          </div>
        )}

        {/* Terminal Screen Logs */}
        <div className="p-4 space-y-1.5 h-64 overflow-y-auto bg-slate-950 text-slate-300">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={log.startsWith('⚠️') ? 'text-amber-400 font-bold' : log.startsWith('💀') ? 'text-purple-400 font-bold' : log.startsWith('-> [OK]') ? 'text-emerald-400 font-bold' : ''}
            >
              {log}
            </div>
          ))}
        </div>

        {/* Fast Action Buttons for DDoS */}
        {hasDdos && (
          <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-2 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center">Анти-DDoS команды:</span>
            <button
              onClick={() => handleSubmit('kill -9 666')}
              className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
            >
              kill -9 666
            </button>
            <button
              onClick={() => handleSubmit('iptables -A INPUT -j DROP')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
            >
              iptables -A INPUT -j DROP
            </button>
          </div>
        )}

        {/* Fast Action Buttons for Ransomware */}
        {hasRansomware && (
          <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-2 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center">Восстановление данных:</span>
            <button
              onClick={() => handleSubmit('restore-backup /mnt/vault')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
            >
              restore-backup
            </button>
            <button
              onClick={() => handleSubmit('openssl decrypt --clean')}
              className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
            >
              decrypt --clean
            </button>
          </div>
        )}

        {/* Terminal Input */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center gap-2">
          <span className="text-emerald-400 font-bold">root@noc:~#</span>
          <input
            type="text"
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Введите команду (например: kill -9 666 или restore-backup)..."
            className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder-slate-600"
          />
          <button
            onClick={() => handleSubmit()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
