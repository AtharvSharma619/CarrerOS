import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production' || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function signSession(userId, sessionVersion = 0) {
  return jwt.sign({ sub: userId, ver: sessionVersion }, env.jwtSecret, { expiresIn: '7d', issuer: 'careeros' });
}

function rejectSession(response) {
  response.clearCookie('careeros_session', cookieOptions);
  return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Your session has expired. Please sign in again.' } });
}

export async function requireAuth(request, response, next) {
  const token = request.cookies?.careeros_session;
  if (!token) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { issuer: 'careeros' });
  } catch {
    return rejectSession(response);
  }
  try {
    const user = await User.findById(payload.sub).select('sessionVersion');
    if (!user || (payload.ver ?? 0) !== user.sessionVersion) return rejectSession(response);
    request.userId = user.id;
    return next();
  } catch (error) { return next(error); }
}
