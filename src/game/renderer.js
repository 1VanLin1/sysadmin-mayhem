import { MAP_CONFIG, ZONES } from './constants.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.floatingTexts = [];
    this.tick = 0;
  }

  addFloatingText(text, color, x, y) {
    this.floatingTexts.push({
      text,
      color: color || '#22c55e',
      x,
      y,
      vy: -1.2,
      life: 1.0
    });
  }

  addSmokeParticle(x, y, isFire = false) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1.5 - Math.random() * 1.5,
      size: 4 + Math.random() * 6,
      color: isFire
        ? Math.random() > 0.5 ? '#f97316' : '#ef4444'
        : 'rgba(148, 163, 184, 0.4)',
      life: 1.0,
      decay: 0.02
    });
  }

  render(gameState, myPlayerId, quickPings = []) {
    const { ctx, canvas } = this;
    this.tick += 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Environment (Indoor Server Room + Outdoor Yard + Dividing Doorway)
    this.drawEnvironment(gameState.powerOnline);

    // 2. Draw Zones (Indoor Racks, Workbench, Terminal, Outdoor Satellite, Generator, Chiller)
    this.drawZones(gameState);

    // 3. Draw Particles (Smoke, Sparks, Steam)
    this.updateAndDrawParticles(gameState);

    // 4. Draw Quick Ping Beacons on floor
    this.drawQuickPings(quickPings);

    // 5. Draw Players (with Interpolation & Prediction)
    if (gameState.players) {
      const now = Date.now();
      for (const p of gameState.players) {
        const activePing = quickPings?.find((qp) => qp.playerId === p.id && now - qp.createdAt < 3500);
        this.drawPlayer(p, p.id === myPlayerId, activePing);
      }
    }

    // 6. Draw Floating Texts
    this.updateAndDrawFloatingTexts();

    // 7. Emergency Lighting Overlay
    if (!gameState.powerOnline) {
      const alpha = 0.35 + Math.sin(this.tick * 0.08) * 0.15;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ ВНИМАНИЕ: СБОЙ ПИТАНИЯ! ПЕРЕЗАПУСТИТЕ PDU ИЛИ ДИЗЕЛЬ-ГЕНЕРАТОР ВО ДВОРЕ!', canvas.width / 2, 35);
    }
  }

  drawQuickPings(quickPings) {
    const { ctx } = this;
    const now = Date.now();
    for (const qp of quickPings || []) {
      const age = now - qp.createdAt;
      if (age > 4000) continue;
      const alpha = Math.max(0, 1 - age / 4000);
      const ringR = 15 + ((age / 1000) % 1) * 35;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = qp.color || '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(qp.x, qp.y, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = qp.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(qp.x, qp.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(qp.icon || '📍', qp.x, qp.y - 12);
      ctx.restore();
    }
  }

  drawEnvironment(powerOnline) {
    const { ctx, canvas } = this;
    const splitX = MAP_CONFIG.outdoorStartX; // 860

    // --- INDOOR AREA (0 .. splitX) ---
    ctx.fillStyle = powerOnline ? '#0f172a' : '#090d16';
    ctx.fillRect(0, 0, splitX, canvas.height);

    // Server Room Grid lines
    ctx.strokeStyle = powerOnline ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 1;
    const tileSize = 40;
    for (let x = 0; x < splitX; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(splitX, y);
      ctx.stroke();
    }

    // --- OUTDOOR YARD (splitX .. width) ---
    // Dark asphalt
    ctx.fillStyle = '#090d14';
    ctx.fillRect(splitX, 0, canvas.width - splitX, canvas.height);

    // Outdoor safety stripes
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(splitX + 25, 20);
    ctx.lineTo(splitX + 25, canvas.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Outdoor Yard Banner Tag
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('🌲 ВНУТРЕННИЙ ДВОР ДАТА-ЦЕНТРА 🛰️', (splitX + canvas.width) / 2, 30);

    // --- DIVIDING WALL WITH DOORWAY ---
    ctx.fillStyle = '#334155';
    // Top wall segment (y: 0..300)
    ctx.fillRect(splitX - 10, 0, 20, 300);
    // Bottom wall segment (y: 440..720)
    ctx.fillRect(splitX - 10, 440, 20, canvas.height - 440);

    // Doorway opening (y: 300..440)
    ctx.fillStyle = '#065f46';
    ctx.fillRect(splitX - 8, 300, 16, 140);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.strokeRect(splitX - 8, 300, 16, 140);

    // Doorway illuminated sign
    ctx.save();
    ctx.translate(splitX, 370);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('🚪 ВЫХОД НА УЛИЦУ 🚪', 0, 4);
    ctx.restore();

    // Outer perimeter walls
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = MAP_CONFIG.wallThickness;
    ctx.strokeRect(
      MAP_CONFIG.wallThickness / 2,
      MAP_CONFIG.wallThickness / 2,
      canvas.width - MAP_CONFIG.wallThickness,
      canvas.height - MAP_CONFIG.wallThickness
    );
  }

  drawZones(gameState) {
    const { ctx } = this;
    const incidents = gameState.activeIncidents || [];

    for (const zone of ZONES) {
      const hasIncident = incidents.find((inc) => inc.targetZoneId === zone.id);

      // Zone shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(zone.x + 4, zone.y + 6, zone.w, zone.h);

      if (zone.type === 'rack') {
        this.drawServerRack(zone, hasIncident, gameState.powerOnline);
      } else if (zone.type === 'empty_rack') {
        this.drawEmptyRack(zone, hasIncident);
      } else if (zone.type === 'terminal') {
        this.drawNocTerminal(zone, hasIncident);
      } else if (zone.type === 'workbench') {
        this.drawWorkbench(zone, gameState.workbenchState);
      } else if (zone.type === 'pdu') {
        this.drawPdu(zone, hasIncident, gameState.powerOnline);
      } else if (zone.type === 'satellite') {
        this.drawSatellite(zone, hasIncident);
      } else if (zone.type === 'generator') {
        this.drawGenerator(zone, hasIncident, gameState.powerOnline);
      } else if (zone.type === 'chiller') {
        this.drawChiller(zone, hasIncident);
      }

      if (hasIncident) {
        this.drawIncidentAlert(zone, hasIncident);
      }
    }
  }

  drawServerRack(zone, hasIncident, powerOnline) {
    const { ctx } = this;
    ctx.fillStyle = hasIncident ? '#450a0a' : '#1e293b';
    ctx.strokeStyle = hasIncident ? '#ef4444' : '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    const units = 5;
    const unitHeight = (zone.h - 16) / units;

    for (let i = 0; i < units; i++) {
      const uy = zone.y + 8 + i * unitHeight;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(zone.x + 6, uy, zone.w - 12, unitHeight - 4);

      if (powerOnline) {
        const ledColor = hasIncident
          ? Math.floor(this.tick / 15) % 2 === 0 ? '#ef4444' : '#7f1d1d'
          : (i + this.tick) % 5 === 0 ? '#38bdf8' : '#10b981';

        ctx.fillStyle = ledColor;
        ctx.beginPath();
        ctx.arc(zone.x + 14, uy + unitHeight / 2 - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(zone.x + 22, uy + unitHeight / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h + 14);
  }

  drawEmptyRack(zone, hasIncident) {
    const { ctx } = this;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = hasIncident ? '#f59e0b' : '#334155';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    ctx.setLineDash([]);

    ctx.fillStyle = hasIncident ? '#fbbf24' : '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hasIncident ? 'УСТАНОВИТЕ СЕРВЕР' : 'Свободный слот', zone.x + zone.w / 2, zone.y + zone.h / 2);
  }

  drawNocTerminal(zone, hasIncident) {
    const { ctx } = this;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = hasIncident ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    const monW = 55;
    const monH = 35;
    [zone.x + 15, zone.x + 80].forEach((mx) => {
      ctx.fillStyle = '#030712';
      ctx.fillRect(mx, zone.y + 10, monW, monH);

      ctx.fillStyle = hasIncident ? '#ef4444' : '#10b981';
      ctx.fillRect(mx + 4, zone.y + 14, monW - 8, monH - 8);

      ctx.fillStyle = '#000000';
      ctx.fillRect(mx + 6, zone.y + 18, 25, 2);
      ctx.fillRect(mx + 6, zone.y + 22, 35, 2);
      ctx.fillRect(mx + 6, zone.y + 26, 20, 2);
    });

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(zone.x + 30, zone.y + 55, 90, 16);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h + 14);
  }

  drawWorkbench(zone, wbState) {
    const { ctx } = this;
    ctx.fillStyle = '#292524';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';

    if (wbState?.hasServerReady) {
      ctx.fillText('🚀', zone.x + zone.w / 2, zone.y + zone.h / 2 - 10);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('ГОТОВ К МОНТАЖУ!', zone.x + zone.w / 2, zone.y + zone.h / 2 + 20);
    } else if (wbState?.hasChassis) {
      ctx.fillText('📦', zone.x + zone.w / 2, zone.y + zone.h / 2 - 10);
      const barW = zone.w - 20;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(zone.x + 10, zone.y + zone.h / 2 + 15, barW, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(zone.x + 10, zone.y + zone.h / 2 + 15, barW * (wbState.buildProgress / 100), 8);
    } else {
      ctx.fillText('🛠️', zone.x + zone.w / 2, zone.y + zone.h / 2 - 5);
      ctx.fillStyle = '#a8a29e';
      ctx.font = '10px sans-serif';
      ctx.fillText('Положите шасси 1U', zone.x + zone.w / 2, zone.y + zone.h / 2 + 20);
    }

    ctx.fillStyle = '#fde047';
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h + 14);
  }

  drawPdu(zone, hasIncident, powerOnline) {
    const { ctx } = this;
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = powerOnline ? '#f97316' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(powerOnline ? '⚡' : '⚠️', zone.x + 35, zone.y + zone.h / 2);

    ctx.fillStyle = powerOnline ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillText(powerOnline ? '230V ОНЛАЙН' : 'ВЫБИЛО АВТОМАТ!', zone.x + 95, zone.y + zone.h / 2);

    ctx.fillStyle = '#fb923c';
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h + 14);
  }

  // --- OUTDOOR ZONES RENDERING ---
  drawSatellite(zone, hasIncident) {
    const { ctx } = this;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = hasIncident ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    // Big Dish Icon
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📡', zone.x + zone.w / 2, zone.y + zone.h / 2 - 10);

    ctx.fillStyle = hasIncident ? '#f87171' : '#38bdf8';
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillText('СПУТНИКОВАЯ ТАРЕЛКА', zone.x + zone.w / 2, zone.y + zone.h / 2 + 25);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillText(hasIncident ? 'НЕТ СИГНАЛА! КАЛИБРОВКА' : 'ОПТИЧЕСКИЙ ЛИНК 100G', zone.x + zone.w / 2, zone.y + zone.h / 2 + 40);
  }

  drawGenerator(zone, hasIncident, powerOnline) {
    const { ctx } = this;
    ctx.fillStyle = '#262626';
    ctx.strokeStyle = hasIncident ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚜', zone.x + zone.w / 2, zone.y + zone.h / 2 - 10);

    ctx.fillStyle = hasIncident ? '#f87171' : '#f59e0b';
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillText('ДИЗЕЛЬ-ГЕНЕРАТОР (ДГУ)', zone.x + zone.w / 2, zone.y + zone.h / 2 + 25);
    ctx.fillStyle = '#a3a3a3';
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillText(hasIncident ? 'СТАРТЕР ОСТАНОВЛЕН!' : 'РЕЗЕРВ: 1200 КВТ ГОТОВ', zone.x + zone.w / 2, zone.y + zone.h / 2 + 40);

    // Emit exhaust smoke from generator
    if (this.tick % 8 === 0) {
      this.particles.push({
        x: zone.x + 20,
        y: zone.y + 10,
        vx: -0.5 - Math.random() * 0.5,
        vy: -1.0 - Math.random() * 1.0,
        size: 3 + Math.random() * 4,
        color: 'rgba(100, 116, 139, 0.4)',
        life: 1.0,
        decay: 0.02
      });
    }
  }

  drawChiller(zone, hasIncident) {
    const { ctx } = this;
    ctx.fillStyle = '#083344';
    ctx.strokeStyle = hasIncident ? '#ef4444' : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hasIncident ? '🔥' : '❄️', zone.x + zone.w / 2, zone.y + zone.h / 2 - 10);

    ctx.fillStyle = hasIncident ? '#fca5a5' : '#67e8f9';
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillText('УЛИЧНАЯ ГРАДИРНЯ', zone.x + zone.w / 2, zone.y + zone.h / 2 + 25);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillText(hasIncident ? 'ВЕНТИЛЯТОРЫ ЗАБИТЫ!' : 'РАДИАТОРЫ В НОРМЕ', zone.x + zone.w / 2, zone.y + zone.h / 2 + 40);
  }

  drawIncidentAlert(zone, incident) {
    const { ctx } = this;
    const pulse = Math.sin(this.tick * 0.15) * 4;

    const badgeY = zone.y - 25 + pulse;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(zone.x + zone.w / 2 - 45, badgeY, 90, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${incident.icon} SOS!`, zone.x + zone.w / 2, badgeY + 16);

    if (this.tick % 4 === 0) {
      this.addSmokeParticle(zone.x + zone.w / 2, zone.y + 20, incident.type === 'fire');
    }
  }

  drawPlayer(player, isMe, activePing) {
    const { ctx } = this;
    const r = MAP_CONFIG.playerRadius;
    const px = player.renderX !== undefined ? player.renderX : player.x;
    const py = player.renderY !== undefined ? player.renderY : player.y;

    // Turbo Sprint Trail
    if (player.hasCoffeeBoost && (player.vx !== 0 || player.vy !== 0)) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.beginPath();
      ctx.arc(px - player.vx * 2, py - player.vy * 2, r * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + r, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Circle
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isMe ? '#ffffff' : '#0f172a';
    ctx.lineWidth = isMe ? 3 : 2;
    ctx.stroke();

    // Head / Face
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py - 2, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px - 2, py - 3, 2, 0, Math.PI * 2);
    ctx.arc(px + 2, py - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Active tool in hands
    const currentTool = player.heldItem || player.activeTool;
    if (currentTool) {
      const itemEmojis = {
        hdd: '💾',
        cable: '🔌',
        extinguisher: '🧯',
        chassis: '📦',
        server: '🚀'
      };
      const emoji = itemEmojis[currentTool] || '❓';
      ctx.font = '18px sans-serif';
      ctx.fillText(emoji, px + r + 2, py - 4);
    }

    // Sabotaged Glitch effect
    if (player.isSabotaged) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(px - 50, py - r - 48, 100, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('😵 САБОТАЖ!', px, py - r - 35);
    }

    // Name tag & Score badge above head
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(px - 45, py - r - 26, 90, 20, 6);
    ctx.fill();
    ctx.strokeStyle = isMe ? '#6366f1' : '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isMe ? '#a5b4fc' : '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, px, py - r - 12);

    // Quick Ping Speech Bubble (from [G] wheel)
    if (activePing) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = activePing.color || '#38bdf8';
      ctx.lineWidth = 1.5;
      const msg = `${activePing.icon} ${activePing.label}`;
      ctx.font = 'bold 10px "JetBrains Mono"';
      const msgW = ctx.measureText(msg).width + 16;
      ctx.beginPath();
      ctx.roundRect(px - msgW / 2, py - r - 58, msgW, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(msg, px, py - r - 43);
    }

    // Smart Bot State Bubble (if Васильич has active task and no ping)
    if (player.isBot && player.botState && !player.isSabotaged && !activePing) {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.95)';
      ctx.beginPath();
      ctx.roundRect(px - 65, py - r - 48, 130, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(player.botState, px, py - r - 35);
    }

    // Interaction Progress Bar
    if (player.isInteracting && player.interactProgress > 0) {
      const pbW = 44;
      const pbH = 6;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(px - pbW / 2, py - r - 34, pbW, pbH);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px - pbW / 2, py - r - 34, pbW * (player.interactProgress / 100), pbH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - pbW / 2, py - r - 34, pbW, pbH);
    }
  }

  updateAndDrawParticles(gameState) {
    const { ctx } = this;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  updateAndDrawFloatingTexts() {
    const { ctx } = this;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.02;

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.life;
      ctx.font = 'bold 13px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1.0;
    }
  }
}
