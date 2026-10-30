import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  RotateCcwIcon, 
  CloseIcon, 
  SlidersIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from './icons/EditorIcons';
import { 
  TeleprompterSettings, 
  TeleprompterAnimationMode,
  getOptimalContrastTextColor
} from '../types/teleprompter';
import { 
  parseHtmlToStanzas, 
  extractSentences, 
  extractWords,
  getPlainTextFromHtml,
  sanitizeTeleprompterHtml,
  ParsedStanza,
  ParsedSentence,
  ParsedWord
} from '../lib/teleprompterParser';

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

  // მიმდინარე ინდექსები
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [currentStanzaIndex, setCurrentStanzaIndex] = useState<number>(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const activeStanzaRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  const hudTimeoutRef = useRef<number | null>(null);
  const osdTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const marqueeFrameRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const marqueePosRef = useRef<number>(0);
  const marqueeTextRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<TeleprompterSettings>(settings);
  const wakeLockRef = useRef<any>(null);

  // სინქრონიზაცია პარამეტრებთან
  useEffect(() => {
    setSettings(initialSettings);
    settingsRef.current = initialSettings;
  }, [initialSettings]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // OSD შეტყობინების ჩვენება
  const showOsd = useCallback((msg: string) => {
    setOsdMessage(msg);
    if (osdTimeoutRef.current) {
      window.clearTimeout(osdTimeoutRef.current);
    }
    osdTimeoutRef.current = window.setTimeout(() => {
      setOsdMessage(null);
    }, 1400);
  }, []);

  // ტექსტის დანაწევრება და კონტენტის გაფილტვრა (Content Scope)
  const effectiveHtml = useMemo(() => {
    let raw = htmlContent;
    if (settings.contentScope === 'editor_selection' && editorSelectedText.trim()) {
      raw = `<p>${editorSelectedText.replace(/\n/g, '<br/>')}</p>`;
    }
    return sanitizeTeleprompterHtml(raw);
  }, [settings.contentScope, editorSelectedText, htmlContent]);

  const rawStanzas: ParsedStanza[] = useMemo(() => {
    return parseHtmlToStanzas(effectiveHtml);
  }, [effectiveHtml]);

  const rawSentences: ParsedSentence[] = useMemo(() => {
    return extractSentences(rawStanzas);
  }, [rawStanzas]);

  // თუ არჩეულია კონკრეტული წინადადებები
  const sentences: ParsedSentence[] = useMemo(() => {
    if (settings.contentScope === 'custom_sentences' && settings.selectedSentenceIndices?.length) {
      const selectedSet = new Set(settings.selectedSentenceIndices);
      const filtered = rawSentences.filter((_, idx) => selectedSet.has(idx));
      return filtered.length > 0 ? filtered : rawSentences;
    }
    return rawSentences;
  }, [settings.contentScope, settings.selectedSentenceIndices, rawSentences]);

  const stanzas: ParsedStanza[] = useMemo(() => {
    if (settings.contentScope === 'custom_sentences' && sentences.length > 0) {
      // წინადადებებიდან ვაგენერირებთ სტროფებს
      return sentences.map((s, idx) => ({
        id: idx,
        html: `<p>${s.text}</p>`,
        text: s.text,
      }));
    }
    return rawStanzas;
  }, [settings.contentScope, sentences, rawStanzas]);

  const words: ParsedWord[] = useMemo(() => {
    return extractWords(sentences);
  }, [sentences]);

  // სუფთა ტექსტი მორბენალი სტრიქონისთვის
  const marqueeText: string = useMemo(() => {
    if (sentences.length > 0) {
      return sentences.map(s => s.text).join('   •   ');
    }
    return getPlainTextFromHtml(effectiveHtml);
  }, [sentences, effectiveHtml]);

  // Screen Wake Lock API - ეკრანის ჩაქრობის პრევენცია
  useEffect(() => {
    if (!isOpen) return;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (e) {
          // ignore
        }
        wakeLockRef.current = null;
      }
    };
  }, [isOpen]);

  // სრულ ეკრანზე გაშვება დაწყებისას
  useEffect(() => {
    if (isOpen && settings.startFullscreen) {
      const enterFs = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (e) {
          console.warn('Fullscreen request failed:', e);
        }
      };
      enterFs();
    }
  }, [isOpen, settings.startFullscreen]);

  // ტაიმერი (წამები)
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, isPlaying]);

  // HUD-ის მართვა (არ იმალება თუ სწრაფი პარამეტრები ღიაა)
  const showHudTemporarily = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) {
      window.clearTimeout(hudTimeoutRef.current);
    }
    // თუ სწრაფი პარამეტრების ფანჯარა ღიაა, HUD მუდმივად რჩება
    if (isQuickSettingsOpen) {
      return;
    }
    hudTimeoutRef.current = window.setTimeout(() => {
      setIsHudVisible(false);
    }, 4000);
  }, [isQuickSettingsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    showHudTemporarily();
  }, [isOpen, showHudTemporarily]);

  // ===================== რეჟიმი 1: უწყვეტი გლუვი სქროლვა =====================
  // ტექსტი იწყებს ამოსვლას სულ ქვემოდან (paddingTop: 100vh)
  useEffect(() => {
    if (!isOpen || settings.mode !== 'continuous') return;

    let running = true;
    lastScrollTimeRef.current = null;

    if (containerRef.current) {
      scrollPositionRef.current = containerRef.current.scrollTop;
    }

    const scrollStep = (timestamp: number) => {
      if (!running) return;

      if (isPlaying && scrollContentRef.current && containerRef.current) {
        if (lastScrollTimeRef.current === null) {
          lastScrollTimeRef.current = timestamp;
        }
        const delta = timestamp - lastScrollTimeRef.current;
        lastScrollTimeRef.current = timestamp;

        // შევზღუდოთ მაქსიმალური delta (მაგ. ჩანართის გადართვისას რომ არ გადახტეს)
        const safeDelta = Math.min(delta, 100);

        // სიჩქარე: 1.0x = 35px/წმ, 0.4x = 14px/წმ (ძალიან მშვიდი და გლუვი)
        const currentSpeed = settingsRef.current.continuousSpeed;
        const pixelsPerSecond = currentSpeed * 35;
        const move = (pixelsPerSecond * safeDelta) / 1000;

        scrollPositionRef.current += move;
        const maxScroll = scrollContentRef.current.scrollHeight;
        
        if (scrollPositionRef.current >= maxScroll) {
          scrollPositionRef.current = maxScroll;
          setIsPlaying(false);
        }

        containerRef.current.scrollTop = scrollPositionRef.current;
      } else {
        lastScrollTimeRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameRef.current = requestAnimationFrame(scrollStep);

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, isPlaying, settings.mode]);

  // ===================== რეჟიმი 2: წინადადებებად =====================
  useEffect(() => {
    if (!isOpen || settings.mode !== 'sentence' || !isPlaying) return;
    if (sentences.length === 0) return;

    const timer = window.setInterval(() => {
      setCurrentSentenceIndex(prev => {
        if (prev + 1 >= sentences.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, settings.sentenceInterval * 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, settings.mode, isPlaying, sentences.length, settings.sentenceInterval]);

  // ===================== რეჟიმი 3: მორბენალი სტრიქონი (Marquee) =====================
  // ტექსტი შემოდის მარჯვნიდან და მიემართება მარცხნივ
  useEffect(() => {
    if (!isOpen || settings.mode !== 'marquee') return;

    let running = true;
    let lastTime: number | null = null;

    // საწყისი პოზიცია: ეკრანის მარჯვენა კიდე
    if (containerRef.current && marqueePosRef.current === 0) {
      marqueePosRef.current = containerRef.current.clientWidth;
    }

    const marqueeStep = (timestamp: number) => {
      if (!running) return;

      if (isPlaying && marqueeTextRef.current && containerRef.current) {
        if (lastTime === null) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        const speed = settingsRef.current.marqueeSpeed;
        const move = (speed * delta) / 1000;
        marqueePosRef.current -= move;

        const textWidth = marqueeTextRef.current.scrollWidth || 2000;
        // როცა ტექსტი მთლიანად გაცდება მარცხენა კიდეს, განვაახლოთ მარჯვნიდან
        if (marqueePosRef.current < -textWidth) {
          marqueePosRef.current = containerRef.current.clientWidth;
        }

        marqueeTextRef.current.style.transform = `translateX(${marqueePosRef.current}px)`;
      } else {
        lastTime = timestamp;
      }

      marqueeFrameRef.current = requestAnimationFrame(marqueeStep);
    };

    marqueeFrameRef.current = requestAnimationFrame(marqueeStep);

    return () => {
      running = false;
      if (marqueeFrameRef.current) {
        cancelAnimationFrame(marqueeFrameRef.current);
      }
    };
  }, [isOpen, isPlaying, settings.mode]);

  // ===================== რეჟიმი 4: სტროფებად / აბზაცებად =====================
  useEffect(() => {
    if (!isOpen || settings.mode !== 'stanza' || !isPlaying) return;
    if (stanzas.length === 0) return;

    const timer = window.setInterval(() => {
      setCurrentStanzaIndex(prev => {
        if (prev + 1 >= stanzas.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, settings.stanzaInterval * 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, settings.mode, isPlaying, stanzas.length, settings.stanzaInterval]);

  // სტროფის ცვლილებისას ავტო-სქროლი (გადადის ქვემოთ ცენტრში)
  useEffect(() => {
    if (isOpen && settings.mode === 'stanza' && activeStanzaRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeStanzaRef.current;
      const targetTop = element.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth'
      });
    }
  }, [isOpen, settings.mode, currentStanzaIndex]);

  // ===================== რეჟიმი 5: სიტყვების გადიდება (WPM) =====================
  useEffect(() => {
    if (!isOpen || settings.mode !== 'word_zoom' || !isPlaying) return;
    if (words.length === 0) return;

    const intervalMs = Math.max(70, Math.round(60000 / settings.wordWpm));

    const timer = window.setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev + 1 >= words.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isOpen, settings.mode, isPlaying, words.length, settings.wordWpm]);

  // სიტყვის ცვლილებისას ავტო-სქროლი (გადადის ქვემოთ ტექსტის გასწვრივ)
  useEffect(() => {
    if (isOpen && settings.mode === 'word_zoom' && activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeWordRef.current;
      const targetTop = element.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
      if (Math.abs(container.scrollTop - targetTop) > 60) {
        container.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth'
        });
      }
    }
  }, [isOpen, settings.mode, currentWordIndex]);

  // პარამეტრების მყისიერი განახლების დამხმარე ფუნქცია
  const handleUpdate = useCallback((partial: Partial<TeleprompterSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      settingsRef.current = next;
      onUpdateSettings?.(next);
      return next;
    });
  }, [onUpdateSettings]);

  // სიჩქარის მომატება
  const increaseSpeed = useCallback(() => {
    if (settings.mode === 'continuous') {
      const newSpeed = Math.min(5.0, Number((settings.continuousSpeed + 0.2).toFixed(1)));
      handleUpdate({ continuousSpeed: newSpeed });
      showOsd(`სიჩქარე: ${newSpeed}x`);
    } else if (settings.mode === 'marquee') {
      const newSpeed = Math.min(300, settings.marqueeSpeed + 15);
      handleUpdate({ marqueeSpeed: newSpeed });
      showOsd(`მორბენალი: ${newSpeed} px/წმ`);
    } else if (settings.mode === 'sentence') {
      const newInt = Math.max(1.0, Number((settings.sentenceInterval - 0.5).toFixed(1)));
      handleUpdate({ sentenceInterval: newInt });
      showOsd(`ინტერვალი: ${newInt} წმ`);
    } else if (settings.mode === 'word_zoom') {
      const newWpm = Math.min(600, settings.wordWpm + 25);
      handleUpdate({ wordWpm: newWpm });
      showOsd(`WPM: ${newWpm}`);
    }
  }, [settings.mode, settings.continuousSpeed, settings.marqueeSpeed, settings.sentenceInterval, settings.wordWpm, handleUpdate, showOsd]);

  // სიჩქარის დაკლება
  const decreaseSpeed = useCallback(() => {
    if (settings.mode === 'continuous') {
      const newSpeed = Math.max(0.1, Number((settings.continuousSpeed - 0.2).toFixed(1)));
      handleUpdate({ continuousSpeed: newSpeed });
      showOsd(`სიჩქარე: ${newSpeed}x`);
    } else if (settings.mode === 'marquee') {
      const newSpeed = Math.max(20, settings.marqueeSpeed - 15);
      handleUpdate({ marqueeSpeed: newSpeed });
      showOsd(`მორბენალი: ${newSpeed} px/წმ`);
    } else if (settings.mode === 'sentence') {
      const newInt = Math.min(10.0, Number((settings.sentenceInterval + 0.5).toFixed(1)));
      handleUpdate({ sentenceInterval: newInt });
      showOsd(`ინტერვალი: ${newInt} წმ`);
    } else if (settings.mode === 'word_zoom') {
      const newWpm = Math.max(80, settings.wordWpm - 25);
      handleUpdate({ wordWpm: newWpm });
      showOsd(`WPM: ${newWpm}`);
    }
  }, [settings.mode, settings.continuousSpeed, settings.marqueeSpeed, settings.sentenceInterval, settings.wordWpm, handleUpdate, showOsd]);

  // წინ/უკან ნაბიჯის გადადგმა
  const stepForward = useCallback(() => {
    if (settings.mode === 'sentence') {
      setCurrentSentenceIndex(prev => Math.min(sentences.length - 1, prev + 1));
    } else if (settings.mode === 'stanza') {
      setCurrentStanzaIndex(prev => Math.min(stanzas.length - 1, prev + 1));
    } else if (settings.mode === 'word_zoom') {
      setCurrentWordIndex(prev => Math.min(words.length - 1, prev + 5));
    } else if (settings.mode === 'continuous') {
      if (containerRef.current) {
        scrollPositionRef.current += 160;
        containerRef.current.scrollTop = scrollPositionRef.current;
      }
    } else if (settings.mode === 'marquee') {
      marqueePosRef.current -= 120;
    }
  }, [settings.mode, sentences.length, stanzas.length, words.length]);

  const stepBackward = useCallback(() => {
    if (settings.mode === 'sentence') {
      setCurrentSentenceIndex(prev => Math.max(0, prev - 1));
    } else if (settings.mode === 'stanza') {
      setCurrentStanzaIndex(prev => Math.max(0, prev - 1));
    } else if (settings.mode === 'word_zoom') {
      setCurrentWordIndex(prev => Math.max(0, prev - 5));
    } else if (settings.mode === 'continuous') {
      if (containerRef.current) {
        scrollPositionRef.current = Math.max(0, scrollPositionRef.current - 160);
        containerRef.current.scrollTop = scrollPositionRef.current;
      }
    } else if (settings.mode === 'marquee') {
      marqueePosRef.current += 120;
    }
  }, [settings.mode]);

  // კლავიატურით მართვა
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
        showHudTemporarily();
      } 
      // Escape: გასვლა
      else if (e.code === 'Escape') {
        e.preventDefault();
        handleClose();
      } 
      // ArrowUp: უწყვეტი/მორბენალი რეჟიმში სიჩქარის მომატება; წინადადებებში წინა წინადადება
      else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (settings.mode === 'continuous' || settings.mode === 'marquee') {
          increaseSpeed();
        } else {
          stepBackward();
        }
        showHudTemporarily();
      } 
      // ArrowDown: უწყვეტი/მორბენალი რეჟიმში სიჩქარის დაკლება; წინადადებებში შემდეგი წინადადება
      else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (settings.mode === 'continuous' || settings.mode === 'marquee') {
          decreaseSpeed();
        } else {
          stepForward();
        }
        showHudTemporarily();
      }
      // ArrowRight: შემდეგი
      else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForward();
        showHudTemporarily();
      } 
      // ArrowLeft: წინა
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
        showHudTemporarily();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, settings.mode, increaseSpeed, decreaseSpeed, stepForward, stepBackward, showHudTemporarily]);

  const handleRestart = () => {
    setIsPlaying(true);
    setElapsedSeconds(0);
    setCurrentSentenceIndex(0);
    setCurrentStanzaIndex(0);
    setCurrentWordIndex(0);
    scrollPositionRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      marqueePosRef.current = containerRef.current.clientWidth;
    }
    showHudTemporarily();
  };

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  // პროგრესის გამოთვლა
  let progressPercent = 0;
  if (settings.mode === 'sentence' && sentences.length > 0) {
    progressPercent = ((currentSentenceIndex + 1) / sentences.length) * 100;
  } else if (settings.mode === 'stanza' && stanzas.length > 0) {
    progressPercent = ((currentStanzaIndex + 1) / stanzas.length) * 100;
  } else if (settings.mode === 'word_zoom' && words.length > 0) {
    progressPercent = ((currentWordIndex + 1) / words.length) * 100;
  } else if (settings.mode === 'continuous' && containerRef.current && scrollContentRef.current) {
    const total = scrollContentRef.current.scrollHeight;
    if (total > 0) {
      progressPercent = Math.min(100, Math.max(0, (scrollPositionRef.current / total) * 100));
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col select-none overflow-hidden"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        transform: settings.mirrorMode ? 'scaleX(-1)' : 'none',
      }}
      onMouseMove={showHudTemporarily}
      onTouchStart={showHudTemporarily}
    >
      {/* სტილების ბლოკი - სუფთა CSS ანიმაციები და კონტრასტის უზრუნველყოფა */}
      <style>{`
        @keyframes teleprompterSentenceSlide {
          0% {
            opacity: 0;
            transform: translateY(42px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes teleprompterSentenceFade {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes teleprompterSentencePop {
          0% {
            opacity: 0;
            transform: scale(0.82);
          }
          70% {
            opacity: 1;
            transform: scale(1.03);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .teleprompter-anim-slide {
          animation: teleprompterSentenceSlide 0.48s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .teleprompter-anim-fade {
          animation: teleprompterSentenceFade 0.55s ease-out both;
        }
        .teleprompter-anim-pop {
          animation: teleprompterSentencePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        /* ტექსტის ფერის გარანტირებული მემკვიდრეობითობა (მუქ ფონზე სრულად თეთრდება) */
        .teleprompter-content,
        .teleprompter-content *,
        .teleprompter-sentence-box,
        .teleprompter-sentence-box *,
        .teleprompter-stanza-box,
        .teleprompter-stanza-box * {
          color: inherit !important;
        }
      `}</style>

      {/* ეკრანზე მყისიერი OSD ინდიკატორი (სიჩქარე, მასშტაბი) */}
      {osdMessage && (
        <div className="pointer-events-none fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-[12px] bg-black/85 backdrop-blur-xl border border-white/20 text-white font-bold text-sm shadow-2xl">
          {osdMessage}
        </div>
      )}

      {/* ძირითადი ტექსტის კონტეინერი (სუფთა სქროლით, scroll-smooth-ის გარეშე უწყვეტობისთვის) */}
      <div 
        ref={containerRef}
        onScroll={(e) => {
          if (settings.mode === 'continuous') {
            const st = e.currentTarget.scrollTop;
            if (Math.abs(st - scrollPositionRef.current) > 25) {
              scrollPositionRef.current = st;
            }
          }
        }}
        className={`flex-1 overflow-y-auto px-6 md:px-24 no-scrollbar relative select-none ${
          settings.mode === 'sentence' || settings.mode === 'marquee' ? 'flex flex-col' : 'block'
        }`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        {/* ===================== რეჟიმი 1: უწყვეტი გლუვი სქროლვა ===================== */}
        {/* ტექსტი იწყებს ამოსვლას სულ ქვემოდან (paddingTop: 100vh) */}
        {settings.mode === 'continuous' && (
          <div 
            ref={scrollContentRef} 
            className="max-w-4xl mx-auto w-full"
            style={{
              paddingTop: '100vh',
              paddingBottom: '100vh'
            }}
          >
            {settings.contentScope === 'custom_sentences' && sentences.length > 0 ? (
              <div className="space-y-6 teleprompter-content">
                {sentences.map((s, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {s.text}
                  </p>
                ))}
              </div>
            ) : (
              <div 
                className="teleprompter-content tracking-wide leading-relaxed font-sans"
                dangerouslySetInnerHTML={{ __html: effectiveHtml }}
              />
            )}
          </div>
        )}

        {/* ===================== რეჟიმი 2: წინადადებებად (სუფთა, ჩრდილის გარეშე) ===================== */}
        {settings.mode === 'sentence' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-12 px-4 text-center">
            {sentences.length > 0 ? (
              <div 
                key={currentSentenceIndex}
                className={`teleprompter-sentence-box font-medium select-none ${
                  settings.sentenceEffect === 'slide' 
                    ? 'teleprompter-anim-slide'
                    : settings.sentenceEffect === 'fade'
                    ? 'teleprompter-anim-fade'
                    : 'teleprompter-anim-pop'
                }`}
                style={{
                  textShadow: 'none',
                  color: settings.textColor,
                }}
              >
                {/* წინადადებების მრიცხველი (ჩართვა/გამორთვა პარამეტრით) */}
                {settings.showSentenceCounter && (
                  <div className="text-sm font-semibold opacity-60 mb-4 tracking-widest uppercase">
                    წინადადება {currentSentenceIndex + 1} / {sentences.length}
                  </div>
                )}
                <p className="leading-snug" style={{ color: 'inherit' }}>
                  {sentences[currentSentenceIndex].text}
                </p>
              </div>
            ) : (
              <div className="opacity-40">ტექსტი ცარიელია</div>
            )}
          </div>
        )}

        {/* ===================== რეჟიმი 3: მორბენალი სტრიქონი (Marquee) ===================== */}
        {settings.mode === 'marquee' && (
          <div className="flex-1 flex items-center justify-start overflow-hidden w-full h-full relative">
            <div
              ref={marqueeTextRef}
              className="whitespace-nowrap font-medium tracking-wide will-change-transform"
              style={{
                fontSize: `${settings.fontSize}px`,
                textShadow: 'none',
              }}
            >
              {marqueeText}
            </div>
          </div>
        )}

        {/* ===================== რეჟიმი 4: სტროფებად / აბზაცებად (ავტო-სქროლით) ===================== */}
        {settings.mode === 'stanza' && (
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full py-24 space-y-8">
            {stanzas.map((stanza, idx) => {
              const isActive = idx === currentStanzaIndex;
              if (settings.stanzaEffect === 'crossfade' && !isActive) return null;

              return (
                <div
                  key={stanza.id}
                  ref={isActive ? activeStanzaRef : null}
                  onClick={() => setCurrentStanzaIndex(idx)}
                  className={`cursor-pointer transition-all duration-500 p-6 rounded-3xl ${
                    isActive
                      ? 'scale-100 opacity-100 shadow-xl'
                      : 'scale-95 hover:opacity-70'
                  }`}
                  style={{
                    opacity: isActive ? 1 : settings.stanzaDimOpacity,
                    borderLeft: isActive ? '5px solid #3b82f6' : '5px solid transparent',
                    paddingLeft: isActive ? '1.75rem' : '0.75rem',
                  }}
                  dangerouslySetInnerHTML={{ __html: stanza.html }}
                />
              );
            })}
          </div>
        )}

        {/* ===================== რეჟიმი 5: სიტყვების გადიდება (ავტო-სქროლით) ===================== */}
        {settings.mode === 'word_zoom' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full py-28 px-4">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 leading-relaxed">
              {words.map((w, idx) => {
                const isActive = idx === currentWordIndex;
                const isPast = idx < currentWordIndex;
                return (
                  <span
                    key={w.id}
                    ref={isActive ? activeWordRef : null}
                    onClick={() => setCurrentWordIndex(idx)}
                    className="cursor-pointer transition-all duration-150 inline-block px-1.5 rounded-lg"
                    style={{
                      transform: isActive ? `scale(${settings.wordZoomScale})` : 'scale(1)',
                      color: isActive ? settings.wordHighlightColor : isPast ? settings.textColor : settings.textColor,
                      opacity: isActive ? 1 : isPast ? 0.8 : 0.45,
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* პროგრესის ზოლი ქვედა ნაწილში */}
      {settings.mode !== 'marquee' && (
        <div className="w-full h-1.5 bg-white/10 relative z-20 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            if (settings.mode === 'sentence') {
              setCurrentSentenceIndex(Math.floor(ratio * sentences.length));
            } else if (settings.mode === 'stanza') {
              setCurrentStanzaIndex(Math.floor(ratio * stanzas.length));
            } else if (settings.mode === 'word_zoom') {
              setCurrentWordIndex(Math.floor(ratio * words.length));
            } else if (settings.mode === 'continuous' && containerRef.current && scrollContentRef.current) {
              const total = scrollContentRef.current.scrollHeight;
              scrollPositionRef.current = ratio * total;
              containerRef.current.scrollTop = scrollPositionRef.current;
            }
          }}
        >
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* მცურავი HUD კონტროლერები (Live Presenter Overlay) */}
      <div 
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 transform ${
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
        style={{
          transform: `translateX(-50%) ${settings.mirrorMode ? 'scaleX(-1)' : ''}`,
        }}
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-[12px] bg-black/85 backdrop-blur-xl border border-white/15 text-white shadow-2xl">
          
          {/* გასული დრო */}
          <div className="text-xs font-mono px-2 py-1 bg-white/10 rounded-[12px]">
            {formatTime(elapsedSeconds)}
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* წინა */}
          <button
            onClick={stepBackward}
            className="p-2 rounded-[12px] hover:bg-white/15 active:scale-90 transition-all"
            title="წინა (Left/Up Arrow)"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="p-3 rounded-[12px] bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            title={isPlaying ? "დაპაუზება (Space)" : "დაკვრა (Space)"}
          >
            {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 fill-white" />}
          </button>

          {/* შემდეგი */}
          <button
            onClick={stepForward}
            className="p-2 rounded-[12px] hover:bg-white/15 active:scale-90 transition-all"
            title="შემდეგი (Right/Down Arrow)"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>

          {/* თავიდან დაწყება */}
          <button
            onClick={handleRestart}
            className="p-2 rounded-[12px] hover:bg-white/15 active:scale-90 transition-all text-gray-300 hover:text-white"
            title="თავიდან დაწყება"
          >
            <RotateCcwIcon className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/20" />

          {/* სიჩქარის სწრაფი რეგულირება (უწყვეტი რეჟიმი) */}
          {settings.mode === 'continuous' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="opacity-60 text-[10px]">სიჩქარე:</span>
              <button
                onClick={decreaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
                title="შენელება (↓ ისარი)"
              >
                -
              </button>
              <span className="font-mono w-10 text-center font-bold text-blue-400">
                {settings.continuousSpeed.toFixed(1)}x
              </span>
              <button
                onClick={increaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
                title="აჩქარება (↑ ისარი)"
              >
                +
              </button>
            </div>
          )}

          {/* სიჩქარის სწრაფი რეგულირება (მორბენალი სტრიქონი) */}
          {settings.mode === 'marquee' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="opacity-60 text-[10px]">სიჩქარე:</span>
              <button
                onClick={decreaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
                title="შენელება (↓ ისარი)"
              >
                -
              </button>
              <span className="font-mono w-14 text-center font-bold text-blue-400">
                {settings.marqueeSpeed} px
              </span>
              <button
                onClick={increaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
                title="აჩქარება (↑ ისარი)"
              >
                +
              </button>
            </div>
          )}

          {/* სიჩქარის სწრაფი რეგულირება (წინადადებები) */}
          {settings.mode === 'sentence' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="opacity-60 text-[10px]">ინტერვალი:</span>
              <button
                onClick={decreaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
                title="შენელება"
              >
                +
              </button>
              <span className="font-mono w-10 text-center font-bold text-blue-400">
                {settings.sentenceInterval}s
              </span>
              <button
                onClick={increaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
                title="აჩქარება"
              >
                -
              </button>
            </div>
          )}

          {/* სიჩქარის სწრაფი რეგულირება (სიტყვები) */}
          {settings.mode === 'word_zoom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="opacity-60 text-[10px]">WPM:</span>
              <button
                onClick={decreaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
              >
                -
              </button>
              <span className="font-mono w-10 text-center font-bold text-blue-400">{settings.wordWpm}</span>
              <button
                onClick={increaseSpeed}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-xs font-bold"
              >
                +
              </button>
            </div>
          )}

          {/* სწრაფი პარამეტრების მენიუ (Quick Settings) */}
          <button
            onClick={() => setIsQuickSettingsOpen(prev => !prev)}
            className={`p-2 rounded-[12px] transition-all ${
              isQuickSettingsOpen ? 'bg-blue-600 text-white' : 'hover:bg-white/15 text-gray-300 hover:text-white'
            }`}
            title="სწრაფი პარამეტრები"
          >
            <SlidersIcon className="w-4 h-4" />
          </button>

          {/* გასვლა */}
          <button
            onClick={handleClose}
            className="p-2 rounded-[12px] hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all active:scale-90"
            title="გასვლა (Esc)"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* სწრაფი პარამეტრების ფანჯარა (Live Reactive Settings) */}
        {isQuickSettingsOpen && (
          <div className="mt-3 p-4 rounded-[12px] bg-black/95 backdrop-blur-2xl border border-white/20 text-white shadow-2xl text-xs space-y-3.5 w-84">
            <div className="font-bold text-blue-400 flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5">
                <SlidersIcon className="w-3.5 h-3.5" />
                <span>სწრაფი პარამეტრები</span>
              </span>
              <button 
                onClick={() => setIsQuickSettingsOpen(false)} 
                className="w-5 h-5 flex items-center justify-center rounded-[12px] hover:bg-white/20 text-gray-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            {/* რეჟიმის შეცვლა პირდაპირ */}
            <div>
              <span className="opacity-70 block mb-1 font-medium text-[11px]">ანიმაციის რეჟიმი:</span>
              <select
                value={settings.mode}
                onChange={(e) => {
                  const m = e.target.value as TeleprompterAnimationMode;
                  handleUpdate({ mode: m });
                  showOsd(`რეჟიმი: ${m}`);
                }}
                className="w-full bg-white/10 border border-white/20 rounded-[12px] p-2 text-white text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="continuous" className="bg-gray-900">📜 უწყვეტი სქროლვა</option>
                <option value="sentence" className="bg-gray-900">🎯 წინადადებებად (სუბტიტრები)</option>
                <option value="marquee" className="bg-gray-900">⚡ მორბენალი სტრიქონი</option>
                <option value="stanza" className="bg-gray-900">📑 სტროფებად / აბზაცებად</option>
                <option value="word_zoom" className="bg-gray-900">🔍 სიტყვების გადიდება</option>
              </select>
            </div>

            {/* სიჩქარის რეგულირება მიმდინარე რეჟიმისთვის */}
            <div className="bg-white/5 p-2.5 rounded-[12px] border border-white/10 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="opacity-80">სიჩქარე / ინტერვალი:</span>
                <span className="font-bold text-blue-400 font-mono">
                  {settings.mode === 'continuous' && `${settings.continuousSpeed.toFixed(1)}x`}
                  {settings.mode === 'sentence' && `${settings.sentenceInterval} წმ`}
                  {settings.mode === 'marquee' && `${settings.marqueeSpeed} px/წმ`}
                  {settings.mode === 'stanza' && `${settings.stanzaInterval} წმ`}
                  {settings.mode === 'word_zoom' && `${settings.wordWpm} WPM`}
                </span>
              </div>

              {settings.mode === 'continuous' && (
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={settings.continuousSpeed}
                  onChange={(e) => {
                    const sp = parseFloat(e.target.value);
                    handleUpdate({ continuousSpeed: sp });
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-white/20 rounded cursor-pointer"
                />
              )}

              {settings.mode === 'sentence' && (
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={settings.sentenceInterval}
                  onChange={(e) => {
                    const inv = parseFloat(e.target.value);
                    handleUpdate({ sentenceInterval: inv });
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-white/20 rounded cursor-pointer"
                />
              )}

              {settings.mode === 'marquee' && (
                <input
                  type="range"
                  min="30"
                  max="250"
                  step="10"
                  value={settings.marqueeSpeed}
                  onChange={(e) => {
                    const msp = parseInt(e.target.value, 10);
                    handleUpdate({ marqueeSpeed: msp });
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-white/20 rounded cursor-pointer"
                />
              )}

              {settings.mode === 'stanza' && (
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={settings.stanzaInterval}
                  onChange={(e) => {
                    const stInv = parseInt(e.target.value, 10);
                    handleUpdate({ stanzaInterval: stInv });
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-white/20 rounded cursor-pointer"
                />
              )}

              {settings.mode === 'word_zoom' && (
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="20"
                  value={settings.wordWpm}
                  onChange={(e) => {
                    const wpm = parseInt(e.target.value, 10);
                    handleUpdate({ wordWpm: wpm });
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-white/20 rounded cursor-pointer"
                />
              )}

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={decreaseSpeed}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
                >
                  - შენელება
                </button>
                <button
                  type="button"
                  onClick={increaseSpeed}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-blue-400"
                >
                  + აჩქარება
                </button>
              </div>
            </div>

            {/* შრიფტის ზომა */}
            <div className="bg-white/5 p-2.5 rounded-[12px] border border-white/10 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="opacity-80">ტექსტის ზომა:</span>
                <span className="font-bold text-blue-400 font-mono">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="96"
                step="2"
                value={settings.fontSize}
                onChange={(e) => {
                  const size = parseInt(e.target.value, 10);
                  handleUpdate({ fontSize: size });
                }}
                className="w-full accent-blue-500 h-1.5 bg-white/20 rounded cursor-pointer"
              />
              <div className="flex justify-between items-center pt-1 text-[10px] text-gray-400">
                <button
                  type="button"
                  onClick={() => handleUpdate({ fontSize: Math.max(20, settings.fontSize - 4) })}
                  className="px-2 py-0.5 rounded-[12px] bg-white/10 hover:bg-white/20 text-white"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ fontSize: Math.min(110, settings.fontSize + 4) })}
                  className="px-2 py-0.5 rounded-[12px] bg-white/10 hover:bg-white/20 text-white font-bold"
                >
                  A+
                </button>
              </div>
            </div>

            {/* ფონის ფერი (ტექსტის ფერი კონტრასტულია ავტომატურად) */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="opacity-70 text-[11px]">ფონი:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { color: '#0a0f1d', title: 'მუქი' },
                  { color: '#000000', title: 'შავი' },
                  { color: '#0f172a', title: 'ლურჯი' },
                  { color: '#ffffff', title: 'თეთრი' },
                ].map(p => (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => {
                      const text = getOptimalContrastTextColor(p.color);
                      handleUpdate({ backgroundColor: p.color, textColor: text });
                    }}
                    style={{ backgroundColor: p.color }}
                    className={`w-6 h-6 rounded-[12px] border border-white/30 transition-transform ${
                      settings.backgroundColor === p.color ? 'scale-110 ring-2 ring-blue-500 shadow-md' : 'opacity-80'
                    }`}
                    title={p.title}
                  />
                ))}
              </div>
            </div>

            {/* წინადადებების მრიცხველის ჩართვა/გამორთვა */}
            {settings.mode === 'sentence' && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-white/10 text-[11px]">
                <input
                  type="checkbox"
                  checked={settings.showSentenceCounter}
                  onChange={(e) => {
                    handleUpdate({ showSentenceCounter: e.target.checked });
                  }}
                  className="rounded accent-blue-500"
                />
                <span>წინადადებების მრიცხველი (1/{sentences.length})</span>
              </label>
            )}

            {/* სარკისებრი რეჟიმი */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-white/10 text-[11px]">
              <input
                type="checkbox"
                checked={settings.mirrorMode}
                onChange={(e) => {
                  handleUpdate({ mirrorMode: e.target.checked });
                }}
                className="rounded accent-blue-500"
              />
              <span>სარკისებრი რეჟიმი (Mirror)</span>
            </label>
          </div>
        )}
      </div>

    </div>
  );
};

export default TeleprompterViewer;
