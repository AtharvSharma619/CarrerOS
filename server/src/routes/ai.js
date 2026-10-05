import { Router } from 'express';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import { requireAuth } from '../middleware/auth.js';
import { generateCareerTextForUser, getAiUsage } from '../services/aiUsage.js';

const router = Router();
router.use(requireAuth);
router.get('/usage', async (req, res, next) => { try { res.json({ usage: await getAiUsage(req.userId) }); } catch (error) { next(error); } });
const resumeText = (resume) => JSON.stringify({ title: resume.title, ...resume.content });

router.post('/applications/:id/cover-letter', async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, owner: req.userId });
    if (!application) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found.' } });
    const resumeId = req.body.resumeId || application.resume;
    const resume = resumeId ? await Resume.findOne({ _id: resumeId, owner: req.userId }) : null;
    if (!resume) return res.status(400).json({ error: { code: 'RESUME_REQUIRED', message: 'Choose one of your resumes before drafting a cover letter.' } });
    const generated = await generateCareerTextForUser(req.userId, {
      instruction: 'Write a concise, specific cover letter draft in a natural professional voice. Use only evidence from the resume and job details. Do not claim skills or experience that are absent. Use [PLACEHOLDER] for missing names or details.',
      input: `RESUME:\n${resumeText(resume)}\n\nAPPLICATION:\n${JSON.stringify({ company: application.company, role: application.role, jobDescription: application.jobDescription, notes: application.notes })}`,
    });
    application.resume = resume._id;
    application.coverLetter = generated.result;
    await application.save();
    res.json({ result: generated.result, usage: generated.usage, application });
  } catch (error) { next(error); }
});

router.post('/applications/:id/tailor', async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, owner: req.userId });
    if (!application) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found.' } });
    const resumeId = req.body.resumeId || application.resume;
    const resume = resumeId ? await Resume.findOne({ _id: resumeId, owner: req.userId }) : null;
    if (!resume) return res.status(400).json({ error: { code: 'RESUME_REQUIRED', message: 'Choose one of your resumes before tailoring.' } });
    if (application.jobDescription.trim().length < 30) return res.status(400).json({ error: { code: 'JOB_DESCRIPTION_REQUIRED', message: 'Add the job description to this application first.' } });
    const generated = await generateCareerTextForUser(req.userId, {
      instruction: 'Compare the resume with the role. Return a tailored summary suggestion, skills to emphasize, and relevant experience bullet rewrites. Do not add facts, skills, metrics, employers, or dates. Label all suggestions as editable suggestions and use [CHECK] when user verification is needed.',
      input: `RESUME:\n${resumeText(resume)}\n\nJOB DESCRIPTION:\n${application.jobDescription}`,
    });
    application.resume = resume._id;
    application.tailoredSuggestions = generated.result;
    await application.save();
    res.json({ result: generated.result, usage: generated.usage, application });
  } catch (error) { next(error); }
});

router.post('/resumes/:id/analyze', async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, owner: req.userId });
    if (!resume) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    const generated = await generateCareerTextForUser(req.userId, { instruction: 'You are an honest resume coach. Review for clarity, impact, relevance, ATS readability, and missing information. Give a concise overall assessment, strengths, prioritized improvements, and example rewrites based only on the material.', input: resumeText(resume) });
    res.json({ result: generated.result, usage: generated.usage });
  } catch (error) { next(error); }
});

router.post('/resumes/:id/tailor', async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, owner: req.userId });
    if (!resume) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resume not found.' } });
    const jobDescription = String(req.body.jobDescription || '').slice(0, 12000);
    if (jobDescription.length < 30) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Paste a job description (at least 30 characters).' } });
    const generated = await generateCareerTextForUser(req.userId, { instruction: 'You help tailor resumes to a specific job. Return a revised professional summary, relevant skills to emphasize, and suggested experience bullet rewrites. Do not alter factual claims or add skills. Clearly mark suggestions that need user verification.', input: `RESUME:\n${resumeText(resume)}\n\nJOB DESCRIPTION:\n${jobDescription}` });
    res.json({ result: generated.result, usage: generated.usage });
  } catch (error) { next(error); }
});

router.post('/applications/cover-letter', async (req, res, next) => {
  try {
    const application = req.body.application || {};
    const resumeId = String(req.body.resumeId || '');
    const resume = await Resume.findOne({ _id: resumeId, owner: req.userId });
    if (!resume) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Choose one of your resumes first.' } });
    const jobDescription = String(req.body.jobDescription || '').slice(0, 10000);
    const generated = await generateCareerTextForUser(req.userId, { instruction: 'Write a concise, specific cover letter draft in a natural professional voice. Use only evidence from the resume and job details. Do not claim skills or experience that are absent. Use [PLACEHOLDER] for missing names or details.', input: `RESUME:\n${resumeText(resume)}\n\nJOB DETAILS:\n${JSON.stringify({ company: String(application.company || '').slice(0, 120), role: String(application.role || '').slice(0, 120), jobDescription })}` });
    res.json({ result: generated.result, usage: generated.usage });
  } catch (error) { next(error); }
});

export default router;
