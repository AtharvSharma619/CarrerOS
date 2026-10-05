import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production' || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function signSession(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '7d', issuer: 'careeros' });
}

export function requireAuth(request, response, next) {
  const token = request.cookies?.careeros_session;
  if (!token) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
  try {
    const payload = jwt.verify(token, env.jwtSecret, { issuer: 'careeros' });
    request.userId = payload.sub;
    next();
  } catch {
    response.clearCookie('careeros_session', cookieOptions);
    response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Your session has expired. Please sign in again.' } });
  }
}
