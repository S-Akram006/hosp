import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;

/**
 * Initialize Socket.io server with CORS and connection topology
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export const initSocket = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);

  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Optional JWT authentication middleware on socket handshake
  ioInstance.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'supersecret_jwt_key_change_in_production_12345'
        );
        socket.user = decoded; // { id, role }
      } catch (err) {
        console.warn(`[Socket Auth] Invalid token provided: ${err.message}`);
      }
    }
    next();
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Auto-join designated room if authenticated
    if (socket.user) {
      if (socket.user.role === 'doctor') {
        socket.join(`room:doctor:${socket.user.id}`);
        console.log(`[Socket] User auto-joined room:doctor:${socket.user.id}`);
      } else if (socket.user.role === 'patient') {
        socket.join(`room:patient:${socket.user.id}`);
        console.log(`[Socket] User auto-joined room:patient:${socket.user.id}`);
      } else if (socket.user.role === 'admin') {
        socket.join('room:admin');
        console.log('[Socket] Admin auto-joined room:admin');
      }
    }

    // Explicit room subscription listeners
    socket.on('join:doctor', ({ doctorId }) => {
      if (doctorId) {
        const room = `room:doctor:${doctorId}`;
        socket.join(room);
        console.log(`[Socket] ${socket.id} joined ${room}`);
      }
    });

    socket.on('join:patient', ({ patientId }) => {
      if (patientId) {
        const room = `room:patient:${patientId}`;
        socket.join(room);
        console.log(`[Socket] ${socket.id} joined ${room}`);
      }
    });

    socket.on('join:waiting-room', () => {
      socket.join('room:waiting-room');
      console.log(`[Socket] ${socket.id} joined room:waiting-room`);
    });

    socket.on('join:admin', () => {
      socket.join('room:admin');
      console.log(`[Socket] ${socket.id} joined room:admin`);
    });

    socket.on('join:room', (roomName) => {
      if (roomName && typeof roomName === 'string') {
        socket.join(roomName);
      }
    });

    socket.on('leave:room', (roomName) => {
      if (roomName && typeof roomName === 'string') {
        socket.leave(roomName);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected ${socket.id} (${reason})`);
    });
  });

  return ioInstance;
};

/**
 * Get Socket.io singleton instance
 * If called before server initialization, returns a safe mock to prevent crashes.
 * @returns {Server}
 */
export const getIO = () => {
  if (!ioInstance) {
    return {
      to: () => ({
        emit: () => {},
      }),
      in: () => ({
        emit: () => {},
      }),
      emit: () => {},
    };
  }
  return ioInstance;
};

export default {
  initSocket,
  getIO,
};
