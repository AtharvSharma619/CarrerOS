import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import { cookieOptions, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/export', async (req, res, next) => {
  try {
    const [user, resumes, applications] = await Promise.all([
      User.findById(req.userId).select('name email plan createdAt updatedAt').lean(),
      Resume.find({ owner: req.userId }).lean(),
      Application.find({ owner: req.userId }).lean(),
    ]);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found.' } });
    res.setHeader('Content-Disposition', 'attachment; filename="careeros-data.json"');
    res.json({ exportedAt: new Date().toISOString(), user, resumes, applications });
  } catch (error) { next(error); }
});

router.delete('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found.' } });
    const passwordMatches = await bcrypt.compare(String(req.body.password || ''), user.passwordHash);
    const emailMatches = String(req.body.confirmEmail || '').trim().toLowerCase() === user.email;
    if (!passwordMatches || !emailMatches) return res.status(400).json({ error: { code: 'CONFIRMATION_FAILED', message: 'Enter your password and account email to confirm deletion.' } });
    await Promise.all([
      Resume.deleteMany({ owner: user._id }),
      Application.deleteMany({ owner: user._id }),
    ]);
    await User.deleteOne({ _id: user._id });
    res.clearCookie('careeros_session', cookieOptions);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
