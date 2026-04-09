/**
 * server/index.js
 * Express static server + WebSocket server.
 * Entry point — run with: node server/index.js
 */

import express         from 'express';
import { WebSocketServer } from 'ws';
import { createServer }    from 'http';
import { fileURLToPath }   from 'url';
import { dirname, join }   from 'path';
import { RoomManager }     from './rooms/RoomManager.js';

// ── Config ──────────────────────────────────────
const PORT        = process.env.PORT || 8080;
const __dirname   = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR  = join(__dirname, '../client');

// ── HTTP Server ─────────────────────────────────
const app    = express();
const server = createServer(app);

app.use(express.json());
app.use(express.static(CLIENT_DIR));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    rooms:   roomManager.roomCount(),
    clients: roomManager.clientCount(),
    uptime:  process.uptime(),
  });
});

// ── WebSocket Server ─────────────────────────────
const wss         = new WebSocketServer({ server });
const roomManager = new RoomManager();

wss.on('connection', (ws, req) => {
  const userId = crypto.randomUUID();
  console.info(`[WS] Client connected: ${userId.slice(0,8)} from ${req.socket.remoteAddress}`);

  // Send the client their userId immediately
  safeSend(ws, 'CONNECTED', { userId });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn('[WS] Malformed message from', userId.slice(0,8));
      return;
    }

    const { type, data } = msg;

    switch (type) {
      case 'JOIN_ROOM': {
        const { roomId, passcode } = data || {};
        if (!roomId || typeof roomId !== 'string' || roomId.length > 40) {
          safeSend(ws, 'ERROR', { message: 'Invalid room ID.' });
          return;
        }
        try {
          const room = roomManager.getOrCreateRoom(roomId, passcode);
          const users = room.addUser(userId, ws);
          safeSend(ws, 'ROOM_STATE', { roomId, users });
          room.broadcast(userId, 'ROOM_STATE', { roomId, users }); // notify others
          console.info(`[Room:${roomId}] ${userId.slice(0,8)} joined — ${users.length} users`);
        } catch (err) {
          safeSend(ws, 'ERROR', { message: err.message });
        }
        break;
      }

      case 'HAND_DATA': {
        const room = roomManager.getRoomByUser(userId);
        if (!room) return;
        // Broadcast our hands to everyone else in the room
        room.broadcast(userId, 'HANDS_UPDATE', {
          userId,
          landmarks: data?.landmarks || [],
        });
        break;
      }

      default:
        // Unknown message type — silently ignore
        break;
    }
  });

  ws.on('close', () => {
    console.info(`[WS] Client disconnected: ${userId.slice(0,8)}`);
    const room = roomManager.getRoomByUser(userId);
    if (room) {
      room.removeUser(userId);
      room.broadcast(userId, 'USER_LEFT', { userId });
      room.broadcast(userId, 'ROOM_STATE', { users: room.getUserList() });
      roomManager.cleanEmpty();
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Socket error for ${userId.slice(0,8)}:`, err.message);
  });
});

// ── Helpers ──────────────────────────────────────
function safeSend(ws, type, data) {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  } catch (err) {
    console.error('[WS] Send failed:', err.message);
  }
}

// ── Start ────────────────────────────────────────
server.listen(PORT, () => {
  console.info(`\n🟢 Neon Aura AR server running`);
  console.info(`   Local:   http://localhost:${PORT}`);
  console.info(`   Health:  http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});