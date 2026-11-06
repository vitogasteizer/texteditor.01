/**
 * ელექტრონული გადასაშლელი წიგნის (Flipbook) ტიპები და ინტერფეისები
 */

export type FlipbookPaperTheme = 'classic' | 'clean' | 'dark' | 'sepia';

export type FlipbookViewMode = 'auto' | 'single' | 'double';

export interface FlipbookPage {
  /** გვერდის უნიკალური ნომერი (1-დან) */
  pageNumber: number;
  /** გვერდის სუფთა HTML კონტენტი */
  html: string;
  /** თავის ან ქვესათაურის სახელი, თუ არსებობს */
  title?: string;
  /** სავარაუდო სიტყვების რაოდენობა */
  wordCount: number;
}

export interface FlipbookSettings {
  /** ქაღალდის თემა (კლასიკური, სუფთა თეთრი, მუქი, სეპია) */
  theme: FlipbookPaperTheme;
  /** ჩვენების რეჟიმი: ავტომატური (ეკრანის მიხედვით), ერთგვერდიანი თუ ორგვერდიანი */
  viewMode: FlipbookViewMode;
  /** შრიფტის ბაზისური ზომა (პიქსელებში, მაგ. 16-24) */
  fontSize: number;
  /** ხაზებს შორის დაშორება */
  lineHeight: number;
  /** გვერდის გადაფურცვლის ნაზი ხმოვანი ეფექტი */
  soundEnabled: boolean;
  /** ავტომატური გადაფურცვლა (სლაიდშოუ, 0 = გამორთული, წამებში) */
  autoFlipInterval: number;
  /** ჩრდილებისა და 3D ეფექტის ინტენსივობა */
  shadowIntensity: number;
  /** გვერდის ნომრების ჩვენება */
  showPageNumbers: boolean;
}

export const DEFAULT_FLIPBOOK_SETTINGS: FlipbookSettings = {
  theme: 'classic',
  viewMode: 'auto',
  fontSize: 18,
  lineHeight: 1.7,
  soundEnabled: true,
  autoFlipInterval: 0,
  shadowIntensity: 0.8,
  showPageNumbers: true,
};

export const FLIPBOOK_THEME_CONFIG: Record<FlipbookPaperTheme, {
  name: string;
  pageBg: string;
  textColor: string;
  headingColor: string;
  pageBorder: string;
  spineShadow: string;
  outerBg: string;
}> = {
  classic: {
    name: 'კლასიკური წიგნი (სპილოსძვლისფერი)',
    pageBg: '#fdfbf7',
    textColor: '#292524',
    headingColor: '#1c1917',
    pageBorder: '#e7e2d7',
    spineShadow: 'rgba(0,0,0,0.12)',
    outerBg: '#f2efe9',
  },
  clean: {
    name: 'თანამედროვე სუფთა (თეთრი)',
    pageBg: '#ffffff',
    textColor: '#1f2937',
    headingColor: '#111827',
    pageBorder: '#e5e7eb',
    spineShadow: 'rgba(0,0,0,0.08)',
    outerBg: '#f1f5f9',
  },
  sepia: {
    name: 'ვინტაჟური სეპია',
    pageBg: '#f4ecd8',
    textColor: '#423324',
    headingColor: '#2f2113',
    pageBorder: '#ded0b6',
    spineShadow: 'rgba(50,30,10,0.15)',
    outerBg: '#eae1d0',
  },
  dark: {
    name: 'ღამის რეჟიმი (მუქი)',
    pageBg: '#1f242d',
    textColor: '#e2e8f0',
    headingColor: '#f8fafc',
    pageBorder: '#334155',
    spineShadow: 'rgba(0,0,0,0.4)',
    outerBg: '#111827',
  },
};
