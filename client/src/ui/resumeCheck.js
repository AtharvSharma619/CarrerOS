const STOP_WORDS = new Set(`a an and are as at be by for from in into is it of on or our the their this to with you your we will work role team experience skills using use build support help develop create design across within ability strong proven responsible excellent good preferred required qualifications responsibilities company job position candidate including`).split(' ');

export function getResumeCheck(resume = {}) {
  const content = resume.content || {};
  const experienceEntries = content.experienceEntries || [];
  const educationEntries = content.educationEntries || [];
  const allFields = [
    content.fullName, content.email, content.phone, content.location, content.website,
    content.headline, content.summary, content.experience, content.education,
    content.skills, content.projects,
    ...experienceEntries.flatMap((entry) => [entry.title, entry.company, entry.achievements]),
    ...educationEntries.flatMap((entry) => [entry.institution, entry.degree, entry.details]),
  ].filter(Boolean);
  const resumeText = allFields.join(' ');
  const experienceText = [content.experience, content.projects, ...experienceEntries.map((entry) => `${entry.title || ''} ${entry.company || ''} ${entry.achievements || ''}`)].filter(Boolean).join('\n');
  const summary = String(content.summary || '').trim();
  const skills = String(content.skills || '').trim();
  const checks = [
    {
      label: 'A way to contact you',
      ready: Boolean(content.email || content.phone || content.website),
      evidence: [content.email, content.phone, content.website].filter(Boolean).join(' · ') || 'No email, phone, or website is listed.',
      advice: 'Add at least one contact method you want employers to use.',
    },
    {
      label: 'A clear target headline',
      ready: String(content.headline || '').trim().length >= 5,
      evidence: String(content.headline || '').trim() || 'No headline is listed.',
      advice: 'Add a short headline that describes the roles you are pursuing.',
    },
    {
      label: 'A useful summary',
      ready: summary.length >= 80,
      evidence: summary ? `Your summary has ${summary.length} characters.` : 'No summary is listed.',
      advice: 'Aim for a few specific sentences about your focus, strengths, and relevant work.',
    },
    {
      label: 'Relevant experience or project evidence',
      ready: experienceText.trim().length >= 40,
      evidence: experienceText.trim().slice(0, 180) || 'No experience or project details are listed.',
      advice: 'Add internships, projects, coursework, volunteering, or other relevant work with your contribution.',
    },
    {
      label: 'A skills section',
      ready: skills.length > 0,
      evidence: skills || 'No skills are listed.',
      advice: 'List relevant skills that you can support with examples in your resume.',
    },
  ];
  const hasNumbers = /(?:\b\d+(?:\.\d+)?\s*%|\b\d{2,}\b|[$₹€£]\s*\d+)/.test(experienceText);
  const metrics = {
    hasNumbers,
    evidence: hasNumbers ? 'A number or measurable result appears in your experience or project text.' : 'No measurable result was detected in your experience or project text.',
    advice: 'Where you have accurate evidence, add scale, frequency, time saved, users reached, or another result. Never invent a number.',
  };
  const template = {
    label: resume.template === 'modern' ? 'Modern, text-based template' : 'Classic, text-first template',
    advice: 'Both CareerOS templates use readable text sections. Keep headings simple and avoid placing key details only in graphics.',
  };
  return { checks, readyCount: checks.filter((check) => check.ready).length, totalChecks: checks.length, metrics, template, resumeText };
}

function tokens(text) {
  return (String(text || '').toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) || [])
    .map((word) => word.replace(/^[.+#-]+|[.+#-]+$/g, ''))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

export function compareResumeToJob(resumeText, jobDescription) {
  const resumeTerms = new Set(tokens(resumeText));
  const counts = new Map();
  for (const word of tokens(jobDescription)) counts.set(word, (counts.get(word) || 0) + 1);
  const terms = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([word]) => word);
  return {
    terms,
    found: terms.filter((word) => resumeTerms.has(word)),
    missing: terms.filter((word) => !resumeTerms.has(word)),
  };
}
