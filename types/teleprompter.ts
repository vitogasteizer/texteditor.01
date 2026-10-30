/**
 * ტექსტის ანიმირების, ტელესუფლიორისა და პრეზენტატორის ტიპების განსაზღვრება
 */

export type TeleprompterAnimationMode = 
  | 'continuous'   // უწყვეტი გლუვი სქროლვა (ქვემოდან ზემოთ)
  | 'sentence'     // წინადადებებად შემოსვლა (სუფთა მკაფიო შრიფტით)
  | 'stanza'       // სტროფებად / აბზაცებად (პრეზენტაციის სლაიდები)
  | 'word_zoom'    // სიტყვების თანმიმდევრული გამოკვეთა და გადიდება
  | 'marquee';     // მორბენალი სტრიქონი (მარჯვნიდან მარცხნივ)

export type SentenceEntranceEffect = 'slide' | 'fade' | 'pop';
export type StanzaEntranceEffect = 'crossfade' | 'curtain' | 'dim';
export type TeleprompterContentScope = 'all' | 'custom_sentences' | 'editor_selection';

export interface TeleprompterSettings {
  mode: TeleprompterAnimationMode;
  contentScope: TeleprompterContentScope;
  selectedSentenceIndices: number[]; // ხელით შერჩეული წინადადებების ინდექსები
  
  // უწყვეტი სქროლვის პარამეტრები (ძალიან ნელი სტარტით)
  continuousSpeed: number; // 0.1 - 5.0 (ნაგულისხმევი 0.4x)
  
  // წინადადებებად რეჟიმის პარამეტრები
  sentenceInterval: number; // წამები (მაგ. 3.5)
  sentenceEffect: SentenceEntranceEffect;
  showSentenceCounter: boolean; // წინადადებების მრიცხველის (მაგ. 1/24) ჩვენება/დამალვა
  
  // მორბენალი სტრიქონის (Marquee) პარამეტრები
  marqueeSpeed: number; // პიქსელები წამში (მაგ. 80px/s, 20-300)
  
  // სტროფებად რეჟიმის პარამეტრები
  stanzaInterval: number; // წამები (მაგ. 6)
  stanzaEffect: StanzaEntranceEffect;
  stanzaDimOpacity: number; // 0.1 - 0.5
  
  // სიტყვების გადიდების პარამეტრები
  wordWpm: number; // სიტყვა წუთში (მაგ. 180-260)
  wordZoomScale: number; // 1.15 - 1.6
  wordHighlightColor: string; // ჰაილაითის ფერი
  
  // ვიზუალური და დისპლეის პარამეტრები
  backgroundColor: string; // ერთიანი ფონის ფერი (Custom Color)
  textColor: string;       // ტექსტის ძირითადი ფერი
  fontSize: number;        // შრიფტის ზომა (პიქსელებში)
  lineHeight: number;      // ხაზთაშორისი დაშორება
  
  // სისტემური და პრეზენტაციის პარამეტრები
  startFullscreen: boolean; // დაწყებისას პირდაპირ სრულ ეკრანზე გაშვება
  mirrorMode: boolean;      // სარკისებრი რეჟიმი (მინის სუფლიორისთვის)
  autoPlay: boolean;        // გახსნისთანავე ავტომატური დაკვრა
}

export const DEFAULT_TELEPROMPTER_SETTINGS: TeleprompterSettings = {
  mode: 'continuous',
  contentScope: 'all',
  selectedSentenceIndices: [],
  
  continuousSpeed: 0.4, // იწყება ძალიან ნელი, კომფორტული სვლით
  
  sentenceInterval: 4,
  sentenceEffect: 'slide',
  showSentenceCounter: false, // მომხმარებლის მოთხოვნით ნაგულისხმევად გამორთულია
  
  marqueeSpeed: 80, // 80 პიქსელი წამში
  
  stanzaInterval: 6,
  stanzaEffect: 'dim',
  stanzaDimOpacity: 0.2,
  
  wordWpm: 190,
  wordZoomScale: 1.3,
  wordHighlightColor: '#38bdf8', // კამკამა ცისფერი
  
  backgroundColor: '#0a0f1d',   // ღრმა მუქი კინემატოგრაფიული ფონი
  textColor: '#f8fafc',
  fontSize: 46,
  lineHeight: 1.9,
  
  startFullscreen: true,
  mirrorMode: false,
  autoPlay: true,
};

export function getOptimalContrastTextColor(bgHex: string): string {
  if (!bgHex || !bgHex.startsWith('#')) return '#f8fafc';
  const clean = bgHex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  // გამოვთვალოთ YIQ სიკაშკაშე
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#f8fafc';
}

export const TELEPROMPTER_STORAGE_KEY = 'app_teleprompter_settings_v2';
