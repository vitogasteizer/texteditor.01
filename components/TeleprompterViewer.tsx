import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  RotateCcwIcon, 
  CloseIcon, 
  SlidersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon
} from './icons/EditorIcons';
import { 
  TeleprompterSettings, 
  FONT_FAMILY_MAP
} from '../types/teleprompter';
import { 
  wrapSentencesInElement,
  wrapWordsInElement,
  stripBracketsFromElement,
  SentenceGroupElement,
  parseHtmlToStanzas,
  getPlainTextFromHtml,
  sanitizeTeleprompterHtml,
  ParsedStanza
} from '../lib/teleprompterParser';
import { playEntranceEffect, playExitEffect } from '../lib/teleprompterEffects';

interface TeleprompterViewerProps {
  isOpen: boolean;
  htmlContent: string;
  editorSelectedText?: string;
  settings: TeleprompterSettings;
  onClose: () => void;
  onUpdateSettings?: (newSettings: TeleprompterSettings) => void;
  t: (key: string) => string;
}

export const TeleprompterViewer: React.FC<TeleprompterViewerProps> = ({
  isOpen,
  htmlContent,
  editorSelectedText = '',
  settings: initialSettings,
  onClose,
  onUpdateSettings,
}) => {
  const [settings, setSettings] = useState<TeleprompterSettings>(initialSettings);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [osdMessage, setOsdMessage] = useState<string | null>(null);

  // უკუთვლა დაწყებამდე (Countdown)
  const [countdownVal, setCountdownVal] = useState<number | null>(null);

  // სუბტიტრების ჯგუფები (Sentence mode)
  const [sentenceGroups, setSentenceGroups] = useState<SentenceGroupElement[]>([]);
  const sentenceGroupsRef = useRef<SentenceGroupElement[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(-1);
  const currentSentenceIdxRef = useRef<number>(-1);
  const [currentPresenterNote, setCurrentPresenterNote] = useState<string | null>(null);

  // სიტყვების გამოკვეთის რეჟიმი (Word Zoom mode)
  const wordSpansRef = useRef<HTMLSpanElement[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState<number>(0);
  const currentWordIdxRef = useRef<number>(0);

  // სტროფების რეჟიმი (Stanza mode)
  const [currentStanzaIndex, setCurrentStanzaIndex] = useState<number>(0);

  // DOM Refs
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const marqueeContainerRef = useRef<HTMLDivElement>(null);
  const marqueeTextRef = useRef<HTMLDivElement>(null);

  // Timers & RAF Refs
  const continuousRafRef = useRef<number | null>(null);
  const continuousPosRef = useRef<number>(0);
  const continuousLastTimeRef = useRef<number>(0);

  const marqueeRafRef = useRef<number | null>(null);
  const marqueePosRef = useRef<number>(0);

  const sentenceTimerRef = useRef<number | null>(null);
  const sentenceRunIdRef = useRef<number>(0);

  const wordTimerRef = useRef<number | null>(null);
  const wordRunIdRef = useRef<number>(0);

  const stanzaTimerRef = useRef<number | null>(null);

  const hudTimeoutRef = useRef<number | null>(null);
  const osdTimeoutRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // სინქრონიზაცია საწყის პარამეტრებთან
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const updateSettingField = useCallback(<K extends keyof TeleprompterSettings>(field: K, val: TeleprompterSettings[K]) => {
    setSettings(prev => {
      const updated = { ...prev, [field]: val };
      if (onUpdateSettings) onUpdateSettings(updated);
      return updated;
    });
  }, [onUpdateSettings]);

  // OSD შეტყობინება ეკრანის ცენტრში
  const showOsd = useCallback((msg: string) => {
    setOsdMessage(msg);
    if (osdTimeoutRef.current) window.clearTimeout(osdTimeoutRef.current);
    osdTimeoutRef.current = window.setTimeout(() => setOsdMessage(null), 1400);
  }, []);

  // სუფთა HTML ტექსტი
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

  // სტროფები
  const stanzas: ParsedStanza[] = useMemo(() => {
    return parseHtmlToStanzas(effectiveHtml);
  }, [effectiveHtml]);

  // მორბენალი სტრიქონის ტექსტი
  const marqueePlain = useMemo(() => {
    return getPlainTextFromHtml(effectiveHtml);
  }, [effectiveHtml]);

  // Screen Wake Lock API
  useEffect(() => {
    if (!isOpen || !settings.wakeLock) return;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock შეცდომა:', err);
      }
    };
    requestLock();
    return () => {
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
    };
  }, [isOpen, settings.wakeLock]);

  // სრულ ეკრანზე გაშვება
  useEffect(() => {
    if (isOpen && settings.startFullscreen) {
      const enterFs = async () => {
        try {
          if (!document.fullscreenElement && stageRef.current) {
            await stageRef.current.requestFullscreen();
          }
        } catch (e) {
          console.warn('სრული ეკრანის შეცდომა:', e);
        }
      };
      enterFs();
    }
  }, [isOpen, settings.startFullscreen]);

  // HUD-ის ავტომატური დამალვა
  const showHudTemporarily = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) window.clearTimeout(hudTimeoutRef.current);
    if (isQuickSettingsOpen) return;
    hudTimeoutRef.current = window.setTimeout(() => setIsHudVisible(false), 3500);
  }, [isQuickSettingsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    showHudTemporarily();
  }, [isOpen, showHudTemporarily]);

  // წამზომი
  useEffect(() => {
    if (!isOpen || !isPlaying || countdownVal !== null) return;
    const iv = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    return () => clearInterval(iv);
  }, [isOpen, isPlaying, countdownVal]);

  // ===================== სუბტიტრების წინადადებების მართვა =====================
  const clearSentenceIntervals = useCallback(() => {
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
      sentenceTimerRef.current = null;
    }
  }, []);

  // ავტო-ცენტრირება წინადადებისთვის
  const centerSentence = useCallback((el: HTMLElement, smooth: boolean = true) => {
    if (!settings.autoCenter || !scrollContainerRef.current) return;
    const cont = scrollContainerRef.current;
    const r = el.getBoundingClientRect();
    const c = cont.getBoundingClientRect();
    const targetTop = Math.max(0, r.top - c.top + cont.scrollTop - cont.clientHeight / 2 + r.height / 2);
    cont.scrollTo({ top: targetTop, behavior: smooth ? 'smooth' : 'auto' });
  }, [settings.autoCenter]);

  // წინადადების აქტივაცია და ანიმაცია
  const activateSentence = useCallback((idx: number) => {
    const groups = sentenceGroupsRef.current;
    if (!groups || groups.length === 0) return;
    if (idx < 0 || idx >= groups.length) return;

    clearSentenceIntervals();
    const currentRunId = ++sentenceRunIdRef.current;

    currentSentenceIdxRef.current = idx;
    setCurrentSentenceIdx(idx);

    const activeGroup = groups[idx];
    setCurrentPresenterNote(activeGroup.note || null);

    // სხვა ყველა წინადადების დეაქტივაცია Exit Fx-ით
    groups.forEach((g, i) => {
      if (i !== idx) {
        g.elements.forEach(el => {
          playExitEffect(el, settings.exitFx, settings.textColor);
        });
      }
    });

    // აქტიური წინადადების გაფორმება
    activeGroup.elements.forEach(el => {
      el.style.opacity = '1';
      el.style.color = settings.highlightColor;
      el.style.fontWeight = '700';

      if (settings.glow) {
        el.style.textShadow = `0 0 0.5em ${settings.highlightColor}aa, 0 0 1.4em ${settings.highlightColor}55`;
      } else {
        el.style.textShadow = 'none';
      }

      if (settings.draw) {
        el.style.background = `linear-gradient(${settings.highlightColor}, ${settings.highlightColor}) 0 100%/0 0.09em no-repeat`;
        el.animate([
          { backgroundSize: '0% 0.09em' }, 
          { backgroundSize: '100% 0.09em' }
        ], { duration: 900, easing: 'ease-out', fill: 'forwards' });
      } else {
        el.style.background = 'transparent';
      }

      // შემოსვლის ეფექტის გაშვება (სრული 12 ეფექტი)
      playEntranceEffect(
        el,
        settings.sentenceEffect,
        settings.effectDur,
        settings.highlightColor,
        settings.textColor,
        () => centerSentence(el, false)
      );
    });

    if (activeGroup.elements[0]) {
      centerSentence(activeGroup.elements[0], true);
    }

    // ავტომატური გადასვლა შემდეგ წინადადებაზე მხოლოდ თუ sentenceInterval > 0
    if (settings.sentenceInterval > 0 && isPlaying && idx < groups.length - 1) {
      sentenceTimerRef.current = window.setTimeout(() => {
        if (sentenceRunIdRef.current === currentRunId) {
          activateSentence(idx + 1);
        }
      }, settings.sentenceInterval * 1000);
    }
  }, [
    settings.exitFx, 
    settings.textColor, 
    settings.highlightColor, 
    settings.glow, 
    settings.draw, 
    settings.sentenceEffect, 
    settings.effectDur, 
    settings.sentenceInterval, 
    isPlaying, 
    clearSentenceIntervals, 
    centerSentence
  ]);

  const advanceNextSentence = useCallback(() => {
    const groups = sentenceGroupsRef.current;
    if (!groups || groups.length === 0) return;
    const current = currentSentenceIdxRef.current;
    if (current < groups.length - 1) {
      activateSentence(current + 1);
    }
  }, [activateSentence]);

  const rewindPrevSentence = useCallback(() => {
    const groups = sentenceGroupsRef.current;
    if (!groups || groups.length === 0) return;
    const current = currentSentenceIdxRef.current;
    if (current > 0) {
      activateSentence(current - 1);
    }
  }, [activateSentence]);

  // ===================== სიტყვების გამოკვეთის რეჟიმი (Word Zoom) =====================
  const clearWordTimer = useCallback(() => {
    if (wordTimerRef.current) {
      clearTimeout(wordTimerRef.current);
      wordTimerRef.current = null;
    }
  }, []);

  const centerWord = useCallback((el: HTMLElement, smooth: boolean = true) => {
    if (!scrollContainerRef.current) return;
    const cont = scrollContainerRef.current;
    const r = el.getBoundingClientRect();
    const c = cont.getBoundingClientRect();
    const targetTop = cont.scrollTop + (r.top - c.top) - (cont.clientHeight / 2) + (r.height / 2);
    cont.scrollTo({ top: Math.max(0, targetTop), behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const activateWord = useCallback((idx: number, smoothScroll: boolean = true) => {
    const words = wordSpansRef.current;
    if (!words || words.length === 0) return;
    if (idx < 0 || idx >= words.length) return;

    clearWordTimer();
    const currentRunId = ++wordRunIdRef.current;

    const prevIdx = currentWordIdxRef.current;
    currentWordIdxRef.current = idx;
    setCurrentWordIdx(idx);

    // წინა სიტყვის დაბრუნება ნორმალურ მდგომარეობაში
    if (prevIdx >= 0 && prevIdx < words.length && prevIdx !== idx) {
      const prevEl = words[prevIdx];
      prevEl.style.opacity = '0.7';
      prevEl.style.color = settings.textColor;
      prevEl.style.fontWeight = 'normal';
      prevEl.style.transform = 'scale(1)';
      prevEl.style.textShadow = 'none';
    }

    // მიმდინარე სიტყვის გამოკვეთა და ფერის ცვლილება
    const activeEl = words[idx];
    const highlightColor = settings.wordHighlightColor || settings.highlightColor;
    const zoomScale = settings.wordZoomScale || 1.25;

    activeEl.style.opacity = '1';
    activeEl.style.color = highlightColor;
    activeEl.style.fontWeight = '800';
    activeEl.style.transform = `scale(${zoomScale})`;
    activeEl.style.transformOrigin = 'center center';
    activeEl.style.display = 'inline-block';

    if (settings.glow) {
      activeEl.style.textShadow = `0 0 0.5em ${highlightColor}aa, 0 0 1.2em ${highlightColor}66`;
    } else {
      activeEl.style.textShadow = 'none';
    }

    // ტექსტის ნელი ცენტრში ამოსვლა და აქტიური სიტყვის ფოკუსში ყოფნა
    centerWord(activeEl, smoothScroll);

    // შემდეგი სიტყვის ავტომატური განრიგი WPM-ის მიხედვით
    if (isPlaying && idx < words.length - 1) {
      const intervalMs = Math.max(50, Math.floor(60000 / settings.wordWpm));
      wordTimerRef.current = window.setTimeout(() => {
        if (wordRunIdRef.current === currentRunId) {
          activateWord(idx + 1, true);
        }
      }, intervalMs);
    } else if (idx >= words.length - 1) {
      setIsPlaying(false);
      showOsd('დასრულდა');
    }
  }, [
    settings.wordHighlightColor, 
    settings.highlightColor, 
    settings.textColor, 
    settings.wordZoomScale, 
    settings.glow, 
    settings.wordWpm, 
    isPlaying, 
    clearWordTimer, 
    centerWord, 
    showOsd
  ]);

  const advanceWordStep = useCallback((delta: number) => {
    const words = wordSpansRef.current;
    if (!words || words.length === 0) return;
    const target = Math.max(0, Math.min(words.length - 1, currentWordIdxRef.current + delta));
    activateWord(target, true);
  }, [activateWord]);

  // ===================== DOM ინიციალიზაცია =====================
  const initStageContent = useCallback(() => {
    if (!innerContentRef.current) return;
    const inner = innerContentRef.current;
    inner.innerHTML = effectiveHtml;

    if (settings.mode === 'continuous') {
      // სუფთა ტიტრები: [ ] და { } მოშორებულია, არანაირი სიტყვის გადიდება!
      stripBracketsFromElement(inner);
      inner.style.columnCount = String(settings.columns);
      inner.style.columnGap = settings.columns === 3 ? '4vw' : settings.columns === 2 ? '5vw' : '0';
      inner.style.columnRule = settings.columns > 1 ? `1px solid ${settings.textColor}33` : 'none';
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      continuousPosRef.current = 0;
    } else if (settings.mode === 'sentence') {
      // სუბტიტრები: წინადადებები
      const groups = wrapSentencesInElement(inner, settings.splitMode);
      sentenceGroupsRef.current = groups;
      setSentenceGroups(groups);
      groups.forEach(g => {
        g.elements.forEach(el => {
          el.style.opacity = '0.22';
          el.style.color = settings.textColor;
          el.style.fontWeight = 'normal';
          el.style.textShadow = 'none';
        });
      });
      currentSentenceIdxRef.current = -1;
      setCurrentSentenceIdx(-1);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    } else if (settings.mode === 'word_zoom') {
      // სიტყვების გამოკვეთა: მთლიანი ტექსტი გამოდის ეკრანზე, სიტყვები ინდივიდუალურად აქტიურდება
      const spans = wrapWordsInElement(inner);
      wordSpansRef.current = spans;
      spans.forEach(sp => {
        sp.style.opacity = '0.35';
        sp.style.color = settings.textColor;
        sp.style.fontWeight = 'normal';
        sp.style.transform = 'scale(1)';
        sp.style.textShadow = 'none';
      });
      currentWordIdxRef.current = -1;
      setCurrentWordIdx(0);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }
  }, [effectiveHtml, settings.mode, settings.columns, settings.textColor, settings.splitMode]);

  // უკუთვლით დაწყება
  const startShowWithCountdown = useCallback(async () => {
    initStageContent();
    const count = settings.countdown;
    if (count > 0) {
      for (let i = count; i > 0; i--) {
        setCountdownVal(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdownVal(null);
    }

    setIsPlaying(true);

    if (settings.mode === 'sentence') {
      setTimeout(() => {
        activateSentence(0);
      }, 50);
    } else if (settings.mode === 'word_zoom') {
      setTimeout(() => {
        activateWord(0, false);
      }, 50);
    }
  }, [initStageContent, settings.countdown, settings.mode, activateSentence, activateWord]);

  useEffect(() => {
    if (!isOpen) return;
    startShowWithCountdown();
  }, [isOpen]);

  // ===================== რეჟიმი 1: უწყვეტი გლუვი სქროლვა (ტიტრები) =====================
  useEffect(() => {
    if (!isOpen || settings.mode !== 'continuous' || !isPlaying || countdownVal !== null) {
      if (continuousRafRef.current) cancelAnimationFrame(continuousRafRef.current);
      return;
    }

    const cont = scrollContainerRef.current;
    if (!cont) return;

    const maxScroll = () => cont.scrollHeight - cont.clientHeight;

    const loop = (time: number) => {
      if (!continuousLastTimeRef.current) continuousLastTimeRef.current = time;
      const dt = Math.min(0.25, (time - continuousLastTimeRef.current) / 1000);
      continuousLastTimeRef.current = time;

      if (Math.abs(cont.scrollTop - continuousPosRef.current) > 6) {
        continuousPosRef.current = cont.scrollTop;
      }

      const max = maxScroll();
      continuousPosRef.current = Math.min(max, continuousPosRef.current + settings.continuousSpeed * dt);
      cont.scrollTop = continuousPosRef.current;

      if (continuousPosRef.current >= max - 0.5) {
        setIsPlaying(false);
        showOsd('დასრულდა');
        return;
      }

      continuousRafRef.current = requestAnimationFrame(loop);
    };

    continuousLastTimeRef.current = 0;
    continuousRafRef.current = requestAnimationFrame(loop);

    return () => {
      if (continuousRafRef.current) cancelAnimationFrame(continuousRafRef.current);
    };
  }, [isOpen, settings.mode, isPlaying, countdownVal, settings.continuousSpeed, showOsd]);

  // ===================== რეჟიმი 2: Marquee (მორბენალი სტრიქონი) =====================
  useEffect(() => {
    if (!isOpen || settings.mode !== 'marquee' || !isPlaying || countdownVal !== null) {
      if (marqueeRafRef.current) cancelAnimationFrame(marqueeRafRef.current);
      return;
    }

    let lastTime = 0;
    const loop = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min(0.25, (time - lastTime) / 1000);
      lastTime = time;

      if (marqueeTextRef.current && marqueeContainerRef.current) {
        const textWidth = marqueeTextRef.current.scrollWidth;
        const contWidth = marqueeContainerRef.current.clientWidth;
        marqueePosRef.current += settings.marqueeSpeed * dt;
        if (marqueePosRef.current > textWidth + contWidth) {
          marqueePosRef.current = -contWidth;
        }
        marqueeTextRef.current.style.transform = `translateX(${-marqueePosRef.current}px)`;
      }

      marqueeRafRef.current = requestAnimationFrame(loop);
    };

    marqueeRafRef.current = requestAnimationFrame(loop);
    return () => {
      if (marqueeRafRef.current) cancelAnimationFrame(marqueeRafRef.current);
    };
  }, [isOpen, settings.mode, isPlaying, countdownVal, settings.marqueeSpeed]);

  // ===================== რეჟიმი 3: Stanza (სტროფებად გადასვლა) =====================
  useEffect(() => {
    if (!isOpen || settings.mode !== 'stanza' || !isPlaying || countdownVal !== null) {
      if (stanzaTimerRef.current) clearTimeout(stanzaTimerRef.current);
      return;
    }

    if (settings.stanzaInterval > 0 && currentStanzaIndex < stanzas.length - 1) {
      stanzaTimerRef.current = window.setTimeout(() => {
        setCurrentStanzaIndex(prev => Math.min(stanzas.length - 1, prev + 1));
      }, settings.stanzaInterval * 1000);
    }

    return () => {
      if (stanzaTimerRef.current) clearTimeout(stanzaTimerRef.current);
    };
  }, [isOpen, settings.mode, isPlaying, countdownVal, settings.stanzaInterval, currentStanzaIndex, stanzas.length]);

  // ===================== კლავიატურისა და კონტროლის ქმედებები =====================
  const togglePlayPause = useCallback(() => {
    if (settings.mode === 'sentence') {
      if (settings.sentenceInterval > 0) {
        setIsPlaying(prev => {
          const nextState = !prev;
          if (!nextState) clearSentenceIntervals();
          else activateSentence(currentSentenceIdxRef.current >= 0 ? currentSentenceIdxRef.current : 0);
          showOsd(nextState ? 'მიმდინარეობს' : 'დაპაუზდა');
          return nextState;
        });
      } else {
        advanceNextSentence();
      }
    } else if (settings.mode === 'word_zoom') {
      setIsPlaying(prev => {
        const nextState = !prev;
        if (!nextState) clearWordTimer();
        else activateWord(currentWordIdxRef.current >= 0 ? currentWordIdxRef.current : 0, true);
        showOsd(nextState ? 'მიმდინარეობს' : 'დაპაუზდა');
        return nextState;
      });
    } else {
      setIsPlaying(prev => {
        const nextState = !prev;
        showOsd(nextState ? 'მიმდინარეობს' : 'დაპაუზდა');
        return nextState;
      });
    }
  }, [
    settings.mode, 
    settings.sentenceInterval, 
    clearSentenceIntervals, 
    activateSentence, 
    advanceNextSentence, 
    clearWordTimer, 
    activateWord, 
    showOsd
  ]);

  const restartPresentation = useCallback(() => {
    clearSentenceIntervals();
    clearWordTimer();
    setCurrentStanzaIndex(0);
    startShowWithCountdown();
    showOsd('თავიდან დაწყება');
  }, [clearSentenceIntervals, clearWordTimer, startShowWithCountdown, showOsd]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await stageRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('სრული ეკრანის შეცდომა:', e);
    }
  }, []);

  // კლავიატურის მოსმენა
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (settings.mode === 'continuous') {
          const newSpd = Math.min(300, settings.continuousSpeed + 10);
          updateSettingField('continuousSpeed', newSpd);
          showOsd(`სიჩქარე: ${newSpd} px/წმ`);
        } else if (settings.mode === 'sentence') {
          advanceNextSentence();
        } else if (settings.mode === 'word_zoom') {
          advanceWordStep(5);
        } else if (settings.mode === 'stanza') {
          setCurrentStanzaIndex(prev => Math.min(stanzas.length - 1, prev + 1));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (settings.mode === 'continuous') {
          const newSpd = Math.max(10, settings.continuousSpeed - 10);
          updateSettingField('continuousSpeed', newSpd);
          showOsd(`სიჩქარე: ${newSpd} px/წმ`);
        } else if (settings.mode === 'sentence') {
          rewindPrevSentence();
        } else if (settings.mode === 'word_zoom') {
          advanceWordStep(-5);
        } else if (settings.mode === 'stanza') {
          setCurrentStanzaIndex(prev => Math.max(0, prev - 1));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (settings.mode === 'continuous') {
          const newSpd = Math.min(300, settings.continuousSpeed + 10);
          updateSettingField('continuousSpeed', newSpd);
          showOsd(`სიჩქარე: ${newSpd} px/წმ`);
        } else if (settings.mode === 'sentence') {
          const newInt = settings.sentenceInterval + 1;
          updateSettingField('sentenceInterval', newInt);
          showOsd(`ავტო-ინტერვალი: ${newInt} წმ`);
        } else if (settings.mode === 'word_zoom') {
          const newWpm = Math.min(400, settings.wordWpm + 20);
          updateSettingField('wordWpm', newWpm);
          showOsd(`სიჩქარე: ${newWpm} WPM`);
        } else if (settings.mode === 'marquee') {
          const newSpd = Math.min(300, settings.marqueeSpeed + 15);
          updateSettingField('marqueeSpeed', newSpd);
          showOsd(`სიჩქარე: ${newSpd} px/წმ`);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (settings.mode === 'continuous') {
          const newSpd = Math.max(10, settings.continuousSpeed - 10);
          updateSettingField('continuousSpeed', newSpd);
          showOsd(`სიჩქარე: ${newSpd} px/წმ`);
        } else if (settings.mode === 'sentence') {
          const newInt = Math.max(0, settings.sentenceInterval - 1);
          updateSettingField('sentenceInterval', newInt);
          showOsd(newInt === 0 ? 'გადასვლა: ხელით' : `ავტო-ინტერვალი: ${newInt} წმ`);
        } else if (settings.mode === 'word_zoom') {
          const newWpm = Math.max(80, settings.wordWpm - 20);
          updateSettingField('wordWpm', newWpm);
          showOsd(`სიჩქარე: ${newWpm} WPM`);
        } else if (settings.mode === 'marquee') {
          const newSpd = Math.max(20, settings.marqueeSpeed - 15);
          updateSettingField('marqueeSpeed', newSpd);
          showOsd(`სიჩქარე: ${newSpd} px/წმ`);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restartPresentation();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen, 
    togglePlayPause, 
    settings.mode, 
    settings.continuousSpeed, 
    settings.sentenceInterval, 
    settings.marqueeSpeed, 
    settings.wordWpm, 
    stanzas.length, 
    updateSettingField, 
    showOsd, 
    advanceNextSentence, 
    rewindPrevSentence, 
    advanceWordStep, 
    restartPresentation, 
    toggleFullscreen, 
    onClose
  ]);

  if (!isOpen) return null;

  // სარკისებური არეკვლა (Flip)
  const flipTransforms = [
    settings.flipHorizontal ? 'scaleX(-1)' : '',
    settings.flipVertical ? 'scaleY(-1)' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={stageRef}
      onMouseMove={showHudTemporarily}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.hud-element')) return;
        togglePlayPause();
      }}
      className="fixed inset-0 z-50 overflow-hidden select-none transition-colors duration-300"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        fontFamily: FONT_FAMILY_MAP[settings.fontFamily] || FONT_FAMILY_MAP['noto-sans-georgian'],
        transform: flipTransforms || undefined,
      }}
    >
      {/* უკუთვლა დაწყებამდე (Countdown Overlay) */}
      {countdownVal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm">
          <span 
            className="text-[28vmin] font-black leading-none drop-shadow-2xl animate-in zoom-in-50 duration-300"
            style={{ color: settings.textColor }}
          >
            {countdownVal}
          </span>
        </div>
      )}

      {/* OSD შეტყობინება ეკრანის ცენტრში */}
      {osdMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-[12px] bg-slate-900/90 text-white text-sm font-semibold border border-white/20 backdrop-blur-md shadow-2xl animate-in fade-in duration-150 pointer-events-none">
          {osdMessage}
        </div>
      )}

      {/* ზედა და ქვედა კიდეების გაბნევა (Fade Edges) */}
      {settings.fadeEdges && (
        <>
          <div 
            className="fixed inset-x-0 top-0 h-36 pointer-events-none z-20"
            style={{
              background: `linear-gradient(to bottom, ${settings.backgroundColor}, transparent)`
            }}
          />
          <div 
            className="fixed inset-x-0 bottom-0 h-36 pointer-events-none z-20"
            style={{
              background: `linear-gradient(to top, ${settings.backgroundColor}, transparent)`
            }}
          />
        </>
      )}

      {/* ტელეპრომპტერის სახელმძღვანელო ჰორიზონტალური ხაზი (Continuous რეჟიმში) */}
      {settings.mode === 'continuous' && settings.guideLine && (
        <div 
          className="fixed inset-x-0 top-1/3 h-[2px] pointer-events-none z-20 shadow-sm"
          style={{
            backgroundColor: `${settings.textColor}4d`
          }}
        />
      )}

      {/* ===================== მთავარი სცენა რეჟიმების მიხედვით ===================== */}

      {/* რეჟიმი 1, 2 და 3: უწყვეტი სქროლვა (ტიტრები), სუბტიტრები და სიტყვების გამოკვეთა */}
      {(settings.mode === 'continuous' || settings.mode === 'sentence' || settings.mode === 'word_zoom') && (
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar"
          style={{
            lineHeight: settings.lineHeight || 1.6,
            fontSize: `${settings.fontSize}px`,
            letterSpacing: settings.letterSpacing ? `${settings.letterSpacing}px` : 'normal',
            scrollbarWidth: 'none',
          }}
        >
          <div
            ref={innerContentRef}
            className="w-full transition-transform duration-300"
            style={{
              padding: settings.mode === 'continuous' 
                ? '100vh 6vw 50vh' 
                : settings.mode === 'sentence'
                ? '45vh 8vw'
                : '50vh 8vw',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          />
        </div>
      )}

      {/* რეჟიმი 4: Marquee (მორბენალი სტრიქონი) */}
      {settings.mode === 'marquee' && (
        <div 
          ref={marqueeContainerRef}
          className="absolute inset-0 flex items-center overflow-hidden"
          style={{
            fontSize: `${settings.fontSize * 1.3}px`,
          }}
        >
          <div
            ref={marqueeTextRef}
            className="whitespace-nowrap font-bold tracking-wide"
            style={{
              color: settings.textColor,
              textShadow: settings.glow ? `0 0 0.5em ${settings.highlightColor}88` : 'none',
            }}
          >
            {marqueePlain}
          </div>
        </div>
      )}

      {/* რეჟიმი 5: Stanza (სტროფებად / სლაიდებად) */}
      {settings.mode === 'stanza' && (
        <div className="absolute inset-0 flex items-center justify-center p-8 md:p-16">
          <div 
            key={currentStanzaIndex}
            className="max-w-5xl text-center transition-all duration-500 animate-in fade-in zoom-in-95"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: '1.7',
            }}
            dangerouslySetInnerHTML={{
              __html: stanzas[currentStanzaIndex]?.html || '<p>ტექსტი არ არის</p>'
            }}
          />
        </div>
      )}

      {/* ===================== წამყვანის შენიშვნის ბანერი (HUD Note) ===================== */}
      {currentPresenterNote && settings.mode === 'sentence' && (
        <div className="hud-element fixed top-6 left-6 max-w-lg z-30 p-3.5 rounded-[12px] bg-slate-900/90 text-amber-200 border border-amber-500/40 backdrop-blur-md shadow-2xl flex items-start gap-2.5 text-xs animate-in slide-in-from-top-4 duration-200">
          <span className="text-base select-none">💡</span>
          <div>
            <strong className="block text-amber-300 font-semibold mb-0.5">შენიშვნა წამყვანს:</strong>
            <span className="text-amber-100/90 leading-relaxed">{currentPresenterNote}</span>
          </div>
        </div>
      )}

      {/* ===================== მართვის პანელი (Presenter HUD) ===================== */}
      <div 
        className={`hud-element fixed bottom-6 right-6 z-30 flex items-center gap-2 p-2 rounded-[12px] bg-slate-900/85 border border-white/15 backdrop-blur-md shadow-2xl transition-all duration-300 ${
          isHudVisible ? 'opacity-95 hover:opacity-100 translate-y-0' : 'opacity-20 translate-y-2'
        }`}
      >
        {/* დროის ან წინადადების მრიცხველი */}
        <div className="px-3 py-1 font-mono text-xs font-semibold text-slate-300 select-none">
          {settings.mode === 'sentence' && settings.showSentenceCounter
            ? `${currentSentenceIdx + 1}/${sentenceGroups.length}`
            : settings.mode === 'word_zoom'
            ? `${currentWordIdx + 1}/${wordSpansRef.current.length || 1}`
            : settings.mode === 'stanza'
            ? `${currentStanzaIndex + 1}/${stanzas.length}`
            : `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`
          }
        </div>

        {/* სუბტიტრების / სიტყვების / სტროფების წინა და შემდეგი ღილაკები */}
        {(settings.mode === 'sentence' || settings.mode === 'stanza' || settings.mode === 'word_zoom') && (
          <>
            <button
              type="button"
              onClick={() => {
                if (settings.mode === 'sentence') rewindPrevSentence();
                else if (settings.mode === 'stanza') setCurrentStanzaIndex(p => Math.max(0, p - 1));
                else if (settings.mode === 'word_zoom') advanceWordStep(-5);
              }}
              className="p-2 text-white hover:bg-white/15 rounded-[12px] transition-colors"
              title="წინა (←)"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (settings.mode === 'sentence') advanceNextSentence();
                else if (settings.mode === 'stanza') setCurrentStanzaIndex(p => Math.min(stanzas.length - 1, p + 1));
                else if (settings.mode === 'word_zoom') advanceWordStep(5);
              }}
              className="p-2 text-white hover:bg-white/15 rounded-[12px] transition-colors"
              title="შემდეგი (→)"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Play / Pause ღილაკი */}
        <button
          type="button"
          onClick={togglePlayPause}
          className="p-2 text-white hover:bg-white/15 rounded-[12px] transition-colors"
          title="დაკვრა / პაუზა (Space)"
        >
          {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
        </button>

        {/* თავიდან დაწყება */}
        <button
          type="button"
          onClick={restartPresentation}
          className="p-2 text-white hover:bg-white/15 rounded-[12px] transition-colors"
          title="თავიდან დაწყება (R)"
        >
          <RotateCcwIcon className="w-4 h-4" />
        </button>

        {/* სწრაფი პარამეტრები (Quick Settings Popover) */}
        <button
          type="button"
          onClick={() => setIsQuickSettingsOpen(prev => !prev)}
          className={`p-2 rounded-[12px] transition-colors ${
            isQuickSettingsOpen ? 'bg-indigo-600 text-white' : 'text-white hover:bg-white/15'
          }`}
          title="სწრაფი პარამეტრები"
        >
          <SlidersIcon className="w-4 h-4" />
        </button>

        {/* სრული ეკრანი */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 text-white hover:bg-white/15 rounded-[12px] transition-colors"
          title="სრული ეკრანი (F)"
        >
          <MaximizeIcon className="w-4 h-4" />
        </button>

        {/* გამოსვლა */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 rounded-[12px] transition-colors"
          title="გასვლა (Esc)"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ===================== სწრაფი პარამეტრების ფანჯარა (Quick Settings Popover) ===================== */}
      {isQuickSettingsOpen && (
        <div className="hud-element fixed bottom-20 right-6 z-40 w-80 p-5 rounded-[12px] bg-slate-900/95 border border-white/20 backdrop-blur-xl shadow-2xl text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">სწრაფი პარამეტრები</h3>
            <button
              onClick={() => setIsQuickSettingsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 text-xs">
            {/* შრიფტის ზომა */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>შრიფტის ზომა</span>
                <span className="font-mono text-indigo-400">{settings.fontSize} px</span>
              </div>
              <input
                type="range"
                min="18"
                max="100"
                step="2"
                value={settings.fontSize}
                onChange={(e) => updateSettingField('fontSize', Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* სიჩქარე (უწყვეტი ტიტრების რეჟიმისთვის) */}
            {settings.mode === 'continuous' && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>სქროლვის სიჩქარე</span>
                  <span className="font-mono text-indigo-400">{settings.continuousSpeed} px/წმ</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={settings.continuousSpeed}
                  onChange={(e) => updateSettingField('continuousSpeed', Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* სუბტიტრების ინტერვალი */}
            {settings.mode === 'sentence' && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>ავტო-გადასვლის დრო</span>
                  <span className="font-mono text-indigo-400">
                    {settings.sentenceInterval > 0 ? `${settings.sentenceInterval} წმ` : 'ხელით'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={settings.sentenceInterval}
                  onChange={(e) => updateSettingField('sentenceInterval', Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* სიტყვების კითხვის სიჩქარე (Word Zoom რეჟიმისთვის) */}
            {settings.mode === 'word_zoom' && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>კითხვის ტემპი</span>
                  <span className="font-mono text-indigo-400">{settings.wordWpm} WPM</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="400"
                  step="10"
                  value={settings.wordWpm}
                  onChange={(e) => updateSettingField('wordWpm', Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* ჩამრთველები */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span>კიდეების გაბნევა</span>
                <input
                  type="checkbox"
                  checked={settings.fadeEdges}
                  onChange={(e) => updateSettingField('fadeEdges', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </label>

              {settings.mode === 'continuous' && (
                <label className="flex items-center justify-between cursor-pointer">
                  <span>სახელმძღვანელო ხაზი</span>
                  <input
                    type="checkbox"
                    checked={settings.guideLine}
                    onChange={(e) => updateSettingField('guideLine', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}

              {(settings.mode === 'sentence' || settings.mode === 'word_zoom') && (
                <label className="flex items-center justify-between cursor-pointer">
                  <span>რბილი ანათება (Glow)</span>
                  <input
                    type="checkbox"
                    checked={settings.glow}
                    onChange={(e) => updateSettingField('glow', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeleprompterViewer;
