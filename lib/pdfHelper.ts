/**
 * PDF დამხმარე ბიბლიოთეკა:
 * 1. PDF-დან ტექსტის ამოღება გვერდის გამყოფებით (PDF.js Text Layer)
 * 2. PDF ყველა გვერდის რენდერი მაღალი ხარისხის სურათებად (A4 Sheets დოკუმენტში ჩასასმელად)
 * 3. გვერდის ზომებისა და ორიენტაციის (Portrait/Landscape) ავტომატური ამოცნობა
 * 4. Gemini Vision OCR სკანირებული ფურცლებისთვის
 */

import * as pdfjsModule from 'pdfjs-dist';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// Resolves the module whether loaded via CommonJS, UMD, or ES Module
const resolvedPdfjs: any = (pdfjsModule as any).default || pdfjsModule;

export interface PdfDocumentInfo {
  pagesCount: number;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  aspectRatio: number;
}

export interface RenderPdfResult {
  pages: string[];
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * გარდაქმნის base64 Data URL-ს Uint8Array-ად მეხსიერებიდან პირდაპირი წაკითხვისთვის
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf('base64,');
  const base64 = base64Index !== -1 ? dataUrl.slice(base64Index + 7) : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * აბრუნებს ინიციალიზებულ PDF.js ობიექტს
 */
export function getPdfJs(): any {
  const lib = (typeof window !== 'undefined' && window.pdfjsLib) ? window.pdfjsLib : resolvedPdfjs;
  
  if (typeof window !== 'undefined') {
    if (!window.pdfjsLib) {
      window.pdfjsLib = lib;
    }
    if (lib && lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  return lib;
}

/**
 * ამოწმებს, ჩატვირთულია თუ არა PDF.js
 */
export async function ensurePdfJsLoaded(): Promise<boolean> {
  const lib = getPdfJs();
  return Boolean(lib && typeof lib.getDocument === 'function');
}

/**
 * აბრუნებს PDF ფაილის მეტამონაცემებსა და პირველი გვერდის ზომებს/ორიენტაციას
 */
export async function getPdfInfo(pdfDataUrl: string): Promise<PdfDocumentInfo> {
  const lib = getPdfJs();
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error('PDF.js ბიბლიოთეკა მიუწვდომელია');
  }

  const rawData = pdfDataUrl.startsWith('data:') ? dataUrlToUint8Array(pdfDataUrl) : pdfDataUrl;
  const loadingTask = lib.getDocument(typeof rawData === 'string' ? rawData : { data: rawData });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  const width = viewport.width;
  const height = viewport.height;
  const orientation: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';
  const aspectRatio = width / height;

  return {
    pagesCount: pdfDoc.numPages,
    orientation,
    width,
    height,
    aspectRatio,
  };
}

/**
 * PDF-ის პირველი გვერდის რენდერი მინიატურისთვის
 */
export async function renderPdfPageToDataUrl(pdfDataUrl: string, pageNum: number = 1): Promise<string> {
  const lib = getPdfJs();
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error('PDF.js ბიბლიოთეკა მიუწვდომელია');
  }

  const rawData = pdfDataUrl.startsWith('data:') ? dataUrlToUint8Array(pdfDataUrl) : pdfDataUrl;
  const loadingTask = lib.getDocument(typeof rawData === 'string' ? rawData : { data: rawData });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNum);

  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  if (!context) throw new Error('Canvas კონტექსტის ინიციალიზაცია ვერ მოხერხდა');

  // თეთრი ფონი
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * PDF-ის ყველა გვერდის რენდერი სურათებად (დოკუმენტში პირდაპირ ჩასასმელად) და ორიენტაციის დადგენა
 */
export async function renderAllPdfPagesToDataUrls(
  pdfDataUrl: string, 
  maxPages: number = 60,
  onProgress?: (current: number, total: number) => void
): Promise<RenderPdfResult> {
  const lib = getPdfJs();
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error('PDF.js ბიბლიოთეკა მიუწვდომელია');
  }

  const rawData = pdfDataUrl.startsWith('data:') ? dataUrlToUint8Array(pdfDataUrl) : pdfDataUrl;
  const loadingTask = lib.getDocument(typeof rawData === 'string' ? rawData : { data: rawData });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const pageImages: string[] = [];

  // პირველი გვერდის ზომების ამოღება ორიენტაციისთვის
  let docWidth = 595;
  let docHeight = 842;
  let docOrientation: 'portrait' | 'landscape' = 'portrait';
  let docAspectRatio = 0.707;

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(i, numPages);
    const page = await pdfDoc.getPage(i);

    if (i === 1) {
      const baseViewport = page.getViewport({ scale: 1 });
      docWidth = baseViewport.width;
      docHeight = baseViewport.height;
      docOrientation = docWidth > docHeight ? 'landscape' : 'portrait';
      docAspectRatio = docWidth / docHeight;
    }

    // 1.5x მასშტაბი იძლევა კრისტალურ ხარისხს A4 ეკრანზე
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (context) {
      // თეთრი ფონი
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      pageImages.push(canvas.toDataURL('image/jpeg', 0.86));
    }
  }

  return {
    pages: pageImages,
    orientation: docOrientation,
    width: docWidth,
    height: docHeight,
    aspectRatio: docAspectRatio,
  };
}

/**
 * PDF-დან ტექსტის ამოღება და დაფორმატება გვერდის გამყოფებით და ორიენტაციის დადგენა
 */
export async function extractTextFromPdf(pdfDataUrl: string): Promise<{ 
  text: string; 
  pagesCount: number; 
  formattedHtml: string;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  aspectRatio: number;
}> {
  const lib = getPdfJs();
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error('PDF.js ბიბლიოთეკა მიუწვდომელია');
  }

  const rawData = pdfDataUrl.startsWith('data:') ? dataUrlToUint8Array(pdfDataUrl) : pdfDataUrl;
  const loadingTask = lib.getDocument(typeof rawData === 'string' ? rawData : { data: rawData });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let docWidth = 595;
  let docHeight = 842;
  let docOrientation: 'portrait' | 'landscape' = 'portrait';
  let docAspectRatio = 0.707;

  let plainTextAll = '';
  const htmlParts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    
    if (i === 1) {
      const baseViewport = page.getViewport({ scale: 1 });
      docWidth = baseViewport.width;
      docHeight = baseViewport.height;
      docOrientation = docWidth > docHeight ? 'landscape' : 'portrait';
      docAspectRatio = docWidth / docHeight;
    }

    const textContent = await page.getTextContent();
    const pageItems = textContent.items || [];

    let lastY: number | null = null;
    let pageLines: string[] = [];
    let currentLine = '';

    for (const item of pageItems) {
      if ('str' in item && typeof item.str === 'string') {
        const currentY = 'transform' in item && Array.isArray(item.transform) ? item.transform[5] : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = '';
        } else if (currentLine.length > 0 && !currentLine.endsWith(' ')) {
          currentLine += ' ';
        }
        currentLine += item.str;
        lastY = currentY;
      }
    }
    if (currentLine.trim()) pageLines.push(currentLine.trim());

    const pageText = pageLines.join('\n');
    plainTextAll += (numPages > 1 ? `\n--- გვერდი ${i} ---\n\n` : '') + pageText + '\n\n';

    // HTML გვერდი
    const paragraphsHtml = pageLines
      .filter(l => l.trim().length > 0)
      .map(line => {
        // თუ მოკლეა და მსხვილს ჰგავს, შეიძლება სათაური იყოს
        if (line.length < 60 && !line.endsWith('.')) {
          return `<h2 style="margin-top: 1.2em; margin-bottom: 0.5em; font-weight: bold;">${line}</h2>`;
        }
        return `<p style="margin-bottom: 0.8em; line-height: 1.6;">${line}</p>`;
      })
      .join('');

    htmlParts.push(`
      <div class="pdf-imported-page" data-page="${i}">
        ${paragraphsHtml || '<p class="opacity-50 italic">[ამ გვერდზე ტექსტი არ მოიძებნა]</p>'}
      </div>
    `);
  }

  // გვერდებს შორის ვსვამთ ოფიციალურ page-break-indicator-ს
  const formattedHtml = htmlParts.join('\n<div class="page-break-indicator"></div>\n');

  return {
    text: plainTextAll.trim(),
    pagesCount: numPages,
    formattedHtml,
    orientation: docOrientation,
    width: docWidth,
    height: docHeight,
    aspectRatio: docAspectRatio,
  };
}
