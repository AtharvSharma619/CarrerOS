import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import applicationRoutes from './routes/applications.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import accountRoutes from './routes/account.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1/ai', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== env.clientOrigin) {
    return res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'Request origin was rejected.' } });
  }
  next();
});

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', service: 'careeros-api' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/account', accountRoutes);
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || (error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500);
  const code = error.code === 'AI_NOT_CONFIGURED' || error.code === 'AI_PROVIDER_ERROR' ? error.code : status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  res.status(status).json({ error: { code, message: status === 500 && code === 'INTERNAL_ERROR' ? 'Something went wrong.' : error.message } });
});
