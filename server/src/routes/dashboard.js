import { Router } from 'express';
import Application from '../models/Application.js';
import Resume from '../models/Resume.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [applications, resumes, recentApplications, upcomingFollowUps] = await Promise.all([
      Application.find({ owner: req.userId }).lean(),
      Resume.find({ owner: req.userId }).sort({ updatedAt: -1 }).lean(),
      Application.find({ owner: req.userId }).sort({ updatedAt: -1 }).limit(5).lean(),
      Application.find({ owner: req.userId, followUpAt: { $ne: null }, status: { $nin: ['Offer', 'Rejected'] } }).sort({ followUpAt: 1 }).limit(4).lean(),
    ]);
    const active = applications.filter((item) => !['Rejected', 'Offer'].includes(item.status)).length;
    const interviews = applications.filter((item) => item.status === 'Interview').length;
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday); endToday.setHours(23, 59, 59, 999);
    const followUpsDue = applications.filter((item) => item.followUpAt && new Date(item.followUpAt) <= endToday && !['Offer', 'Rejected'].includes(item.status)).length;
    const content = resumes[0]?.content || {};
    const profileSignals = [
      content.fullName,
      content.email,
      content.headline,
      content.summary,
      content.experienceEntries?.length || content.experience,
      content.educationEntries?.length || content.education,
      content.skills,
      content.projects,
    ];
    const profileStrength = resumes[0] ? Math.round(profileSignals.filter((value) => String(value || '').trim()).length / profileSignals.length * 100) : 0;
    res.json({ stats: { activeApplications: active, interviews, followUpsDue, profileStrength, resumeCount: resumes.length, applicationCount: applications.length }, resumes: resumes.slice(0, 5), recentApplications, upcomingFollowUps });
  } catch (error) { next(error); }
});
export default router;
