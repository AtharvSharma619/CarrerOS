import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import { cookieOptions, requireAuth, signSession } from '../middleware/auth.js';
import { sendEmailVerification, sendPasswordResetEmail } from '../services/email.js';
import { env } from '../config/env.js';

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
    const verificationToken = env.requireEmailVerification ? randomBytes(32).toString('hex') : '';
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      emailVerifiedAt: env.requireEmailVerification ? null : new Date(),
      ...(env.requireEmailVerification ? {
        emailVerificationTokenHash: createHash('sha256').update(verificationToken).digest('hex'),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } : {}),
    });
    if (env.requireEmailVerification) {
      try { await sendEmailVerification(user.email, verificationToken); }
      catch (emailError) { console.error('Could not send account verification email:', emailError.message); }
      return response.status(201).json({ verificationRequired: true, message: 'Check your email for a verification link to finish creating your account.' });
    }
    response.cookie('careeros_session', signSession(user.id, user.sessionVersion), cookieOptions);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (request, response, next) => {
  try {
    const email = String(request.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    const matches = user && await bcrypt.compare(String(request.body.password || ''), user.passwordHash);
    if (!matches) return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    if (env.requireEmailVerification && !user.emailVerifiedAt) return response.status(403).json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before signing in.' } });
    response.cookie('careeros_session', signSession(user.id, user.sessionVersion), cookieOptions);
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/verify-email', async (request, response, next) => {
  try {
    const token = String(request.body.token || '');
    if (!/^[a-f0-9]{64}$/i.test(token)) return response.status(400).json({ error: { code: 'INVALID_VERIFICATION', message: 'This email verification link is invalid or expired.' } });
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: { $gt: new Date() } }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
    if (!user) return response.status(400).json({ error: { code: 'INVALID_VERIFICATION', message: 'This email verification link is invalid or expired.' } });
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    response.json({ ok: true, message: 'Email verified. You can sign in now.' });
  } catch (error) { next(error); }
});

router.post('/resend-verification', async (request, response, next) => {
  try {
    if (!env.requireEmailVerification) return response.status(202).json({ message: 'If the account needs verification, a new link will arrive shortly.' });
    const email = String(request.body.email || '').trim().toLowerCase();
    if (!emailPattern.test(email)) return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Enter a valid email address.' } });
    const user = await User.findOne({ email });
    if (user && !user.emailVerifiedAt) {
      const token = randomBytes(32).toString('hex');
      user.emailVerificationTokenHash = createHash('sha256').update(token).digest('hex');
      user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      try { await sendEmailVerification(user.email, token); }
      catch (emailError) { console.error('Could not resend account verification email:', emailError.message); }
    }
    response.status(202).json({ message: 'If the account needs verification, a new link will arrive shortly.' });
  } catch (error) { next(error); }
});

router.post('/logout', requireAuth, async (request, response, next) => {
  try { await User.updateOne({ _id: request.userId }, { $inc: { sessionVersion: 1 } }); }
  catch (error) { return next(error); }
  response.clearCookie('careeros_session', cookieOptions);
  response.json({ ok: true });
});

router.post('/forgot-password', async (request, response, next) => {
  try {
    if (!env.resendApiKey) return response.status(503).json({ error: { code: 'EMAIL_NOT_CONFIGURED', message: 'Password recovery is not configured on this app yet.' } });
    const email = String(request.body.email || '').trim().toLowerCase();
    if (!emailPattern.test(email)) return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Enter a valid email address.' } });
    const user = await User.findOne({ email });
    if (user) {
      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = createHash('sha256').update(token).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      try { await sendPasswordResetEmail(user.email, token); }
      catch (emailError) { console.error('Could not send password recovery email:', emailError.message); }
    }
    response.status(202).json({ message: 'If an account exists for that email, a password reset link will arrive shortly.' });
  } catch (error) { next(error); }
});

router.post('/reset-password', async (request, response, next) => {
  try {
    const token = String(request.body.token || '');
    const password = String(request.body.password || '');
    if (!/^[a-f0-9]{64}$/i.test(token) || password.length < 8 || password.length > 128) {
      return response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'This reset link is invalid or expired, or the new password does not meet the requirements.' } });
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) return response.status(400).json({ error: { code: 'INVALID_RESET', message: 'This reset link is invalid or expired. Request a new one.' } });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.sessionVersion += 1;
    await user.save();
    response.clearCookie('careeros_session', cookieOptions);
    response.json({ ok: true, message: 'Password reset. Sign in with your new password.' });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await User.findById(request.userId);
    if (!user) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in again.' } });
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
