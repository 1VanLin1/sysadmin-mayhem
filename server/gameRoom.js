import { MAP_CONFIG, ZONES, INCIDENT_TEMPLATES, SHIFT_LEVELS, ABILITIES } from './constants.js';
import { db } from './db.js';

// Waypoints for navigation through indoor aisles and outdoor doorway
const INDOOR_WAYPOINTS = [
  { x: 80, y: 55 }, { x: 240, y: 55 }, { x: 410, y: 55 }, { x: 570, y: 55 }, { x: 750, y: 55 },
  { x: 80, y: 285 }, { x: 240, y: 285 }, { x: 410, y: 285 }, { x: 570, y: 285 }, { x: 750, y: 285 },
  { x: 80, y: 510 }, { x: 240, y: 510 }, { x: 410, y: 510 }, { x: 570, y: 510 }, { x: 750, y: 510 },
  { x: 860, y: 370 } // Doorway threshold between indoor and outdoor
];

const OUTDOOR_WAYPOINTS = [
  { x: 860, y: 370 }, // Doorway
  { x: 910, y: 170 }, { x: 910, y: 370 }, { x: 910, y: 570 },
  { x: 1130, y: 170 }, { x: 1130, y: 370 }, { x: 1130, y: 570 }
];

export class GameRoom {
  constructor(id, io, mode = 'coop') {
    this.id = id;
    this.io = io;
    this.mode = mode; // 'coop' or 'pvp'
    this.players = new Map();
    this.activeIncidents = [];
    this.sla = 100;
    this.gameTime = 180;
    this.status = 'lobby'; // 'lobby' | 'playing' | 'game_over'
    this.currentLevel = 1;
    this.levelRepairs = 0;
    this.workbenchState = { hasChassis: false, buildProgress: 0, hasServerReady: false };
    this.powerOnline = true;
    this.incidentCounter = 0;
    this.lastIncidentTime = 0;
    this.tickInterval = null;
  }

  addPlayer(socket, username, color, isBot = false, dbUsername = null) {
    if (isBot) {
      const existingBot = Array.from(this.players.values()).find((p) => p.isBot);
      if (existingBot) return existingBot;
    }

    const spawnPoints = [
      { x: 100, y: 280 },
      { x: 100, y: 360 },
      { x: 100, y: 440 },
      { x: 100, y: 200 }
    ];
    const spawn = spawnPoints[this.players.size % spawnPoints.length];

    const player = {
      id: socket ? socket.id : `bot_${Date.now()}`,
      socket,
      name: username || (isBot ? 'Васильич (Senior AI)' : `Админ_${this.players.size + 1}`),
      dbUsername: dbUsername || (isBot ? null : username),
      color: color || (isBot ? '#e11d48' : '#6366f1'),
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      activeTool: 'hdd',
      heldItem: null,
      score: 0,
      repairsCount: 0,
      coffeeUntil: 0,
      energyUntil: 0,
      sabotagedUntil: 0,
      cooldowns: { sprint: 0, overclock: 0, sabotage: 0 },
      isInteracting: false,
      interactProgress: 0,
      targetZoneId: null,
      isBot,
      botState: isBot ? 'Готов к работе!' : null
    };

    this.players.set(player.id, player);

    if (socket) {
      socket.join(this.id);
      this.bindSocketEvents(socket, player);
    }

    this.broadcastState();
    return player;
  }

  bindSocketEvents(socket, player) {
    socket.on('player_input', (input) => {
      if (this.status !== 'playing') return;

      let speed = MAP_CONFIG.baseSpeed;
      if (Date.now() < player.coffeeUntil) speed = MAP_CONFIG.coffeeSpeedBuff;
      if (Date.now() < player.sabotagedUntil) speed *= 0.5; // Sabotaged debuff!

      let dx = 0;
      let dy = 0;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      player.vx = dx * speed;
      player.vy = dy * speed;
    });

    socket.on('select_tool', ({ tool }) => {
      if (['hdd', 'extinguisher', 'cable', 'chassis', 'server'].includes(tool)) {
        player.activeTool = tool;
        this.broadcastState();
      }
    });

    // Use Ability with Cooldown
    socket.on('use_ability', ({ ability }) => {
      if (this.status !== 'playing') return;
      const now = Date.now();

      if (ability === 'sprint' && now >= (player.cooldowns.sprint || 0)) {
        player.coffeeUntil = now + 6000;
        player.cooldowns.sprint = now + 18000;
        this.io.to(this.id).emit('sound_event', { sound: 'coffee', x: player.x, y: player.y });
        this.io.to(this.id).emit('floating_text', {
          text: '⚡ ТУРБО-СПРИНТ: +60% СКОРОСТЬ!',
          color: '#f59e0b',
          x: player.x,
          y: player.y - 20
        });
        this.broadcastState();
      } else if (ability === 'overclock' && now >= (player.cooldowns.overclock || 0)) {
        player.energyUntil = now + 6000;
        player.cooldowns.overclock = now + 25000;
        this.io.to(this.id).emit('sound_event', { sound: 'coffee', x: player.x, y: player.y });
        this.io.to(this.id).emit('floating_text', {
          text: '🔋 ОВЕРКЛОК: 2.5x СКОРОСТЬ РЕМОНТА!',
          color: '#10b981',
          x: player.x,
          y: player.y - 20
        });
        this.broadcastState();
      } else if (ability === 'sabotage' && this.mode === 'pvp' && now >= (player.cooldowns.sabotage || 0)) {
        player.cooldowns.sabotage = now + 35000;
        // Find opponent in PvP
        for (const opp of this.players.values()) {
          if (opp.id !== player.id) {
            opp.sabotagedUntil = now + 4000;
            this.io.to(this.id).emit('sound_event', { sound: 'alarm', x: opp.x, y: opp.y });
            this.io.to(this.id).emit('floating_text', {
              text: '💣 САБОТАЖ! ВАС ЗАМЕДЛИЛИ!',
              color: '#ef4444',
              x: opp.x,
              y: opp.y - 25
            });
          }
        }
        this.io.to(this.id).emit('floating_text', {
          text: '💣 САБОТАЖ АКТИВИРОВАН!',
          color: '#e11d48',
          x: player.x,
          y: player.y - 20
        });
        this.broadcastState();
      }
    });

    socket.on('interact_start', () => {
      if (this.status !== 'playing') return;
      this.handlePlayerInteractStart(player);
    });

    socket.on('interact_stop', () => {
      this.handlePlayerInteractStop(player);
    });

    socket.on('drop_item', () => {
      if (this.status !== 'playing') return;
      player.heldItem = null;
      this.io.to(this.id).emit('sound_event', { sound: 'drop', x: player.x, y: player.y });
      this.broadcastState();
    });

    socket.on('terminal_action', ({ command }) => {
      if (this.status !== 'playing') return;
      this.handleTerminalCommand(player, command);
    });

    socket.on('surrender_pvp', () => {
      if (this.mode !== 'pvp' || this.status !== 'playing') return;
      const opponent = Array.from(this.players.values()).find((p) => p.id !== player.id);
      this.io.to(this.id).emit('floating_text', {
        text: `🏳️ ${player.name} сдался! Победа ${opponent ? opponent.name : 'соперника'}!`,
        color: '#f59e0b',
        x: player.x,
        y: player.y - 30
      });
      this.endGame('surrender', opponent || null);
    });

    socket.on('request_coop_exit', () => {
      if (this.status !== 'playing') return;
      const humanPlayers = Array.from(this.players.values()).filter((p) => !p.isBot);
      if (humanPlayers.length <= 1) {
        // Solo player or playing with bot: exit immediately!
        this.io.to(this.id).emit('floating_text', {
          text: '🚪 Смена досрочно завершена!',
          color: '#f59e0b',
          x: player.x,
          y: player.y - 20
        });
        this.endGame('solo_exit');
      } else {
        // Multi-player co-op: ask teammate to confirm
        this.pendingCoopExit = { initiatorId: player.id, initiatorName: player.name };
        this.io.to(this.id).emit('coop_exit_vote_prompt', {
          initiatorId: player.id,
          initiatorName: player.name
        });
      }
    });

    socket.on('respond_coop_exit', ({ accept }) => {
      if (!this.pendingCoopExit) return;
      if (accept) {
        this.io.to(this.id).emit('coop_exit_approved');
        this.endGame('coop_agreed_exit');
      } else {
        this.io.to(this.id).emit('coop_exit_declined', {
          respondentName: player.name
        });
      }
      this.pendingCoopExit = null;
    });

    socket.on('start_game', () => {
      if (this.status === 'lobby' || this.status === 'game_over') {
        this.startGame();
      }
    });

    socket.on('leave_game', () => {
      this.players.delete(player.id);
      socket.leave(this.id);
      socket.emit('left_room');
      if (this.players.size === 0) {
        this.stopGame();
      } else {
        this.broadcastState();
      }
    });

    socket.on('disconnect', () => {
      this.players.delete(player.id);
      if (this.players.size === 0) {
        this.stopGame();
      } else {
        this.broadcastState();
      }
    });
  }

  startGame() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.status = 'playing';
    this.gameTime = 180;
    this.sla = 100;
    this.currentLevel = 1;
    this.levelRepairs = 0;
    this.activeIncidents = [];
    this.workbenchState = { hasChassis: false, buildProgress: 0, hasServerReady: false };
    this.powerOnline = true;

    for (const player of this.players.values()) {
      player.score = 0;
      player.repairsCount = 0;
      player.activeTool = 'hdd';
      player.heldItem = null;
      player.coffeeUntil = 0;
      player.energyUntil = 0;
      player.sabotagedUntil = 0;
      player.cooldowns = { sprint: 0, overclock: 0, sabotage: 0 };
      player.interactProgress = 0;
      player.isInteracting = false;
    }

    // Spawn 1 indoor incident and 1 outdoor incident right at start
    this.spawnIncident();
    setTimeout(() => this.spawnIncident(true), 2500);

    // 25 FPS Game Loop
    this.tickInterval = setInterval(() => {
      this.gameTick();
    }, 40);

    this.io.to(this.id).emit('game_started', {
      gameTime: this.gameTime,
      mode: this.mode,
      level: this.currentLevel
    });
  }

  stopGame() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.status = 'game_over';
  }

  resetRoom() {
    this.stopGame();
    this.status = 'lobby';
    this.gameTime = 180;
    this.sla = 100;
    this.currentLevel = 1;
    this.levelRepairs = 0;
    this.activeIncidents = [];
    this.pendingCoopExit = null;
    this.workbenchState = { hasChassis: false, buildProgress: 0, hasServerReady: false };
    this.powerOnline = true;
    for (const player of this.players.values()) {
      player.score = 0;
      player.repairsCount = 0;
      player.isInteracting = false;
      player.interactProgress = 0;
      player.targetZoneId = null;
      player.cooldowns = { sprint: 0, overclock: 0, sabotage: 0 };
    }
  }

  gameTick() {
    // 1. Move players and bot
    for (const player of this.players.values()) {
      if (player.isBot) {
        this.updateAutonomousVasilich(player);
      }

      this.movePlayerWithCollision(player);

      if (player.isInteracting && player.targetZoneId) {
        this.progressPlayerInteraction(player);
      }
    }

    // 2. Incident SLA drain
    if (this.activeIncidents.length > 0) {
      let activeSeverity = this.activeIncidents.length;
      if (!this.powerOnline) activeSeverity += 1.5;
      
      this.sla = Math.max(0, this.sla - (activeSeverity * 0.006));

      if (this.mode === 'coop' && this.sla <= 0) {
        this.endGame('sla_failed');
        return;
      }
    }

    // 3. Periodic incident spawner (both indoor & outdoor)
    this.lastIncidentTime += 0.04;
    const spawnInterval = Math.max(6, 12 - this.currentLevel * 1.8);

    if (this.lastIncidentTime >= spawnInterval && this.activeIncidents.length < (3 + this.currentLevel)) {
      this.spawnIncident();
      this.lastIncidentTime = 0;
    }

    // 4. Timer
    this.gameTime -= 0.04;
    if (this.gameTime <= 0) {
      this.endGame('time_out');
      return;
    }

    this.broadcastState();
  }

  movePlayerWithCollision(player) {
    let nextX = player.x + player.vx;
    let nextY = player.y + player.vy;
    const r = MAP_CONFIG.playerRadius;

    // Boundaries of entire complex (Indoor + Outdoor)
    const minX = MAP_CONFIG.wallThickness + r;
    const maxX = MAP_CONFIG.width - MAP_CONFIG.wallThickness - r;
    const minY = MAP_CONFIG.wallThickness + r;
    const maxY = MAP_CONFIG.height - MAP_CONFIG.wallThickness - r;

    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));

    // Dividing Wall between Indoor and Outdoor (x: 860) with Doorway at y: 300..440
    const wallX = MAP_CONFIG.outdoorStartX;
    const isDoorway = nextY >= 300 && nextY <= 440;

    if (!isDoorway) {
      // Top dividing wall (y: 0..300)
      if (player.x <= wallX - r && nextX > wallX - r && nextY < 300) nextX = player.x;
      if (player.x >= wallX + r && nextX < wallX + r && nextY < 300) nextX = player.x;

      // Bottom dividing wall (y: 440..720)
      if (player.x <= wallX - r && nextX > wallX - r && nextY > 440) nextX = player.x;
      if (player.x >= wallX + r && nextX < wallX + r && nextY > 440) nextX = player.x;
    }

    // Obstacle collision (Racks, Desks, Chiller, Generator, Satellite)
    for (const zone of ZONES) {
      if (
        nextX + r > zone.x &&
        nextX - r < zone.x + zone.w &&
        nextY + r > zone.y &&
        nextY - r < zone.y + zone.h
      ) {
        const prevCollidesX = player.x + r > zone.x && player.x - r < zone.x + zone.w;
        const prevCollidesY = player.y + r > zone.y && player.y - r < zone.y + zone.h;

        if (!prevCollidesX) nextX = player.x;
        if (!prevCollidesY) nextY = player.y;
      }
    }

    player.x = nextX;
    player.y = nextY;
  }

  getNearestZone(player) {
    let nearest = null;
    let minDist = 58; // reach distance from edge of zone
    for (const zone of ZONES) {
      const closestX = Math.max(zone.x, Math.min(player.x, zone.x + zone.w));
      const closestY = Math.max(zone.y, Math.min(player.y, zone.y + zone.h));
      const dist = Math.hypot(player.x - closestX, player.y - closestY);
      if (dist < minDist) {
        minDist = dist;
        nearest = zone;
      }
    }
    return nearest;
  }

  handlePlayerInteractStart(player) {
    const zone = this.getNearestZone(player);
    if (!zone) return;

    // Workbench
    if (zone.type === 'workbench') {
      if (!this.workbenchState.hasChassis && !this.workbenchState.hasServerReady) {
        this.workbenchState.hasChassis = true;
        this.workbenchState.buildProgress = 0;
        this.io.to(this.id).emit('sound_event', { sound: 'place', x: zone.x, y: zone.y });
        this.io.to(this.id).emit('floating_text', {
          text: '📦 Шасси на верстаке! Зажмите [E] для сборки.',
          color: '#eab308',
          x: zone.x,
          y: zone.y - 20
        });
        return;
      }

      if (this.workbenchState.hasServerReady && !player.heldItem) {
        player.heldItem = 'server';
        player.activeTool = 'server';
        this.workbenchState.hasServerReady = false;
        this.io.to(this.id).emit('sound_event', { sound: 'pickup', x: zone.x, y: zone.y });
        this.io.to(this.id).emit('floating_text', {
          text: '🚀 Сервер взят! Несите в стойку D1.',
          color: '#10b981',
          x: player.x,
          y: player.y - 20
        });
        return;
      }

      if (this.workbenchState.hasChassis && !this.workbenchState.hasServerReady) {
        if (player.isInteracting && player.targetZoneId === zone.id) return;
        player.isInteracting = true;
        player.targetZoneId = zone.id;
        player.interactProgress = this.workbenchState.buildProgress;
        return;
      }
    }

    // NOC Terminal
    if (zone.type === 'terminal') {
      const ddosIncident = this.activeIncidents.find((inc) => inc.type === 'ddos_attack');
      if (player.socket) {
        player.socket.emit('open_terminal', {
          hasDdos: !!ddosIncident,
          incidentId: ddosIncident ? ddosIncident.id : null
        });
      }
      return;
    }

    // Active Incident interaction (Both Indoor and Outdoor!)
    const incident = this.activeIncidents.find((inc) => inc.targetZoneId === zone.id);
    if (incident) {
      if (incident.requiredItem && incident.requiredItem !== 'server') {
        player.activeTool = incident.requiredItem; // auto-equip right tool
      }

      if (incident.requiredItem === 'server' && player.heldItem !== 'server') {
        this.io.to(this.id).emit('floating_text', {
          text: '❌ Соберите сервер на верстаке и принесите сюда!',
          color: '#ef4444',
          x: player.x,
          y: player.y - 20
        });
        return;
      }

      if (player.isInteracting && player.targetZoneId === zone.id) return;

      player.isInteracting = true;
      player.targetZoneId = zone.id;
      player.interactProgress = 0;
      this.io.to(this.id).emit('sound_event', { sound: 'repairing', x: zone.x, y: zone.y });
    }
  }

  handlePlayerInteractStop(player) {
    player.isInteracting = false;
    player.interactProgress = 0;
    player.targetZoneId = null;
  }

  progressPlayerInteraction(player) {
    const zone = ZONES.find((z) => z.id === player.targetZoneId);
    if (!zone) {
      this.handlePlayerInteractStop(player);
      return;
    }

    const closestX = Math.max(zone.x, Math.min(player.x, zone.x + zone.w));
    const closestY = Math.max(zone.y, Math.min(player.y, zone.y + zone.h));
    const dist = Math.hypot(player.x - closestX, player.y - closestY);
    if (dist > 75) {
      this.handlePlayerInteractStop(player);
      return;
    }

    const speedMultiplier = Date.now() < player.energyUntil ? 2.5 : 1.0;

    // Workbench assembly
    if (zone.type === 'workbench' && this.workbenchState.hasChassis) {
      player.interactProgress += 2.8 * speedMultiplier;
      this.workbenchState.buildProgress = player.interactProgress;

      if (player.interactProgress >= 100) {
        this.workbenchState.hasChassis = false;
        this.workbenchState.hasServerReady = true;
        this.workbenchState.buildProgress = 0;
        this.handlePlayerInteractStop(player);
        this.io.to(this.id).emit('sound_event', { sound: 'build_done', x: zone.x, y: zone.y });
        this.io.to(this.id).emit('floating_text', {
          text: '✅ Сервер собран! Заберите его с верстака.',
          color: '#10b981',
          x: zone.x,
          y: zone.y - 20
        });
      }
      return;
    }

    // Incident repair
    const incidentIndex = this.activeIncidents.findIndex((inc) => inc.targetZoneId === zone.id);
    if (incidentIndex !== -1) {
      const incident = this.activeIncidents[incidentIndex];
      player.interactProgress += 2.6 * speedMultiplier;

      if (player.interactProgress >= 100) {
        this.activeIncidents.splice(incidentIndex, 1);
        player.score += incident.points;
        player.repairsCount += 1;
        this.levelRepairs += 1;
        this.sla = Math.min(100, this.sla + 15);

        if (incident.requiredItem === 'server') {
          player.heldItem = null;
          player.activeTool = 'hdd';
        }

        if (incident.type === 'power_trip') {
          this.powerOnline = true;
        }

        this.handlePlayerInteractStop(player);

        this.io.to(this.id).emit('sound_event', { sound: 'success', x: zone.x, y: zone.y });
        this.io.to(this.id).emit('incident_resolved', {
          incidentId: incident.id,
          resolvedBy: player.name,
          points: incident.points
        });
        this.io.to(this.id).emit('floating_text', {
          text: `+${incident.points} XP! Авария устранена!`,
          color: '#22c55e',
          x: player.x,
          y: player.y - 25
        });

        this.checkLevelProgression();
      }
    }
  }

  checkLevelProgression() {
    const curConfig = SHIFT_LEVELS.find((l) => l.level === this.currentLevel);
    if (curConfig && this.levelRepairs >= curConfig.targetRepairs && this.currentLevel < SHIFT_LEVELS.length) {
      this.currentLevel += 1;
      this.levelRepairs = 0;
      this.sla = 100;

      const nextConfig = SHIFT_LEVELS.find((l) => l.level === this.currentLevel);
      this.io.to(this.id).emit('sound_event', { sound: 'success', x: 600, y: 360 });
      this.io.to(this.id).emit('level_up', {
        level: this.currentLevel,
        name: nextConfig.name,
        desc: nextConfig.desc
      });
      this.io.to(this.id).emit('floating_text', {
        text: `🎉 ПОВЫШЕНИЕ! ${nextConfig.badge}`,
        color: '#f59e0b',
        x: 600,
        y: 200
      });
    }
  }

  handleTerminalCommand(player, command) {
    const cmd = (command || '').trim().toLowerCase();
    const ddosIdx = this.activeIncidents.findIndex((inc) => inc.type === 'ddos_attack');

    if (ddosIdx !== -1 && (cmd.includes('kill') || cmd.includes('iptables') || cmd.includes('block') || cmd.includes('mitigate'))) {
      const incident = this.activeIncidents[ddosIdx];
      this.activeIncidents.splice(ddosIdx, 1);
      player.score += incident.points;
      player.repairsCount += 1;
      this.levelRepairs += 1;
      this.sla = Math.min(100, this.sla + 20);

      this.io.to(this.id).emit('sound_event', { sound: 'success', x: 650, y: 550 });
      this.io.to(this.id).emit('incident_resolved', {
        incidentId: incident.id,
        resolvedBy: player.name,
        points: incident.points
      });
      this.io.to(this.id).emit('floating_text', {
        text: `+${incident.points} XP! DDoS атака отражена!`,
        color: '#22c55e',
        x: player.x,
        y: player.y - 25
      });

      this.checkLevelProgression();
    }
  }

  spawnIncident(forceOutdoor = false) {
    let pool = INCIDENT_TEMPLATES;
    if (forceOutdoor) {
      pool = INCIDENT_TEMPLATES.filter((t) => t.isOutdoor);
    }

    const template = pool[Math.floor(Math.random() * pool.length)];

    let targetZone = null;
    if (template.targetId) {
      targetZone = ZONES.find((z) => z.id === template.targetId);
    } else {
      const racks = ZONES.filter((z) => z.type === 'rack' && !this.activeIncidents.some((inc) => inc.targetZoneId === z.id));
      if (racks.length > 0) {
        targetZone = racks[Math.floor(Math.random() * racks.length)];
      }
    }

    if (!targetZone) return;

    if (template.type === 'power_trip') {
      this.powerOnline = false;
    }

    this.incidentCounter += 1;
    const incident = {
      id: `inc_${this.incidentCounter}`,
      type: template.type,
      title: template.title,
      desc: template.desc.replace('{target}', targetZone.label),
      targetZoneId: targetZone.id,
      targetZoneLabel: targetZone.label,
      targetX: targetZone.x + targetZone.w / 2,
      targetY: targetZone.y + targetZone.h / 2,
      requiredItem: template.requiredItem,
      points: template.points,
      icon: template.icon,
      isOutdoor: !!template.isOutdoor,
      createdAt: Date.now()
    };

    this.activeIncidents.push(incident);

    this.io.to(this.id).emit('sound_event', { sound: 'alarm', x: incident.targetX, y: incident.targetY });
    this.io.to(this.id).emit('incident_spawned', incident);
  }

  // --- SMART ВАСИЛЬИЧ 3.0 (Guaranteed Task Resolution & Indoor/Outdoor Doorway Navigation) ---
  updateAutonomousVasilich(bot) {
    if (this.activeIncidents.length === 0) {
      bot.vx = 0;
      bot.vy = 0;
      bot.botState = 'Все системы в норме ☕';
      bot.isInteracting = false;
      return;
    }

    // In Co-op mode, pick incident that is NOT currently being fixed by a human player
    const humanPlayers = Array.from(this.players.values()).filter((p) => !p.isBot);
    let targetIncident = null;

    for (const inc of this.activeIncidents) {
      const isTaken = humanPlayers.some((hp) => hp.targetZoneId === inc.targetZoneId && hp.isInteracting);
      if (!isTaken) {
        targetIncident = inc;
        break;
      }
    }
    if (!targetIncident) targetIncident = this.activeIncidents[0];

    const targetZone = ZONES.find((z) => z.id === targetIncident.targetZoneId);
    if (!targetZone) return;

    // Auto-equip the right tool for the incident
    if (targetIncident.requiredItem) {
      bot.activeTool = targetIncident.requiredItem;
    }

    // Calculate closest reachable point on zone border (outside its solid collision box)
    const closestX = Math.max(targetZone.x, Math.min(bot.x, targetZone.x + targetZone.w));
    const closestY = Math.max(targetZone.y, Math.min(bot.y, targetZone.y + targetZone.h));
    const distToZone = Math.hypot(bot.x - closestX, bot.y - closestY);

    // If within reach (55px) of zone edge: LOCK IN AND REPAIR WITH BALANCED SPEED
    if (distToZone <= 55) {
      bot.vx = 0;
      bot.vy = 0;

      // Small reaction delay (6 ticks = 0.24s) so human player has priority
      if (!bot.inspectTicks) bot.inspectTicks = 0;
      if (bot.inspectTicks < 6) {
        bot.inspectTicks += 1;
        bot.botState = `🔍 Осматривает ${targetIncident.targetZoneLabel}...`;
        return;
      }

      bot.botState = `🛠️ Чинит ${targetIncident.targetZoneLabel}...`;

      if (targetIncident.type === 'ddos_attack') {
        bot.inspectTicks = 0;
        this.handleTerminalCommand(bot, 'kill -9 666');
      } else {
        if (!bot.isInteracting) {
          bot.isInteracting = true;
          bot.targetZoneId = targetIncident.targetZoneId;
          bot.interactProgress = 0;
        }
        // Advance repair progress balanced: 2.0 per tick (Human base is 2.6, with overclock 6.5)
        bot.interactProgress += 2.0;

        if (bot.interactProgress >= 100) {
          bot.inspectTicks = 0;
          const idx = this.activeIncidents.findIndex((inc) => inc.id === targetIncident.id);
          if (idx !== -1) {
            this.activeIncidents.splice(idx, 1);
            bot.score += targetIncident.points;
            bot.repairsCount += 1;
            this.levelRepairs += 1;
            this.sla = Math.min(100, this.sla + 15);
            bot.isInteracting = false;
            bot.interactProgress = 0;
            bot.targetZoneId = null;

            this.io.to(this.id).emit('sound_event', { sound: 'success', x: bot.x, y: bot.y });
            this.io.to(this.id).emit('incident_resolved', {
              incidentId: targetIncident.id,
              resolvedBy: bot.name,
              points: targetIncident.points
            });
            this.io.to(this.id).emit('floating_text', {
              text: `+${targetIncident.points} XP! Васильич починил ${targetIncident.targetZoneLabel}!`,
              color: '#10b981',
              x: bot.x,
              y: bot.y - 25
            });
            this.checkLevelProgression();
          }
        }
      }
      return;
    }

    // Reset inspect ticks if moving
    bot.inspectTicks = 0;

    // Navigation logic:
    bot.isInteracting = false;
    bot.botState = `🏃 Спешит к ${targetIncident.targetZoneLabel}`;
    const speed = MAP_CONFIG.baseSpeed * 0.95;

    // Check if transition between indoor and outdoor is needed
    const botIsIndoor = bot.x < MAP_CONFIG.outdoorStartX;
    const targetIsIndoor = targetZone.x < MAP_CONFIG.outdoorStartX;

    let targetWaypointX = closestX;
    let targetWaypointY = closestY;

    if (botIsIndoor !== targetIsIndoor) {
      // Must pass through the Doorway at (x: 860, y: 370)
      const distToDoor = Math.hypot(860 - bot.x, 370 - bot.y);
      if (distToDoor > 30) {
        targetWaypointX = 860;
        targetWaypointY = 370;
      }
    }

    // Direct angle navigation towards target waypoint
    const angle = Math.atan2(targetWaypointY - bot.y, targetWaypointX - bot.x);
    bot.vx = Math.cos(angle) * speed;
    bot.vy = Math.sin(angle) * speed;
  }

  endGame(reason, customWinner = null) {
    this.stopGame();

    const sortedPlayers = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
    const winner = customWinner || sortedPlayers[0] || null;

    // Record stats to persistent DB for registered players
    for (const p of this.players.values()) {
      if (!p.isBot) {
        const isWin = winner && winner.id === p.id;
        db.updateStats(p.dbUsername || p.name, p.score, p.repairsCount, isWin);
      }
    }

    this.io.to(this.id).emit('game_over', {
      reason,
      winner: winner ? { id: winner.id, name: winner.name, color: winner.color, score: winner.score } : null,
      leaderboard: sortedPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: p.score,
        repairsCount: p.repairsCount
      })),
      finalSla: Math.round(this.sla),
      finalLevel: this.currentLevel,
      mode: this.mode
    });
  }

  broadcastState() {
    this.io.to(this.id).emit('game_state', {
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: Math.round(p.x),
        y: Math.round(p.y),
        activeTool: p.activeTool,
        heldItem: p.heldItem,
        score: p.score,
        hasCoffeeBoost: Date.now() < p.coffeeUntil,
        hasEnergyBoost: Date.now() < p.energyUntil,
        isSabotaged: Date.now() < p.sabotagedUntil,
        cooldowns: p.cooldowns || { sprint: 0, overclock: 0, sabotage: 0 },
        isInteracting: p.isInteracting,
        interactProgress: Math.round(p.interactProgress),
        isBot: p.isBot,
        botState: p.botState
      })),
      activeIncidents: this.activeIncidents,
      sla: Math.round(this.sla),
      gameTime: Math.max(0, Math.round(this.gameTime)),
      powerOnline: this.powerOnline,
      currentLevel: this.currentLevel,
      levelRepairs: this.levelRepairs,
      targetRepairs: (SHIFT_LEVELS.find((l) => l.level === this.currentLevel) || SHIFT_LEVELS[0]).targetRepairs,
      workbenchState: this.workbenchState,
      status: this.status
    });
  }
}
