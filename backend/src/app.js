import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import connectDB from './config/db.js';
import passport from './config/passport.js';
import { initSocket } from './config/socket.js';

// Route Imports
import authRouter from './routes/auth.js';
import boardRouter from './routes/boardRoutes.js';
import columnRouter from './routes/columnRoutes.js';
import taskRouter from './routes/taskRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Connect Database
connectDB();

// CORS configuration
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Socket-ID']
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Static Upload Folder
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/boards', boardRouter);
app.use('/api/columns', columnRouter);
app.use('/api/tasks', taskRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);

  const status = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      fields: err.fields || undefined
    }
  });
});

// Initialize Socket.io
initSocket(server, corsOptions);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export { app, server };
