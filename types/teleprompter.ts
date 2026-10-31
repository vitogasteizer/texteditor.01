/**
 * ტექსტის ანიმირების, ტელესუფლიორისა და პრეზენტატორის ტიპების განსაზღვრება
 */

export type TeleprompterAnimationMode = 
  | 'continuous'   // ტიტრები / ტელეპრომპტერი (ვერტიკალური სქროლი)
  | 'sentence'     // სუბტიტრები / წინადადებები (სუფთა მკაფიო შრიფტით)
  | 'stanza'       // სტროფებად / აბზაცებად (პრეზენტაციის სლაიდები)
  | 'word_zoom'    // სიტყვების თანმიმდევრული გამოკვეთა და გადიდება
  | 'marquee';     // მორბენალი სტრიქონი (მარჯვნიდან მარცხნივ)

export type SentenceEntranceEffect = 
  | 'none'
  | 'fade'
  | 'slide'
  | 'scale'
  | 'typewriter'
  | 'word'
  | 'blur'
  | 'up'
  | 'down'
  | 'flip'
  | 'bounce'
  | 'wave'
  | 'karaoke';

export type SentenceExitEffect = 'none' | 'fade' | 'slow' | 'rise';
export type SplitMode = 'auto' | 'manual'; // auto: წერტილები + [ ], manual: მხოლოდ [ ]
export type StanzaEntranceEffect = 'crossfade' | 'curtain' | 'dim';
export type TeleprompterFontFamily = 'sans' | 'serif' | 'mono';
export type TeleprompterTextAlign = 'left' | 'center' | 'right';

export interface TeleprompterSettings {
  mode: TeleprompterAnimationMode;
  
  // უწყვეტი სქროლვის / ტიტრების პარამეტრები
  continuousSpeed: number; // 10 - 300 px/წმ (ან 0.1-5.0x მამრავლი)
  columns: 1 | 2 | 3;      // სვეტების რაოდენობა (1, 2, 3)
  guideLine: boolean;      // სახელმძღვანელო ჰორიზონტალური ხაზი (33% პოზიციაზე)
  
  // სუბტიტრების / წინადადებების პარამეტრები
  splitMode: SplitMode;             // 'auto' ან 'manual' ([ ] ნიშნებით)
  sentenceInterval: number;         // ავტომატური გადასვლა წამებში (0 = ხელით)
  sentenceEffect: SentenceEntranceEffect; // შემოსვლის ეფექტი
  effectDur: number;                // ეფექტის ხანგრძლივობა (300ms, 500ms, 900ms)
  exitFx: SentenceExitEffect;       // წინა წინადადების გასვლის ეფექტი
  highlightColor: string;          // აქტიური წინადადების ფერი
  autoCenter: boolean;              // აქტიური წინადადების ავტომატური ცენტრირება
  glow: boolean;                    // რბილი ანათება (text-shadow glow)
  draw: boolean;                    // ხაზგასმის ანიმირებული „გაწერვა“
  showSentenceCounter: boolean;     // წინადადებების მრიცხველის (მაგ. 1/24) ჩვენება

  // მორბენალი სტრიქონის (Marquee) პარამეტრები
  marqueeSpeed: number; // 20-300 px/s

  // სტროფებად რეჟიმის პარამეტრები
  stanzaInterval: number; // წამები (მაგ. 6)
  stanzaEffect: StanzaEntranceEffect;
  stanzaDimOpacity: number; // 0.1 - 0.5

  // სიტყვების გადიდების პარამეტრები
  wordWpm: number; // სიტყვა წუთში (მაგ. 180-260)
  wordZoomScale: number; // 1.15 - 1.6
  wordHighlightColor: string; // ჰაილაითის ფერი

  // ვიზუალური და დისპლეის პარამეტრები
  backgroundColor: string; // ერთიანი ფონის ფერი
  textColor: string;       // ტექსტის ძირითადი ფერი
  fontSize: number;        // შრიფტის ზომა (პიქსელებში)
  fontFamily: TeleprompterFontFamily; // sans, serif, mono
  textAlign: TeleprompterTextAlign;   // center, left, right
  fadeEdges: boolean;      // ზედა და ქვედა კიდეების გლუვი გაბნევა (gradient mask)
  
  // სისტემური და პრეზენტაციის პარამეტრები
  countdown: number;        // უკუთვლა დაწყებამდე: 0 (გამორთული), 3, 5, 10 წამი
  wakeLock: boolean;        // ეკრანის ჩაქრობის პრევენცია
  startFullscreen: boolean; // დაწყებისას პირდაპირ სრულ ეკრანზე გაშვება
  mirrorMode: boolean;      // სარკისებრი რეჟიმი (მინის სუფლიორისთვის)
  autoPlay: boolean;        // გახსნისთანავე ავტომატური დაკვრა
}

export const DEFAULT_TELEPROMPTER_SETTINGS: TeleprompterSettings = {
  mode: 'continuous',
  
  // ტიტრები
  continuousSpeed: 80, // 80 px/s
  columns: 1,
  guideLine: false,
  
  // სუბტიტრები / წინადადებები
  splitMode: 'auto',
  sentenceInterval: 5, // 5 წამი
  sentenceEffect: 'fade',
  effectDur: 500,
  exitFx: 'fade',
  highlightColor: '#ffe680', // კლოდის საუკეთესო კონტრასტული ოქროსფერი
  autoCenter: true,
  glow: true,
  draw: false,
  showSentenceCounter: false,
  
  // მორბენალი სტრიქონი
  marqueeSpeed: 80,
  
  // სტროფები
  stanzaInterval: 6,
  stanzaEffect: 'dim',
  stanzaDimOpacity: 0.2,
  
  // სიტყვები
  wordWpm: 190,
  wordZoomScale: 1.3,
  wordHighlightColor: '#38bdf8',
  
  // გარეგნობა
  backgroundColor: '#000000',
  textColor: '#ffffff',
  fontSize: 42,
  fontFamily: 'sans',
  textAlign: 'center',
  fadeEdges: true,
  
  // სისტემური
  countdown: 3,
  wakeLock: true,
  startFullscreen: true,
  mirrorMode: false,
  autoPlay: true,
};

export const FONT_FAMILY_MAP: Record<TeleprompterFontFamily, string> = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Georgian", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", "Noto Serif Georgian", serif',
  mono: 'ui-monospace, "Cascadia Mono", "DejaVu Sans Mono", Consolas, monospace',
};

export function getOptimalContrastTextColor(bgHex: string): string {
  if (!bgHex || !bgHex.startsWith('#')) return '#ffffff';
  const clean = bgHex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  // გამოვთვალოთ YIQ სიკაშკაშე
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
}

export const TELEPROMPTER_STORAGE_KEY = 'app_teleprompter_settings_v3';
