const router = require('express').Router();
const auth = require('../middlewares/auth');
const { listarSalas, mensagensSala, enviarMensagem } = require('../controllers/chatController');

// Listar salas de chat disponíveis
router.get('/rooms', auth, listarSalas);

// Buscar mensagens de uma sala
router.get('/rooms/:roomId/messages', auth, mensagensSala);

// Enviar mensagem (fallback HTTP, o principal é via Socket)
router.post('/rooms/:roomId/messages', auth, enviarMensagem);

module.exports = router;
