import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, LockKeyhole, ScanSearch, Upload, X } from 'lucide-react';
import { resumeDraftToText, scanResumeText } from './resumeScanAnalysis.js';

export default function ResumeScanner({ resumes = [], setMode }) {
  const [text, setText] = useState('');
  const [source, setSource] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadFile(file) {
    if (!file) return;
    setBusy(true); setError(''); setReport(null); setSource(null);
    try {
      const { extractResumeFile } = await import('./resumeScanner.js');
      const extracted = await extractResumeFile(file);
      setText(extracted.text);
      setSource({ ...extracted, fileName: file.name });
      if (extracted.text.trim().length < 120) setError('We found very little selectable text. This may be a scanned image PDF. Try a text-based PDF, DOCX, or paste your resume text below.');
    } catch (scanError) { setError(scanError.message || 'This file could not be read. Try another file or paste your resume text.'); }
    finally { setBusy(false); }
  }

  function chooseDraft(id) {
    const resume = resumes.find((item) => item._id === id);
    if (!resume) return;
    setText(resumeDraftToText(resume));
    setSource({ parser: 'CareerOS resume builder', fileName: resume.title, pages: null, warnings: [] });
    setReport(null); setError('');
  }

  function scanText() {
    setError('');
    if (text.trim().length < 120) { setError('Add at least 120 characters so the checks have enough resume content to review.'); return; }
    const result = scanResumeText(text, source || { parser: 'Pasted text', fileName: 'Pasted resume text', pages: null, warnings: [] });
    if (result.missingExtractedText) { setError('We could not find enough readable text to scan. Try a text-based file or paste the resume text.'); setReport(null); return; }
    setReport(result);
  }

  function dropFile(event) { event.preventDefault(); loadFile(event.dataTransfer.files?.[0]); }

  return <div className={`resume-scan-page ${setMode ? 'resume-scan-standalone' : ''}`}>
    {setMode && <header className="resume-scan-header"><a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setMode('landing'); }}><span className="brand-mark"><ScanSearch size={18}/></span><span>career<span className="brand-light">OS</span></span></a><div><button className="landing-signin" onClick={() => setMode('landing')}><ArrowLeft size={14}/> CareerOS home</button><button className="primary-button" onClick={() => setMode('register')}>Create free account <ArrowRight size={14}/></button></div></header>}
    <main className="resume-scan-main">
      <div className="resume-scan-heading"><div className="section-kicker">FREE RESUME SCAN · NO ACCOUNT NEEDED</div><h1>See what your resume makes easy to find.</h1><p>Check readable text, common sections, contact details, and specific outcomes. Every point shows what CareerOS found and what you could review.</p></div>
      <div className="resume-scan-input-grid">
        <section className="scan-input-card" onDrop={dropFile} onDragOver={(event) => event.preventDefault()}><div className="scan-input-icon"><Upload size={18}/></div><h2>Upload a resume</h2><p>Drop a PDF, DOCX, or TXT file here, or choose one. It is read in your browser and isn’t uploaded or saved.</p><label className="scan-file-button"><input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => loadFile(event.target.files?.[0])}/>{busy ? 'Reading your file…' : 'Choose a file'}<Upload size={15}/></label>{source?.fileName && <small className="scan-file-meta"><FileText size={13}/>{source.fileName} · {source.parser}{source.pages ? ` · ${source.pages} pages` : ''}</small>}</section>
        <section className="scan-input-card"><div className="scan-input-icon draft"><FileText size={18}/></div><h2>Use a CareerOS resume</h2>{resumes.length ? <><p>Scan a saved resume draft without changing it.</p><label className="scan-draft-select">Choose a saved resume<select defaultValue="" onChange={(event) => chooseDraft(event.target.value)}><option value="" disabled>Select a resume…</option>{resumes.map((resume) => <option key={resume._id} value={resume._id}>{resume.title}</option>)}</select></label></> : <><p>{setMode ? 'Create an account to save resumes in CareerOS, or use the upload and paste options here.' : 'Your account has no saved resumes yet. You can still scan a file or paste text below.'}</p>{setMode && <button className="secondary-button scan-account-button" onClick={() => setMode('register')}>Create a free account <ArrowRight size={13}/></button>}</>}</section>
      </div>
      <section className="scan-paste-card"><label htmlFor="scan-resume-text"><strong>Paste resume text</strong><span>Plain text works too. The report stays in this browser session; CareerOS does not save it.</span></label><textarea id="scan-resume-text" value={text} maxLength={40000} onChange={(event) => { setText(event.target.value); setReport(null); setSource(null); setError(''); }} placeholder="Paste the text from your resume here…" rows={10}/><div className="scan-paste-footer"><small>{text.length.toLocaleString()} characters · 120 minimum</small><button className="primary-button" disabled={busy || text.trim().length < 120} onClick={scanText}>{busy ? 'Reading…' : 'Scan my resume'} <ArrowRight size={14}/></button></div>{error && <div className="form-error scan-error" role="alert">{error}</div>}</section>
      <div className="scan-privacy-note"><LockKeyhole size={15}/><span><strong>Your resume stays on this device.</strong> File extraction and these checks run in this browser. No AI request is made. Scanned-image OCR and exact behavior of every employer’s ATS are not covered.</span></div>
      {report && <ScanReport report={report}/>}
    </main>
  </div>;
}

function ScanReport({ report }) {
  const title = report.score >= 80 ? 'Many key details are easy to find.' : report.score >= 55 ? 'Some useful details are present; review the gaps.' : 'We found a few things to check in the extracted text.';
  return <section className="scan-report" aria-live="polite"><div className="scan-report-top"><div><div className="section-kicker">YOUR RESUME SCAN</div><h2>{title}</h2><p>{report.source.fileName} · {report.wordCount} words detected</p></div><div className="scan-score"><b>{report.score}</b><span>/ 100</span></div></div><div className="scan-score-track"><span style={{ width: `${report.score}%` }}/></div><p className="scan-score-caveat">This score adds up the visible checks below. It is not a real employer ATS result, a hiring prediction, or a guarantee.</p>{report.source.warnings?.length > 0 && <div className="scan-warning">Document reader notes: {report.source.warnings.join(' ')}</div>}<div className="scan-checks">{report.checks.map((check) => <article className={`scan-check ${check.ready ? 'passed' : 'review'}`} key={check.id}><span className="scan-check-mark">{check.ready ? <Check size={14}/> : <X size={13}/>}</span><div><div className="scan-check-title"><strong>{check.label}</strong><span>{check.ready ? `+${check.points}` : `0 / ${check.points}`}</span></div><p>{check.evidence}</p>{!check.ready && <small>{check.advice}</small>}</div></article>)}</div><div className="scan-report-foot"><span><LockKeyhole size={14}/> This report exists only in this tab and is cleared when you leave or refresh it.</span><button className="secondary-button" onClick={() => window.print()}>Print report</button></div></section>;
}
