import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from './gameRoom.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// API Auth & Leaderboard Routes
app.post('/api/register', (req, res) => {
  const { username, password, color } = req.body || {};
  const result = db.register(username, password, color);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = db.login(username, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.json(result);
});

app.get('/api/leaderboard', (req, res) => {
  const list = db.getLeaderboard(50);
  return res.json({ leaderboard: list });
});

const rooms = new Map();

function getOrCreateRoom(roomId, mode = 'coop') {
  let room = rooms.get(roomId);
  if (!room) {
    room = new GameRoom(roomId, io, mode);
    rooms.set(roomId, room);
  } else {
    // If room is in lobby, game_over or has 0 human players, allow switching mode!
    const humanPlayers = Array.from(room.players.values()).filter((p) => !p.isBot);
    if (room.status !== 'playing' || humanPlayers.length === 0) {
      if (room.mode !== mode) {
        room.mode = mode;
      }
      if (room.status === 'game_over') {
        room.resetRoom();
        room.mode = mode;
      }
    }
  }
  return room;
}

io.on('connection', (socket) => {
  socket.on('ping_check', (data) => {
    socket.emit('pong_check', data);
  });

  socket.on('join_game', ({ roomId, username, color, mode, withBot, dbUsername }) => {
    const targetRoomId = (roomId || 'DATA-1').trim().toUpperCase();
    const targetMode = mode === 'pvp' ? 'pvp' : 'coop';
    const room = getOrCreateRoom(targetRoomId, targetMode);

    // If room is not currently in a match, ensure its mode matches requested mode
    if (room.status !== 'playing') {
      room.mode = targetMode;
    }

    const player = room.addPlayer(socket, username, color, false, dbUsername);

    if (withBot) {
      // Also spawn Senior AI sysadmin bot in this room
      room.addPlayer(null, 'Васильич (Senior AI)', '#e11d48', true);
    }

    socket.emit('joined_room', {
      roomId: targetRoomId,
      playerId: player.id,
      mode: room.mode,
      roomStatus: room.status
    });
  });
});

// Serve frontend build if dist folder exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('SysAdmin Mayhem API running.');
    }
  });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`🖥️  SysAdmin Mayhem server running on http://localhost:${PORT}`);
});
