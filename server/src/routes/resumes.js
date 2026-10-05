import { Router } from 'express';
import Resume from '../models/Resume.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const fields = ['fullName', 'email', 'phone', 'location', 'website', 'headline', 'summary', 'experience', 'education', 'skills', 'projects'];
const cleanEntries = (entries, keys, maxEntries) => Array.isArray(entries) ? entries.slice(0, maxEntries).map((entry) => Object.fromEntries(keys.map((key) => [key, String(entry?.[key] || '').slice(0, key === 'achievements' ? 3000 : 2000)]))) : [];
const cleanContent = (source = {}) => ({
  ...Object.fromEntries(fields.map((field) => [field, String(source[field] || '').slice(0, field === 'summary' ? 2000 : 10000)])),
  experienceEntries: cleanEntries(source.experienceEntries, ['title', 'company', 'location', 'startDate', 'endDate', 'achievements'], 12),
  educationEntries: cleanEntries(source.educationEntries, ['institution', 'degree', 'location', 'startDate', 'endDate', 'details'], 12),
});

router.use(requireAuth);
router.get('/', async (req, res, next) => { try { res.json({ resumes: await Resume.find({ owner: req.userId }).sort({ updatedAt: -1 }) }); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Give your resume a title.' } });
    const resume = await Resume.create({ owner: req.userId, title: title.slice(0, 100), content: cleanContent(req.body.content), template: req.body.template === 'modern' ? 'modern' : 'classic' });
    res.status(201).json({ resume });
  } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => { try { const resume = await Resume.findOne({ _id: req.params.id, owner: req.userId }); if (!resume) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } }); res.json({ resume }); } catch (e) { next(e); } });
router.patch('/:id', async (req, res, next) => {
  try {
    const update = {};
    if (req.body.title !== undefined) update.title = String(req.body.title).trim().slice(0, 100);
    if (req.body.content !== undefined) update.content = cleanContent(req.body.content);
    if (req.body.template !== undefined) update.template = req.body.template === 'modern' ? 'modern' : 'classic';
    const resume = await Resume.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, { $set: update }, { new: true, runValidators: true });
    if (!resume) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    res.json({ resume });
  } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => { try { const deleted = await Resume.findOneAndDelete({ _id: req.params.id, owner: req.userId }); if (!deleted) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } }); res.json({ ok: true }); } catch (e) { next(e); } });

export default router;
