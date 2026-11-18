import React, { useRef, useEffect } from 'react';
import { MAP_CONFIG, ZONES } from '../game/constants.js';

export function MiniMap({ players, myPlayerId, activeIncidents, quickPings = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const scaleX = W / MAP_CONFIG.width;
    const scaleY = H / MAP_CONFIG.height;

    // 1. Background (Indoor & Outdoor)
    const splitX = MAP_CONFIG.outdoorStartX * scaleX;
    // Indoor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, splitX, H);
    // Outdoor yard
    ctx.fillStyle = '#141e33';
    ctx.fillRect(splitX, 0, W - splitX, H);

    // Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);

    // Dividing wall with doorway (y: 300..440)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, 300 * scaleY);
    ctx.moveTo(splitX, 440 * scaleY);
    ctx.lineTo(splitX, H);
    ctx.stroke();

    // 2. Zone outlines
    for (const zone of ZONES) {
      ctx.fillStyle = zone.isOutdoor ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)';
      ctx.fillRect(zone.x * scaleX, zone.y * scaleY, zone.w * scaleX, zone.h * scaleY);
    }

    // 3. Incidents (pulsing red/amber dots)
    const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
    for (const inc of activeIncidents || []) {
      const ix = inc.targetX * scaleX;
      const iy = inc.targetY * scaleY;
      ctx.fillStyle = inc.isOutdoor ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(ix, iy, 3 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Quick Pings beacons
    for (const qp of quickPings || []) {
      const qx = qp.x * scaleX;
      const qy = qp.y * scaleY;
      ctx.strokeStyle = qp.color || '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(qx, qy, 6 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Players
    for (const p of players || []) {
      const px = (p.renderX !== undefined ? p.renderX : p.x) * scaleX;
      const py = (p.renderY !== undefined ? p.renderY : p.y) * scaleY;
      const isMe = p.id === myPlayerId;

      ctx.fillStyle = isMe ? '#22c55e' : p.color || '#6366f1';
      ctx.beginPath();
      ctx.arc(px, py, isMe ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isMe) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [players, myPlayerId, activeIncidents, quickPings]);

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-2xl backdrop-blur-md pointer-events-auto">
      <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Радар дата-центра
        </span>
        <span className="text-[9px] text-slate-500">Улица →</span>
      </div>
      <canvas
        ref={canvasRef}
        width={150}
        height={90}
        className="rounded-lg border border-slate-800 bg-slate-950 block"
      />
    </div>
  );
}
