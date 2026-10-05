import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { cookieOptions, requireAuth, signSession } from '../middleware/auth.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, plan: user.plan });

router.post('/register', async (request, response, next) => {
  try {
    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '');
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || password.length < 8 || password.length > 128) {
      return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Enter your name, a valid email, and a password of at least 8 characters.' } });
    }
    if (await User.exists({ email })) return response.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'An account with that email already exists.' } });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    response.cookie('careeros_session', signSession(user.id), cookieOptions);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (request, response, next) => {
  try {
    const email = String(request.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    const matches = user && await bcrypt.compare(String(request.body.password || ''), user.passwordHash);
    if (!matches) return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    response.cookie('careeros_session', signSession(user.id), cookieOptions);
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', (_request, response) => {
  response.clearCookie('careeros_session', cookieOptions);
  response.json({ ok: true });
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.userId);
    if (!user) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in again.' } });
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
