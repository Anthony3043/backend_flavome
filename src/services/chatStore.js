// Estado em memória compartilhado entre socket e controller
// rooms: { [roomId]: { id, category, participants: [userId], createdAt } }
const rooms = {};

// roomMessages: { [roomId]: [{ id, roomId, userId, username, message, timestamp }] }
const roomMessages = {};

// matchQueue: { [category]: [{ socketId, userId, username }] }
const matchQueue = {};

// socketUserMap: { [socketId]: { userId, username } }
const socketUserMap = {};

module.exports = { rooms, roomMessages, matchQueue, socketUserMap };