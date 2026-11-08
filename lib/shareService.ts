import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

export interface SharedDocumentMetadata {
  id: string;
  title: string;
  createdAt: string;
  pageCount: number;
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  isPdf: boolean;
  content?: string;
  hasSubPages?: boolean;
}

export interface SharedDocumentResult {
  metadata: SharedDocumentMetadata;
  htmlContent: string;
}

/**
 * გენერირებს უსაფრთხო, უნიკალურ ID-ს firestore.rules-ის მოთხოვნებთან თავსებადობით
 */
export function generateShareId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `doc_${timestamp}_${randomPart}`;
}

/**
 * ამცირებს და აკომპრესირებს დიდ Base64 Data URL სურათს canvas-ის მეშვეობით
 */
export async function compressDataUrl(
  dataUrl: string, 
  maxWidth: number = 1100, 
  maxHeight: number = 1500, 
  quality: number = 0.78
): Promise<string> {
  if (typeof window === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      let scale = 1;
      if (w > maxWidth) scale = maxWidth / w;
      if (h * scale > maxHeight) scale = Math.min(scale, maxHeight / h);

      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      let result = canvas.toDataURL('image/jpeg', quality);
      if (result.length > 420000) {
        result = canvas.toDataURL('image/jpeg', 0.68);
      }
      resolve(result);
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * ამოწმებს HTML-ში არსებულ სურათებს და აკომპრესირებს, რათა თითოეული გვერდი დარჩეს 400KB-ის ფარგლებში
 */
async function compressImageHtmlIfNeeded(html: string): Promise<string> {
  if (!html.includes('data:image/')) return html;
  if (html.length < 350000) return html;

  try {
    const parser = new DOMParser();
    const docParsed = parser.parseFromString(html, 'text/html');
    const imgs = docParsed.querySelectorAll('img');
    let modified = false;

    for (const img of Array.from(imgs)) {
      const src = img.getAttribute('src');
      if (src && src.startsWith('data:image/') && src.length > 350000) {
        const compressed = await compressDataUrl(src, 1100, 1500, 0.78);
        img.setAttribute('src', compressed);
        modified = true;
      }
    }

    if (modified) {
      return docParsed.body.innerHTML || html;
    }
  } catch (err) {
    console.warn('სურათის კომპრესია გამოტოვებულია:', err);
  }

  return html;
}

/**
 * ყოფს HTML შიგთავსს ცალკეულ გვერდებად (თუ PDF-ია ან შეიცავს page-break-indicator-ებს)
 */
export function splitHtmlIntoPageChunks(html: string): string[] {
  if (!html || !html.trim()) return ['<p><br></p>'];

  const parser = new DOMParser();
  const docParsed = parser.parseFromString(html, 'text/html');

  // 1. პირველ რიგში ვამოწმებთ PDF-ის გვერდებს (.pdf-page-sheet)
  const sheets = docParsed.querySelectorAll('.pdf-page-sheet');
  if (sheets.length > 0) {
    return Array.from(sheets).map(sheet => sheet.outerHTML.trim());
  }

  // 2. ვამოწმებთ ოფიციალურ page-break-indicator-ებს
  if (html.includes('page-break-indicator')) {
    const parts = html.split(/<div class="page-break-indicator"[^>]*><\/div>/gi)
      .map(p => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }

  // 3. თუ არცერთია, ერთიანად ვაბრუნებთ
  return [html];
}

/**
 * დოკუმენტის ატვირთვა Firestore-ში საზიარო ლინკის შესაქმნელად.
 * ითვალისწინებს Firestore-ის 1MB ლიმიტს: დიდი დოკუმენტები/PDF-ები ინახება ქვეკოლექციის გვერდებად.
 */
export async function uploadSharedDocument(params: {
  title: string;
  htmlContent: string;
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  onProgress?: (status: string, percent: number) => void;
}): Promise<{ id: string; bookUrl: string; docUrl: string }> {
  const { title, htmlContent, orientation, aspectRatio, onProgress } = params;
  const docId = generateShareId();
  const isPdf = htmlContent.includes('pdf-page-sheet') || htmlContent.includes('pdf-page-img');
  const now = new Date().toISOString();

  onProgress?.('დოკუმენტის მომზადება...', 10);

  const rawPages = splitHtmlIntoPageChunks(htmlContent);

  // თითოეული გვერდის სურათის ოპტიმიზაცია Firestore-ის ლიმიტების შესაბამისად
  const pages: string[] = [];
  for (let i = 0; i < rawPages.length; i++) {
    onProgress?.(`გვერდების ოპტიმიზაცია (${i + 1}/${rawPages.length})...`, 12 + Math.round((i / rawPages.length) * 18));
    const optimized = await compressImageHtmlIfNeeded(rawPages[i]);
    pages.push(optimized);
  }

  const totalLength = pages.reduce((sum, p) => sum + p.length, 0);

  // თუ დოკუმენტი ტექსტურია და პატარაა (< 350KB) და ერთგვერდიანია
  if (!isPdf && totalLength < 350000 && pages.length <= 1) {
    onProgress?.('ღრუბელში შენახვა...', 70);

    const docRef = doc(db, 'shared_documents', docId);
    await setDoc(docRef, {
      id: docId,
      title: (title || 'დოკუმენტი').slice(0, 180),
      createdAt: now,
      pageCount: 1,
      orientation,
      aspectRatio: Number(aspectRatio) || 0.707,
      isPdf: false,
      content: pages[0] || htmlContent,
    });
  } else {
    // მრავალგვერდიანი ან PDF დოკუმენტი — ყოველთვის ქვეკოლექციაში გვერდობრივი შენახვა
    onProgress?.(`მეტამონაცემების შენახვა (${pages.length} გვერდი)...`, 35);

    const docRef = doc(db, 'shared_documents', docId);
    await setDoc(docRef, {
      id: docId,
      title: (title || 'დოკუმენტი').slice(0, 180),
      createdAt: now,
      pageCount: pages.length,
      orientation,
      aspectRatio: Number(aspectRatio) || 0.707,
      isPdf,
    });

    // თითოეული გვერდის შენახვა ქვეკოლექციაში
    const pagesCol = collection(db, 'shared_documents', docId, 'pages');
    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      const pageId = `p_${pageNum.toString().padStart(4, '0')}`;
      const pageDocRef = doc(pagesCol, pageId);

      onProgress?.(`გვერდი ${pageNum} / ${pages.length} იტვირთება...`, 40 + Math.round((i / pages.length) * 55));

      await setDoc(pageDocRef, {
        pageNumber: pageNum,
        html: pages[i],
      });
    }
  }

  onProgress?.('ლინკი მზადაა!', 100);

  const origin = window.location.origin + window.location.pathname;
  const bookUrl = `${origin}?share=${docId}&mode=book`;
  const docUrl = `${origin}?share=${docId}&mode=doc`;

  return { id: docId, bookUrl, docUrl };
}

/**
 * საზიარო დოკუმენტის ჩატვირთვა Firestore-იდან ID-ით
 */
export async function fetchSharedDocument(docId: string): Promise<SharedDocumentResult | null> {
  try {
    const docRef = doc(db, 'shared_documents', docId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data() as SharedDocumentMetadata;

    // 1. პირველ რიგში ვამოწმებთ ქვეკოლექციის გვერდებს (PDF-ები და მრავალგვერდიანი დოკუმენტები)
    const pagesCol = collection(db, 'shared_documents', docId, 'pages');
    const q = query(pagesCol, orderBy('pageNumber', 'asc'));
    const pagesSnap = await getDocs(q);

    if (!pagesSnap.empty) {
      const pageHtmls = pagesSnap.docs.map(d => d.data().html as string);
      const combinedHtml = pageHtmls.join('\n<div class="page-break-indicator"></div>\n');
      return {
        metadata: data,
        htmlContent: combinedHtml,
      };
    }

    // 2. თუ შიგთავსი პირდაპირ მთავარ დოკუმენტშია (კომპაქტური ტექსტური დოკუმენტი)
    if (data.content && data.content.trim().length > 0) {
      return {
        metadata: data,
        htmlContent: data.content,
      };
    }

    return {
      metadata: data,
      htmlContent: data.content || '',
    };
  } catch (error) {
    console.error('შეცდომა საზიარო დოკუმენტის წაკითხვისას:', error);
    throw error;
  }
}
