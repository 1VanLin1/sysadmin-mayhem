import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { GameRenderer } from './game/renderer';
import { MAP_CONFIG } from './game/constants';
import { simulateMovement, isPlayerOnCoolant } from './game/physics';
import { HUD } from './components/HUD';
import { Lobby } from './components/Lobby';
import { NocTerminalModal } from './components/NocTerminalModal';
import { GameOverModal } from './components/GameOverModal';
import { QuickPingWheel } from './components/QuickPingWheel';
import { MinigameModal } from './components/MinigameModal';
import { audio } from './game/audio';

export default function App() {
  const [screen, setScreen] = useState('lobby'); // 'lobby' | 'game'
  const [gameState, setGameState] = useState({
    players: [],
    activeIncidents: [],
    sla: 100,
    gameTime: 180,
    powerOnline: true,
    workbenchState: null,
    status: 'lobby'
  });
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [mode, setMode] = useState('pvp');
  const [isMuted, setIsMuted] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalDdos, setTerminalDdos] = useState(false);
  const [terminalRansomware, setTerminalRansomware] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [coopExitPrompt, setCoopExitPrompt] = useState(null);
  const [showPingWheel, setShowPingWheel] = useState(false);
  const [quickPings, setQuickPings] = useState([]);
  const [minigameIncident, setMinigameIncident] = useState(null);
  const [ping, setPing] = useState(24);

  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  const interactPressedRef = useRef(false);
  const localPosRef = useRef({ x: 100, y: 280, initialized: false });
  const momentumRef = useRef({ vx: 0, vy: 0 });
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const quickPingsRef = useRef(quickPings);
  quickPingsRef.current = quickPings;

  // 1. Initialize Socket.IO
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setMyPlayerId(socket.id);
    });

    socket.on('joined_room', ({ roomId, playerId, mode, roomStatus }) => {
      setMyPlayerId(playerId);
      setMode(mode);
      setScreen('game');
      setGameOverData(null);
      localPosRef.current.initialized = false;
      if (roomStatus !== 'playing') {
        socket.emit('start_game');
      }
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('pong_check', (data) => {
      if (data && data.time) {
        const rtt = Math.max(1, Date.now() - data.time);
        setPing(rtt);
      }
    });

    socket.on('player_quick_ping', (pingData) => {
      setQuickPings((prev) => [...prev.filter((p) => Date.now() - p.createdAt < 4000), pingData]);
      audio.playSuccess();
    });

    socket.on('sound_event', ({ sound }) => {
      if (sound === 'pickup') audio.playPickup();
      if (sound === 'drop') audio.playDrop();
      if (sound === 'alarm') audio.playAlarm();
      if (sound === 'repairing') audio.playRepair();
      if (sound === 'success') audio.playSuccess();
      if (sound === 'coffee') audio.playCoffee();
    });

    socket.on('floating_text', ({ text, color, x, y }) => {
      if (rendererRef.current) {
        rendererRef.current.addFloatingText(text, color, x, y);
      }
    });

    socket.on('open_terminal', ({ hasDdos, hasRansomware }) => {
      setTerminalDdos(hasDdos);
      setTerminalRansomware(hasRansomware);
      setTerminalOpen(true);
    });

    socket.on('game_over', (data) => {
      setGameOverData(data);
      setCoopExitPrompt(null);
    });

    socket.on('coop_exit_vote_prompt', (prompt) => {
      if (prompt.initiatorId !== socket.id) {
        setCoopExitPrompt(prompt);
      }
    });

    socket.on('coop_exit_approved', () => {
      setCoopExitPrompt(null);
    });

    socket.on('coop_exit_declined', ({ respondentName }) => {
      setCoopExitPrompt(null);
      if (rendererRef.current) {
        rendererRef.current.addFloatingText(`${respondentName || 'Напарник'} отклонил выход!`, '#f59e0b', 600, 300);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Periodic Ping measurement (every 2.5s)
  useEffect(() => {
    if (screen !== 'game') return;
    const interval = setInterval(() => {
      socketRef.current?.emit('ping_check', { time: Date.now() });
    }, 2500);
    return () => clearInterval(interval);
  }, [screen]);

  // Clean expired quick pings
  useEffect(() => {
    if (quickPings.length === 0) return;
    const cleanup = setInterval(() => {
      const now = Date.now();
      setQuickPings((prev) => prev.filter((p) => now - p.createdAt < 4000));
    }, 1000);
    return () => clearInterval(cleanup);
  }, [quickPings.length]);

  // 2. Keyboard Controls (Supports both English and Russian keyboard layouts)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (screen !== 'game' || terminalOpen) return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';
      let changed = false;

      // QUICK PING WHEEL: KeyG, 'g', 'п'
      if (code === 'KeyG' || key === 'g' || key === 'п') {
        setShowPingWheel((prev) => !prev);
        return;
      }

      // UP: KeyW, ArrowUp, 'w', 'ц'
      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'ц') {
        inputRef.current.up = true;
        changed = true;
      }
      // DOWN: KeyS, ArrowDown, 's', 'ы'
      if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'ы') {
        inputRef.current.down = true;
        changed = true;
      }
      // LEFT: KeyA, ArrowLeft, 'a', 'ф'
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'ф') {
        inputRef.current.left = true;
        changed = true;
      }
      // RIGHT: KeyD, ArrowRight, 'd', 'в'
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'в') {
        inputRef.current.right = true;
        changed = true;
      }

      // INTERACT: KeyE, Space, 'e', 'у', ' '
      if (code === 'KeyE' || code === 'Space' || key === 'e' || key === 'у' || key === ' ') {
        e.preventDefault();
        if (!interactPressedRef.current) {
          interactPressedRef.current = true;
          socketRef.current?.emit('interact_start');
        }
      }

      // DROP: KeyQ, 'q', 'й'
      if (code === 'KeyQ' || key === 'q' || key === 'й') {
        socketRef.current?.emit('drop_item');
      }

      // TOOLBELT HOTKEYS 1-5:
      if (code === 'Digit1' || key === '1') socketRef.current?.emit('select_tool', { tool: 'hdd' });
      if (code === 'Digit2' || key === '2') socketRef.current?.emit('select_tool', { tool: 'extinguisher' });
      if (code === 'Digit3' || key === '3') socketRef.current?.emit('select_tool', { tool: 'cable' });
      if (code === 'Digit4' || key === '4') socketRef.current?.emit('select_tool', { tool: 'chassis' });
      if (code === 'Digit5' || key === '5') socketRef.current?.emit('select_tool', { tool: 'server' });

      // ACTIVE ABILITIES HOTKEYS R, F, C (EN & RU layouts):
      if (code === 'KeyR' || key === 'r' || key === 'к') {
        socketRef.current?.emit('use_ability', { ability: 'sprint' });
      }
      if (code === 'KeyF' || key === 'f' || key === 'а') {
        socketRef.current?.emit('use_ability', { ability: 'overclock' });
      }
      if (code === 'KeyC' || key === 'c' || key === 'с') {
        socketRef.current?.emit('use_ability', { ability: 'sabotage' });
      }

      // FAST MINIGAME HOTKEY M:
      if (code === 'KeyM' || key === 'm' || key === 'ь') {
        const curPos = localPosRef.current;
        const inc = gameStateRef.current.activeIncidents?.find((i) => {
          return Math.hypot(curPos.x - i.targetX, curPos.y - i.targetY) <= 85;
        });
        if (inc) {
          setMinigameIncident(inc);
        }
      }

      if (changed) {
        socketRef.current?.emit('player_input', inputRef.current);
      }
    };

    const handleKeyUp = (e) => {
      if (screen !== 'game') return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';
      let changed = false;

      // UP: KeyW, ArrowUp, 'w', 'ц'
      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'ц') {
        inputRef.current.up = false;
        changed = true;
      }
      // DOWN: KeyS, ArrowDown, 's', 'ы'
      if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'ы') {
        inputRef.current.down = false;
        changed = true;
      }
      // LEFT: KeyA, ArrowLeft, 'a', 'ф'
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'ф') {
        inputRef.current.left = false;
        changed = true;
      }
      // RIGHT: KeyD, ArrowRight, 'd', 'в'
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'в') {
        inputRef.current.right = false;
        changed = true;
      }

      // INTERACT STOP: KeyE, Space, 'e', 'у', ' '
      if (code === 'KeyE' || code === 'Space' || key === 'e' || key === 'у' || key === ' ') {
        interactPressedRef.current = false;
        socketRef.current?.emit('interact_stop');
      }

      if (changed) {
        socketRef.current?.emit('player_input', inputRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen, terminalOpen]);

  // 3. Setup Canvas Renderer and 60FPS Render Loop with Client-Side Prediction & Entity Interpolation
  useEffect(() => {
    if (screen !== 'game' || !canvasRef.current) return;

    rendererRef.current = new GameRenderer(canvasRef.current);

    let animId;
    let lastFrameTime = performance.now();
    let lastMoveSend = 0;

    const renderLoop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const currentGS = gameStateRef.current;
      const myPlayer = currentGS.players?.find((p) => p.id === myPlayerId);

      if (myPlayer) {
        if (!localPosRef.current.initialized) {
          localPosRef.current = { x: myPlayer.x, y: myPlayer.y, initialized: true };
        }

        // --- CLIENT-SIDE PREDICTION WITH FRAME-INDEPENDENT DELTA TIME ---
        let speedMultiplier = 1;
        if (myPlayer.adminClass === 'netops') speedMultiplier *= 1.15;
        if (myPlayer.hasCoffeeBoost) speedMultiplier *= (MAP_CONFIG.coffeeSpeedBuff / MAP_CONFIG.baseSpeed);
        if (myPlayer.isSabotaged) speedMultiplier *= 0.5;

        let dx = 0;
        let dy = 0;
        if (inputRef.current.left) dx -= 1;
        if (inputRef.current.right) dx += 1;
        if (inputRef.current.up) dy -= 1;
        if (inputRef.current.down) dy += 1;

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        const isMoving = dx !== 0 || dy !== 0;
        const onCoolant = isPlayerOnCoolant(localPosRef.current.x, localPosRef.current.y, currentGS.activeIncidents);
        const pixelsPerSec = MAP_CONFIG.baseSpeed * 25 * speedMultiplier;

        let moveDistX = 0;
        let moveDistY = 0;

        if (isMoving) {
          const rawMoveX = dx * pixelsPerSec * dt;
          const rawMoveY = dy * pixelsPerSec * dt;

          if (onCoolant) {
            momentumRef.current.vx = momentumRef.current.vx * 0.92 + rawMoveX * 0.08;
            momentumRef.current.vy = momentumRef.current.vy * 0.92 + rawMoveY * 0.08;
            moveDistX = rawMoveX * 0.45 + momentumRef.current.vx * 0.55;
            moveDistY = rawMoveY * 0.45 + momentumRef.current.vy * 0.55;
          } else {
            momentumRef.current.vx = 0;
            momentumRef.current.vy = 0;
            moveDistX = rawMoveX;
            moveDistY = rawMoveY;
          }
        } else if (onCoolant && (Math.abs(momentumRef.current.vx) > 0.05 || Math.abs(momentumRef.current.vy) > 0.05)) {
          // Sliding on ice when keys are released!
          moveDistX = momentumRef.current.vx;
          moveDistY = momentumRef.current.vy;
          momentumRef.current.vx *= 0.94;
          momentumRef.current.vy *= 0.94;
        }

        if (moveDistX !== 0 || moveDistY !== 0) {
          const next = simulateMovement(localPosRef.current.x, localPosRef.current.y, moveDistX, moveDistY);
          localPosRef.current.x = next.x;
          localPosRef.current.y = next.y;

          // Stream client position to server at ~30Hz for responsive sync
          if (now - lastMoveSend >= 33 && socketRef.current) {
            lastMoveSend = now;
            socketRef.current.emit('player_move', {
              x: localPosRef.current.x,
              y: localPosRef.current.y,
              vx: dx * MAP_CONFIG.baseSpeed * speedMultiplier,
              vy: dy * MAP_CONFIG.baseSpeed * speedMultiplier
            });
          }
        }

        // Reconciliation with authoritative server position
        const errX = myPlayer.x - localPosRef.current.x;
        const errY = myPlayer.y - localPosRef.current.y;
        const distErr = Math.hypot(errX, errY);

        if (distErr > 70) {
          // Hard snap only on huge discrepancy (e.g., teleport, respawn, map reset)
          localPosRef.current.x = myPlayer.x;
          localPosRef.current.y = myPlayer.y;
        } else if (!isMoving && distErr > 1) {
          // Smoothly settle to rest position when not moving
          localPosRef.current.x += errX * 0.2;
          localPosRef.current.y += errY * 0.2;
        }

        // Override render position for instant 0ms player reaction
        myPlayer.renderX = localPosRef.current.x;
        myPlayer.renderY = localPosRef.current.y;
      }

      // --- ENTITY INTERPOLATION (Smooth 60 FPS for other players & bot) ---
      if (currentGS.players) {
        for (const p of currentGS.players) {
          if (p.id !== myPlayerId) {
            if (p.renderX === undefined) {
              p.renderX = p.x;
              p.renderY = p.y;
            } else {
              p.renderX += (p.x - p.renderX) * 0.28;
              p.renderY += (p.y - p.renderY) * 0.28;
            }
          }
        }
      }

      if (rendererRef.current && canvasRef.current) {
        rendererRef.current.render(currentGS, myPlayerId, quickPingsRef.current);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [screen, myPlayerId]);

  const handleJoinGame = (config) => {
    socketRef.current?.emit('join_game', config);
  };

  const handleToggleMute = () => {
    const isMutedNow = audio.toggleMute();
    setIsMuted(isMutedNow);
  };

  const handleDropItem = () => {
    socketRef.current?.emit('drop_item');
  };

  const handleTerminalCommand = (command) => {
    socketRef.current?.emit('terminal_action', { command });
  };

  const handlePlayAgain = () => {
    setGameOverData(null);
    localPosRef.current.initialized = false;
    socketRef.current?.emit('start_game');
  };

  const handleSelectTool = (tool) => {
    socketRef.current?.emit('select_tool', { tool });
  };

  const handleUseAbility = (ability) => {
    socketRef.current?.emit('use_ability', { ability });
  };

  const handleSurrenderPvp = () => {
    socketRef.current?.emit('surrender_pvp');
  };

  const handleRequestCoopExit = () => {
    socketRef.current?.emit('request_coop_exit');
  };

  const handleRespondCoopExit = (accept) => {
    socketRef.current?.emit('respond_coop_exit', { accept });
    setCoopExitPrompt(null);
  };

  const handleSelectPing = (ping) => {
    setShowPingWheel(false);
    socketRef.current?.emit('quick_ping', {
      id: ping.id,
      label: ping.label,
      icon: ping.icon,
      color: ping.color
    });
  };

  const handleReturnToLobby = () => {
    socketRef.current?.emit('leave_game');
    setScreen('lobby');
    setGameOverData(null);
    setCoopExitPrompt(null);
    setShowPingWheel(false);
    setQuickPings([]);
    localPosRef.current.initialized = false;
    setGameState({
      players: [],
      activeIncidents: [],
      sla: 100,
      gameTime: 180,
      powerOnline: true,
      workbenchState: null,
      status: 'lobby'
    });
  };

  const handleMinigameComplete = (type) => {
    if (minigameIncident) {
      socketRef.current?.emit('minigame_complete', {
        incidentId: minigameIncident.id,
        type
      });
      setMinigameIncident(null);
    }
  };

  const myPlayer = gameState.players?.find((p) => p.id === myPlayerId);
  const nearbyIncident = gameState.activeIncidents?.find((inc) => {
    return Math.hypot(localPosRef.current.x - inc.targetX, localPosRef.current.y - inc.targetY) <= 85;
  });

  return (
    <div
      className={`relative w-screen h-screen bg-[#080c14] ${
        screen === 'lobby' ? 'overflow-y-auto' : 'overflow-hidden flex items-center justify-center'
      }`}
    >
      {screen === 'lobby' && (
        <Lobby onJoinGame={handleJoinGame} />
      )}

      {screen === 'game' && (
        <>
          {/* Main 2D Canvas */}
          <canvas
            ref={canvasRef}
            width={MAP_CONFIG.width}
            height={MAP_CONFIG.height}
            className="rounded-2xl border-2 border-slate-800 shadow-2xl max-w-full max-h-full object-contain"
          />

          {/* Interactive HUD Overlay */}
          <HUD
            myPlayer={myPlayer}
            players={gameState.players}
            gameTime={gameState.gameTime}
            sla={gameState.sla}
            mode={mode}
            currentLevel={gameState.currentLevel}
            levelRepairs={gameState.levelRepairs}
            targetRepairs={gameState.targetRepairs}
            activeIncidents={gameState.activeIncidents}
            powerOnline={gameState.powerOnline}
            blackout={gameState.blackout}
            hasNearbyIncident={!!nearbyIncident}
            onOpenMinigame={() => setMinigameIncident(nearbyIncident)}
            onSelectTool={handleSelectTool}
            onUseAbility={handleUseAbility}
            onDropItem={handleDropItem}
            onSurrenderPvp={handleSurrenderPvp}
            onRequestCoopExit={handleRequestCoopExit}
            onRespondCoopExit={handleRespondCoopExit}
            coopExitPrompt={coopExitPrompt}
            onOpenPingWheel={() => setShowPingWheel(true)}
            quickPings={quickPings}
            ping={ping}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* Quick Ping Wheel Modal */}
          {showPingWheel && (
            <QuickPingWheel
              onSelectPing={handleSelectPing}
              onClose={() => setShowPingWheel(false)}
            />
          )}

          {/* Interactive Minigame Modal (Wire connect / RAID rebuild) */}
          {minigameIncident && (
            <MinigameModal
              incident={minigameIncident}
              onClose={() => setMinigameIncident(null)}
              onComplete={handleMinigameComplete}
            />
          )}

          {/* Interactive NOC Terminal Modal */}
          {terminalOpen && (
            <NocTerminalModal
              hasDdos={terminalDdos}
              hasRansomware={terminalRansomware}
              onCommand={handleTerminalCommand}
              onClose={() => setTerminalOpen(false)}
            />
          )}

          {/* Game Over Modal */}
          {gameOverData && (
            <GameOverModal
              gameOverData={gameOverData}
              myPlayerId={myPlayerId}
              onPlayAgain={handlePlayAgain}
              onReturnToLobby={handleReturnToLobby}
            />
          )}
        </>
      )}
    </div>
  );
}
