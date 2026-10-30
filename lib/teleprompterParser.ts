/**
 * ტელესუფლიორისა და პრეზენტატორის ტექსტის პარსერი
 * უზრუნველყოფს HTML ფორმატირების შენარჩუნებას და ტექსტის დაყოფას
 * წინადადებებად, სტროფებად და სიტყვებად.
 */

export interface ParsedStanza {
  id: number;
  html: string;
  text: string;
}

export interface ParsedSentence {
  id: number;
  text: string;
  stanzaIndex: number;
}

export interface ParsedWord {
  id: number;
  word: string;
  sentenceIndex: number;
}

/**
 * ასუფთავებს HTML-ს inline ფერებისგან (color და background-color), რათა ტექსტი
 * იდეალურად დაემორჩილოს ტელესუფლიორის კონტრასტულ ფონს (მაგ. მუქ ფონზე სრულად გათეთრდეს)
 */
export function sanitizeTeleprompterHtml(html: string): string {
  if (!html || !html.trim()) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // მოვხსნათ სკრიპტები და სტილები
    doc.querySelectorAll('script, style').forEach(el => el.remove());

    // ყველა ელემენტიდან წავშალოთ inline color და background-color
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
 * ასუფთავებს და აანალიზებს HTML-ს სტროფებად/აბზაცებად
 */
export function parseHtmlToStanzas(html: string): ParsedStanza[] {
  if (!html || !html.trim()) {
    return [{ id: 0, html: '<p>ტექსტი არ არის შეყვანილი</p>', text: 'ტექსტი არ არის შეყვანილი' }];
  }

  const cleanedHtml = sanitizeTeleprompterHtml(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedHtml, 'text/html');
  
  // შევამოწმოთ ბლოკური ელემენტები
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
      // ვამოწმებთ, რომ ეს ელემენტი არ იყოს სხვა ბლოკური ელემენტის შიგნით (მაგ. p div-ში)
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
 * ტექსტის მკაცრი დაყოფა წინადადებებად:
 * მომხმარებლის მკაცრი მოთხოვნით: „წინადადება მთავრდება წერტილით, წერტილიდან წერტილამდე ერთი წინადადებააა.“
 */
export function extractSentences(stanzas: ParsedStanza[]): ParsedSentence[] {
  const sentences: ParsedSentence[] = [];
  let sentenceId = 0;

  stanzas.forEach((stanza, stanzaIdx) => {
    const raw = stanza.text.trim();
    if (!raw) return;

    // წერტილიდან წერტილამდე დაყოფა
    // ვეძებთ ყველა ფრაგმენტს, რომელიც სრულდება წერტილით
    let remaining = raw;
    while (remaining.length > 0) {
      const dotIndex = remaining.indexOf('.');
      if (dotIndex !== -1) {
        // წერტილის ჩათვლით წინადადება
        const sentenceText = remaining.slice(0, dotIndex + 1).trim();
        // შევამოწმოთ, რომ მხოლოდ მარტო წერტილი არ იყოს
        if (sentenceText.length > 1) {
          sentences.push({
            id: sentenceId++,
            text: sentenceText,
            stanzaIndex: stanzaIdx,
          });
        }
        remaining = remaining.slice(dotIndex + 1).trim();
      } else {
        // დარჩენილი ტექსტი, თუ ავტორმა ბოლოში წერტილი არ დასვა
        const leftover = remaining.trim();
        if (leftover.length > 0) {
          sentences.push({
            id: sentenceId++,
            text: leftover.endsWith('.') ? leftover : `${leftover}.`,
            stanzaIndex: stanzaIdx,
          });
        }
        remaining = '';
      }
    }
  });

  return sentences;
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
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
