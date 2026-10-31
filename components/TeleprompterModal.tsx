import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  PlayIcon, 
  PauseIcon,
  CloseIcon, 
  SaveIcon, 
  PresentationIcon,
  SparklesIcon
} from './icons/EditorIcons';
import { 
  TeleprompterSettings, 
  DEFAULT_TELEPROMPTER_SETTINGS, 
  TELEPROMPTER_STORAGE_KEY,
  TeleprompterAnimationMode,
  SentenceEntranceEffect,
  SentenceExitEffect,
  SplitMode,
  getOptimalContrastTextColor
} from '../types/teleprompter';
import { 
  wrapSentencesInElement,
  wrapWordsInElement,
  stripBracketsFromElement,
  extractSentencesFromHtml,
  sanitizeTeleprompterHtml 
} from '../lib/teleprompterParser';
import { playEntranceEffect } from '../lib/teleprompterEffects';

interface TeleprompterModalProps {
  isOpen: boolean;
  htmlContent: string;
  editorSelectedText?: string;
  onClose: () => void;
  onLaunch: (settings: TeleprompterSettings) => void;
  t: (key: string) => string;
}

const THEMES: Record<string, { name: string; bg: string; fg: string; hl: string }> = {
  dark: { name: '🌑 მუქი (OLED Black)', bg: '#000000', fg: '#ffffff', hl: '#ffe680' },
  light: { name: '☀️ ღია (თეთრი ფონი)', bg: '#ffffff', fg: '#111827', hl: '#b45309' },
  contrast: { name: '⚡ მაღალი კონტრასტი', bg: '#000000', fg: '#ffff00', hl: '#ffffff' },
  sepia: { name: '📜 სეპია (კინო)', bg: '#f4ecd8', fg: '#3b2f1e', hl: '#9a3412' },
  night: { name: '🌌 ღამის ლურჯი', bg: '#0b1220', fg: '#dbe7ff', hl: '#7dd3fc' },
};

const MODES_LIST: { id: TeleprompterAnimationMode; title: string; subtitle: string; icon: string }[] = [
  { id: 'continuous', title: 'ტიტრები (ტელეპრომპტერი)', subtitle: 'გლუვი უწყვეტი სქროლი', icon: '📜' },
  { id: 'sentence', title: 'სუბტიტრები', subtitle: 'წინადადებები ანიმაციით', icon: '💬' },
  { id: 'word_zoom', title: 'სიტყვების მიყოლა & გამოკვეთა', subtitle: 'ტექსტის სქროლი + სიტყვა-სიტყვით', icon: '🔤' },
  { id: 'stanza', title: 'სტროფებად', subtitle: 'პრეზენტაციის სლაიდები', icon: '📑' },
  { id: 'marquee', title: 'მორბენალი სტრიქონი', subtitle: 'ჰორიზონტალური ტიტრი', icon: '🏃' },
];

export const TeleprompterModal: React.FC<TeleprompterModalProps> = ({
  isOpen,
  htmlContent,
  editorSelectedText = '',
  onClose,
  onLaunch,
}) => {
  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    try {
      const saved = localStorage.getItem(TELEPROMPTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...DEFAULT_TELEPROMPTER_SETTINGS, 
          ...parsed,
        };
      }
    } catch (e) {
      console.error('ტელესუფლიორის პარამეტრების წაკითხვა ვერ მოხერხდა', e);
    }
    return DEFAULT_TELEPROMPTER_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>('dark');

  // Live Monitor რეჟიმის შიდა მდგომარეობა
  const [monPlaying, setMonPlaying] = useState<boolean>(false);
  const [monSentenceIdx, setMonSentenceIdx] = useState<number>(0);
  const [monWordIdx, setMonWordIdx] = useState<number>(0);
  const [monScale, setMonScale] = useState<number>(1);
  const monWrapRef = useRef<HTMLDivElement>(null);
  const monInnerRef = useRef<HTMLDivElement>(null);
  const monRafRef = useRef<number | null>(null);
  const monPosRef = useRef<number>(0);
  const monLastTimeRef = useRef<number>(0);
  const monTimerRef = useRef<number | null>(null);

  // სუფთა HTML ტექსტი მონიტორისთვის
  const effectiveHtml = useMemo(() => {
    let raw = htmlContent;
    if (editorSelectedText && editorSelectedText.trim().length > 0) {
      raw = `<p>${editorSelectedText.replace(/\n/g, '<br/>')}</p>`;
    }
    if (!raw || !raw.trim()) {
      raw = '<p>დიდი მადლობა ყველას, ვინც ამ პროექტში მიიღო მონაწილეობა. [ეს არის გამოყოფილი წინადადება ანიმაციისთვის]. [მეორე წინადადება მშვენიერი ეფექტით].</p>';
    }
    return sanitizeTeleprompterHtml(raw);
  }, [htmlContent, editorSelectedText]);

  // გაანალიზებული წინადადებები
  const parsedSentences = useMemo(() => {
    return extractSentencesFromHtml(effectiveHtml, settings.splitMode);
  }, [effectiveHtml, settings.splitMode]);

  // ინიციალიზაცია გახსნისას
  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setMonPlaying(false);
      setMonSentenceIdx(0);
      setMonWordIdx(0);
      monPosRef.current = 0;
    }
  }, [isOpen]);

  // Live monitor scale calculation for 16:9 (1280x720)
  const updateMonScale = useCallback(() => {
    if (monWrapRef.current) {
      const wrapWidth = monWrapRef.current.clientWidth;
      setMonScale(wrapWidth / 1280);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMonScale();
    window.addEventListener('resize', updateMonScale);
    return () => window.removeEventListener('resize', updateMonScale);
  }, [isOpen, updateMonScale]);

  // Monitor DOM Setup შესაბამისი რეჟიმის მიხედვით
  useEffect(() => {
    if (!monInnerRef.current || !isOpen) return;
    const inner = monInnerRef.current;
    inner.innerHTML = effectiveHtml;

    if (settings.mode === 'continuous') {
      stripBracketsFromElement(inner);
      inner.style.columnCount = String(settings.columns);
      inner.style.columnGap = settings.columns > 1 ? '64px' : '0';
      inner.style.columnRule = settings.columns > 1 ? `1px solid ${settings.textColor}33` : 'none';
      inner.style.transform = `translateY(${-monPosRef.current}px)`;
    } else if (settings.mode === 'word_zoom') {
      // სიტყვების გამოკვეთის რეჟიმი: მთლიანი ტექსტი + სიტყვა-სიტყვით გამოკვეთა
      const wordSpans = wrapWordsInElement(inner);
      wordSpans.forEach((w, idx) => {
        const isCurrent = idx === monWordIdx;
        const isPast = idx < monWordIdx;
        w.style.opacity = isCurrent ? '1' : isPast ? '0.85' : '0.35';
        w.style.color = isCurrent ? settings.highlightColor : settings.textColor;
        w.style.fontWeight = isCurrent ? 'bold' : 'normal';
        w.style.transform = isCurrent ? `scale(${settings.wordZoomScale || 1.2})` : 'none';
        w.style.textShadow = isCurrent && settings.glow ? `0 0 0.8em ${settings.highlightColor}aa` : 'none';
      });

      const currentWordEl = wordSpans[monWordIdx];
      if (currentWordEl && settings.autoCenter) {
        const offset = currentWordEl.offsetTop + currentWordEl.offsetHeight / 2;
        inner.style.transform = `translateY(${360 - offset}px)`;
      } else {
        inner.style.transform = 'translateY(0)';
      }
    } else if (settings.mode === 'sentence') {
      // სუბტიტრების რეჟიმი: წინადადებების გამოყოფა [ ] და splitMode-ის გათვალისწინებით
      wrapSentencesInElement(inner, settings.splitMode);
      const sentenceEls = inner.querySelectorAll<HTMLSpanElement>('.sentence');
      sentenceEls.forEach((sp, idx) => {
        const isActive = idx === monSentenceIdx;
        sp.style.opacity = isActive ? '1' : '0.2';
        sp.style.color = isActive ? settings.highlightColor : settings.textColor;
        sp.style.fontWeight = isActive ? '700' : 'normal';
        sp.style.textShadow = isActive && settings.glow ? `0 0 0.5em ${settings.highlightColor}aa, 0 0 1.4em ${settings.highlightColor}55` : 'none';
        if (isActive && settings.draw) {
          sp.style.borderBottom = `2px solid ${settings.highlightColor}`;
        } else {
          sp.style.borderBottom = 'none';
        }
      });

      const activeEl = sentenceEls[monSentenceIdx];
      if (activeEl && settings.autoCenter) {
        const offset = activeEl.offsetTop + activeEl.offsetHeight / 2;
        inner.style.transform = `translateY(${360 - offset}px)`;
      } else {
        inner.style.transform = 'translateY(0)';
      }
    } else {
      // marquee ან stanza
      stripBracketsFromElement(inner);
      inner.style.transform = 'translateY(0)';
    }
  }, [
    effectiveHtml, 
    settings.mode, 
    settings.columns, 
    settings.textColor, 
    settings.splitMode, 
    settings.highlightColor, 
    settings.glow, 
    settings.draw,
    settings.autoCenter, 
    settings.wordZoomScale,
    monSentenceIdx, 
    monWordIdx,
    isOpen
  ]);

  // მიმდინარე აქტიური წინადადების ეფექტის შემოწმება Live Monitor-ში
  const triggerEffectPreview = useCallback(() => {
    if (!monInnerRef.current) return;
    const sentenceEls = monInnerRef.current.querySelectorAll<HTMLSpanElement>('.sentence');
    const targetEl = sentenceEls[monSentenceIdx] || sentenceEls[0];
    if (targetEl) {
      targetEl.style.opacity = '1';
      targetEl.style.color = settings.highlightColor;
      targetEl.style.fontWeight = '700';
      if (settings.glow) {
        targetEl.style.textShadow = `0 0 0.5em ${settings.highlightColor}aa, 0 0 1.4em ${settings.highlightColor}55`;
      }
      playEntranceEffect(
        targetEl, 
        settings.sentenceEffect, 
        settings.effectDur, 
        settings.highlightColor, 
        settings.textColor
      );
    }
  }, [monSentenceIdx, settings.sentenceEffect, settings.effectDur, settings.highlightColor, settings.textColor, settings.glow]);

  // Live Monitor ტესტირების Loop (ანიმაცია)
  useEffect(() => {
    if (!monPlaying || !isOpen) {
      if (monRafRef.current) cancelAnimationFrame(monRafRef.current);
      if (monTimerRef.current) clearTimeout(monTimerRef.current);
      return;
    }

    if (settings.mode === 'continuous') {
      const loop = (time: number) => {
        if (!monLastTimeRef.current) monLastTimeRef.current = time;
        const dt = Math.min(0.25, (time - monLastTimeRef.current) / 1000);
        monLastTimeRef.current = time;

        if (monInnerRef.current) {
          const max = Math.max(0, monInnerRef.current.scrollHeight - 680);
          monPosRef.current += settings.continuousSpeed * dt;
          if (monPosRef.current > max) monPosRef.current = 0;
          monInnerRef.current.style.transform = `translateY(${-monPosRef.current}px)`;
        }

        monRafRef.current = requestAnimationFrame(loop);
      };

      monLastTimeRef.current = 0;
      monRafRef.current = requestAnimationFrame(loop);

      return () => {
        if (monRafRef.current) cancelAnimationFrame(monRafRef.current);
      };
    } else if (settings.mode === 'word_zoom') {
      // სიტყვების გამოკვეთის ტესტი WPM სიჩქარით
      const intervalMs = Math.max(70, Math.floor(60000 / settings.wordWpm));
      const wordEls = monInnerRef.current?.querySelectorAll<HTMLSpanElement>('.teleprompter-word') || [];
      const totalWords = wordEls.length || 1;

      monTimerRef.current = window.setTimeout(() => {
        setMonWordIdx(prev => (prev + 1) % totalWords);
      }, intervalMs);

      return () => {
        if (monTimerRef.current) clearTimeout(monTimerRef.current);
      };
    } else if (settings.mode === 'sentence') {
      // წინადადებების ავტომატური სვლა მონიტორში
      const intervalSec = settings.sentenceInterval > 0 ? settings.sentenceInterval : 3.5;
      const totalSentences = parsedSentences.length || 1;

      monTimerRef.current = window.setTimeout(() => {
        setMonSentenceIdx(prev => {
          const nextIdx = (prev + 1) % totalSentences;
          setTimeout(() => {
            if (monInnerRef.current) {
              const sentenceEls = monInnerRef.current.querySelectorAll<HTMLSpanElement>('.sentence');
              const nextEl = sentenceEls[nextIdx];
              if (nextEl) {
                nextEl.style.opacity = '1';
                nextEl.style.color = settings.highlightColor;
                playEntranceEffect(
                  nextEl,
                  settings.sentenceEffect,
                  settings.effectDur,
                  settings.highlightColor,
                  settings.textColor
                );
              }
            }
          }, 40);
          return nextIdx;
        });
      }, intervalSec * 1000);

      return () => {
        if (monTimerRef.current) clearTimeout(monTimerRef.current);
      };
    }
  }, [
    monPlaying, 
    isOpen, 
    settings.mode, 
    settings.continuousSpeed, 
    settings.sentenceInterval, 
    settings.sentenceEffect, 
    settings.effectDur, 
    settings.highlightColor, 
    settings.textColor, 
    settings.wordWpm,
    parsedSentences.length, 
    monSentenceIdx,
    monWordIdx
  ]);

  // პარამეტრების შენახვა
  const handleSaveSettings = () => {
    try {
      localStorage.setItem(TELEPROMPTER_STORAGE_KEY, JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      console.error('შენახვა ვერ მოხერხდა', e);
    }
  };

  // თემის შეცვლა
  const handleThemeChange = (themeKey: string) => {
    setCurrentTheme(themeKey);
    if (THEMES[themeKey]) {
      const t = THEMES[themeKey];
      setSettings(prev => ({
        ...prev,
        backgroundColor: t.bg,
        textColor: t.fg,
        highlightColor: t.hl,
      }));
    }
  };

  // ფონის ფერის შეცვლა ავტომატური კონტრასტული ტექსტით
  const handleBgColorChange = (newBg: string) => {
    setCurrentTheme('custom');
    const autoContrastFg = getOptimalContrastTextColor(newBg);
    setSettings(prev => ({
      ...prev,
      backgroundColor: newBg,
      textColor: autoContrastFg,
    }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-7xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* სათაურის ზოლი */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <PresentationIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                🎬 ტიტრები · ტელეპრომპტერი · სუბტიტრები
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                სრული დოკუმენტის ანიმირებული გაშვება, ტელესუფლიორი და საპრეზენტაციო ეკრანი
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[12px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              title="პარამეტრების შენახვა"
            >
              <SaveIcon className="w-4 h-4 text-emerald-500" />
              <span>{savedSuccess ? 'შენახულია!' : 'შენახვა'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[12px] transition-colors"
              title="დახურვა"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* მთავარი შიგთავსი: 2 სვეტიანი დიზაინი (მარცხნივ პარამეტრები, მარჯვნივ Live Monitor) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* მარცხენა მხარე: პარამეტრების ბარათი (7 სვეტი) */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            
            {/* განმარტებითი ბანერი: [ ] და { } ნიშნების გამოყენება */}
            <div className="p-4 rounded-[12px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-slate-800 dark:text-indigo-200 text-xs sm:text-sm leading-relaxed flex items-start gap-3 shadow-sm">
              <span className="text-xl select-none leading-none">💡</span>
              <div>
                <p className="font-semibold text-indigo-950 dark:text-indigo-100 mb-1">
                  წინადადებებისა და წამყვანის შენიშვნების მონიშვნა პირდაპირ ტექსტში:
                </p>
                <p className="text-slate-600 dark:text-indigo-300/90 text-xs leading-5">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded-[6px]">[ამ ნიშნებში]</span> ჩასმული ტექსტი აღიქმება ცალკე წინადადებად.<br />
                  <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-[6px]">{`{კომენტარი}`}</span> ჩაწერილი ტექსტი თქვენი პირადი ნოტებისთვისაა და ეკრანზე არ გამოჩნდება.<br />
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 block">გაშვებისას [ ] და {`{ }`} სიმბოლოები ეკრანზე სრულიად უხილავია.</span>
                </p>
              </div>
            </div>

            {/* რეჟიმის არჩევანი (5 მკაფიო ბარათი) */}
            <div className="p-5 rounded-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                გაშვების რეჟიმი (აირჩიეთ სასურველი)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {MODES_LIST.map((m) => {
                  const isSelected = settings.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, mode: m.id }))}
                      className={`flex flex-col text-left p-3 rounded-[12px] border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/40'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base select-none">{m.icon}</span>
                        <span className="font-bold text-xs leading-snug">{m.title}</span>
                      </div>
                      <small className={`text-[11px] leading-tight ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {m.subtitle}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* რეჟიმზე დამოკიდებული პარამეტრები (მოძრაობა & ეფექტები) */}
            <div className="p-5 rounded-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                მოძრაობა და ეფექტები — {MODES_LIST.find(m => m.id === settings.mode)?.title}
              </h2>

              {/* 1. ტიტრები (ტელეპრომპტერი) */}
              {settings.mode === 'continuous' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>სქროლვის სიჩქარე</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{settings.continuousSpeed} px/წმ</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={settings.continuousSpeed}
                      onChange={(e) => setSettings(prev => ({ ...prev, continuousSpeed: Number(e.target.value) }))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-400">ისრებით (↑ ↓) შეგიძლიათ აჩქარება/შენელება დაკვრის დროსაც</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      სვეტების რაოდენობა
                    </label>
                    <select
                      value={settings.columns}
                      onChange={(e) => setSettings(prev => ({ ...prev, columns: Number(e.target.value) as 1 | 2 | 3 }))}
                      className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={1}>1 სვეტი</option>
                      <option value={2}>2 სვეტი</option>
                      <option value={3}>3 სვეტი</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <label className="inline-flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.guideLine}
                        onChange={(e) => setSettings(prev => ({ ...prev, guideLine: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        სახელმძღვანელო ჰორიზონტალური ხაზი (ტელეპრომპტერი 33%-ზე)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* 2. სუბტიტრები */}
              {settings.mode === 'sentence' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      წინადადებების გამოყოფა
                    </label>
                    <select
                      value={settings.splitMode}
                      onChange={(e) => setSettings(prev => ({ ...prev, splitMode: e.target.value as SplitMode }))}
                      className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="auto">ავტომატური + [ ] ნიშნები</option>
                      <option value="manual">მხოლოდ [ ] ნიშნებით (დანარჩენი დაიმალება)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ავტომატური გადასვლა
                    </label>
                    <select
                      value={settings.sentenceInterval}
                      onChange={(e) => setSettings(prev => ({ ...prev, sentenceInterval: Number(e.target.value) }))}
                      className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={0}>ხელით (კლავიატურით / კლიკით)</option>
                      <option value={3}>3 წამში</option>
                      <option value={5}>5 წამში (რეკომენდებული)</option>
                      <option value={8}>8 წამში</option>
                      <option value={12}>12 წამში</option>
                    </select>
                  </div>

                  {/* შემოსვლის მდიდარი ეფექტები (Entry Effects) + ტესტის ღილაკი */}
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        შემოსვლის ეფექტი (Entry Effect)
                      </label>
                      <button
                        type="button"
                        onClick={triggerEffectPreview}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[12px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors shadow-sm"
                        title="ეფექტის გატესტვა Live Monitor-ში"
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>▶ ეფექტის ტესტი (შემოწმება)</span>
                      </button>
                    </div>

                    <select
                      value={settings.sentenceEffect}
                      onChange={(e) => {
                        const newEf = e.target.value as SentenceEntranceEffect;
                        setSettings(prev => ({ ...prev, sentenceEffect: newEf }));
                        setTimeout(triggerEffectPreview, 60);
                      }}
                      className="h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-sm"
                    >
                      <option value="none">არცერთი (მყისიერი გამოჩენა)</option>
                      <option value="fade">fade — თანდათანობით გამოჩენა</option>
                      <option value="slide">slide — გვერდიდან შემოსვლა</option>
                      <option value="scale">scale — გადიდებით შემოსვლა</option>
                      <option value="typewriter">typewriter — საბეჭდი მანქანა (ასო-ასო)</option>
                      <option value="word">word — სიტყვა-სიტყვით გამოჩენა</option>
                      <option value="blur">blur — გამოკვეთა დაბინდვიდან</option>
                      <option value="up">up — ქვემოდან ამოსვლა</option>
                      <option value="down">down — ზემოდან ჩამოსვლა</option>
                      <option value="flip">flip — 3D გადატრიალება</option>
                      <option value="bounce">bounce — რბილი ხტუნვა</option>
                      <option value="wave">wave — ასო-ასო ტალღოვანი შემოსვლა</option>
                      <option value="karaoke">karaoke — ფერის თანმიმდევრული შევსება</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ეფექტის სიჩქარე
                    </label>
                    <select
                      value={settings.effectDur}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, effectDur: Number(e.target.value) }));
                        setTimeout(triggerEffectPreview, 60);
                      }}
                      className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={300}>სწრაფი (300 ms)</option>
                      <option value={500}>ჩვეულებრივი (500 ms)</option>
                      <option value={900}>ნელი (900 ms)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      წინა წინადადების გასვლა
                    </label>
                    <select
                      value={settings.exitFx}
                      onChange={(e) => setSettings(prev => ({ ...prev, exitFx: e.target.value as SentenceExitEffect }))}
                      className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="none">მყისიერად (None)</option>
                      <option value="fade">სწრაფი გაქრობა (Fade)</option>
                      <option value="slow">ნელი, რბილი გაქრობა (Slow)</option>
                      <option value="rise">ნელა ზემოთ გაქრობა (Rise)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      აქტიური წინადადების ფერი
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.highlightColor}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, highlightColor: e.target.value }));
                          setTimeout(triggerEffectPreview, 60);
                        }}
                        className="w-10 h-10 rounded-[12px] border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                      />
                      <input
                        type="text"
                        value={settings.highlightColor}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, highlightColor: e.target.value }));
                          setTimeout(triggerEffectPreview, 60);
                        }}
                        className="h-10 px-3 font-mono text-xs uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] w-28 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.glow}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, glow: e.target.checked }));
                          setTimeout(triggerEffectPreview, 60);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>რბილი ანათება (Glow)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.draw}
                        onChange={(e) => setSettings(prev => ({ ...prev, draw: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>ხაზგასმის გაწერა (Draw)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoCenter}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoCenter: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>ავტო-ცენტრირება</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showSentenceCounter}
                        onChange={(e) => setSettings(prev => ({ ...prev, showSentenceCounter: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>მრიცხველი (1/N)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 3. სიტყვების მიყოლა & გამოკვეთა */}
              {settings.mode === 'word_zoom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>კითხვის სიჩქარე (WPM)</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{settings.wordWpm} WPM</span>
                    </div>
                    <input
                      type="range"
                      min="90"
                      max="380"
                      step="10"
                      value={settings.wordWpm}
                      onChange={(e) => setSettings(prev => ({ ...prev, wordWpm: Number(e.target.value) }))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-400">180 WPM შეესაბამება საშუალო ტემპით მეტყველებას</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      სიტყვის გადიდების მასშტაბი
                    </label>
                    <input
                      type="range"
                      min="1.05"
                      max="1.5"
                      step="0.05"
                      value={settings.wordZoomScale || 1.2}
                      onChange={(e) => setSettings(prev => ({ ...prev, wordZoomScale: Number(e.target.value) }))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-400 font-mono text-right">{settings.wordZoomScale || 1.2}x</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      აქტიური სიტყვის ფერი
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.wordHighlightColor || settings.highlightColor}
                        onChange={(e) => setSettings(prev => ({ ...prev, wordHighlightColor: e.target.value, highlightColor: e.target.value }))}
                        className="w-10 h-10 rounded-[12px] border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                      />
                      <input
                        type="text"
                        value={settings.wordHighlightColor || settings.highlightColor}
                        onChange={(e) => setSettings(prev => ({ ...prev, wordHighlightColor: e.target.value, highlightColor: e.target.value }))}
                        className="h-10 px-3 font-mono text-xs uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] w-28 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-end pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.glow}
                        onChange={(e) => setSettings(prev => ({ ...prev, glow: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>სიტყვის რბილი ანათება (Glow)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 4. სტროფებად */}
              {settings.mode === 'stanza' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      სტროფის ავტო-გადასვლის დრო
                    </label>
                    <select
                      value={settings.stanzaInterval}
                      onChange={(e) => setSettings(prev => ({ ...prev, stanzaInterval: Number(e.target.value) }))}
                      className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={0}>ხელით (კლავიატურით / კლიკით)</option>
                      <option value={4}>4 წამი</option>
                      <option value={6}>6 წამი (რეკომენდებული)</option>
                      <option value={10}>10 წამი</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 5. მორბენალი სტრიქონი */}
              {settings.mode === 'marquee' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>მორბენალი სტრიქონის სიჩქარე</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{settings.marqueeSpeed} px/წმ</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="5"
                    value={settings.marqueeSpeed}
                    onChange={(e) => setSettings(prev => ({ ...prev, marqueeSpeed: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* გარეგნობის პარამეტრები (Appearance - შრიფტის ზომა და კონტრასტული ფერები) */}
            <div className="p-5 rounded-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                გარეგნობა და ფერები
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* თემა */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    წინასწარი თემა
                  </label>
                  <select
                    value={currentTheme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {Object.entries(THEMES).map(([k, t]) => (
                      <option key={k} value={k}>{t.name}</option>
                    ))}
                    <option value="custom">🎨 მორგებული</option>
                  </select>
                </div>

                {/* ფონის ფერი (ავტომატური კონტრასტის გამომთვლელით) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ფონის ფერი (ავტო-კონტრასტი)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      className="w-10 h-10 rounded-[12px] border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      className="h-10 px-3 font-mono text-xs uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] w-28 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ტექსტის ფერი */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ტექსტის ფერი
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.textColor}
                      onChange={(e) => {
                        setCurrentTheme('custom');
                        setSettings(prev => ({ ...prev, textColor: e.target.value }));
                      }}
                      className="w-10 h-10 rounded-[12px] border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.textColor}
                      onChange={(e) => {
                        setCurrentTheme('custom');
                        setSettings(prev => ({ ...prev, textColor: e.target.value }));
                      }}
                      className="h-10 px-3 font-mono text-xs uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] w-28 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* შრიფტის ზომა */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>შრიფტის მასშტაბი (ზომა)</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{settings.fontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="110"
                    step="2"
                    value={settings.fontSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* უკუთვლა დაწყებამდე */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    უკუთვლა დაწყებამდე
                  </label>
                  <select
                    value={settings.countdown}
                    onChange={(e) => setSettings(prev => ({ ...prev, countdown: Number(e.target.value) }))}
                    className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>გამორთული</option>
                    <option value={3}>3 წამი (რეკომენდებული)</option>
                    <option value={5}>5 წამი</option>
                    <option value={10}>10 წამი</option>
                  </select>
                </div>

                {/* სისტემური ჩამრთველები */}
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.fadeEdges}
                      onChange={(e) => setSettings(prev => ({ ...prev, fadeEdges: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>კიდეების გაბნევა (Fade Edges)</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.startFullscreen}
                      onChange={(e) => setSettings(prev => ({ ...prev, startFullscreen: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>პირდაპირ სრულ ეკრანზე</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.wakeLock}
                      onChange={(e) => setSettings(prev => ({ ...prev, wakeLock: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>ეკრანი არ ჩაქრეს (Wake Lock)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ცხელი კლავიშების გზამკვლევი (Keyboard Hints) */}
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-300">კლავიატურა:</span>
              <kbd className="px-2 py-0.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-300 dark:border-slate-700">Space</kbd>
              <span>— პაუზა / შემდეგი ·</span>
              <kbd className="px-2 py-0.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-300 dark:border-slate-700">← →</kbd>
              <span>— წინა / შემდეგი ·</span>
              <kbd className="px-2 py-0.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-300 dark:border-slate-700">↑ ↓</kbd>
              <span>— სიჩქარის / ინტერვალის რეგულირება ·</span>
              <kbd className="px-2 py-0.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-300 dark:border-slate-700">R</kbd>
              <span>— თავიდან ·</span>
              <kbd className="px-2 py-0.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-300 dark:border-slate-700">F</kbd>
              <span>— სრული ეკრანი ·</span>
              <kbd className="px-2 py-0.5 rounded-[6px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-300 dark:border-slate-700">Esc</kbd>
              <span>— გასვლა</span>
            </div>

          </div>

          {/* მარჯვენა მხარე: Live Monitor 16:9 გადახედვა (5 სვეტი) */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            <div className="sticky top-0 flex flex-col gap-4 p-5 rounded-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Live Monitor
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {MODES_LIST.find(m => m.id === settings.mode)?.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {settings.mode === 'sentence' && (
                    <button
                      type="button"
                      onClick={triggerEffectPreview}
                      className="px-2.5 py-1.5 rounded-[12px] text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                      title="ეფექტის ხელახლა გაშვება"
                    >
                      ⚡ ეფექტი
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMonPlaying(prev => !prev);
                      if (!monPlaying) {
                        monPosRef.current = 0;
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-bold transition-all shadow-sm ${
                      monPlaying 
                        ? 'bg-rose-600 text-white hover:bg-rose-700' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {monPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                    <span>{monPlaying ? '■ გაჩერება' : '▶ ტესტი'}</span>
                  </button>
                </div>
              </div>

              {/* 16:9 Monitor Frame */}
              <div 
                ref={monWrapRef}
                className="relative w-full aspect-video rounded-[12px] overflow-hidden border border-slate-800 shadow-inner"
                style={{ backgroundColor: settings.backgroundColor }}
              >
                {/* 1280x720 Scaled Viewport */}
                <div
                  className="absolute left-0 top-0 overflow-hidden select-none pointer-events-none"
                  style={{
                    width: '1280px',
                    height: '720px',
                    transform: `scale(${monScale})`,
                    transformOrigin: '0 0',
                    backgroundColor: settings.backgroundColor,
                    color: settings.textColor,
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: '1.55',
                  }}
                >
                  <div
                    ref={monInnerRef}
                    className="absolute left-0 right-0 top-0 transition-transform duration-300"
                    style={{
                      padding: settings.mode === 'continuous' ? '40px 64px' : '0 100px',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                    }}
                  />
                </div>

                {/* ზედა და ქვედა გაბნევის ნიღბები მონიტორში (Fade Edges) */}
                {settings.fadeEdges && (
                  <>
                    <div 
                      className="absolute inset-x-0 top-0 h-14 pointer-events-none z-10"
                      style={{
                        background: `linear-gradient(to bottom, ${settings.backgroundColor}, transparent)`
                      }}
                    />
                    <div 
                      className="absolute inset-x-0 bottom-0 h-14 pointer-events-none z-10"
                      style={{
                        background: `linear-gradient(to top, ${settings.backgroundColor}, transparent)`
                      }}
                    />
                  </>
                )}

                {/* სახელმძღვანელო ხაზი (Guide Line) */}
                {settings.mode === 'continuous' && settings.guideLine && (
                  <div 
                    className="absolute inset-x-0 top-1/3 h-[2px] pointer-events-none z-20"
                    style={{
                      backgroundColor: `${settings.textColor}4d`
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <span>ზუსტი 1280×720 გადახედვა</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {settings.mode === 'sentence' ? `ეფექტი: ${settings.sentenceEffect}` : settings.mode === 'word_zoom' ? `სიჩქარე: ${settings.wordWpm} WPM` : settings.mode === 'continuous' ? `${settings.continuousSpeed} px/წმ` : ''}
                </span>
              </div>

              {/* მთავარი დაწყების ღილაკი */}
              <button
                type="button"
                onClick={() => {
                  handleSaveSettings();
                  onLaunch(settings);
                }}
                className="w-full h-12 flex items-center justify-center gap-2 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-[12px] shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01]"
              >
                <PlayIcon className="w-5 h-5 fill-current" />
                <span>დაწყება (პრეზენტაცია)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TeleprompterModal;
