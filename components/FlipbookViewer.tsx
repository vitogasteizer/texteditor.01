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
  Share2Icon,
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
  pageOrientation?: 'portrait' | 'landscape';
  onClose: () => void;
  onShare?: () => void;
  t: (key: string) => string;
}

export const FlipbookViewer: React.FC<FlipbookViewerProps> = ({
  isOpen,
  htmlContent,
  pageOrientation,
  onClose,
  onShare,
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

  // 3D გადაფურცვლის ანიმაციის მდგომარეობა
  const [flippingState, setFlippingState] = useState<{
    direction: 'next' | 'prev';
    fromSpread: number;
    toSpread: number;
  } | null>(null);
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

  // დოკუმენტის/გვერდების ორიენტაციის დადგენა
  const isLandscapeDoc = useMemo<boolean>(() => {
    if (pageOrientation === 'landscape') return true;
    if (pageOrientation === 'portrait') return false;
    const sampleHtml = pages.slice(0, 3).map(p => p.html).join(' ');
    return sampleHtml.includes('orientation="landscape"') || sampleHtml.includes('data-orientation="landscape"');
  }, [pageOrientation, pages]);

  // ზუსტი პროპორციის გამოთვლა (Aspect Ratio) დოკუმენტის მეტამონაცემებიდან
  const singleAspectRatio = useMemo<number>(() => {
    const match = htmlContent.match(/data-aspect-ratio=["']([\d.]+)["']/);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0.2 && val < 5) return val;
    }
    return isLandscapeDoc ? 1.414 : 0.707;
  }, [htmlContent, isLandscapeDoc]);

  const doubleAspectRatio = useMemo<number>(() => {
    return singleAspectRatio * 2;
  }, [singleAspectRatio]);

  // ხედვის რეჟიმი: თუ დოკუმენტი Landscape-ია და მომხმარებელს არ დაუფიქსირებია viewMode, ნაგულისხმევად 1 გვერდი 100%-ით ავსებს ეკრანს
  const effectiveViewMode = useMemo<'single' | 'double'>(() => {
    if (isMobileScreen) return 'single';
    if (settings.viewMode === 'single') return 'single';
    if (settings.viewMode === 'double') return 'double';
    if (isLandscapeDoc) return 'single';
    return 'double';
  }, [isMobileScreen, settings.viewMode, isLandscapeDoc]);

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

  // გადასვლა კონკრეტულ გვერდზე 3D გადაშლის ანიმაციით
  const goToPage = useCallback((targetIdx: number) => {
    if (isFlippingRef.current) return;
    const bounded = Math.max(0, Math.min(pages.length - 1, targetIdx));
    if (bounded === currentPageIndex) return;

    const dir: 'next' | 'prev' = bounded > currentPageIndex ? 'next' : 'prev';
    if (settings.soundEnabled) {
      playPaperFlipSound(0.35);
    }

    const fromSpread = effectiveViewMode === 'double'
      ? Math.floor(currentPageIndex / 2) * 2
      : currentPageIndex;
    const toSpread = effectiveViewMode === 'double'
      ? Math.floor(bounded / 2) * 2
      : bounded;

    isFlippingRef.current = true;
    setFlippingState({ direction: dir, fromSpread, toSpread });

    setTimeout(() => {
      setCurrentPageIndex(bounded);
      setFlippingState(null);
      isFlippingRef.current = false;
    }, 380);
  }, [pages.length, currentPageIndex, settings.soundEnabled, effectiveViewMode]);

  // წინ გადაფურცვლა (2P რეჟიმში 2 გვერდით გადაადგილება)
  const flipNext = useCallback(() => {
    if (effectiveViewMode === 'single') {
      if (currentPageIndex < pages.length - 1) {
        goToPage(currentPageIndex + 1);
      } else {
        showOsd('ბოლო გვერდი');
      }
    } else {
      const curSpread = Math.floor(currentPageIndex / 2) * 2;
      const nextSpread = curSpread + 2;
      if (nextSpread < pages.length) {
        goToPage(nextSpread);
      } else {
        showOsd('ბოლო გვერდი');
      }
    }
  }, [effectiveViewMode, currentPageIndex, pages.length, goToPage, showOsd]);

  // უკან გადაფურცვლა (2P რეჟიმში 2 გვერდით უკან დაბრუნება)
  const flipPrev = useCallback(() => {
    if (effectiveViewMode === 'single') {
      if (currentPageIndex > 0) {
        goToPage(currentPageIndex - 1);
      } else {
        showOsd('პირველი გვერდი');
      }
    } else {
      const curSpread = Math.floor(currentPageIndex / 2) * 2;
      const prevSpread = curSpread - 2;
      if (prevSpread >= 0) {
        goToPage(prevSpread);
      } else {
        showOsd('პირველი გვერდი');
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
      flipNext();
    }, intervalSec * 1000);

    return () => {
      if (autoFlipTimerRef.current) clearInterval(autoFlipTimerRef.current);
    };
  }, [isOpen, isPlayingAuto, settings.autoFlipInterval, flipNext]);

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

  // გვერდების განსაზღვრა (2P რეჟიმში დოკუმენტი იწყება პირველივე გვერდიდან: მარცხნივ გვერდი 1, მარჯვნივ გვერდი 2)
  const spreadIndex = effectiveViewMode === 'double'
    ? Math.floor(currentPageIndex / 2) * 2
    : currentPageIndex;

  let leftPage: FlipbookPage | null = null;
  let rightPage: FlipbookPage | null = null;

  if (effectiveViewMode === 'single') {
    rightPage = pages[currentPageIndex] || null;
  } else {
    leftPage = pages[spreadIndex] || null;
    rightPage = pages[spreadIndex + 1] || null;
  }

  // პროგრესი
  const progressPercent = Math.round(((currentPageIndex + 1) / Math.max(1, pages.length)) * 100);

  // გვერდის ერთიანი სუფთა კომპონენტი (PDF ან ტექსტი)
  const renderPageCard = (page: FlipbookPage | null, isLeft: boolean, customShadow?: string) => {
    const isPdf = Boolean(page?.html && (page.html.includes('pdf-page-sheet') || page.html.includes('pdf-page-img')));

    return (
      <div
        className={`w-full h-full relative flex flex-col justify-between ${
          isPdf ? 'p-0 m-0 overflow-hidden' : 'p-8 sm:p-10 md:p-12 overflow-y-auto'
        } custom-scrollbar transition-colors select-none`}
        style={{
          backgroundColor: page ? theme.pageBg : undefined,
          color: theme.textColor,
          boxShadow: customShadow ?? (isLeft
            ? `inset -20px 0 30px -15px ${theme.spineShadow}`
            : `inset 20px 0 30px -15px ${theme.spineShadow}`),
        }}
      >
        {page ? (
          <>
            <div className={isPdf ? "w-full h-full p-0 m-0 flex items-stretch justify-stretch overflow-hidden" : "flex-1 w-full h-full flex flex-col justify-center"}>
              {page.title && !isPdf && (
                <div className={`text-[11px] font-semibold tracking-wider uppercase opacity-40 mb-4 pb-2 border-b border-black/5 dark:border-white/10 ${isLeft ? '' : 'text-right'}`}>
                  {page.title}
                </div>
              )}
              <div 
                className={isPdf ? "w-full h-full p-0 m-0" : "prose prose-slate max-w-none text-justify"}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  color: theme.textColor,
                }}
                dangerouslySetInnerHTML={{ __html: page.html }}
              />
            </div>
            {settings.showPageNumbers && !isPdf && (
              <div className="text-center text-xs font-mono opacity-40 pt-4 mt-auto">
                — {page.pageNumber} —
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 select-none opacity-40">
            <span className="text-3xl mb-2">🏁</span>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              დოკუმენტის დასასრული
            </span>
          </div>
        )}
      </div>
    );
  };

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

      {/* ===================== მთავარი წიგნის სცენა (Edge-to-Edge 100% Clean Area) ===================== */}
      <main 
        className="w-full h-full flex items-center justify-center p-0 m-0 relative overflow-hidden"
        style={{ perspective: '2600px' }}
      >
        {/* წიგნის კონტეინერი */}
        <div
          className="relative max-w-full transition-transform duration-200 ease-out flex items-center justify-center"
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`,
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 16px 36px rgba(0,0,0,0.12))',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* ===================== ორგვერდიანი გაშლა (2P Real 3D Flip) ===================== */}
          {(() => {
            const isFlipping = Boolean(flippingState);
            const isNext = flippingState?.direction === 'next';
            const isPrev = flippingState?.direction === 'prev';

            // ბაზისური ფურცლები (ქვედა სტაციონარული ფენა გადაფურცვლისას)
            let baseLeftPage: FlipbookPage | null = leftPage;
            let baseRightPage: FlipbookPage | null = rightPage;

            if (isFlipping && flippingState) {
              if (isNext) {
                baseLeftPage = pages[flippingState.fromSpread] || null;
                baseRightPage = pages[flippingState.toSpread + 1] || null;
              } else if (isPrev) {
                baseLeftPage = pages[flippingState.toSpread] || null;
                baseRightPage = pages[flippingState.fromSpread + 1] || null;
              }
            }

            return effectiveViewMode === 'double' ? (
            <div 
              className="flex items-stretch overflow-hidden border border-slate-300/80 dark:border-slate-700/80 shadow-2xl relative select-none"
              style={{
                height: !isLandscapeDoc 
                  ? '100vh' 
                  : `min(100vh, calc(100vw / ${doubleAspectRatio}))`,
                width: !isLandscapeDoc 
                  ? `min(100vw, calc(100vh * ${doubleAspectRatio}))` 
                  : '100vw',
                maxHeight: '100vh',
                maxWidth: '100vw',
                aspectRatio: `${doubleAspectRatio} / 1`,
                perspective: '2000px',
              }}
            >
              {/* მარცხენა გვერდი */}
              <div
                onClick={flipPrev}
                className="flex-1 relative border-r border-slate-200/80 dark:border-slate-700/80 cursor-pointer overflow-hidden"
              >
                {isFlipping && flippingState ? (
                  isNext ? (
                    <div className="w-full h-full">
                      {renderPageCard(pages[flippingState.fromSpread] || null, true)}
                    </div>
                  ) : (
                    <div className="w-full h-full page-glide-prev-in">
                      {renderPageCard(pages[flippingState.toSpread] || null, true)}
                    </div>
                  )
                ) : (
                  renderPageCard(leftPage, true)
                )}
              </div>

              {/* წიგნის ცენტრალური ნაკეცი (Spine with dynamic shadow wave) */}
              <div 
                className="w-1.5 relative z-20 flex-shrink-0"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.12), rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.12))',
                }}
              >
                {isFlipping && (
                  <div className="absolute inset-0 bg-black/25 spine-shadow-sweep pointer-events-none" />
                )}
              </div>

              {/* მარჯვენა გვერდი */}
              <div
                onClick={flipNext}
                className="flex-1 relative cursor-pointer overflow-hidden"
              >
                {isFlipping && flippingState ? (
                  isNext ? (
                    <div className="w-full h-full relative">
                      {/* შემომსვლელი ახალი გვერდი */}
                      <div className="w-full h-full page-glide-next-in">
                        {renderPageCard(pages[flippingState.toSpread + 1] || null, false)}
                      </div>
                      {/* გამავალი გვერდი */}
                      <div className="absolute inset-0 page-glide-next-out pointer-events-none">
                        {renderPageCard(pages[flippingState.fromSpread + 1] || null, false)}
                        <div className="absolute inset-0 bg-gradient-to-l from-black/15 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full relative">
                      <div className="w-full h-full">
                        {renderPageCard(pages[flippingState.toSpread + 1] || null, false)}
                      </div>
                      <div className="absolute inset-0 page-glide-prev-out pointer-events-none">
                        {renderPageCard(pages[flippingState.fromSpread + 1] || null, false)}
                      </div>
                    </div>
                  )
                ) : (
                  renderPageCard(rightPage, false)
                )}
              </div>
            </div>
          ) : (
            /* ===================== ერთგვერდიანი ხედი (Single Page Tactile Glide) ===================== */
            rightPage && (
            <div 
              className="overflow-hidden border border-slate-300/80 dark:border-slate-700/80 shadow-2xl relative select-none"
              style={{
                backgroundColor: theme.pageBg,
                color: theme.textColor,
                height: !isLandscapeDoc 
                  ? '100vh' 
                  : `min(100vh, calc(100vw / ${singleAspectRatio}))`,
                width: !isLandscapeDoc 
                  ? `min(100vw, calc(100vh * ${singleAspectRatio}))` 
                  : '100vw',
                maxHeight: '100vh',
                maxWidth: '100vw',
                aspectRatio: `${singleAspectRatio} / 1`,
                boxShadow: `inset 0 0 20px ${theme.spineShadow}, 0 16px 36px rgba(0,0,0,0.15)`,
              }}
            >
              {isFlipping && flippingState ? (
                <div className="w-full h-full relative">
                  {/* შემომსვლელი გვერდი */}
                  <div className={`w-full h-full ${isNext ? 'single-glide-next-in' : 'single-glide-prev-in'}`}>
                    {renderPageCard(pages[flippingState.toSpread] || null, false)}
                  </div>
                  {/* გამავალი გვერდი */}
                  <div className={`absolute inset-0 ${isNext ? 'single-glide-next-out' : 'single-glide-prev-out'} pointer-events-none`}>
                    {renderPageCard(pages[flippingState.fromSpread] || null, false)}
                  </div>
                </div>
              ) : (
                renderPageCard(rightPage, false)
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
          disabled={effectiveViewMode === 'double' ? spreadIndex === 0 : currentPageIndex === 0}
          className="p-1.5 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          title="წინა გვერდი (←)"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {/* გვერდის ნომერი და პროგრესის ზოლი */}
        <div className="flex items-center gap-2 px-1">
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap min-w-[50px] text-center">
            {effectiveViewMode === 'double'
              ? (rightPage ? `${spreadIndex + 1}-${spreadIndex + 2} / ${pages.length}` : `${spreadIndex + 1} / ${pages.length}`)
              : `${currentPageIndex + 1} / ${pages.length}`}
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(0, pages.length - 1)}
            step={effectiveViewMode === 'double' ? 2 : 1}
            value={effectiveViewMode === 'double' ? spreadIndex : currentPageIndex}
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
          disabled={effectiveViewMode === 'double' ? spreadIndex + 2 >= pages.length : currentPageIndex >= pages.length - 1}
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

        {/* 1P / 2P რეჟიმის გადამრთველი */}
        {!isMobileScreen && (
          <button
            type="button"
            onClick={() => {
              const nextMode = effectiveViewMode === 'double' ? 'single' : 'double';
              updateSettings({ viewMode: nextMode });
              showOsd(nextMode === 'double' ? 'ორგვერდიანი გაშლა (2P)' : 'ერთგვერდიანი ხედი (1P - 100% სიმაღლე)');
            }}
            className={`px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-bold transition-colors ${
              effectiveViewMode === 'single'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title={effectiveViewMode === 'double' ? 'ერთ გვერდზე გადართვა (100% სიმაღლეზე გაშლა)' : 'ორ გვერდზე გაშლა (2P)'}
          >
            {effectiveViewMode === 'double' ? '2P' : '1P'}
          </button>
        )}

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

        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="p-1.5 rounded-[8px] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-colors"
            title="წიგნის გაზიარება / ბმულის შექმნა"
          >
            <Share2Icon className="w-4 h-4" />
          </button>
        )}

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
              const isActive = effectiveViewMode === 'double'
                ? (idx === spreadIndex || idx === spreadIndex + 1)
                : (idx === currentPageIndex);

              // ამოვიღოთ რეალური სურათის URL, თუ PDF გვერდია
              const imgMatch = p.html.match(/<img[^>]+src=["']([^"']+)["']/i);
              const previewImgSrc = imgMatch ? imgMatch[1] : null;

              return (
                <button
                  key={p.pageNumber}
                  type="button"
                  onClick={() => {
                    goToPage(idx);
                    setIsThumbnailsOpen(false);
                  }}
                  className={`flex-shrink-0 w-24 sm:w-28 h-36 sm:h-40 rounded-[8px] p-1.5 text-left flex flex-col justify-between border transition-all ${
                    isActive
                      ? 'border-indigo-600 ring-2 ring-indigo-500/40 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-md scale-[1.02]'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 opacity-90 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: theme.pageBg,
                    color: theme.textColor,
                  }}
                >
                  <div className="w-full flex-1 min-h-0 overflow-hidden rounded-[4px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50">
                    {previewImgSrc ? (
                      <img 
                        src={previewImgSrc} 
                        alt={`გვერდი ${p.pageNumber}`} 
                        className="w-full h-full object-contain pointer-events-none select-none" 
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full p-1.5 text-[8px] line-clamp-6 opacity-75 font-sans overflow-hidden">
                        {p.title ? <strong className="block mb-0.5">{p.title}</strong> : null}
                        {p.html.replace(/<[^>]+>/g, ' ').slice(0, 110)}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-center pt-1 mt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-semibold flex items-center justify-between px-1">
                    <span className="opacity-50 text-[9px] font-sans">გვ.</span>
                    <span className={isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}>
                      {p.pageNumber}
                    </span>
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
