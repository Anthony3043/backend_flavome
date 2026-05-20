require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS liberado para todas as origens (necessário para React Native / Expo Go)
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Permite polling e websocket
  transports: ['polling', 'websocket'],
  allowEIO3: true,
});

// Rotas HTTP existentes (não alteradas)
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/api'));

// Nova rota de chat
app.use('/api/chat', require('./src/routes/chat'));

// Health check
app.get('/', (req, res) => res.json({ status: 'Flavome API rodando ✅' }));

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Inicializa lógica de Socket.io
require('./src/services/chatSocket')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});