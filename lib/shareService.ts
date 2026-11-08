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
 * ყოფს HTML შიგთავსს ცალკეულ გვერდებად (თუ PDF-ია ან შეიცავს page-break-indicator-ებს)
 */
function splitHtmlIntoPageChunks(html: string): string[] {
  if (html.includes('page-break-indicator')) {
    const parts = html.split(/<div class="page-break-indicator"[^>]*><\/div>/gi)
      .map(p => p.trim())
      .filter(Boolean);
    if (parts.length > 1) return parts;
  }
  
  // შევამოწმოთ pdf-page-sheet-ები
  if (html.includes('pdf-page-sheet')) {
    const parser = new DOMParser();
    const docParsed = parser.parseFromString(html, 'text/html');
    const sheets = docParsed.querySelectorAll('.pdf-page-sheet');
    if (sheets.length > 1) {
      return Array.from(sheets).map(sheet => sheet.outerHTML);
    }
  }

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

  onProgress?.('დოკუმენტის მომზადება...', 15);

  const pages = splitHtmlIntoPageChunks(htmlContent);
  const totalLength = htmlContent.length;

  // თუ დოკუმენტი კომპაქტურია (< 700KB) და ერთგვერდიანია
  if (totalLength < 700000 && pages.length <= 1) {
    onProgress?.('ღრუბელში შენახვა...', 60);

    const docRef = doc(db, 'shared_documents', docId);
    await setDoc(docRef, {
      id: docId,
      title: (title || 'დოკუმენტი').slice(0, 180),
      createdAt: now,
      pageCount: 1,
      orientation,
      aspectRatio,
      isPdf,
      content: htmlContent,
    });

    onProgress?.('დასრულებულია!', 100);
  } else {
    // მრავალგვერდიანი ან დიდი PDF ფაილი — ქვეკოლექციაში გვერდობრივი შენახვა
    onProgress?.(`მუშავდება ${pages.length} გვერდი...`, 25);

    const docRef = doc(db, 'shared_documents', docId);
    // ჯერ ვინახავთ მთავარ მეტამონაცემებს
    await setDoc(docRef, {
      id: docId,
      title: (title || 'დოკუმენტი').slice(0, 180),
      createdAt: now,
      pageCount: pages.length,
      orientation,
      aspectRatio,
      isPdf,
    });

    // თითოეული გვერდის შენახვა ქვეკოლექციაში
    const pagesCol = collection(db, 'shared_documents', docId, 'pages');
    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      const pageId = `p_${pageNum.toString().padStart(4, '0')}`;
      const pageDocRef = doc(pagesCol, pageId);

      onProgress?.(`გვერდი ${pageNum} / ${pages.length} იტვირთება...`, 30 + Math.round((i / pages.length) * 65));

      await setDoc(pageDocRef, {
        pageNumber: pageNum,
        html: pages[i],
      });
    }

    onProgress?.('ლინკი მზადაა!', 100);
  }

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

    // თუ შიგთავსი პირდაპირ მთავარ დოკუმენტშია
    if (data.content && data.content.trim().length > 0) {
      return {
        metadata: data,
        htmlContent: data.content,
      };
    }

    // თუ გვერდები ქვეკოლექციაშია შენახული
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

    return {
      metadata: data,
      htmlContent: data.content || '',
    };
  } catch (error) {
    console.error('შეცდომა საზიარო დოკუმენტის წაკითხვისას:', error);
    throw error;
  }
}
