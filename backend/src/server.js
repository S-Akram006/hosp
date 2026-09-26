import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/db.js';
import corsOptions from './config/cors.js';
import { initSocket } from './socket.js';
import { sanitizeData } from './middleware/sanitizeMiddleware.js';
import {
  generalLimiter,
  authLimiter,
  aiLimiter,
} from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server for Express and Socket.io
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initSocket(httpServer);
app.set('io', io);

// Connect to Database
connectDB();

// -------------------------------------------------------------
// Security & Hardening Middleware
// -------------------------------------------------------------

// 1. Helmet HTTP Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles/scripts if needed by frontends
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Configuration
app.use(cors(corsOptions));

// 3. Body Parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Data Sanitization (NoSQL injection & XSS defense)
app.use(sanitizeData);

// 5. Global API Rate Limiting
app.use('/api', generalLimiter);

// -------------------------------------------------------------
// Root & Health check routes
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'AI-Driven Hospital and Appointment Management System API',
    version: '1.0.0',
    documentation: '/api/docs (coming soon)',
    security: {
      helmet: 'enabled',
      rateLimiter: 'active',
      dataSanitization: 'active',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    socketActive: !!io,
  });
});

// -------------------------------------------------------------
// Mount Routes with specialized rate limits
// -------------------------------------------------------------

// Strict auth rate limiter on authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// AI compute rate limiter on AI service routes
app.use('/api/ai', aiLimiter, aiRoutes);

// Calendar, Emergency, Resource, and Queue routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/queue', queueRoutes);

// -------------------------------------------------------------
// Centralized Error Handling Middleware
// -------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// Server Listening via HTTP Server (supporting Socket.io)
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(
    `[Server] Hospital AI Backend (Secure HTTP & Socket.io) running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${PORT}`
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection] ${err.message}`);
});

export { app, httpServer, io };
export default app;
