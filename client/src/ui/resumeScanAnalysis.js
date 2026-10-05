function findHeading(lines, names) {
  const match = lines.find((line) => names.some((name) => new RegExp(`^(?:${name})(?:\\s*[:|—-].*)?$`, 'i').test(line.trim())));
  return match || '';
}

function excerptAround(text, pattern) {
  const match = text.match(pattern);
  if (!match) return '';
  return text.slice(Math.max(0, match.index - 35), Math.min(text.length, match.index + match[0].length + 55)).replace(/\s+/g, ' ').trim();
}

export function scanResumeText(rawText, source = {}) {
  const text = String(rawText || '').replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const words = text.match(/[\p{L}\p{N}+#.-]+/gu) || [];
  const sections = {
    summary: findHeading(lines, ['summary', 'professional summary', 'profile', 'about me', 'career objective']),
    experience: findHeading(lines, ['experience', 'work experience', 'professional experience', 'employment history', 'work history', 'internships']),
    education: findHeading(lines, ['education', 'academic background', 'qualifications']),
    skills: findHeading(lines, ['skills', 'technical skills', 'core skills', 'competencies', 'technologies']),
    projects: findHeading(lines, ['projects', 'selected projects', 'project experience', 'personal projects']),
  };
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d[\d ().-]{7,}\d)/);
  const profileMatch = text.match(/(?:linkedin\.com\/in\/[^\s]+|github\.com\/[^\s]+|https?:\/\/[^\s]+)/i);
  const bulletLines = lines.filter((line) => /^(?:[•*▪◦–—-]|\d+[.)])\s+/.test(line));
  const metricPattern = /(?:[$₹€£]\s?\d[\d,.]*|\b\d+(?:\.\d+)?\s?(?:%|percent|x|users?|customers?|clients?|projects?|hours?|weeks?|months?|years?|teams?|requests?|tickets?|releases?|students?)\b|\b\d{2,}\+\b)/i;
  const metricMatch = text.match(metricPattern);
  const dateMatch = text.match(/\b(?:19|20)\d{2}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(?:19|20)\d{2}\b/i);
  const sectionBody = (key) => {
    const heading = sections[key];
    if (!heading) return '';
    const index = lines.indexOf(heading);
    return lines.slice(index + 1, Math.min(lines.length, index + 7)).join(' ').slice(0, 220);
  };
  const checks = [
    { id: 'contact', label: 'Contact information', points: 15, ready: Boolean(emailMatch || phoneMatch || profileMatch), evidence: [emailMatch?.[0], phoneMatch?.[0], profileMatch?.[0]].filter(Boolean).join(' · ') || 'No recognizable email, phone, or profile link found.', advice: 'Add an email address and one other contact method or professional profile link.' },
    { id: 'experience', label: 'Experience section', points: 15, ready: Boolean(sections.experience), evidence: sections.experience ? `${sections.experience}: ${sectionBody('experience')}` : 'No clearly labeled experience section found.', advice: 'Use a familiar heading such as “Experience” or “Work Experience.” Include internships, volunteering, or relevant work when applicable.' },
    { id: 'education', label: 'Education section', points: 10, ready: Boolean(sections.education), evidence: sections.education ? `${sections.education}: ${sectionBody('education')}` : 'No clearly labeled education section found.', advice: 'Add an Education section if it is relevant to the role or your career stage.' },
    { id: 'skills', label: 'Skills section', points: 10, ready: Boolean(sections.skills), evidence: sections.skills ? `${sections.skills}: ${sectionBody('skills')}` : 'No clearly labeled skills section found.', advice: 'Use a clear Skills heading and list skills you can support with examples.' },
    { id: 'summary', label: 'Summary or profile', points: 10, ready: Boolean(sections.summary), evidence: sections.summary ? `${sections.summary}: ${sectionBody('summary')}` : 'No clearly labeled summary or profile found.', advice: 'A short, specific introduction can help a reader understand your target and strengths quickly.' },
    { id: 'projects', label: 'Projects section', points: 10, ready: Boolean(sections.projects), evidence: sections.projects ? `${sections.projects}: ${sectionBody('projects')}` : 'No clearly labeled projects section found.', advice: 'For early-career roles, relevant personal, academic, or open-source projects can show applied skills.' },
    { id: 'bullets', label: 'Scannable achievement lines', points: 10, ready: bulletLines.length >= 2, evidence: bulletLines.length ? `${bulletLines.length} bullet-style lines detected. Example: ${bulletLines[0].slice(0, 150)}` : 'No bullet-style lines detected.', advice: 'Use short, separate achievement lines so a reader can scan your contributions.' },
    { id: 'dates', label: 'Timeline details', points: 5, ready: Boolean(dateMatch), evidence: dateMatch ? `Found “${dateMatch[0]}”.` : 'No year or month/year date found.', advice: 'Add accurate dates for roles or education where they help explain your timeline.' },
    { id: 'outcomes', label: 'Specific outcomes', points: 10, ready: Boolean(metricMatch), evidence: metricMatch ? `Found “${excerptAround(text, metricPattern)}”.` : 'No likely numbers or measurable outcomes detected.', advice: 'Where true, include scale, frequency, time saved, users reached, or another result. Do not invent numbers.' },
    { id: 'length', label: 'Readable amount of text', points: 5, ready: words.length >= 120 && words.length <= 1100, evidence: `${words.length} words extracted${source.pages ? ` from ${source.pages} PDF pages` : ''}.`, advice: 'Very short or very long resumes can be harder to scan. Check whether each section is relevant and complete.' },
  ];
  const score = checks.reduce((sum, check) => sum + (check.ready ? check.points : 0), 0);
  return { score, checks, wordCount: words.length, source, missingExtractedText: words.length < 30, detectedSections: Object.entries(sections).filter(([, heading]) => heading).map(([key]) => key), text };
}

export function resumeDraftToText(resume = {}) {
  const content = resume.content || {};
  const sections = [
    [[content.fullName, content.headline].filter(Boolean).join('\n'), [content.email, content.phone, content.location, content.website].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
    content.summary && `SUMMARY\n${content.summary}`,
    (content.experienceEntries || []).length && `EXPERIENCE\n${content.experienceEntries.map((entry) => `${[entry.title, entry.company, [entry.startDate, entry.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}\n${entry.achievements || ''}`).join('\n')}`,
    content.experience && `EXPERIENCE\n${content.experience}`,
    content.education && `EDUCATION\n${content.education}`,
    (content.educationEntries || []).length && `EDUCATION\n${content.educationEntries.map((entry) => `${[entry.institution, entry.degree, [entry.startDate, entry.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}\n${entry.details || ''}`).join('\n')}`,
    content.skills && `SKILLS\n${content.skills}`,
    content.projects && `PROJECTS\n${content.projects}`,
  ].filter(Boolean);
  return sections.join('\n\n');
}
