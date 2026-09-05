import cors from 'cors';
import express from 'express';
import path from 'node:path';

import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

const app = express();

// Build the list of allowed CORS origins.
// In development: allow localhost Vite dev servers (5173/5174).
// In production: only use FRONTEND_URL (or CORS_ORIGINS if explicitly set).
// Never expose localhost origins to production clients.
const isDev = process.env.NODE_ENV !== 'production';

const devOrigins = isDev
  ? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ]
  : [];

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendUrl = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.trim()]
  : [];

const allowedOrigins = Array.from(new Set([...devOrigins, ...frontendUrl, ...configuredOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (like Postman) and configured frontend origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  }),
);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_request, response) => {
  response.json({
    message: 'TripleA API is running.',
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;


