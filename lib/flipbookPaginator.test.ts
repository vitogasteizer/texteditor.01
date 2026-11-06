/**
 * ელექტრონული წიგნის დაგვერდების (Pagination Engine) ტესტი
 */

import { paginateHtmlForFlipbook } from './flipbookPaginator';

export function runFlipbookPaginatorTests(): boolean {
  // ტესტი 1: ცარიელი დოკუმენტი
  const emptyPages = paginateHtmlForFlipbook('');
  if (emptyPages.length !== 1 || emptyPages[0].pageNumber !== 1) {
    throw new Error('ტესტი 1 ჩავარდა: ცარიელი დოკუმენტი არ აბრუნებს 1 გვერდს');
  }

  // ტესტი 2: ხელით ჩასმული გვერდის გამყოფები (.page-break-indicator)
  const html = `
    <h1>თავი 1</h1>
    <p>პირველი გვერდის ტექსტი</p>
    <div class="page-break-indicator"></div>
    <h1>თავი 2</h1>
    <p>მეორე გვერდის ტექსტი</p>
  `;
  const pages = paginateHtmlForFlipbook(html);
  if (pages.length !== 2 || pages[0].title !== 'თავი 1' || pages[1].title !== 'თავი 2') {
    throw new Error('ტესტი 2 ჩავარდა: გვერდის გამყოფი არ მუშაობს სწორად');
  }

  // ტესტი 3: ნოტებისა და ფრჩხილების გასუფთავება
  const noteHtml = '<p>[ეს არის ტექსტი] {წამყვანის შენიშვნა}</p>';
  const cleanPages = paginateHtmlForFlipbook(noteHtml);
  if (cleanPages[0].html.includes('{წამყვანის შენიშვნა}') || cleanPages[0].html.includes('[')) {
    throw new Error('ტესტი 3 ჩავარდა: ტელეპრომპტერის ნოტები არ გასუფთავდა');
  }

  return true;
}
