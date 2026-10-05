import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import applicationRoutes from './routes/applications.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import accountRoutes from './routes/account.js';

export const app = express();
const clientBuild = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
app.disable('x-powered-by');
if (env.trustProxyHops > 0) app.set('trust proxy', env.trustProxyHops);
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1/auth/reset-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1/ai', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== env.clientOrigin) {
    return res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'Request origin was rejected.' } });
  }
  next();
});

app.get('/api/v1/health', async (_req, res) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return res.status(503).json({ status: 'unavailable', service: 'careeros-api', database: 'disconnected' });
  }
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok', service: 'careeros-api', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unavailable', service: 'careeros-api', database: 'unreachable' });
  }
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/resumes', resumeRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested API resource was not found.' } }));
if (env.nodeEnv === 'production') {
  app.use(express.static(clientBuild, { index: false }));
  app.get('*', (req, res, next) => {
    if (!req.accepts('html')) return res.status(404).end();
    res.sendFile(path.join(clientBuild, 'index.html'), (error) => { if (error) next(error); });
  });
} else {
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } }));
}
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
  const code = ['AI_NOT_CONFIGURED', 'AI_PROVIDER_ERROR', 'AI_USAGE_LIMIT'].includes(error.code) ? error.code : status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  res.status(status).json({ error: { code, message: status === 500 && code === 'INTERNAL_ERROR' ? 'Something went wrong.' : error.message } });
});
