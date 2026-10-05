export const MAX_RESUME_FILE_BYTES = 12 * 1024 * 1024;

export async function extractResumeFile(file) {
  if (file.size > MAX_RESUME_FILE_BYTES) throw new Error('Choose a file smaller than 12 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'docx', 'txt'].includes(extension)) throw new Error('Choose a PDF, DOCX, or TXT file.');
  if (extension === 'txt') return { text: await file.text(), parser: 'Text file', pages: null, warnings: [] };
  const data = await file.arrayBuffer();
  if (extension === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser');
    const result = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: data });
    return { text: result.value, parser: 'DOCX text reader', pages: null, warnings: result.messages.map((message) => message.message) };
  }
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = pdf.numPages;
  if (pageCount > 30) { await pdf.destroy(); throw new Error('This scanner supports PDFs up to 30 pages.'); }
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map();
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform?.[5] || 0);
      rows.set(y, [...(rows.get(y) || []), item.str.trim()]);
    }
    pages.push([...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, words]) => words.join(' ')).join('\n'));
  }
  await pdf.destroy();
  return { text: pages.join('\n\n'), parser: 'PDF text reader', pages: pageCount, warnings: [] };
}
