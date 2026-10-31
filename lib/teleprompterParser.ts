/**
 * ტელესუფლიორისა და პრეზენტატორის ტექსტის პარსერი
 * უზრუნველყოფს HTML ფორმატირების შენარჩუნებას, [ ] ფრჩხილების მიხედვით
 * წინადადებების გამოყოფას, { } კომენტარების ამოღებას და ტექსტის გასუფთავებას.
 */

import { SplitMode } from '../types/teleprompter';

export interface ParsedStanza {
  id: number;
  html: string;
  text: string;
}

export interface ParsedSentence {
  id: number;
  text: string;
  note?: string;
  stanzaIndex: number;
}

export interface ParsedWord {
  id: number;
  word: string;
  sentenceIndex: number;
}

/**
 * ასუფთავებს HTML-ს inline ფერებისგან (color და background-color), რათა ტექსტი
 * იდეალურად დაემორჩილოს ტელესუფლიორის კონტრასტულ ფონს
 */
export function sanitizeTeleprompterHtml(html: string): string {
  if (!html || !html.trim()) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // მოვხსნათ სკრიპტები და სტილები
    doc.querySelectorAll('script, style, meta, link, iframe, object, embed, xml').forEach(el => el.remove());

    // ყველა ელემენტიდან წავშალოთ inline color და background-color (თუ გარედან მართულია)
    doc.body.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        htmlEl.style.removeProperty('color');
        htmlEl.style.removeProperty('background-color');
        if (!htmlEl.getAttribute('style') || htmlEl.getAttribute('style')?.trim() === '') {
          htmlEl.removeAttribute('style');
        }
      }
    });

    return doc.body.innerHTML;
  } catch (e) {
    return html
      .replace(/color\s*:\s*[^;"]+;?/gi, '')
      .replace(/background-color\s*:\s*[^;"]+;?/gi, '');
  }
}

/**
 * აშორებს [ ] და {კომენტარი} ნიშნებს HTML ტექსტიდან (უწყვეტი ტიტრების რეჟიმისთვის)
 */
export function stripBracketsAndNotes(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent && /[\[\]{}]/.test(node.textContent)) {
        node.textContent = node.textContent
          .replace(/\{[^{}]*\}/g, '')
          .replace(/[\[\]]/g, '');
      }
    }
    return doc.body.innerHTML;
  } catch (e) {
    return html.replace(/\{[^{}]*\}/g, '').replace(/[\[\]]/g, '');
  }
}

/**
 * ასუფთავებს DOM ხეს [ ] და { } ნიშნებისგან ადგილზე (In-place)
 */
export function stripBracketsFromElement(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent && /[\[\]{}]/.test(node.textContent)) {
      node.textContent = node.textContent
        .replace(/\{[^{}]*\}/g, '')
        .replace(/[\[\]]/g, '');
    }
  }
}

/**
 * DOM ელემენტში არსებული ტექსტის გარდაქმნა სუბტიტრების წინადადება-სპანებად.
 * [ტექსტი] = ერთი გამოყოფილი წინადადება.
 * {კომენტარი} = წამყვანის პირადი შენიშვნა, რომელიც ეკრანიდან ქრება და ინახება ჯგუფში.
 * splitMode = 'manual' რეჟიმში ეკრანზე რჩება მხოლოდ [ ] ნიშნებში ჩასმული წინადადებები!
 */
export interface SentenceGroupElement {
  elements: HTMLSpanElement[];
  note?: string;
  fullText: string;
}

export function wrapSentencesInElement(root: HTMLElement, splitMode: SplitMode): SentenceGroupElement[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    nodes.push(n);
  }

  const groups: SentenceGroupElement[] = [];
  let currentOpenElements: HTMLSpanElement[] | null = null;
  let currentOpenNote: string = '';

  const manual = splitMode === 'manual';

  const makeSpan = (t: string): HTMLSpanElement => {
    const clean = t.replace(/[\[\]]/g, '');
    const sp = document.createElement('span');
    sp.className = 'sentence transition-all duration-300';
    sp.textContent = clean;
    sp.dataset.full = clean;
    return sp;
  };

  nodes.forEach(node => {
    const textContent = node.textContent || '';
    const frag = document.createDocumentFragment();
    const tokens = textContent.split(/(\[|\]|\{[^{}]*\})/);

    tokens.forEach(tok => {
      if (tok === '[') {
        if (currentOpenElements && currentOpenElements.length > 0) {
          const full = currentOpenElements.map(e => e.textContent || '').join('').replace(/[\[\]]/g, '');
          groups.push({
            elements: currentOpenElements,
            note: currentOpenNote.trim() || undefined,
            fullText: full.trim()
          });
        }
        currentOpenElements = [];
        currentOpenNote = '';
        return;
      }

      if (tok === ']') {
        if (currentOpenElements && currentOpenElements.length > 0) {
          const full = currentOpenElements.map(e => e.textContent || '').join('').replace(/[\[\]]/g, '');
          groups.push({
            elements: currentOpenElements,
            note: currentOpenNote.trim() || undefined,
            fullText: full.trim()
          });
        }
        currentOpenElements = null;
        currentOpenNote = '';
        return;
      }

      if (!tok) return;

      // {კომენტარი} - წამყვანის შენიშვნა
      if (/^\{[^{}]*\}$/.test(tok)) {
        const noteContent = tok.slice(1, -1).trim();
        if (currentOpenElements) {
          currentOpenNote = (currentOpenNote + ' ' + noteContent).trim();
        } else if (groups.length > 0) {
          const lastGroup = groups[groups.length - 1];
          lastGroup.note = ((lastGroup.note || '') + ' ' + noteContent).trim();
        }
        return;
      }

      // თუ [ ] ფრჩხილებში ვართ
      if (currentOpenElements) {
        if (tok.trim() || currentOpenElements.length > 0) {
          const sp = makeSpan(tok);
          frag.appendChild(sp);
          currentOpenElements.push(sp);
        }
        return;
      }

      // თუ manual რეჟიმია და ფრჩხილებს გარეთ ვართ - ტექსტი იმალება
      if (manual) return;

      // auto რეჟიმი: წერტილები [.!?…։]
      const sentenceParts = tok.split(/(?<=[.!?…։])(\s+)/);
      sentenceParts.forEach((t, i) => {
        if (i % 2 !== 0 || !t.trim()) {
          frag.appendChild(document.createTextNode(t));
          return;
        }
        const sp = makeSpan(t);
        frag.appendChild(sp);
        groups.push({
          elements: [sp],
          fullText: t.trim()
        });
      });
    });

    node.parentNode?.replaceChild(frag, node);
  });

  if (currentOpenElements && currentOpenElements.length > 0) {
    const full = currentOpenElements.map(e => e.textContent || '').join('').replace(/[\[\]]/g, '');
    groups.push({
      elements: currentOpenElements,
      note: currentOpenNote.trim() || undefined,
      fullText: full.trim()
    });
  }

  return groups;
}

/**
 * ასუფთავებს და აანალიზებს HTML-ს სტროფებად/აბზაცებად
 */
export function parseHtmlToStanzas(html: string): ParsedStanza[] {
  if (!html || !html.trim()) {
    return [{ id: 0, html: '<p>ტექსტი არ არის შეყვანილი</p>', text: 'ტექსტი არ არის შეყვანილი' }];
  }

  const cleanedHtml = sanitizeTeleprompterHtml(stripBracketsAndNotes(html));
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedHtml, 'text/html');
  
  const blockElements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, div');
  
  if (blockElements.length === 0) {
    const rawText = doc.body.textContent || '';
    const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length === 0) {
      return [{ id: 0, html: doc.body.innerHTML, text: rawText }];
    }
    return paragraphs.map((p, idx) => ({
      id: idx,
      html: `<p>${p.replace(/\n/g, '<br/>')}</p>`,
      text: p.trim(),
    }));
  }

  const stanzas: ParsedStanza[] = [];
  let currentId = 0;

  blockElements.forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text.length > 0) {
      const hasBlockParent = el.parentElement && el.parentElement !== doc.body && 
        ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(el.parentElement.tagName);
      
      if (!hasBlockParent) {
        stanzas.push({
          id: currentId++,
          html: el.outerHTML,
          text: text,
        });
      }
    }
  });

  if (stanzas.length === 0) {
    return [{ id: 0, html: doc.body.innerHTML, text: doc.body.textContent?.trim() || '' }];
  }

  return stanzas;
}

/**
 * ტექსტის დაყოფა წინადადებებად:
 * ითვალისწინებს [ ] ფრჩხილებს, { } კომენტარებს და splitMode-ს.
 */
export function extractSentencesFromHtml(html: string, splitMode: SplitMode = 'auto'): ParsedSentence[] {
  if (!html || !html.trim()) return [];
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const groups = wrapSentencesInElement(tempDiv, splitMode);
  return groups.map((g, idx) => ({
    id: idx,
    text: g.fullText,
    note: g.note,
    stanzaIndex: 0,
  }));
}

/**
 * თავსებადობის ფუნქცია ძველი გამოძახებებისთვის
 */
export function extractSentences(stanzas: ParsedStanza[]): ParsedSentence[] {
  const allHtml = stanzas.map(s => s.html).join('');
  return extractSentencesFromHtml(allHtml, 'auto');
}

/**
 * ტექსტის დაყოფა სიტყვებად
 */
export function extractWords(sentences: ParsedSentence[]): ParsedWord[] {
  const words: ParsedWord[] = [];
  let wordId = 0;

  sentences.forEach((sentence, sIdx) => {
    const tokens = sentence.text.split(/\s+/).filter(w => w.trim().length > 0);
    tokens.forEach((w) => {
      words.push({
        id: wordId++,
        word: w.trim(),
        sentenceIndex: sIdx,
      });
    });
  });

  return words;
}

/**
 * HTML-დან სუფთა ტექსტის გამოღება (მორბენალი სტრიქონისთვის)
 */
export function getPlainTextFromHtml(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(stripBracketsAndNotes(html), 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * გარდაქმნის DOM ხის ტექსტს სიტყვების სპანებად (სიტყვების მიყოლის/გადიდების რეჟიმისთვის)
 * ინარჩუნებს სრულ HTML სტრუქტურას (აბზაცებს, ფორმატირებას, სტრიქონებს) და აშორებს [ ] და { } ნიშნებს.
 */
export function wrapWordsInElement(root: HTMLElement): HTMLSpanElement[] {
  stripBracketsFromElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    nodes.push(n);
  }

  const wordSpans: HTMLSpanElement[] = [];

  nodes.forEach(node => {
    const text = node.textContent || '';
    if (!text.trim()) return;

    const frag = document.createDocumentFragment();
    const tokens = text.split(/(\s+)/);

    tokens.forEach(tok => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        frag.appendChild(document.createTextNode(tok));
      } else {
        const sp = document.createElement('span');
        sp.className = 'teleprompter-word transition-all duration-150 inline-block';
        sp.textContent = tok;
        sp.dataset.word = tok;
        frag.appendChild(sp);
        wordSpans.push(sp);
      }
    });

    node.parentNode?.replaceChild(frag, node);
  });

  return wordSpans;
}
