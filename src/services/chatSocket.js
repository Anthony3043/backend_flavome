const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { rooms, roomMessages, matchQueue, socketUserMap } = require('./chatStore');

module.exports = (io) => {

  // ── Autenticação via JWT no handshake ─────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Token não fornecido.'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, username: decoded.nome };
      next();
    } catch {
      next(new Error('Token inválido ou expirado.'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;
    socketUserMap[socket.id] = { userId, username };

    console.log(`🔌 Conectado: ${username} (${socket.id})`);

    // Confirma autenticação ao cliente
    socket.emit('authenticated', { userId, username });

    // ── find-match ────────────────────────────────────────────────────────────
    socket.on('find-match', ({ category }) => {
      if (!category) return;
      const cat = category.toLowerCase();

      removeFromAllQueues(socket.id);

      if (!matchQueue[cat]) matchQueue[cat] = [];

      const waiting = matchQueue[cat].find(u => u.socketId !== socket.id);

      if (waiting) {
        matchQueue[cat] = matchQueue[cat].filter(u => u.socketId !== waiting.socketId);

        const roomId = uuidv4();
        rooms[roomId] = {
          id: roomId,
          category: cat,
          participants: [userId, waiting.userId],
          createdAt: new Date().toISOString(),
        };
        roomMessages[roomId] = [];

        io.to(socket.id).emit('match-found', {
          roomId,
          partner: { userId: waiting.userId, username: waiting.username },
        });
        io.to(waiting.socketId).emit('match-found', {
          roomId,
          partner: { userId, username },
        });

        console.log(`🎉 Match: ${username} ↔ ${waiting.username} | sala: ${roomId} | cat: ${cat}`);
      } else {
        matchQueue[cat].push({ socketId: socket.id, userId, username });
        socket.emit('queue-status', { status: 'waiting', category: cat });
        console.log(`⏳ ${username} na fila de [${cat}]`);
      }
    });

    // ── cancel-match ──────────────────────────────────────────────────────────
    socket.on('cancel-match', () => {
      removeFromAllQueues(socket.id);
    });

    // ── join-room ─────────────────────────────────────────────────────────────
    socket.on('join-room', ({ roomId }) => {
      if (!rooms[roomId]) return;
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { userId, username });
    });

    // ── leave-room ────────────────────────────────────────────────────────────
    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { userId, username });
      cleanupRoom(roomId, socket.id);
    });

    // ── send-message ──────────────────────────────────────────────────────────
    socket.on('send-message', ({ roomId, message }) => {
      if (!roomId || !message || !message.trim()) return;
      if (!rooms[roomId]) return;

      const msg = {
        id: uuidv4(),
        roomId,
        userId,
        username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      if (!roomMessages[roomId]) roomMessages[roomId] = [];
      roomMessages[roomId].push(msg);

      io.to(roomId).emit('new-message', msg);
    });

    // ── authenticate (compatibilidade com o frontend) ─────────────────────────
    socket.on('authenticate', () => {
      socket.emit('authenticated', { userId, username });
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔴 Desconectado: ${username} (${socket.id})`);

      removeFromAllQueues(socket.id);

      Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        if (room && room.participants.includes(userId)) {
          socket.to(roomId).emit('partner_disconnected', { userId, username });
          cleanupRoom(roomId, socket.id);
        }
      });

      delete socketUserMap[socket.id];
    });
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function removeFromAllQueues(socketId) {
    Object.keys(matchQueue).forEach(cat => {
      matchQueue[cat] = matchQueue[cat].filter(u => u.socketId !== socketId);
    });
  }

  function cleanupRoom(roomId, socketId) {
    if (!rooms[roomId]) return;
    const user = socketUserMap[socketId];
    if (user) {
      rooms[roomId].participants = rooms[roomId].participants.filter(id => id !== user.userId);
    }
    if (rooms[roomId].participants.length === 0) {
      delete rooms[roomId];
      delete roomMessages[roomId];
    }
  }
};
