import { getIO } from '../config/socket.js';

export const broadcastToBoard = (req, boardId, event, payload) => {
  try {
    const io = getIO();
    // Exclude sender if their socket ID is provided in headers
    const socketId = req.headers['x-socket-id'];
    const roomName = `board:${boardId}`;

    if (socketId) {
      io.to(roomName).except(socketId).emit(event, payload);
    } else {
      io.to(roomName).emit(event, payload);
    }
  } catch (error) {
    console.error(`Socket broadcast error for event ${event}:`, error.message);
  }
};
