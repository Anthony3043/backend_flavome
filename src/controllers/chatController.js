// Armazena salas e mensagens em memória (não altera o BD existente)
const { rooms, roomMessages } = require('../services/chatStore');

const listarSalas = (req, res) => {
  const lista = Object.values(rooms).map(room => ({
    id: room.id,
    category: room.category,
    participants: room.participants.length,
    createdAt: room.createdAt,
  }));
  return res.json({ success: true, data: { rooms: lista } });
};

const mensagensSala = (req, res) => {
  const { roomId } = req.params;
  const msgs = roomMessages[roomId] || [];
  return res.json({ success: true, data: { messages: msgs } });
};

const enviarMensagem = (req, res) => {
  const { roomId } = req.params;
  const { text } = req.body;
  const usuario = req.usuario;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Mensagem não pode ser vazia.' });
  }

  if (!roomMessages[roomId]) {
    return res.status(404).json({ error: 'Sala não encontrada.' });
  }

  const msg = {
    id: Date.now().toString(),
    roomId,
    userId: usuario.id,
    username: usuario.nome,
    message: text.trim(),
    timestamp: new Date().toISOString(),
  };

  roomMessages[roomId].push(msg);

  return res.json({ success: true, data: { message: msg } });
};

module.exports = { listarSalas, mensagensSala, enviarMensagem };
