import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Board from '../models/Board.js';

let io = null;

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, c) => {
    const parts = c.split('=');
    acc[parts[0].trim()] = decodeURIComponent((parts[1] || '').trim());
    return acc;
  }, {});
};

export const initSocket = (server, corsOptions) => {
  io = new Server(server, {
    cors: corsOptions
  });

  // Authentication Handshake Middleware
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      // Try to find token in cookie or handshake authentication payload
      const token = cookies.accessToken || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'local_dev_access_secret_1234567890');
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.id})`);

    socket.on('board:join', async ({ boardId }) => {
      try {
        const board = await Board.findById(boardId);
        if (!board || board.isArchived) {
          socket.emit('error_message', { message: 'Board not found' });
          return;
        }

        const isMember = board.members.some(m => m.userId.toString() === socket.user._id.toString());
        if (!isMember) {
          socket.emit('error_message', { message: 'Not authorized to join this board' });
          return;
        }

        const roomName = `board:${boardId}`;
        socket.join(roomName);
        socket.boardId = boardId;

        // Broadcast presence updates
        socket.to(roomName).emit('user:joined', {
          userId: socket.user._id,
          name: socket.user.name,
          avatarUrl: socket.user.avatarUrl,
          avatarColor: socket.user.avatarColor
        });

        // Sync presence list
        const sockets = await io.in(roomName).fetchSockets();
        const presenceList = sockets.map(s => ({
          userId: s.user._id,
          name: s.user.name,
          avatarUrl: s.user.avatarUrl,
          avatarColor: s.user.avatarColor
        }));
        const uniquePresence = Array.from(new Map(presenceList.map(item => [item.userId.toString(), item])).values());
        io.to(roomName).emit('presence:sync', uniquePresence);
      } catch (error) {
        socket.emit('error_message', { message: 'Failed to join board room' });
      }
    });

    socket.on('board:leave', async () => {
      if (socket.boardId) {
        const roomName = `board:${socket.boardId}`;
        socket.leave(roomName);
        
        socket.to(roomName).emit('user:left', {
          userId: socket.user._id
        });

        const oldBoardId = socket.boardId;
        socket.boardId = null;

        // Sync presence list
        const sockets = await io.in(roomName).fetchSockets();
        const presenceList = sockets.map(s => ({
          userId: s.user._id,
          name: s.user.name,
          avatarUrl: s.user.avatarUrl,
          avatarColor: s.user.avatarColor
        }));
        const uniquePresence = Array.from(new Map(presenceList.map(item => [item.userId.toString(), item])).values());
        io.to(roomName).emit('presence:sync', uniquePresence);
      }
    });

    socket.on('cursor:move', (data) => {
      if (socket.boardId) {
        socket.to(`board:${socket.boardId}`).emit('cursor:move', {
          userId: socket.user._id,
          x: data.x,
          y: data.y
        });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.user.name}`);
      if (socket.boardId) {
        const roomName = `board:${socket.boardId}`;
        socket.to(roomName).emit('user:left', {
          userId: socket.user._id
        });

        // Sync presence list
        const sockets = await io.in(roomName).fetchSockets();
        const presenceList = sockets.map(s => ({
          userId: s.user._id,
          name: s.user.name,
          avatarUrl: s.user.avatarUrl,
          avatarColor: s.user.avatarColor
        }));
        const uniquePresence = Array.from(new Map(presenceList.map(item => [item.userId.toString(), item])).values());
        io.to(roomName).emit('presence:sync', uniquePresence);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
