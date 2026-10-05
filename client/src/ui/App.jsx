import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight, Bell, BriefcaseBusiness, Check, ChevronDown, CircleHelp, FileText,
  LayoutDashboard, LogOut, Plus, Search, Sparkles, Target, Trash2, WandSparkles, X,
} from 'lucide-react';

const blankResume = { fullName: '', email: '', phone: '', location: '', website: '', headline: '', summary: '', experience: '', education: '', experienceEntries: [], educationEntries: [], skills: '', projects: '' };
const statuses = ['Saved', 'Applied', 'In review', 'Interview', 'Offer', 'Rejected'];
const API_BASE = import.meta.env.VITE_API_URL || '';

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Something went wrong. Please try again.');
    error.code = data.error?.code;
    throw error;
  }
  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authMode, setAuthMode] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    return query.has('token') ? 'reset' : query.has('verify') ? 'login' : 'landing';
  });
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [authBusy, setAuthBusy] = useState(false);
  const [active, setActive] = useState('Overview');
  const [dashboard, setDashboard] = useState(null);
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [aiUsage, setAiUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState('');
  const [resumeDraft, setResumeDraft] = useState(null);
  const [applicationDraft, setApplicationDraft] = useState({ company: '', role: '', status: 'Saved', url: '', notes: '', jobDescription: '', coverLetter: '', tailoredSuggestions: '', resume: '', appliedAt: new Date().toISOString().slice(0, 10), followUpAt: '' });
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationAiKind, setApplicationAiKind] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [dash, appData, resumeData, usageData] = await Promise.all([api('/dashboard'), api('/applications'), api('/resumes'), api('/ai/usage')]);
      setDashboard(dash); setApplications(appData.applications); setResumes(resumeData.resumes); setAiUsage(usageData.usage);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has('token')) { setReady(true); return; }
    if (query.has('verify')) {
      setReady(true);
      api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: query.get('verify') }) })
        .then((result) => setAuthNotice(result.message))
        .catch((err) => setAuthError(err.message))
        .finally(() => window.history.replaceState({}, '', window.location.pathname));
      return;
    }
    api('/auth/me').then(({ user: current }) => setUser(current)).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  async function submitAuth(event) {
    event.preventDefault(); setAuthBusy(true); setAuthError('');
    const form = new FormData(event.currentTarget);
    try {
      if (authMode === 'reset' && form.get('password') !== form.get('confirmPassword')) throw new Error('The passwords do not match.');
      if (authMode === 'forgot') {
        const result = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: form.get('email') }) });
        setAuthNotice(result.message); return;
      }
      if (authMode === 'reset') {
        const result = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: resetToken, password: form.get('password') }) });
        setAuthNotice(result.message); setAuthMode('login'); setResetToken(''); window.history.replaceState({}, '', window.location.pathname); return;
      }
      const path = authMode === 'register' ? '/auth/register' : '/auth/login';
      const data = await api(path, { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }) });
      if (data.verificationRequired) { setAuthMode('login'); setVerificationNeeded(true); setAuthNotice(data.message); return; }
      setUser(data.user);
    } catch (err) { setAuthError(err.message); if (err.code === 'EMAIL_NOT_VERIFIED') setVerificationNeeded(true); }
    finally { setAuthBusy(false); }
  }

  async function resendVerification() {
    setAuthError(''); setAuthNotice(''); setAuthBusy(true);
    try { const result = await api('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: authEmail }) }); setAuthNotice(result.message); setVerificationNeeded(false); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  }

  async function logout() { await api('/auth/logout', { method: 'POST', body: '{}' }).catch(() => {}); setUser(null); setDashboard(null); }

  async function downloadAccountData() {
    try {
      const data = await api('/account/export');
      const link = document.createElement('a');
      const fileUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      link.href = fileUrl;
      link.download = 'careeros-data.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch (err) { setError(err.message); }
  }

  async function deleteAccount() {
    if (!window.confirm('Permanently delete your CareerOS account, resumes, and applications? This cannot be undone.')) return;
    const password = window.prompt('Enter your account password to confirm:');
    if (!password) return;
    const confirmEmail = window.prompt(`Type ${user.email} to confirm permanent deletion:`);
    if (!confirmEmail) return;
    try {
      await api('/account', { method: 'DELETE', body: JSON.stringify({ password, confirmEmail }) });
      setUser(null); setApplications([]); setResumes([]); setDashboard(null); setModal('');
    } catch (err) { setError(err.message); setModal(''); }
  }

  function startResume(resume = null) {
    setResumeDraft(resume ? { ...resume, content: { ...blankResume, ...resume.content } } : { title: 'My resume', content: { ...blankResume }, template: 'classic' });
    setModal('resume');
  }

  function updateResumeEntry(section, index, field, value) {
    setResumeDraft((draft) => {
      const entries = [...(draft.content[section] || [])];
      entries[index] = { ...entries[index], [field]: value };
      return { ...draft, content: { ...draft.content, [section]: entries } };
    });
  }

  function addResumeEntry(section, entry) {
    setResumeDraft((draft) => ({ ...draft, content: { ...draft.content, [section]: [...(draft.content[section] || []), entry] } }));
  }

  function removeResumeEntry(section, index) {
    setResumeDraft((draft) => ({ ...draft, content: { ...draft.content, [section]: draft.content[section].filter((_, itemIndex) => itemIndex !== index) } }));
  }

  async function saveResume(event) {
    event.preventDefault(); setError('');
    try {
      const data = await api(resumeDraft._id ? `/resumes/${resumeDraft._id}` : '/resumes', { method: resumeDraft._id ? 'PATCH' : 'POST', body: JSON.stringify(resumeDraft), });
      setModal(''); setResumeDraft(null); await refresh();
      if (data.resume) setActive('My resumes');
    } catch (err) { setError(err.message); }
  }

  async function removeResume(id) {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return;
    try { await api(`/resumes/${id}`, { method: 'DELETE' }); await refresh(); } catch (err) { setError(err.message); }
  }

  function reviewResume(resume) {
    if (!resume?._id) {
      setError('Save your resume first, then you can get feedback on it.');
      setModal('');
      return;
    }
    setResumeDraft(resume);
    setAiError(''); setAiResult(''); setModal('ai-choice');
  }

  async function saveApplication(event) {
    event.preventDefault(); setError('');
    try {
      await api('/applications', { method: 'POST', body: JSON.stringify(applicationDraft) });
      setModal(''); setSelectedApplication(null); setApplicationDraft({ company: '', role: '', status: 'Saved', url: '', notes: '', jobDescription: '', coverLetter: '', tailoredSuggestions: '', resume: '', appliedAt: new Date().toISOString().slice(0, 10), followUpAt: '' }); await refresh();
    } catch (err) { setError(err.message); }
  }

  function openCreateApplication() {
    setSelectedApplication(null);
    setApplicationDraft({ company: '', role: '', status: 'Saved', url: '', notes: '', jobDescription: '', coverLetter: '', tailoredSuggestions: '', resume: '', appliedAt: new Date().toISOString().slice(0, 10), followUpAt: '' });
    setModal('application');
  }

  function openApplication(item) {
    setSelectedApplication(item);
    setApplicationDraft({
      company: item.company || '', role: item.role || '', status: item.status || 'Applied',
      url: item.url || '', notes: item.notes || '', jobDescription: item.jobDescription || '',
      coverLetter: item.coverLetter || '', tailoredSuggestions: item.tailoredSuggestions || '',
      resume: item.resume?._id || item.resume || '',
      appliedAt: item.appliedAt ? new Date(item.appliedAt).toISOString().slice(0, 10) : '',
      followUpAt: item.followUpAt ? new Date(item.followUpAt).toISOString().slice(0, 10) : '',
    });
    setModal('application-details');
  }

  async function saveApplicationDetails(event) {
    event.preventDefault(); setError('');
    try {
      await api(`/applications/${selectedApplication._id}`, { method: 'PATCH', body: JSON.stringify(applicationDraft) });
      setModal(''); setSelectedApplication(null); await refresh();
    } catch (err) { setError(err.message); }
  }

  async function updateStatus(id, status) {
    try { await api(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await refresh(); } catch (err) { setError(err.message); }
  }
  async function removeApplication(id) {
    if (!window.confirm('Delete this application?')) return;
    try { await api(`/applications/${id}`, { method: 'DELETE' }); await refresh(); } catch (err) { setError(err.message); }
  }

  async function runAi(kind, resume) {
    setAiBusy(true); setAiError(''); setAiResult(''); setModal(kind === 'analyze' ? 'analyze-result' : 'tailor');
    try {
      const route = kind === 'analyze' ? `/ai/resumes/${resume._id}/analyze` : `/ai/resumes/${resume._id}/tailor`;
      const data = await api(route, { method: 'POST', body: JSON.stringify({ jobDescription }) });
      setAiResult(data.result);
      const usageData = await api('/ai/usage'); setAiUsage(usageData.usage);
    } catch (err) { setAiError(err.message); }
    finally { setAiBusy(false); }
  }

  async function makeCoverLetter() {
    if (selectedApplication?._id) {
      await runApplicationAi('cover-letter');
      return;
    }
    const resume = resumes[0];
    if (!resume) { setAiError('Create a resume first, then come back to draft a cover letter.'); return; }
    setAiBusy(true); setAiError(''); setAiResult('');
    try {
      const data = await api('/ai/applications/cover-letter', { method: 'POST', body: JSON.stringify({ resumeId: resume._id, application: { company: applicationDraft.company, role: applicationDraft.role }, jobDescription }) });
      setAiResult(data.result);
      const usageData = await api('/ai/usage'); setAiUsage(usageData.usage);
    } catch (err) { setAiError(err.message); }
    finally { setAiBusy(false); }
  }

  async function runApplicationAi(kind) {
    if (!selectedApplication?._id) { setAiError('Save this opportunity first so the draft stays with its application.'); return; }
    if (!applicationDraft.resume) { setAiError('Choose a resume for this application first.'); return; }
    setApplicationAiKind(kind); setAiBusy(true); setAiError(''); setAiResult(''); setModal('application-ai');
    try {
      await api(`/applications/${selectedApplication._id}`, { method: 'PATCH', body: JSON.stringify(applicationDraft) });
      const endpoint = kind === 'cover-letter' ? 'cover-letter' : 'tailor';
      const data = await api(`/ai/applications/${selectedApplication._id}/${endpoint}`, { method: 'POST', body: JSON.stringify({ resumeId: applicationDraft.resume }) });
      setAiResult(data.result); if (data.usage) setAiUsage(data.usage);
      setApplicationDraft((draft) => ({ ...draft, [kind === 'cover-letter' ? 'coverLetter' : 'tailoredSuggestions']: data.result }));
      setSelectedApplication(data.application);
      await refresh();
    } catch (err) { setAiError(err.message); }
    finally { setAiBusy(false); }
  }

  if (!ready) return <div className="loading-screen"><div className="brand-mark"><Target size={18}/></div><span>Getting your workspace ready…</span></div>;
  if (!user) return <AuthScreen mode={authMode} setMode={(mode) => { setAuthError(''); setAuthNotice(''); setVerificationNeeded(false); setAuthMode(mode); }} onSubmit={submitAuth} error={authError} notice={authNotice} busy={authBusy} email={authEmail} setEmail={setAuthEmail} verificationNeeded={verificationNeeded} onResend={resendVerification}/>;

  const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase();
  const stats = dashboard?.stats || { activeApplications: 0, interviews: 0, profileStrength: 0, resumeCount: 0, applicationCount: 0 };
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" aria-label="CareerOS home"><span className="brand-mark"><Target size={18} strokeWidth={2.5}/></span><span>career<span className="brand-light">OS</span></span></a>
      <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
      <div className="profile-switch"><div className="avatar">{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="profile-copy"><strong>{user.name}</strong><span>Personal workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">MENU</div><nav aria-label="Main navigation">
        {[['Overview', LayoutDashboard], ['My resumes', FileText], ['Applications', BriefcaseBusiness]].map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'selected' : ''}`} onClick={() => setActive(label)}><Icon size={17}/><span>{label}</span>{label === 'Applications' && applications.length > 0 && <small>{applications.length}</small>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={15}/></div><strong>Make your next move</strong><p>Get more from every application with thoughtful AI tools.</p>{aiUsage && <small className="ai-usage-count">AI drafts this month: {aiUsage.remaining} of {aiUsage.limit} left</small>}<button onClick={() => { setSelectedApplication(null); setModal('cover'); }}>Try AI tools <ArrowRight size={14}/></button></div><button className="nav-item help" onClick={() => setModal('help')}><CircleHelp size={17}/><span>Help & support</span></button><button className="nav-item logout-button" onClick={logout}><LogOut size={16}/><span>Sign out</span></button><div className="sidebar-foot">CAREEROS <span>·</span> YOUR CAREER, IN MOTION</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Search" onClick={() => document.querySelector('.search-input')?.focus()}><Search size={17}/></button><div className="top-avatar">{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div></div></header>
      <div className="page-content">
        {error && <div className="notice-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={14}/></button></div>}
        {active === 'Overview' && <>
          <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/>{today}</div><h1>Your next move<br className="mobile-break"/> starts here, {user.name.split(' ')[0]}<span className="period">.</span></h1><p className="intro">A little progress adds up. Here’s where your search stands.</p></div><button className="primary-button" onClick={openCreateApplication}><Plus size={17}/> Add application</button></div>
          <section className="stats-grid" aria-label="Job search overview">
            <article className="stat-card"><div className="stat-top"><span>Active applications</span><span className="stat-icon mint"><BriefcaseBusiness size={17}/></span></div><div className="stat-number">{String(stats.activeApplications).padStart(2, '0')}</div><div className="stat-foot">{stats.followUpsDue ? `${stats.followUpsDue} follow-up${stats.followUpsDue === 1 ? '' : 's'} due` : `${stats.applicationCount} total in your tracker`}</div></article>
            <article className="stat-card"><div className="stat-top"><span>Interviews</span><span className="stat-icon lilac"><Target size={17}/></span></div><div className="stat-number">{String(stats.interviews).padStart(2, '0')}</div><div className="stat-foot"><span className="foot-dot purple"/><span>Keep your follow-ups moving</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Profile strength</span><span className="stat-icon peach"><Sparkles size={17}/></span></div><div className="stat-number">{stats.profileStrength}<span className="percent">%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${stats.profileStrength}%` }}/></div><div className="stat-foot">{stats.resumeCount ? 'Based on your latest resume' : 'Create a resume to get started'}</div></article>
          </section>
          <section className="content-grid">
            <article className="panel applications-panel"><div className="panel-heading"><div><div className="section-kicker">KEEP THE MOMENTUM</div><h2>Recent applications</h2></div><button className="text-button" onClick={() => setActive('Applications')}>View all <ArrowRight size={14}/></button></div>
              <div className="application-list">{(dashboard?.recentApplications || []).slice(0, 4).map((item) => <div className="application-row" key={item._id}><div className="company-mark violet">{item.company?.slice(0, 1).toUpperCase()}</div><div className="company-info"><strong>{item.company}</strong><span>{item.role}</span></div><select aria-label={`Status for ${item.company}`} className="status-select" value={item.status} onChange={(event) => updateStatus(item._id, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><span className="application-date">{new Date(item.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>)}
                {!dashboard?.recentApplications?.length && <div className="empty-state"><BriefcaseBusiness size={20}/><span>Your application list starts here.</span><button onClick={openCreateApplication}>Add your first application</button></div>}
              </div><button className="all-applications" onClick={() => setActive('Applications')}>See all {stats.applicationCount} applications <ArrowRight size={14}/></button></article>
            <article className="panel resume-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR STORY, SHARPER</div><h2>Resume studio</h2></div><span className="tiny-spark"><Sparkles size={15}/></span></div><div className="resume-card-list">{resumes.slice(0, 2).map((resume) => <button className="resume-list-item" key={resume._id} onClick={() => startResume(resume)}><span className="resume-icon"><FileText size={16}/></span><span><b>{resume.title}</b><small>Updated {new Date(resume.updatedAt).toLocaleDateString()}</small></span><ArrowRight size={14}/></button>)}{!resumes.length && <div className="empty-state compact"><FileText size={20}/><span>Your first resume is one step away.</span></div>}</div><button className="resume-action" onClick={() => startResume()}>Create a resume <Plus size={15}/></button></article>
          </section>
          {(dashboard?.upcomingFollowUps || []).length > 0 && <section className="panel follow-up-panel"><div className="panel-heading"><div><div className="section-kicker">KEEP YOUR PROMISE TO FOLLOW UP</div><h2>Upcoming follow-ups</h2></div><button className="text-button" onClick={() => setActive('Applications')}>View tracker <ArrowRight size={14}/></button></div><div className="follow-up-list">{dashboard.upcomingFollowUps.map((item) => <button className="follow-up-item" key={item._id} onClick={() => openApplication(item)}><span className="follow-up-date">{new Date(item.followUpAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span className="follow-up-company"><b>{item.company}</b><small>{item.role}</small></span><span className={`follow-up-state ${new Date(item.followUpAt) < new Date(new Date().setHours(0, 0, 0, 0)) ? 'overdue' : ''}`}>{new Date(item.followUpAt) < new Date(new Date().setHours(0, 0, 0, 0)) ? 'Overdue' : 'Reminder'}</span><ArrowRight size={14}/></button>)}</div></section>}
          <section className="nudge-banner"><div className="nudge-illustration"><div className="nudge-sun"/><div className="nudge-card"><Sparkles size={17}/><span/><span/><span/></div></div><div className="nudge-copy"><div className="section-kicker">A SMALL NEXT STEP</div><h2>Make every application feel personal.</h2><p>Get thoughtful feedback or tailor a resume using your experience and a job description.</p></div><button className="nudge-button" onClick={() => { setSelectedApplication(null); setModal('cover'); }}>Explore AI tools <ArrowRight size={15}/></button></section>
        </>}

        {active === 'My resumes' && <><div className="list-page-heading"><div><div className="eyebrow"><span className="live-dot"/> YOUR CAREER STORY</div><h1>Resume studio<span className="period">.</span></h1><p className="intro">Build, edit, and prepare a resume for your next opportunity.</p></div><button className="primary-button" onClick={() => startResume()}><Plus size={17}/> New resume</button></div><div className="resume-grid">{resumes.map((resume) => <article className="resume-tile" key={resume._id}><div className="resume-tile-top"><span className="resume-icon"><FileText size={19}/></span><button className="delete-button" onClick={() => removeResume(resume._id)} aria-label="Delete resume"><Trash2 size={15}/></button></div><h2>{resume.title}</h2><p>{resume.content?.headline || 'Add a professional headline'}</p><div className="tile-meta">Updated {new Date(resume.updatedAt).toLocaleDateString()}</div><div className="tile-actions"><button onClick={() => startResume(resume)}>Edit resume</button><button onClick={() => { setResumeDraft(resume); setModal('preview'); }}>Preview / print</button><button onClick={() => reviewResume(resume)}>AI review</button></div></article>)}<button className="new-resume-tile" onClick={() => startResume()}><span><Plus size={20}/></span><b>Create a resume</b><small>Start with your experience and shape your story.</small></button></div></>}

        {active === 'Applications' && <><div className="list-page-heading"><div><div className="eyebrow"><span className="live-dot"/> YOUR SEARCH, ORGANIZED</div><h1>Applications<span className="period">.</span></h1><p className="intro">Track each opportunity and keep your next step close.</p></div><button className="primary-button" onClick={openCreateApplication}><Plus size={17}/> Add application</button></div><div className="panel full-list-panel"><div className="panel-heading"><div><div className="section-kicker">APPLICATION PIPELINE</div><h2>{applications.length} opportunities</h2></div><input className="search-input" value={applicationSearch} placeholder="Search companies or roles" onChange={(event) => setApplicationSearch(event.target.value)}/></div><div className="application-list full-list">{applications.filter((item) => `${item.company} ${item.role} ${item.status}`.toLowerCase().includes(applicationSearch.toLowerCase())).map((item) => <div className="application-row" data-application key={item._id}><div className="company-mark violet">{item.company?.slice(0, 1).toUpperCase()}</div><div className="company-info"><strong>{item.company}</strong><span>{item.role}{item.url && <> · <a href={item.url} target="_blank" rel="noreferrer">Job post</a></>}</span></div><select aria-label={`Status for ${item.company}`} className="status-select" value={item.status} onChange={(event) => updateStatus(item._id, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><span className="application-date">{item.followUpAt ? `Follow up ${new Date(item.followUpAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : new Date(item.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><button className="application-open" onClick={() => openApplication(item)}>Details</button><button className="delete-button" onClick={() => removeApplication(item._id)} aria-label={`Delete ${item.company} application`}><Trash2 size={15}/></button></div>)}{!applications.length && <div className="empty-state"><BriefcaseBusiness size={22}/><span>No applications yet. Add one to start tracking your search.</span><button onClick={openCreateApplication}>Add application</button></div>}{applications.length > 0 && !applications.filter((item) => `${item.company} ${item.role} ${item.status}`.toLowerCase().includes(applicationSearch.toLowerCase())).length && <div className="empty-state">No applications match “{applicationSearch}”.</div>}</div></div></>}
        <footer className="page-footer"><span>One step at a time. You’ve got this.</span><span>Made for the journey <span className="heart">♥</span></span></footer>
      </div>
    </main>

    {modal === 'resume' && resumeDraft && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="resume-form-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button><div className="section-kicker">RESUME STUDIO</div><h2 id="resume-form-title">{resumeDraft._id ? 'Edit your resume' : 'Create your resume'}</h2><p className="modal-intro">Write in your own words. You can preview and print a clean, ATS-friendly copy.</p><form onSubmit={saveResume} className="editor-form"><div className="form-grid"><label>Resume title<input required maxLength="100" value={resumeDraft.title} onChange={(e) => setResumeDraft({ ...resumeDraft, title: e.target.value })}/></label><label>Template<select value={resumeDraft.template || 'classic'} onChange={(e) => setResumeDraft({ ...resumeDraft, template: e.target.value })}><option value="classic">Classic · simple and ATS-friendly</option><option value="modern">Modern · subtle color accent</option></select></label></div><div className="form-grid"><label>Full name<input maxLength="100" value={resumeDraft.content.fullName} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, fullName: e.target.value } })}/></label><label>Professional headline<input maxLength="160" placeholder="Product designer" value={resumeDraft.content.headline} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, headline: e.target.value } })}/></label><label>Email<input type="email" value={resumeDraft.content.email} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, email: e.target.value } })}/></label><label>Phone<input value={resumeDraft.content.phone} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, phone: e.target.value } })}/></label><label>Location<input value={resumeDraft.content.location} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, location: e.target.value } })}/></label><label>Website / LinkedIn<input value={resumeDraft.content.website} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, website: e.target.value } })}/></label></div>{[['summary','Professional summary'],['skills','Skills'],['projects','Projects']].map(([field,label]) => <label key={field}>{label}<textarea rows={field === 'summary' ? 3 : 4} value={resumeDraft.content[field]} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, [field]: e.target.value } })} placeholder={field === 'skills' ? 'Separate skills with commas' : ''}/></label>)}
<div className="resume-entry-section"><div className="entry-section-heading"><div><b>Experience</b><small>Add each role separately, with a few impact-focused bullet points.</small></div><button type="button" className="secondary-button" onClick={() => addResumeEntry('experienceEntries', { title: '', company: '', location: '', startDate: '', endDate: '', achievements: '' })}><Plus size={13}/> Add role</button></div>{(resumeDraft.content.experienceEntries || []).map((entry, index) => <div className="resume-entry-card" key={entry._id || index}><div className="entry-card-heading"><strong>Role {index + 1}</strong><button type="button" onClick={() => removeResumeEntry('experienceEntries', index)}>Remove</button></div><div className="form-grid"><label>Job title<input value={entry.title || ''} onChange={(e) => updateResumeEntry('experienceEntries', index, 'title', e.target.value)}/></label><label>Company<input value={entry.company || ''} onChange={(e) => updateResumeEntry('experienceEntries', index, 'company', e.target.value)}/></label><label>Location<input value={entry.location || ''} onChange={(e) => updateResumeEntry('experienceEntries', index, 'location', e.target.value)}/></label><label>Dates<input placeholder="Jan 2024 – Present" value={[entry.startDate, entry.endDate].filter(Boolean).join(' – ')} onChange={(e) => { const [startDate = '', ...endParts] = e.target.value.split(' – '); updateResumeEntry('experienceEntries', index, 'startDate', startDate); updateResumeEntry('experienceEntries', index, 'endDate', endParts.join(' – ')); }}/></label></div><label>Highlights and achievements<textarea rows="4" maxLength="3000" placeholder="One achievement per line. Start with an action and include a result when you know it." value={entry.achievements || ''} onChange={(e) => updateResumeEntry('experienceEntries', index, 'achievements', e.target.value)}/></label></div>)}{resumeDraft.content.experience && <label>Previous experience notes<textarea rows="3" value={resumeDraft.content.experience} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, experience: e.target.value } })}/></label>}</div>
<div className="resume-entry-section"><div className="entry-section-heading"><div><b>Education</b><small>Add schools, qualifications, or relevant coursework.</small></div><button type="button" className="secondary-button" onClick={() => addResumeEntry('educationEntries', { institution: '', degree: '', location: '', startDate: '', endDate: '', details: '' })}><Plus size={13}/> Add education</button></div>{(resumeDraft.content.educationEntries || []).map((entry, index) => <div className="resume-entry-card" key={entry._id || index}><div className="entry-card-heading"><strong>Education {index + 1}</strong><button type="button" onClick={() => removeResumeEntry('educationEntries', index)}>Remove</button></div><div className="form-grid"><label>Institution<input value={entry.institution || ''} onChange={(e) => updateResumeEntry('educationEntries', index, 'institution', e.target.value)}/></label><label>Degree / qualification<input value={entry.degree || ''} onChange={(e) => updateResumeEntry('educationEntries', index, 'degree', e.target.value)}/></label><label>Location<input value={entry.location || ''} onChange={(e) => updateResumeEntry('educationEntries', index, 'location', e.target.value)}/></label><label>Dates<input placeholder="2022 – 2026" value={[entry.startDate, entry.endDate].filter(Boolean).join(' – ')} onChange={(e) => { const [startDate = '', ...endParts] = e.target.value.split(' – '); updateResumeEntry('educationEntries', index, 'startDate', startDate); updateResumeEntry('educationEntries', index, 'endDate', endParts.join(' – ')); }}/></label></div><label>Details<textarea rows="2" maxLength="2000" placeholder="Honors, coursework, or activities" value={entry.details || ''} onChange={(e) => updateResumeEntry('educationEntries', index, 'details', e.target.value)}/></label></div>)}{resumeDraft.content.education && <label>Previous education notes<textarea rows="3" value={resumeDraft.content.education} onChange={(e) => setResumeDraft({ ...resumeDraft, content: { ...resumeDraft.content, education: e.target.value } })}/></label>}</div>
<div className="form-actions"><button type="button" className="secondary-button" onClick={() => reviewResume(resumeDraft)}>AI review</button><button className="primary-button"><Check size={15}/> Save resume</button></div></form></div></div>}

    {modal === 'application' && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="application-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button><div className="stat-icon mint"><BriefcaseBusiness size={18}/></div><h2 id="application-title">Add an opportunity</h2><p className="modal-intro">Paste a listing to capture its description, then review the suggested details before saving.</p><form onSubmit={saveApplication} className="editor-form"><JobCapture onCapture={(capture) => setApplicationDraft((draft) => ({ ...draft, jobDescription: capture.text, ...(capture.role && !draft.role ? { role: capture.role } : {}), ...(capture.company && !draft.company ? { company: capture.company } : {}) }))}/><div className="form-grid"><label>Company<input required maxLength="120" value={applicationDraft.company} onChange={(e) => setApplicationDraft({ ...applicationDraft, company: e.target.value })} placeholder="Company name"/></label><label>Role<input required maxLength="120" value={applicationDraft.role} onChange={(e) => setApplicationDraft({ ...applicationDraft, role: e.target.value })} placeholder="Job title"/></label><label>Status<select value={applicationDraft.status} onChange={(e) => setApplicationDraft({ ...applicationDraft, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Applied / saved date<input type="date" value={applicationDraft.appliedAt} onChange={(e) => setApplicationDraft({ ...applicationDraft, appliedAt: e.target.value })}/></label><label>Follow-up date<input type="date" value={applicationDraft.followUpAt} onChange={(e) => setApplicationDraft({ ...applicationDraft, followUpAt: e.target.value })}/></label><label>Resume for this role<select value={applicationDraft.resume} onChange={(e) => setApplicationDraft({ ...applicationDraft, resume: e.target.value })}><option value="">Choose later</option>{resumes.map((resume) => <option key={resume._id} value={resume._id}>{resume.title}</option>)}</select></label></div><label>Job post link<input type="url" value={applicationDraft.url} onChange={(e) => setApplicationDraft({ ...applicationDraft, url: e.target.value })} placeholder="https://"/></label><label>Job description<textarea rows="5" maxLength="12000" value={applicationDraft.jobDescription} onChange={(e) => setApplicationDraft({ ...applicationDraft, jobDescription: e.target.value })} placeholder="Paste the job description here so you can tailor your materials to this role."/></label><label>Notes<textarea rows="3" maxLength="3000" value={applicationDraft.notes} onChange={(e) => setApplicationDraft({ ...applicationDraft, notes: e.target.value })} placeholder="Recruiter, next steps, what stood out…"/></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setModal('')}>Cancel</button><button className="primary-button"><Plus size={15}/> Save opportunity</button></div></form></div></div>}

    {modal === 'application-details' && selectedApplication && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="application-details-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button><div className="section-kicker">APPLICATION WORKSPACE</div><h2 id="application-details-title">{selectedApplication.company}</h2><p className="modal-intro">Keep the job details, next steps, resume, and writing drafts together.</p><form onSubmit={saveApplicationDetails} className="editor-form"><div className="form-grid"><label>Company<input required value={applicationDraft.company} onChange={(e) => setApplicationDraft({ ...applicationDraft, company: e.target.value })}/></label><label>Role<input required value={applicationDraft.role} onChange={(e) => setApplicationDraft({ ...applicationDraft, role: e.target.value })}/></label><label>Status<select value={applicationDraft.status} onChange={(e) => setApplicationDraft({ ...applicationDraft, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Applied / saved date<input type="date" value={applicationDraft.appliedAt} onChange={(e) => setApplicationDraft({ ...applicationDraft, appliedAt: e.target.value })}/></label><label>Follow-up date<input type="date" value={applicationDraft.followUpAt} onChange={(e) => setApplicationDraft({ ...applicationDraft, followUpAt: e.target.value })}/></label><label>Resume for this role<select value={applicationDraft.resume} onChange={(e) => setApplicationDraft({ ...applicationDraft, resume: e.target.value })}><option value="">Choose a resume</option>{resumes.map((resume) => <option key={resume._id} value={resume._id}>{resume.title}</option>)}</select></label></div><label>Job post link<input type="url" value={applicationDraft.url} onChange={(e) => setApplicationDraft({ ...applicationDraft, url: e.target.value })} placeholder="https://"/></label><label>Job description<textarea rows="5" maxLength="12000" value={applicationDraft.jobDescription} onChange={(e) => setApplicationDraft({ ...applicationDraft, jobDescription: e.target.value })}/></label><label>Notes<textarea rows="3" maxLength="3000" value={applicationDraft.notes} onChange={(e) => setApplicationDraft({ ...applicationDraft, notes: e.target.value })}/></label>{aiError && <div className="form-error">{aiError}</div>}<div className="application-ai-actions"><button type="button" className="secondary-button" onClick={() => runApplicationAi('tailor')}>Tailor resume with AI</button><button type="button" className="secondary-button" onClick={() => runApplicationAi('cover-letter')}>Draft cover letter</button></div><label>Cover letter draft<textarea rows="7" maxLength="12000" value={applicationDraft.coverLetter} onChange={(e) => setApplicationDraft({ ...applicationDraft, coverLetter: e.target.value })} placeholder="Generate a draft above, then review and edit it here."/></label><label>Resume tailoring suggestions<textarea rows="7" maxLength="12000" value={applicationDraft.tailoredSuggestions} onChange={(e) => setApplicationDraft({ ...applicationDraft, tailoredSuggestions: e.target.value })} placeholder="Save tailored suggestions for this opportunity."/></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setModal('')}>Close</button><button className="primary-button"><Check size={15}/> Save changes</button></div></form></div></div>}

    {modal === 'application-ai' && <div className="modal-backdrop" onClick={() => setModal('application-details')}><div className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="application-ai-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal('application-details')} aria-label="Close"><X size={18}/></button><div className="stat-icon lilac"><WandSparkles size={18}/></div><div className="section-kicker ai-kicker">SAVED WITH THIS OPPORTUNITY</div><h2 id="application-ai-title">{applicationAiKind === 'cover-letter' ? 'Cover letter draft' : 'Resume tailoring suggestions'}</h2><p className="modal-intro">Review and edit the draft before using it. AI suggestions are saved with this application.</p>{aiBusy && <div className="ai-loading"><span className="live-dot"/> Working on a thoughtful draft…</div>}{aiError && <div className="form-error ai-error">{aiError}</div>}{aiResult && <div className="ai-result"><div className="result-heading">DRAFT · REVIEW BEFORE USING <button className="secondary-button" onClick={() => navigator.clipboard?.writeText(aiResult)}>Copy text</button></div><pre>{aiResult}</pre></div>}<div className="form-actions"><button className="secondary-button" onClick={() => setModal('application-details')}>Back to opportunity</button></div></div></div>}

    {(modal === 'analyze-result' || modal === 'tailor' || modal === 'cover') && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="ai-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button><div className="stat-icon lilac"><WandSparkles size={18}/></div><div className="section-kicker ai-kicker">AI CAREER TOOLS</div><h2 id="ai-title">{modal === 'cover' ? 'Draft a cover letter' : modal === 'tailor' ? 'Tailor your resume' : 'Your resume feedback'}</h2><p className="modal-intro">When you generate a draft, your resume and job description are sent to the AI provider configured for this app. Review suggestions before using them; they should never add experience you don’t have.</p>{modal !== 'analyze-result' && <>{modal === 'cover' && <div className="form-grid"><label>Company<input value={applicationDraft.company} onChange={(e) => setApplicationDraft({ ...applicationDraft, company: e.target.value })} placeholder="Company name"/></label><label>Role<input value={applicationDraft.role} onChange={(e) => setApplicationDraft({ ...applicationDraft, role: e.target.value })} placeholder="Role title"/></label></div>}<label>Job description<textarea className="ai-job-input" rows="5" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here…"/></label><button className="primary-button ai-run" disabled={aiBusy} onClick={modal === 'cover' ? makeCoverLetter : () => runAi('tailor', resumeDraft)}>{aiBusy ? 'Working…' : modal === 'cover' ? 'Draft with my resume' : 'Get tailoring suggestions'}<Sparkles size={15}/></button></>}{aiBusy && <div className="ai-loading"><span className="live-dot"/> Working on a thoughtful draft…</div>}{aiError && <div className="form-error ai-error">{aiError}</div>}{aiResult && <div className="ai-result"><div className="result-heading">DRAFT · REVIEW BEFORE USING <button className="secondary-button" onClick={() => navigator.clipboard?.writeText(aiResult)}>Copy text</button></div><pre>{aiResult}</pre></div>}</div></div>}

    {modal === 'ai-choice' && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="choice-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button><div className="stat-icon lilac"><Sparkles size={18}/></div><h2 id="choice-title">Give your resume a closer look</h2><p className="modal-intro">Choose a helpful next step. Suggestions are drafts for you to review.</p><button className="choice-button" onClick={() => runAi('analyze', resumeDraft)}><span><b>Review my resume</b><small>Get clarity, impact, and ATS readability feedback</small></span><ArrowRight size={15}/></button><button className="choice-button" onClick={() => { setModal('tailor'); setAiResult(''); setAiError(''); }}><span><b>Tailor to a job</b><small>Compare your resume with a job description</small></span><ArrowRight size={15}/></button></div></div>}

    {modal === 'preview' && resumeDraft && <div className="modal-backdrop preview-backdrop" onClick={() => setModal('')}><div className="print-preview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="preview-toolbar"><span>Resume preview</span><div><button className="secondary-button" onClick={() => window.print()}>Print / Save PDF</button><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button></div></div><ResumePreview resume={resumeDraft}/></div></div>}
    {modal === 'help' && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="modal-close" onClick={() => setModal('')} aria-label="Close"><X size={18}/></button><div className="stat-icon mint"><CircleHelp size={18}/></div><h2 id="help-title">CareerOS help & privacy</h2><p className="modal-intro">Your account, resumes, and applications are private. When you request AI help, the resume and job description are sent to the AI provider configured by this app. Review generated suggestions before using them. You can export or permanently delete your data below.</p><div className="account-actions"><button className="secondary-button" onClick={downloadAccountData}>Download my data</button><button className="danger-button" onClick={deleteAccount}>Delete my account</button></div><button className="primary-button help-done" onClick={() => setModal('')}>Done <Check size={15}/></button></div></div>}
  </div>;
}

function JobCapture({ onCapture }) {
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  function captureJob() {
    const cleaned = text.replace(/\r/g, '').trim();
    if (!cleaned) { setMessage('Paste the job listing text first.'); return; }
    const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
    const roleLine = lines.find((line) => line.length >= 4 && line.length <= 120 && !/^(apply|apply now|share|save job|job details|description|about the job|requirements|responsibilities)$/i.test(line));
    const companyMatch = cleaned.match(/(?:company|employer)\s*[:\-]\s*([^\n]{2,120})/i)
      || cleaned.match(/([^\n]{2,100}?)\s+(?:is hiring|is looking for|is seeking)\b/i);
    const roleAtCompany = roleLine?.match(/^(.+?)\s+(?:at|@)\s+([^|·]{2,80})$/i);
    const company = (companyMatch?.[1] || roleAtCompany?.[2] || '').trim().replace(/[|·•-]$/, '');
    const role = (roleAtCompany?.[1] || roleLine || '').replace(/^(job title|role)\s*[:\-]\s*/i, '').trim();
    onCapture({ text: cleaned.slice(0, 12000), role, company });
    setMessage('Listing copied into the job description. Check the suggested title and company before saving.');
  }

  return <section className="job-capture" aria-label="Paste a job listing">
    <div><strong>Quick capture</strong><span>Copy the job post text from any site and paste it here. It stays in your account.</span></div>
    <textarea rows="4" maxLength="12000" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the job listing, including the role and company if shown…"/>
    <div className="job-capture-actions"><small>{text.length.toLocaleString()} / 12,000 characters</small><button type="button" className="secondary-button" onClick={captureJob}>Use this listing</button></div>
    {message && <small className="job-capture-message" role="status">{message}</small>}
  </section>;
}

function AuthScreen({ mode, setMode, onSubmit, error, notice, busy, email, setEmail, verificationNeeded, onResend }) {
  if (mode === 'landing') return <LandingPage setMode={setMode}/>;
  const heading = mode === 'register' ? 'Make your next move.' : mode === 'forgot' ? 'Reset your password.' : mode === 'reset' ? 'Choose a new password.' : 'Welcome back.';
  const description = mode === 'register' ? 'Create your free workspace and get organized.' : mode === 'forgot' ? 'We’ll email you a secure link if an account matches.' : mode === 'reset' ? 'Choose a new password for your CareerOS account.' : 'Sign in to pick up where you left off.';
  const submitLabel = mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Sign in';

  return (
    <div className="auth-page">
      <a className="brand auth-brand" href="#home">
        <span className="brand-mark"><Target size={18}/></span>
        <span>career<span className="brand-light">OS</span></span>
      </a>
      <div className="auth-card">
        <div className="section-kicker">A CALMER JOB SEARCH</div>
        <h1>{heading}</h1>
        <p>{description}</p>
        <form onSubmit={onSubmit} className="stack-form">
          {mode === 'register' && <label>Your name<input name="name" autoComplete="name" minLength="2" maxLength="80" required placeholder="Alex Smith"/></label>}
          {mode !== 'reset' && <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)}/></label>}
          {mode !== 'forgot' && <label>{mode === 'reset' ? 'New password' : 'Password'}<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" maxLength="128" required placeholder="At least 8 characters"/></label>}
          {mode === 'reset' && <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" maxLength="128" required placeholder="Enter the new password again"/></label>}
          {notice && <div className="auth-notice" role="status">{notice}</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Please wait…' : submitLabel}<ArrowRight size={15}/></button>
        </form>
        {mode === 'login' && <button className="auth-link forgot-link" onClick={() => setMode('forgot')}>Forgot password?</button>}
        {verificationNeeded && <button className="auth-link" disabled={busy} onClick={onResend}>Resend verification email</button>}
        {mode === 'forgot' && <div className="auth-switch"><button onClick={() => setMode('login')}>Back to sign in</button></div>}
        {mode === 'reset' && <div className="auth-switch">Reset link not working? <button onClick={() => setMode('forgot')}>Request another</button></div>}
        {mode === 'login' && <div className="auth-switch">New to CareerOS? <button onClick={() => setMode('register')}>Create an account</button></div>}
        {mode === 'register' && <div className="auth-switch">Already have an account? <button onClick={() => setMode('login')}>Sign in</button></div>}
        <div className="auth-note"><Check size={14}/> Your career information stays private to your account.</div>
      </div>
      <div className="auth-side-note">Make a little progress, every day.</div>
    </div>
  );
}

function LandingPage({ setMode }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="brand" href="#home"><span className="brand-mark"><Target size={18}/></span><span>career<span className="brand-light">OS</span></span></a>
        <div><button className="landing-signin" onClick={() => setMode('login')}>Sign in</button><button className="primary-button" onClick={() => setMode('register')}>Create free account <ArrowRight size={15}/></button></div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy"><div className="landing-eyebrow"><span className="live-dot"/> YOUR JOB SEARCH, WITH A LITTLE MORE CLARITY</div><h1>Make your next move<br/>feel <em>more like yours.</em></h1><p>Keep applications, resumes, and follow-ups in one thoughtful workspace. Show up prepared for each opportunity, one step at a time.</p><div className="landing-cta"><button className="primary-button" onClick={() => setMode('register')}>Start your free workspace <ArrowRight size={15}/></button><span>No card needed · Your account is private</span></div></div>
          <div className="landing-preview" aria-label="CareerOS workspace preview"><div className="preview-window"><div className="preview-window-top"><span/><span/><span/><b>YOUR SEARCH AT A GLANCE</b></div><div className="preview-window-body"><div className="preview-welcome">A little progress adds up<span>.</span><small>Here’s where your search stands.</small></div><div className="preview-stat-row"><div><small>ACTIVE APPLICATIONS</small><b>08</b></div><div><small>INTERVIEWS</small><b>03</b></div><div><small>PROFILE STRENGTH</small><b>72%</b></div></div><div className="preview-job-row"><span className="preview-company">L</span><div><b>Product Designer</b><small>Linear · Interview</small></div><span className="preview-tag">THU, 10:30</span></div><div className="preview-job-row"><span className="preview-company neutral">N</span><div><b>UX Designer</b><small>Notion · Applied</small></div><span className="preview-tag muted">FOLLOW UP</span></div><div className="preview-progress"><Sparkles size={14}/><div><b>Your next step, saved.</b><small>Resume and follow-up stay with this opportunity.</small></div></div></div></div><div className="landing-floating"><span className="landing-check"><Check size={14}/></span><span><b>One place for the moving parts</b><small>Keep your search feeling manageable</small></span></div></div>
        </section>
        <section className="landing-features" id="how-it-works"><div className="landing-section-heading"><div className="section-kicker">A WORKSPACE THAT MOVES WITH YOU</div><h2>From saved role to next step.</h2></div><div className="landing-feature-grid"><article><span className="feature-icon"><BriefcaseBusiness size={18}/></span><h3>Keep each opportunity together</h3><p>Save the job description, your notes, chosen resume, and a clear follow-up date.</p></article><article><span className="feature-icon"><FileText size={18}/></span><h3>Tell your story with care</h3><p>Build a readable resume, then create role-specific drafts that stay grounded in your experience.</p></article><article><span className="feature-icon"><Target size={18}/></span><h3>Make progress visible</h3><p>See your pipeline, interviews, and upcoming follow-ups without losing your place.</p></article></div></section>
      </main>
      <footer className="landing-footer"><span>CareerOS · Made for the journey</span><span>Your information belongs to you. Export or delete it from your account.</span></footer>
    </div>
  );
}

function ResumePreview({ resume }) {
  const content = resume.content || {};
  const experienceEntries = (content.experienceEntries || []).map((entry) => {
    const heading = [entry.title, entry.company].filter(Boolean).join(' · ');
    const details = [[entry.location, [entry.startDate, entry.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · '), entry.achievements].filter(Boolean).join('\n');
    return [heading, details].filter(Boolean).join('\n');
  }).filter(Boolean).join('\n\n');
  const educationEntries = (content.educationEntries || []).map((entry) => {
    const heading = [entry.institution, entry.degree].filter(Boolean).join(' · ');
    const details = [[entry.location, [entry.startDate, entry.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · '), entry.details].filter(Boolean).join('\n');
    return [heading, details].filter(Boolean).join('\n');
  }).filter(Boolean).join('\n\n');
  const experienceText = [experienceEntries, content.experience].filter(Boolean).join('\n\n');
  const educationText = [educationEntries, content.education].filter(Boolean).join('\n\n');
  const sections = [['Summary', content.summary], ['Experience', experienceText], ['Education', educationText], ['Skills', content.skills], ['Projects', content.projects]].filter(([, text]) => text?.trim());
  return <article className={`print-resume template-${resume.template || 'classic'}`}><header><h1>{content.fullName || 'Your Name'}</h1><p>{content.headline || 'Professional headline'}</p><div>{[content.email, content.phone, content.location, content.website].filter(Boolean).join(' · ')}</div></header>{sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}</article>;
}

export default App;
