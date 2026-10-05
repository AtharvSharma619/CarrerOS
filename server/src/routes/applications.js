import { Router } from 'express';
import Application from '../models/Application.js';
import Resume from '../models/Resume.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const statuses = ['Saved', 'Applied', 'In review', 'Interview', 'Offer', 'Rejected'];
router.use(requireAuth);
router.get('/', async (req, res, next) => { try { res.json({ applications: await Application.find({ owner: req.userId }).sort({ updatedAt: -1 }).populate('resume', 'title') }); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => {
  try {
    const company = String(req.body.company || '').trim(); const role = String(req.body.role || '').trim();
    if (!company || !role) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Company and role are required.' } });
    const status = statuses.includes(req.body.status) ? req.body.status : 'Applied';
    const resumeId = req.body.resume || null;
    if (resumeId && !await Resume.exists({ _id: resumeId, owner: req.userId })) return res.status(400).json({ error: { code: 'INVALID_RESUME', message: 'Choose one of your own resumes.' } });
    const application = await Application.create({
      owner: req.userId,
      company: company.slice(0, 120),
      role: role.slice(0, 120),
      url: String(req.body.url || '').slice(0, 500),
      notes: String(req.body.notes || '').slice(0, 3000),
      jobDescription: String(req.body.jobDescription || '').slice(0, 12000),
      resume: resumeId,
      status,
      appliedAt: req.body.appliedAt || new Date(),
      followUpAt: req.body.followUpAt || null,
    });
    res.status(201).json({ application });
  } catch (e) { next(e); }
});
router.patch('/:id', async (req, res, next) => {
  try {
    const update = {};
    for (const field of ['company', 'role', 'url', 'notes', 'appliedAt', 'followUpAt', 'jobDescription', 'coverLetter', 'tailoredSuggestions']) if (req.body[field] !== undefined) update[field] = req.body[field];
    if (req.body.resume !== undefined) {
      if (req.body.resume && !await Resume.exists({ _id: req.body.resume, owner: req.userId })) return res.status(400).json({ error: { code: 'INVALID_RESUME', message: 'Choose one of your own resumes.' } });
      update.resume = req.body.resume || null;
    }
    if (req.body.status !== undefined) {
      if (!statuses.includes(req.body.status)) return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Choose a valid application status.' } });
      update.status = req.body.status;
    }
    const application = await Application.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, { $set: update }, { new: true, runValidators: true });
    if (!application) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found.' } });
    res.json({ application });
  } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => { try { const deleted = await Application.findOneAndDelete({ _id: req.params.id, owner: req.userId }); if (!deleted) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found.' } }); res.json({ ok: true }); } catch (e) { next(e); } });
export default router;
