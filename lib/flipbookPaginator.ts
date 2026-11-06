/**
 * დოკუმენტის HTML შიგთავსის დაყოფა ელექტრონული წიგნის გვერდებად (Pagination Engine).
 * ითვალისწინებს:
 *  - ხელით ჩასმულ გვერდის გამყოფებს (.page-break-indicator)
 *  - სათაურებს (H1, H2, H3), სურათებს, ცხრილებს
 *  - აბზაცების ბუნებრივ ზომას და ესთეტიკურ დანაწევრებას
 */

import { FlipbookPage } from '../types/flipbook';

/**
 * ასუფთავებს და ანალიზებს HTML-ს
 */
function cleanHtmlForBook(html: string): string {
  if (!html) return '';
  // მოვაშოროთ ტელეპრომპტერის პირადი შენიშვნები {ნოტები} და [ ] ნიშნები, თუ დოკუმენტში იყო
  return html
    .replace(/\{[^{}]*\}/g, '')
    .replace(/\[([^\[\]]+)\]/g, '$1');
}

/**
 * ითვლის ბლოკ-ელემენტის წონას (სიმაღლის ექვივალენტს)
 */
function estimateElementWeight(el: Element): number {
  const tagName = el.tagName.toLowerCase();
  const text = (el.textContent || '').trim();
  const textLen = text.length;

  if (el.classList.contains('embedded-pdf-box') || el.querySelector('iframe')) return 900;
  if (tagName === 'img' || el.querySelector('img')) return 450;
  if (tagName === 'table') return Math.max(300, textLen * 1.5);
  if (tagName === 'h1') return 160 + textLen * 1.2;
  if (tagName === 'h2') return 130 + textLen * 1.1;
  if (tagName === 'h3' || tagName === 'h4') return 100 + textLen;
  if (tagName === 'blockquote') return 120 + textLen * 0.9;
  if (tagName === 'pre' || tagName === 'code') return 180 + textLen * 0.9;
  if (tagName === 'ul' || tagName === 'ol') return 80 + textLen * 0.9;

  // ჩვეულებრივი პარაგრაფი
  return Math.max(50, textLen * 0.85);
}

/**
 * მთავარი ფუნქცია: HTML-ის გვერდებად გარდაქმნა
 */
export function paginateHtmlForFlipbook(rawHtml: string): FlipbookPage[] {
  const cleaned = cleanHtmlForBook(rawHtml);
  if (!cleaned.trim()) {
    return [
      {
        pageNumber: 1,
        html: '<div class="book-empty-page"><p class="text-center italic opacity-60">დოკუმენტი ცარიელია</p></div>',
        wordCount: 0,
      }
    ];
  }

  // 1. ვამოწმებთ, არის თუ არა დოკუმენტში ხელით ჩასმული გვერდის გამყოფები
  if (cleaned.includes('page-break-indicator') || cleaned.includes('page-break-after')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleaned, 'text/html');
    const pages: FlipbookPage[] = [];

    let currentPageNodes: Node[] = [];
    let currentTitle: string | undefined = undefined;

    const commitPage = () => {
      if (currentPageNodes.length === 0) return;
      const tempDiv = document.createElement('div');
      currentPageNodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
      const pageHtml = tempDiv.innerHTML.trim();
      const text = tempDiv.textContent || '';
      const words = text.trim().split(/\s+/).filter(Boolean).length;

      if (pageHtml.length > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          html: pageHtml,
          title: currentTitle,
          wordCount: words,
        });
      }
      currentPageNodes = [];
    };

    const walk = (parent: Node) => {
      Array.from(parent.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const isBreak = el.classList.contains('page-break-indicator') || 
            el.style.pageBreakAfter === 'always' || 
            el.style.breakAfter === 'page';

          if (isBreak) {
            commitPage();
            return;
          }

          if (/^H[1-3]$/i.test(el.tagName)) {
            currentTitle = el.textContent?.trim();
          }
        }
        currentPageNodes.push(node);
      });
    };

    walk(doc.body);
    commitPage();

    if (pages.length > 0) {
      return pages;
    }
  }

  // 2. დინამიური დაგვერდება ბლოკების წონის მიხედვით
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, 'text/html');
  const children = Array.from(doc.body.children);

  if (children.length === 0) {
    // თუ ტეგიანი შიგთავსი არაა, მარტივი ტექსტია
    const plainText = doc.body.textContent || '';
    const paragraphs = plainText.split(/\n\s*\n/).filter(p => p.trim());
    const pages: FlipbookPage[] = [];
    let currentHtml = '';
    let currentWords = 0;

    paragraphs.forEach((p) => {
      const pWords = p.trim().split(/\s+/).filter(Boolean).length;
      if (currentWords + pWords > 280 && currentHtml) {
        pages.push({
          pageNumber: pages.length + 1,
          html: currentHtml,
          wordCount: currentWords,
        });
        currentHtml = `<p>${p}</p>`;
        currentWords = pWords;
      } else {
        currentHtml += `<p>${p}</p>`;
        currentWords += pWords;
      }
    });

    if (currentHtml) {
      pages.push({
        pageNumber: pages.length + 1,
        html: currentHtml,
        wordCount: currentWords,
      });
    }

    return pages.length > 0 ? pages : [
      { pageNumber: 1, html: `<p>${plainText}</p>`, wordCount: plainText.split(/\s+/).length }
    ];
  }

  const pages: FlipbookPage[] = [];
  const TARGET_PAGE_WEIGHT = 950; // ოპტიმალური მოცულობა ერთ გვერდზე

  let currentElements: HTMLElement[] = [];
  let currentWeight = 0;
  let currentTitle: string | undefined = undefined;

  const flushPage = () => {
    if (currentElements.length === 0) return;
    const tempDiv = document.createElement('div');
    currentElements.forEach(el => tempDiv.appendChild(el.cloneNode(true)));
    const html = tempDiv.innerHTML.trim();
    const words = (tempDiv.textContent || '').trim().split(/\s+/).filter(Boolean).length;

    pages.push({
      pageNumber: pages.length + 1,
      html,
      title: currentTitle,
      wordCount: words,
    });

    currentElements = [];
    currentWeight = 0;
  };

  children.forEach((child) => {
    const el = child as HTMLElement;
    const isHeading = /^H[1-3]$/i.test(el.tagName);
    const weight = estimateElementWeight(el);

    if (isHeading) {
      currentTitle = el.textContent?.trim();
      // თუ სათაურია და გვერდი უკვე ნახევარზე მეტია შევსებული, ახალ გვერდზე გადავიტანოთ
      if (currentWeight > TARGET_PAGE_WEIGHT * 0.45) {
        flushPage();
      }
    }

    // თუ მიმდინარე ბლოკი გადააჭარბებს გვერდის მაქსიმუმს
    if (currentWeight + weight > TARGET_PAGE_WEIGHT && currentElements.length > 0) {
      flushPage();
    }

    currentElements.push(el);
    currentWeight += weight;
  });

  flushPage();

  return pages.length > 0 ? pages : [
    { pageNumber: 1, html: cleaned, wordCount: cleaned.split(/\s+/).length }
  ];
}
