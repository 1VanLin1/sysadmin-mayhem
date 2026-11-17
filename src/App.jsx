import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { GameRenderer } from './game/renderer';
import { MAP_CONFIG } from './game/constants';
import { HUD } from './components/HUD';
import { Lobby } from './components/Lobby';
import { NocTerminalModal } from './components/NocTerminalModal';
import { GameOverModal } from './components/GameOverModal';
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
  const [gameOverData, setGameOverData] = useState(null);
  const [coopExitPrompt, setCoopExitPrompt] = useState(null);

  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  const interactPressedRef = useRef(false);

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
      if (roomStatus !== 'playing') {
        socket.emit('start_game');
      }
    });

    socket.on('game_state', (state) => {
      setGameState(state);
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

    socket.on('open_terminal', ({ hasDdos }) => {
      setTerminalDdos(hasDdos);
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

  // 2. Keyboard Controls (Supports both English and Russian keyboard layouts)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (screen !== 'game' || terminalOpen) return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';
      let changed = false;

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

  // 3. Setup Canvas Renderer and 60FPS Render Loop
  useEffect(() => {
    if (screen !== 'game' || !canvasRef.current) return;

    rendererRef.current = new GameRenderer(canvasRef.current);

    let animId;
    const renderLoop = () => {
      if (rendererRef.current && canvasRef.current) {
        rendererRef.current.render(gameState, myPlayerId);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [screen, gameState, myPlayerId]);

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

  const handleReturnToLobby = () => {
    socketRef.current?.emit('leave_game');
    setScreen('lobby');
    setGameOverData(null);
    setCoopExitPrompt(null);
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

  const myPlayer = gameState.players?.find((p) => p.id === myPlayerId);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14] flex items-center justify-center">
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
            onSelectTool={handleSelectTool}
            onUseAbility={handleUseAbility}
            onDropItem={handleDropItem}
            onSurrenderPvp={handleSurrenderPvp}
            onRequestCoopExit={handleRequestCoopExit}
            onRespondCoopExit={handleRespondCoopExit}
            coopExitPrompt={coopExitPrompt}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* Interactive NOC Terminal Modal */}
          {terminalOpen && (
            <NocTerminalModal
              hasDdos={terminalDdos}
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
