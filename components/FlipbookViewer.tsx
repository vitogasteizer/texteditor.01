import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  RotateCcwIcon, 
  CloseIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MaximizeIcon, 
  BookOpenIcon, 
  ZoomInIcon, 
  ZoomOutIcon, 
  Volume2Icon, 
  VolumeXIcon,
  SlidersIcon,
} from './icons/EditorIcons';
import { 
  FlipbookPage, 
  FlipbookSettings, 
  FlipbookPaperTheme, 
  DEFAULT_FLIPBOOK_SETTINGS, 
  FLIPBOOK_THEME_CONFIG 
} from '../types/flipbook';
import { paginateHtmlForFlipbook } from '../lib/flipbookPaginator';
import { playPaperFlipSound } from '../lib/flipbookAudio';

interface FlipbookViewerProps {
  isOpen: boolean;
  htmlContent: string;
  onClose: () => void;
  t: (key: string) => string;
}

export const FlipbookViewer: React.FC<FlipbookViewerProps> = ({
  isOpen,
  htmlContent,
  onClose,
}) => {
  const [settings, setSettings] = useState<FlipbookSettings>(() => {
    try {
      const saved = localStorage.getItem('avma_flipbook_settings');
      if (saved) {
        return { ...DEFAULT_FLIPBOOK_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_FLIPBOOK_SETTINGS;
  });

  // გვერდები
  const pages: FlipbookPage[] = useMemo(() => {
    return paginateHtmlForFlipbook(htmlContent);
  }, [htmlContent]);

  // მიმდინარე გვერდის ინდექსი (0-დან)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // მობილური ეკრანის დეტექტორი
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  // მასშტაბირება (Zoom) და პანინგი (Pan)
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // გადაფურცვლის ანიმაცია
  const [flippingDirection, setFlippingDirection] = useState<'next' | 'prev' | null>(null);
  const isFlippingRef = useRef<boolean>(false);

  // მენიუები და სტატუსი
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(false);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [osdMessage, setOsdMessage] = useState<string | null>(null);

  // Refs
  const stageRef = useRef<HTMLDivElement>(null);
  const hudTimeoutRef = useRef<number | null>(null);
  const osdTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const autoFlipTimerRef = useRef<number | null>(null);

  // პარამეტრების განახლება
  const updateSettings = useCallback((newPartial: Partial<FlipbookSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem('avma_flipbook_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // OSD შეტყობინება
  const showOsd = useCallback((msg: string) => {
    setOsdMessage(msg);
    if (osdTimeoutRef.current) window.clearTimeout(osdTimeoutRef.current);
    osdTimeoutRef.current = window.setTimeout(() => setOsdMessage(null), 1300);
  }, []);

  // ეკრანის ზომის მონიტორინგი
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ხედვის რეჟიმი
  const effectiveViewMode = useMemo<'single' | 'double'>(() => {
    if (isMobileScreen) return 'single';
    if (settings.viewMode === 'single') return 'single';
    return 'double';
  }, [isMobileScreen, settings.viewMode]);

  // HUD-ის ავტომატური დამალვა
  const showHudTemporarily = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) window.clearTimeout(hudTimeoutRef.current);
    if (isSettingsOpen || isThumbnailsOpen) return;
    hudTimeoutRef.current = window.setTimeout(() => setIsHudVisible(false), 4500);
  }, [isSettingsOpen, isThumbnailsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    showHudTemporarily();
  }, [isOpen, showHudTemporarily]);

  // მიმდინარე თემა (ღია, სადა ფერებით)
  const theme = FLIPBOOK_THEME_CONFIG[settings.theme] || FLIPBOOK_THEME_CONFIG.classic;

  // გადასვლა კონკრეტულ გვერდზე
  const goToPage = useCallback((targetIdx: number) => {
    if (isFlippingRef.current) return;
    const bounded = Math.max(0, Math.min(pages.length - 1, targetIdx));
    if (bounded === currentPageIndex) return;

    const dir = bounded > currentPageIndex ? 'next' : 'prev';
    if (settings.soundEnabled) {
      playPaperFlipSound(0.3);
    }

    isFlippingRef.current = true;
    setFlippingDirection(dir);

    setTimeout(() => {
      setCurrentPageIndex(bounded);
      setFlippingDirection(null);
      isFlippingRef.current = false;
    }, 380);
  }, [pages.length, currentPageIndex, settings.soundEnabled]);

  // წინ გადაფურცვლა
  const flipNext = useCallback(() => {
    if (effectiveViewMode === 'single') {
      if (currentPageIndex < pages.length - 1) {
        goToPage(currentPageIndex + 1);
      } else {
        showOsd('ბოლო გვერდი');
      }
    } else {
      const step = currentPageIndex === 0 ? 1 : 2;
      const nextIdx = currentPageIndex + step;
      if (nextIdx < pages.length) {
        goToPage(nextIdx);
      } else {
        showOsd('ბოლო გვერდი');
      }
    }
  }, [effectiveViewMode, currentPageIndex, pages.length, goToPage, showOsd]);

  // უკან გადაფურცვლა
  const flipPrev = useCallback(() => {
    if (effectiveViewMode === 'single') {
      if (currentPageIndex > 0) {
        goToPage(currentPageIndex - 1);
      } else {
        showOsd('პირველი გვერდი');
      }
    } else {
      if (currentPageIndex <= 1) {
        goToPage(0);
      } else {
        goToPage(currentPageIndex - 2);
      }
    }
  }, [effectiveViewMode, currentPageIndex, goToPage, showOsd]);

  // ავტო-სლაიდშოუ
  useEffect(() => {
    if (!isOpen || !isPlayingAuto) {
      if (autoFlipTimerRef.current) clearInterval(autoFlipTimerRef.current);
      return;
    }

    const intervalSec = Math.max(3, settings.autoFlipInterval || 5);
    autoFlipTimerRef.current = window.setInterval(() => {
      if (effectiveViewMode === 'single') {
        setCurrentPageIndex(prev => {
          if (prev >= pages.length - 1) {
            setIsPlayingAuto(false);
            showOsd('დასრულდა');
            return prev;
          }
          if (settings.soundEnabled) playPaperFlipSound(0.2);
          return prev + 1;
        });
      } else {
        setCurrentPageIndex(prev => {
          const step = prev === 0 ? 1 : 2;
          if (prev + step >= pages.length) {
            setIsPlayingAuto(false);
            showOsd('დასრულდა');
            return prev;
          }
          if (settings.soundEnabled) playPaperFlipSound(0.2);
          return prev + step;
        });
      }
    }, intervalSec * 1000);

    return () => {
      if (autoFlipTimerRef.current) clearInterval(autoFlipTimerRef.current);
    };
  }, [isOpen, isPlayingAuto, settings.autoFlipInterval, settings.soundEnabled, effectiveViewMode, pages.length, showOsd]);

  // მასშტაბირება
  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const next = Math.min(2.0, Number((prev + 0.15).toFixed(2)));
      showOsd(`${Math.round(next * 100)}%`);
      return next;
    });
  }, [showOsd]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(0.7, Number((prev - 0.15).toFixed(2)));
      if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
      showOsd(`${Math.round(next * 100)}%`);
      return next;
    });
  }, [showOsd]);

  const handleZoomReset = useCallback(() => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    showOsd('100%');
  }, [showOsd]);

  // სრული ეკრანი
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

  // კლავიატურა
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(pages.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (zoom > 1.0) {
          handleZoomReset();
        } else if (isSettingsOpen || isThumbnailsOpen) {
          setIsSettingsOpen(false);
          setIsThumbnailsOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen, 
    flipNext, 
    flipPrev, 
    goToPage, 
    pages.length, 
    toggleFullscreen, 
    handleZoomIn, 
    handleZoomOut, 
    handleZoomReset, 
    zoom, 
    isSettingsOpen, 
    isThumbnailsOpen, 
    onClose
  ]);

  // Touch & Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (zoom > 1.0) {
        setIsPanning(true);
        panStartRef.current = { x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && zoom > 1.0 && e.touches.length === 1) {
      const touch = e.touches[0];
      setPanOffset({
        x: touch.clientX - panStartRef.current.x,
        y: touch.clientY - panStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPanning(false);
    if (!touchStartRef.current || zoom > 1.15) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 600) {
      if (dx < 0) {
        flipNext();
      } else {
        flipPrev();
      }
    }
    touchStartRef.current = null;
  };

  // მაუსით პანინგი
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1.0 && e.button === 0) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    showHudTemporarily();
    if (isPanning && zoom > 1.0) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  if (!isOpen) return null;

  // გვერდების განსაზღვრა
  let leftPage: FlipbookPage | null = null;
  let rightPage: FlipbookPage | null = null;

  if (effectiveViewMode === 'single') {
    rightPage = pages[currentPageIndex] || null;
  } else {
    if (currentPageIndex === 0) {
      leftPage = null;
      rightPage = pages[0] || null;
    } else {
      const leftIdx = currentPageIndex % 2 === 1 ? currentPageIndex : currentPageIndex - 1;
      leftPage = pages[leftIdx] || null;
      rightPage = pages[leftIdx + 1] || null;
    }
  }

  // პროგრესი
  const progressPercent = Math.round(((currentPageIndex + 1) / Math.max(1, pages.length)) * 100);

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 overflow-hidden select-none transition-colors duration-500 flex flex-col items-center justify-center flipbook-viewer"
      style={{
        backgroundColor: theme.outerBg,
        cursor: zoom > 1.0 ? (isPanning ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* OSD შეტყობინება */}
      {osdMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-[12px] bg-slate-900/80 text-white text-xs font-semibold backdrop-blur-md shadow-lg pointer-events-none animate-in fade-in duration-150">
          {osdMessage}
        </div>
      )}

      {/* ===================== მთავარი წიგნის სცენა (Clean Book Area) ===================== */}
      <main 
        className="w-full flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden"
        style={{ perspective: '2200px' }}
      >
        {/* წიგნის კონტეინერი */}
        <div
          className={`relative max-w-full transition-transform duration-200 ease-out ${
            flippingDirection === 'next' ? 'animate-flip-next' : flippingDirection === 'prev' ? 'animate-flip-prev' : ''
          }`}
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`,
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 16px 36px rgba(0,0,0,0.12))',
          }}
        >
          {/* ===================== ორგვერდიანი გაშლა ===================== */}
          {(() => {
            const isLeftPdf = Boolean(leftPage?.html && (leftPage.html.includes('pdf-page-sheet') || leftPage.html.includes('pdf-page-img')));
            const isRightPdf = Boolean(rightPage?.html && (rightPage.html.includes('pdf-page-sheet') || rightPage.html.includes('pdf-page-img')));

            return effectiveViewMode === 'double' ? (
            <div 
              className="flex items-stretch rounded-[12px] overflow-hidden border border-slate-300/80 dark:border-slate-700/80 shadow-2xl"
              style={{
                minHeight: '76vh',
                maxHeight: '84vh',
                width: 'min(94vw, 1340px)',
                aspectRatio: '1.414 / 1',
              }}
            >
              {/* მარცხენა გვერდი */}
              <div
                onClick={flipPrev}
                className={`flex-1 relative flex flex-col justify-between ${
                  isLeftPdf ? 'p-0 overflow-hidden' : 'p-8 sm:p-10 md:p-12 overflow-y-auto'
                } custom-scrollbar border-r border-slate-200/80 dark:border-slate-700/80 cursor-pointer transition-colors ${
                  !leftPage ? 'items-center justify-center bg-slate-100/60 dark:bg-slate-800/40' : ''
                }`}
                style={{
                  backgroundColor: leftPage ? theme.pageBg : undefined,
                  color: theme.textColor,
                  boxShadow: `inset -20px 0 30px -15px ${theme.spineShadow}`,
                }}
              >
                {leftPage ? (
                  <>
                    <div className="flex-1 w-full h-full flex flex-col justify-center">
                      {leftPage.title && !isLeftPdf && (
                        <div className="text-[11px] font-semibold tracking-wider uppercase opacity-40 mb-4 pb-2 border-b border-black/5 dark:border-white/10">
                          {leftPage.title}
                        </div>
                      )}
                      <div 
                        className={isLeftPdf ? "w-full h-full flex items-center justify-center" : "prose prose-slate max-w-none text-justify"}
                        style={{
                          fontSize: `${settings.fontSize}px`,
                          lineHeight: settings.lineHeight,
                          color: theme.textColor,
                        }}
                        dangerouslySetInnerHTML={{ __html: leftPage.html }}
                      />
                    </div>
                    {settings.showPageNumbers && (
                      <div className={isLeftPdf 
                        ? "absolute bottom-3 left-4 z-10 px-2.5 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-mono backdrop-blur-sm pointer-events-none select-none shadow-sm"
                        : "text-center text-xs font-mono opacity-40 pt-4 mt-auto"
                      }>
                        — {leftPage.pageNumber} —
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8 select-none opacity-40">
                    <span className="text-4xl block mb-2">📖</span>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                      თავფურცელი
                    </span>
                  </div>
                )}
              </div>

              {/* წიგნის ცენტრალური ნაკეცი (Subtle spine) */}
              <div 
                className="w-1.5 relative z-20 flex-shrink-0"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.12), rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.12))',
                }}
              />

              {/* მარჯვენა გვერდი */}
              <div
                onClick={flipNext}
                className={`flex-1 relative flex flex-col justify-between ${
                  isRightPdf ? 'p-0 overflow-hidden' : 'p-8 sm:p-10 md:p-12 overflow-y-auto'
                } custom-scrollbar cursor-pointer transition-colors`}
                style={{
                  backgroundColor: theme.pageBg,
                  color: theme.textColor,
                  boxShadow: `inset 20px 0 30px -15px ${theme.spineShadow}`,
                }}
              >
                {rightPage ? (
                  <>
                    <div className="flex-1 w-full h-full flex flex-col justify-center">
                      {rightPage.title && !isRightPdf && (
                        <div className="text-[11px] font-semibold tracking-wider uppercase opacity-40 mb-4 pb-2 border-b border-black/5 dark:border-white/10 text-right">
                          {rightPage.title}
                        </div>
                      )}
                      <div 
                        className={isRightPdf ? "w-full h-full flex items-center justify-center" : "prose prose-slate max-w-none text-justify"}
                        style={{
                          fontSize: `${settings.fontSize}px`,
                          lineHeight: settings.lineHeight,
                          color: theme.textColor,
                        }}
                        dangerouslySetInnerHTML={{ __html: rightPage.html }}
                      />
                    </div>
                    {settings.showPageNumbers && (
                      <div className={isRightPdf 
                        ? "absolute bottom-3 right-4 z-10 px-2.5 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-mono backdrop-blur-sm pointer-events-none select-none shadow-sm"
                        : "text-center text-xs font-mono opacity-40 pt-4 mt-auto"
                      }>
                        — {rightPage.pageNumber} —
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 select-none opacity-40">
                    <span className="text-3xl mb-2">🏁</span>
                    <span className="text-xs font-mono uppercase tracking-widest">
                      დოკუმენტის დასასრული
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===================== ერთგვერდიანი ხედი (Single Page) ===================== */
            rightPage && (
            <div 
              className={`rounded-[12px] overflow-hidden border border-slate-300/80 dark:border-slate-700/80 shadow-2xl flex flex-col justify-between ${
                isRightPdf ? 'p-0 overflow-hidden' : 'p-6 sm:p-10 overflow-y-auto'
              } custom-scrollbar relative`}
              style={{
                backgroundColor: theme.pageBg,
                color: theme.textColor,
                width: 'min(94vw, 680px)',
                minHeight: '76vh',
                maxHeight: '84vh',
                aspectRatio: '0.707 / 1',
                boxShadow: `inset 0 0 20px ${theme.spineShadow}, 0 16px 36px rgba(0,0,0,0.15)`,
              }}
            >
              <div className="flex-1 w-full h-full flex flex-col justify-center">
                {rightPage.title && !isRightPdf && (
                  <div className="text-[11px] font-semibold tracking-wider uppercase opacity-40 mb-4 pb-2 border-b border-black/5 dark:border-white/10 text-center">
                    {rightPage.title}
                  </div>
                )}
                <div 
                  className={isRightPdf ? "w-full h-full flex items-center justify-center" : "prose prose-slate max-w-none text-justify"}
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    color: theme.textColor,
                  }}
                  dangerouslySetInnerHTML={{ __html: rightPage.html }}
                />
              </div>

              {settings.showPageNumbers && (
                <div className={isRightPdf 
                  ? "absolute bottom-3 inset-x-0 mx-auto w-max z-10 px-2.5 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-mono backdrop-blur-sm pointer-events-none select-none shadow-sm"
                  : "text-center text-xs font-mono opacity-40 pt-4 mt-auto"
                }>
                  — {rightPage.pageNumber} / {pages.length} —
                </div>
              )}
            </div>
            )
          );
          })()}
        </div>
      </main>

      {/* ===================== ერთიანი კომპაქტური მცურავი პანელი (Single Compact Light Bar) ===================== */}
      <nav 
        className={`hud-element fixed bottom-5 inset-x-auto z-40 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2 rounded-[12px] bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/90 shadow-xl backdrop-blur-md transition-all duration-300 max-w-[94vw] ${
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-20 hover:opacity-100 translate-y-1'
        }`}
      >
        {/* გადაფურცვლა უკან */}
        <button
          type="button"
          onClick={flipPrev}
          disabled={currentPageIndex === 0}
          className="p-1.5 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          title="წინა გვერდი (←)"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {/* გვერდის ნომერი და პროგრესის ზოლი */}
        <div className="flex items-center gap-2 px-1">
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap min-w-[50px] text-center">
            {currentPageIndex + 1}/{pages.length}
          </span>

          <input
            type="range"
            min={0}
            max={pages.length - 1}
            value={currentPageIndex}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="w-16 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            title="გვერდებზე გადასვლა"
          />

          <span className="font-mono text-[11px] text-slate-400 hidden sm:inline whitespace-nowrap">
            {progressPercent}%
          </span>
        </div>

        {/* გადაფურცვლა წინ */}
        <button
          type="button"
          onClick={flipNext}
          disabled={currentPageIndex >= pages.length - 1}
          className="p-1.5 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          title="შემდეგი გვერდი (→)"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* მასშტაბი: - / + / რესეტი */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.7}
          className="p-1.5 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          title="დაპატარავება (-)"
        >
          <ZoomOutIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomReset}
          className="px-1.5 py-0.5 rounded-[6px] text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
          title="მასშტაბის დაბრუნება (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 2.0}
          className="p-1.5 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          title="გადიდება (+)"
        >
          <ZoomInIcon className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* მინიატურები */}
        <button
          type="button"
          onClick={() => setIsThumbnailsOpen(prev => !prev)}
          className={`p-1.5 rounded-[8px] transition-colors ${
            isThumbnailsOpen 
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
          title="გვერდების მინიატურები"
        >
          <BookOpenIcon className="w-4 h-4" />
        </button>

        {/* ხმის ჩართვა/გამორთვა */}
        <button
          type="button"
          onClick={() => {
            const next = !settings.soundEnabled;
            updateSettings({ soundEnabled: next });
            showOsd(next ? 'ხმა ჩართულია' : 'ხმა გამორთულია');
          }}
          className={`p-1.5 rounded-[8px] transition-colors ${
            settings.soundEnabled ? 'text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="ფურცლის ხმა"
        >
          {settings.soundEnabled ? <Volume2Icon className="w-4 h-4" /> : <VolumeXIcon className="w-4 h-4" />}
        </button>

        {/* ავტო-სლაიდშოუ */}
        <button
          type="button"
          onClick={() => {
            const next = !isPlayingAuto;
            setIsPlayingAuto(next);
            showOsd(next ? 'ავტო-გადაფურცვლა ჩართულია' : 'ავტო შეჩერდა');
          }}
          className={`p-1.5 rounded-[8px] transition-colors ${
            isPlayingAuto 
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 ring-1 ring-emerald-500/40' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
          title="ავტო-გადაფურცვლა"
        >
          {isPlayingAuto ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
        </button>

        {/* პარამეტრების ფანჯარა */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(prev => !prev)}
          className={`p-1.5 rounded-[8px] transition-colors ${
            isSettingsOpen ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
          title="პარამეტრები"
        >
          <SlidersIcon className="w-4 h-4" />
        </button>

        {/* სრული ეკრანი */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="სრული ეკრანი (F)"
        >
          <MaximizeIcon className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* დახურვა */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-[8px] hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
          title="დახურვა (Esc)"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </nav>

      {/* ===================== მინიატურების გალერეა (Light Drawer) ===================== */}
      {isThumbnailsOpen && (
        <aside className="hud-element fixed bottom-20 inset-x-4 md:inset-x-12 z-40 p-4 rounded-[12px] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200 max-h-56 flex flex-col gap-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              გვერდების მინიატურები ({pages.length})
            </h2>
            <button
              onClick={() => setIsThumbnailsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1">
            {pages.map((p, idx) => {
              const isActive = idx === currentPageIndex;
              return (
                <button
                  key={p.pageNumber}
                  type="button"
                  onClick={() => {
                    goToPage(idx);
                    setIsThumbnailsOpen(false);
                  }}
                  className={`flex-shrink-0 w-28 h-36 rounded-[8px] p-2 text-left flex flex-col justify-between border transition-all ${
                    isActive
                      ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400'
                  }`}
                  style={{
                    backgroundColor: theme.pageBg,
                    color: theme.textColor,
                  }}
                >
                  <div className="text-[9px] line-clamp-6 opacity-75 overflow-hidden font-sans">
                    {p.title ? <strong>{p.title} </strong> : null}
                    {p.html.replace(/<[^>]+>/g, ' ').slice(0, 110)}
                  </div>
                  <div className="text-[10px] font-mono text-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-semibold">
                    {p.pageNumber}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* ===================== პარამეტრების ფანჯარა (Light Drawer) ===================== */}
      {isSettingsOpen && (
        <aside className="hud-element fixed bottom-20 right-4 sm:right-8 z-40 w-72 p-4 rounded-[12px] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              წიგნის პარამეტრები
            </h2>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            {/* თემა */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">ქაღალდის თემა</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as FlipbookPaperTheme })}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(FLIPBOOK_THEME_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>{cfg.name}</option>
                ))}
              </select>
            </div>

            {/* ჩვენების რეჟიმი */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">ხედვის რეჟიმი</label>
              <select
                value={settings.viewMode}
                onChange={(e) => updateSettings({ viewMode: e.target.value as any })}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">ავტომატური (ეკრანის მიხედვით)</option>
                <option value="double">ორგვერდიანი გაშლა (წიგნი)</option>
                <option value="single">ერთგვერდიანი (მობილური)</option>
              </select>
            </div>

            {/* შრიფტის ზომა */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>ტექსტის ზომა</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{settings.fontSize} px</span>
              </div>
              <input
                type="range"
                min="14"
                max="26"
                step="1"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* ჩამრთველები */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span>გვერდის ნომრები</span>
                <input
                  type="checkbox"
                  checked={settings.showPageNumbers}
                  onChange={(e) => updateSettings({ showPageNumbers: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>ფურცლის ხმა</span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default FlipbookViewer;
