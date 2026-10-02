// Loaded on demand: pdf.js is large and only needed when a PDF report is uploaded.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { MAX_DIM } from './files';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Renders each PDF page to an image and pulls out its text for measurement parsing. */
export async function readPdf(file: File, maxPages = 12): Promise<{ pages: string[]; text: string }> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  const texts: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, MAX_DIM / Math.max(base.width, base.height)) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.85));
  }
  // Scan remaining pages for text even if we don't keep their images.
  for (let i = maxPages + 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    texts.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  return { pages, text: texts.join('\n') };
}
