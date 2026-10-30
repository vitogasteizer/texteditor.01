import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PlayIcon, 
  PauseIcon,
  CloseIcon, 
  SaveIcon, 
  SlidersIcon, 
  PresentationIcon,
  MaximizeIcon,
  ChecklistIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from './icons/EditorIcons';
import { 
  TeleprompterSettings, 
  DEFAULT_TELEPROMPTER_SETTINGS, 
  TELEPROMPTER_STORAGE_KEY,
  TeleprompterAnimationMode,
  SentenceEntranceEffect,
  StanzaEntranceEffect,
  TeleprompterContentScope,
  getOptimalContrastTextColor
} from '../types/teleprompter';
import { 
  parseHtmlToStanzas, 
  extractSentences, 
  extractWords,
  getPlainTextFromHtml,
  sanitizeTeleprompterHtml 
} from '../lib/teleprompterParser';

interface TeleprompterModalProps {
  isOpen: boolean;
  htmlContent: string;
  editorSelectedText?: string;
  onClose: () => void;
  onLaunch: (settings: TeleprompterSettings) => void;
  t: (key: string) => string;
}

const ACCENT_PRESETS = ['#38bdf8', '#facc15', '#4ade80', '#c084fc', '#fb923c', '#f43f5e'];

const BG_PRESETS = [
  { color: '#0a0f1d', title: 'ღრმა მუქი' },
  { color: '#000000', title: 'შავი (OLED)' },
  { color: '#0f172a', title: 'მუქი ლურჯი' },
  { color: '#18181b', title: 'გრაფიტი' },
  { color: '#ffffff', title: 'თეთრი' },
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
        const bg = parsed.backgroundColor || DEFAULT_TELEPROMPTER_SETTINGS.backgroundColor;
        return { 
          ...DEFAULT_TELEPROMPTER_SETTINGS, 
          ...parsed,
          textColor: getOptimalContrastTextColor(bg)
        };
      }
    } catch (e) {
      console.error('ტელესუფლიორის პარამეტრების წაკითხვა ვერ მოხერხდა', e);
    }
    return DEFAULT_TELEPROMPTER_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sentences'>('config');

  // გადახედვის (Live Preview) შიდა მდგომარეობა
  const [previewSentenceIdx, setPreviewSentenceIdx] = useState<number>(0);
  const [previewIsPlaying, setPreviewIsPlaying] = useState<boolean>(true);
  const [previewWordIdx, setPreviewWordIdx] = useState<number>(0);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const previewMarqueeRef = useRef<HTMLDivElement>(null);

  // დოკუმენტიდან გასუფთავებული სტროფებისა და წინადადებების ამოღება
  const stanzas = useMemo(() => {
    return parseHtmlToStanzas(htmlContent);
  }, [htmlContent]);

  const allSentences = useMemo(() => {
    return extractSentences(stanzas);
  }, [stanzas]);

  // გაფილტრული წინადადებები ContentScope-ის მიხედვით
  const activeSentences = useMemo(() => {
    if (settings.contentScope === 'editor_selection' && editorSelectedText.trim()) {
      const parsed = parseHtmlToStanzas(`<p>${editorSelectedText.replace(/\n/g, '<br/>')}</p>`);
      return extractSentences(parsed);
    }
    if (settings.contentScope === 'custom_sentences' && settings.selectedSentenceIndices?.length) {
      const set = new Set(settings.selectedSentenceIndices);
      const filtered = allSentences.filter((_, idx) => set.has(idx));
      return filtered.length > 0 ? filtered : allSentences;
    }
    return allSentences;
  }, [settings.contentScope, settings.selectedSentenceIndices, allSentences, editorSelectedText]);

  const previewWords = useMemo(() => {
    return extractWords(activeSentences);
  }, [activeSentences]);

  const previewMarqueeText = useMemo(() => {
    if (activeSentences.length > 0) {
      return activeSentences.map(s => s.text).join('   •   ');
    }
    return getPlainTextFromHtml(htmlContent) || 'ტექსტის გადახედვა...';
  }, [activeSentences, htmlContent]);

  // ინიციალიზაცია გახსნისას
  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setPreviewSentenceIdx(0);
      setPreviewWordIdx(0);
      setPreviewIsPlaying(true);
      if (editorSelectedText && editorSelectedText.trim().length > 0) {
        setSettings(prev => ({
          ...prev,
          contentScope: 'editor_selection'
        }));
      }
    }
  }, [isOpen, editorSelectedText]);

  // გადახედვის ტაიმერი წინადადებებისთვის
  useEffect(() => {
    if (!isOpen || !previewIsPlaying || settings.mode !== 'sentence') return;
    if (activeSentences.length <= 1) return;

    const timer = setInterval(() => {
      setPreviewSentenceIdx(prev => (prev + 1) % activeSentences.length);
    }, Math.max(2000, settings.sentenceInterval * 800));

    return () => clearInterval(timer);
  }, [isOpen, previewIsPlaying, settings.mode, activeSentences.length, settings.sentenceInterval]);

  // გადახედვის ტაიმერი სიტყვებისთვის
  useEffect(() => {
    if (!isOpen || !previewIsPlaying || settings.mode !== 'word_zoom') return;
    if (previewWords.length === 0) return;

    const timer = setInterval(() => {
      setPreviewWordIdx(prev => (prev + 1) % previewWords.length);
    }, Math.max(120, Math.round(60000 / settings.wordWpm)));

    return () => clearInterval(timer);
  }, [isOpen, previewIsPlaying, settings.mode, previewWords.length, settings.wordWpm]);

  // გადახედვის უწყვეტი სქროლვა
  useEffect(() => {
    if (!isOpen || !previewIsPlaying || settings.mode !== 'continuous') return;
    const el = previewScrollRef.current;
    if (!el) return;

    let pos = 0;
    let frameId: number;

    const step = () => {
      pos += settings.continuousSpeed * 0.75;
      if (pos >= el.scrollHeight - el.clientHeight) {
        pos = 0;
      }
      el.scrollTop = pos;
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, previewIsPlaying, settings.mode, settings.continuousSpeed]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof TeleprompterSettings>(key: K, value: TeleprompterSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // ფონის ფერის შეცვლა ავტომატური კონტრასტული ტექსტით
  const handleBackgroundColorChange = (newBg: string) => {
    const contrastText = getOptimalContrastTextColor(newBg);
    setSettings(prev => ({
      ...prev,
      backgroundColor: newBg,
      textColor: contrastText
    }));
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem(TELEPROMPTER_STORAGE_KEY, JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error('პარამეტრების შენახვა ვერ მოხერხდა', e);
    }
  };

  const handleStart = () => {
    try {
      localStorage.setItem(TELEPROMPTER_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('შენახვის შეცდომა', e);
    }
    onLaunch(settings);
  };

  const toggleSentenceSelection = (idx: number) => {
    setSettings(prev => {
      const current = prev.selectedSentenceIndices || [];
      const next = current.includes(idx)
        ? current.filter(i => i !== idx)
        : [...current, idx].sort((a, b) => a - b);
      return { ...prev, selectedSentenceIndices: next };
    });
  };

  const selectAllSentences = () => {
    setSettings(prev => ({
      ...prev,
      selectedSentenceIndices: allSentences.map((_, idx) => idx)
    }));
  };

  const clearSentenceSelection = () => {
    setSettings(prev => ({
      ...prev,
      selectedSentenceIndices: []
    }));
  };

  const selectedCount = settings.selectedSentenceIndices?.length || 0;
  const isDarkBg = settings.textColor === '#f8fafc' || settings.textColor === '#ffffff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
      
      {/* სტილების ბლოკი - სუფთა CSS ანიმაციები და ტექსტის სრული კონტრასტი */}
      <style>{`
        @keyframes teleprompterSentenceSlide {
          0% {
            opacity: 0;
            transform: translateY(35px) scale(0.97);
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
            transform: scale(0.84);
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
          animation: teleprompterSentenceSlide 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .teleprompter-anim-fade {
          animation: teleprompterSentenceFade 0.5s ease-out both;
        }
        .teleprompter-anim-pop {
          animation: teleprompterSentencePop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        /* ტექსტის ფერის გარანტირებული მემკვიდრეობითობა (მუქ ფონზე სრულად თეთრდება) */
        .teleprompter-preview-content,
        .teleprompter-preview-content *,
        .teleprompter-preview-screen,
        .teleprompter-preview-screen * {
          color: inherit !important;
        }
      `}</style>

      {/* გაშლილი, სრულყოფილი და დახვეწილი კონტეინერი (max-w-6xl xl:max-w-7xl) 12px კუთხეებით */}
      <div className="relative w-full max-w-6xl xl:max-w-7xl bg-white dark:bg-gray-900 rounded-[12px] shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* სათაური და ჰედერი */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[12px] bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <PresentationIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                ტექსტის ანიმირება & პრეზენტატორი
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ტელესუფლიორი, პროექტორი, მორბენალი სტრიქონი და მონიშნული წინადადებები
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[12px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
            aria-label="დახურვა"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ჩანართების ნავიგაცია */}
        <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-800/20 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <SlidersIcon className="w-4 h-4" />
            <span>ანიმაცია & დისპლეი (სრული მენიუ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sentences')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'sentences'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <ChecklistIcon className="w-4 h-4" />
            <span>წინადადებების შერჩევის ხელსაწყო</span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-[12px] bg-blue-600 text-white text-[10px] font-bold">
                {selectedCount} არჩეული
              </span>
            )}
          </button>
        </div>

        {/* პარამეტრების სხეული - გაშლილი 2-სვეტიანი სტუდიური განლაგება */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-700 dark:text-gray-300">
          
          {activeTab === 'config' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* მარცხენა მხარე (7 სვეტი): პარამეტრები და კონფიგურაცია */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. ტექსტის დიაპაზონის შერჩევა (Content Scope) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    რა ტექსტი გავუშვათ?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateSetting('contentScope', 'all')}
                      className={`p-3 rounded-[12px] border text-left transition-all ${
                        settings.contentScope === 'all'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="font-bold text-xs">მთლიანი დოკუმენტი</div>
                      <div className="text-[11px] opacity-75 mt-0.5">სრული ტექსტი ({allSentences.length} წინადადება)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateSetting('contentScope', 'custom_sentences');
                        setActiveTab('sentences');
                      }}
                      className={`p-3 rounded-[12px] border text-left transition-all ${
                        settings.contentScope === 'custom_sentences'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>მონიშნული წინადადებები</span>
                        <span className="text-[10px] text-blue-600 font-bold">{selectedCount}</span>
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5">ხელით მონიშვნა ჩამონათვალში</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateSetting('contentScope', 'editor_selection')}
                      disabled={!editorSelectedText}
                      className={`p-3 rounded-[12px] border text-left transition-all ${
                        !editorSelectedText 
                          ? 'opacity-40 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                          : settings.contentScope === 'editor_selection'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="font-bold text-xs">რედაქტორში მონიშნული</div>
                      <div className="text-[11px] opacity-75 mt-0.5">
                        {editorSelectedText ? 'მხოლოდ არჩეული ფრაგმენტი' : 'მონიშნეთ ტექსტი რედაქტორში'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. ანიმაციის რეჟიმის არჩევა */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      ანიმაციის რეჟიმი (ბარათები 12px)
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      აირჩიეთ სასურველი ეფექტი
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { 
                        id: 'continuous', 
                        label: 'უწყვეტი სქროლვა', 
                        badge: 'სუფლიორი',
                        icon: '📜',
                        desc: 'ტექსტი ამოდის ქვემოდან გლუვად' 
                      },
                      { 
                        id: 'sentence', 
                        label: 'წინადადებებად', 
                        badge: 'პრეზენტატორი',
                        icon: '🎯',
                        desc: 'წერტილიდან წერტილამდე ცალკე ეკრანზე' 
                      },
                      { 
                        id: 'marquee', 
                        label: 'მორბენალი სტრიქონი', 
                        badge: 'Marquee',
                        icon: '⚡',
                        desc: 'მარჯვნიდან მარცხნივ ლენტის სტილში' 
                      },
                      { 
                        id: 'stanza', 
                        label: 'სტროფებად / აბზაც.', 
                        badge: 'სლაიდები',
                        icon: '📑',
                        desc: 'აბზაცების ფოკუსი და ავტო-ჩასქროლვა' 
                      },
                      { 
                        id: 'word_zoom', 
                        label: 'სიტყვების გადიდება', 
                        badge: 'კარაოკე & RSVP',
                        icon: '🔍',
                        desc: 'სიტყვების დინამიური გამოკვეთა და ტემპი' 
                      },
                    ].map(m => {
                      const isSelected = settings.mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateSetting('mode', m.id as TeleprompterAnimationMode)}
                          className={`p-3 rounded-[12px] border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 shadow-md ring-2 ring-blue-500/20'
                              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-base">{m.icon}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[12px] ${
                                isSelected 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                              }`}>
                                {m.badge}
                              </span>
                            </div>
                            <div className="font-bold text-xs leading-tight mb-1">{m.label}</div>
                            <div className="text-[11px] opacity-75 leading-snug">{m.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. არჩეული რეჟიმის დეტალური პარამეტრები (12px ბარათი) */}
                <div className="p-4 rounded-[12px] bg-gray-50 dark:bg-gray-800/50 border border-gray-200/70 dark:border-gray-800 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <SlidersIcon className="w-4 h-4" />
                    <span>რეჟიმის დეტალური პარამეტრები</span>
                  </div>

                  {/* რეჟიმი 1: უწყვეტი სქროლვა */}
                  {settings.mode === 'continuous' && (
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-xs space-y-1">
                        <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>📜 უწყვეტი გლუვი სქროლვა (ტელესუფლიორი)</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                          ტექსტი იწყებს ამოსვლას ეკრანის სულ ქვემოდან გლუვი, მშვიდი სვლით. იდეალურია ტელეწამყვანებისთვის, გამომსვლელებისთვის და ვიდეოჩანაწერებისთვის.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span>საწყისი სქროლვის სიჩქარე</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{settings.continuousSpeed.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          value={settings.continuousSpeed}
                          onChange={(e) => updateSetting('continuousSpeed', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>ძალიან ნელი (0.1x)</span>
                          <span>კომფორტული (0.4x)</span>
                          <span>სწრაფი (2.0x+)</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/60 p-2.5 rounded-[12px] border border-gray-200 dark:border-gray-800">
                        💡 გაშვების დროს კლავიატურის <strong>↑ (ზედა)</strong> და <strong>↓ (ქვედა)</strong> ისრებით შეგიძლიათ სიჩქარის მყისიერი აჩქარება ან შენელება. <strong>Space</strong> - პაუზა/დაკვრა.
                      </p>
                    </div>
                  )}

                  {/* რეჟიმი 2: წინადადებებად შემოსვლა */}
                  {settings.mode === 'sentence' && (
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-xs space-y-1">
                        <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>🎯 წინადადებებად შემოსვლა (პრეზენტატორი & სუბტიტრები)</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                          თითოეული წინადადება (წერტილიდან წერტილამდე) ჩნდება ცალკე ეკრანზე სუფთა მკაფიო შრიფტით ჩრდილების გარეშე.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span>ავტო-გადასვლის დრო წინადადებაზე</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{settings.sentenceInterval} წამი</span>
                        </div>
                        <input
                          type="range"
                          min="1.5"
                          max="10"
                          step="0.5"
                          value={settings.sentenceInterval}
                          onChange={(e) => updateSetting('sentenceInterval', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5">წინადადების შემოსვლის ეფექტი</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'slide', label: 'ამოცურება (Slide)' },
                            { id: 'fade', label: 'თანდათანობით (Fade)' },
                            { id: 'pop', label: 'მკაფიო (Pop)' },
                          ].map(eff => (
                            <button
                              key={eff.id}
                              type="button"
                              onClick={() => {
                                updateSetting('sentenceEffect', eff.id as SentenceEntranceEffect);
                                // გადატვირთოს გადახედვის წინადადება ანიმაციის სანახავად
                                setPreviewSentenceIdx(prev => prev);
                              }}
                              className={`py-2 px-3 text-xs rounded-[12px] border font-medium transition-all ${
                                settings.sentenceEffect === eff.id
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-gray-400'
                              }`}
                            >
                              {eff.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium pt-1">
                        <input
                          type="checkbox"
                          checked={settings.showSentenceCounter}
                          onChange={(e) => updateSetting('showSentenceCounter', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded-[6px] border-gray-300 focus:ring-blue-500"
                        />
                        <span>წინადადებების მრიცხველის ჩვენება (მაგ. „წინადადება 1 / 24“)</span>
                      </label>

                      <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/60 p-2.5 rounded-[12px] border border-gray-200 dark:border-gray-800">
                        💡 მართვა: <strong>→ / ↓</strong> ისრით შემდეგი წინადადება, <strong>← / ↑</strong> ისრით წინა წინადადება, <strong>Space</strong> - პაუზა/დაკვრა.
                      </p>
                    </div>
                  )}

                  {/* რეჟიმი 3: მორბენალი სტრიქონი (Marquee) */}
                  {settings.mode === 'marquee' && (
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-xs space-y-1">
                        <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>⚡ მორბენალი სტრიქონი (News Ticker & Marquee)</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                          ტექსტი შემოდის ეკრანის მარჯვენა კიდიდან და მიედინება მარცხნივ უწყვეტ ლენტად.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span>მოძრაობის სიჩქარე</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{settings.marqueeSpeed} px/წამი</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="250"
                          step="10"
                          value={settings.marqueeSpeed}
                          onChange={(e) => updateSetting('marqueeSpeed', parseInt(e.target.value, 10))}
                          className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>მშვიდი (40 px/s)</span>
                          <span>სტანდარტული (80 px/s)</span>
                          <span>სწრაფი (200 px/s)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* რეჟიმი 4: სტროფებად / აბზაცებად */}
                  {settings.mode === 'stanza' && (
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-xs space-y-1">
                        <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>📑 სტროფებად / აბზაცებად (პრეზენტაციის სლაიდები)</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                          სტროფები თანმიმდევრულად ფოკუსირდება და ეკრანი ავტომატურად გადადის ქვემოთ.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span>სტროფის ჩვენების ხანგრძლივობა</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{settings.stanzaInterval} წამი</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="20"
                          step="1"
                          value={settings.stanzaInterval}
                          onChange={(e) => updateSetting('stanzaInterval', parseInt(e.target.value, 10))}
                          className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5">სტროფის გადასვლის ეფექტი</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'dim', label: 'ფოკუსირება (Dimming)' },
                            { id: 'crossfade', label: 'გაქრობა (Cross-fade)' },
                            { id: 'curtain', label: 'ფარდა (Slide Reveal)' },
                          ].map(eff => (
                            <button
                              key={eff.id}
                              type="button"
                              onClick={() => updateSetting('stanzaEffect', eff.id as StanzaEntranceEffect)}
                              className={`py-2 px-3 text-xs rounded-[12px] border font-medium transition-all ${
                                settings.stanzaEffect === eff.id
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                              }`}
                            >
                              {eff.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* რეჟიმი 5: სიტყვების გადიდება (Word Zoom) */}
                  {settings.mode === 'word_zoom' && (
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 text-xs space-y-1">
                        <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>🔍 სიტყვების თანმიმდევრული გადიდება (კარაოკე & RSVP)</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                          სიტყვები თანმიმდევრულად დიდდება და ფერადდება კითხვის ტემპის მიხედვით.
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span>კითხვის სიჩქარე (სიტყვა წუთში - WPM)</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{settings.wordWpm} WPM</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="500"
                          step="20"
                          value={settings.wordWpm}
                          onChange={(e) => updateSetting('wordWpm', parseInt(e.target.value, 10))}
                          className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5">გამოკვეთის ფერი</label>
                        <div className="flex items-center gap-3">
                          {ACCENT_PRESETS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => updateSetting('wordHighlightColor', color)}
                              style={{ backgroundColor: color }}
                              className={`w-7 h-7 rounded-[12px] transition-transform ${
                                settings.wordHighlightColor === color ? 'ring-4 ring-blue-500/30 scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                              }`}
                            />
                          ))}
                          <input
                            type="color"
                            value={settings.wordHighlightColor}
                            onChange={(e) => updateSetting('wordHighlightColor', e.target.value)}
                            className="w-8 h-8 rounded-[12px] cursor-pointer border border-gray-300 dark:border-gray-700 p-0.5 bg-transparent"
                            title="საკუთარი ფერი"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. ვიზუალური და დისპლეის პარამეტრები (12px ბარათი) */}
                <div className="p-4 rounded-[12px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ფონი და დისპლეი (მუქ ფონზე ტექსტი სრულად თეთრდება)
                  </label>

                  {/* ფონის ფერის არჩევა */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-[12px] border border-gray-200/80 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="teleprompter-bg-picker"
                        value={settings.backgroundColor}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        className="w-10 h-10 rounded-[12px] cursor-pointer border border-gray-300 dark:border-gray-700 p-0.5 bg-transparent shadow-sm"
                      />
                      <div>
                        <label htmlFor="teleprompter-bg-picker" className="font-bold text-xs block cursor-pointer text-gray-900 dark:text-white">
                          ფონის ფერი: {settings.backgroundColor}
                        </label>
                        <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                          ✓ ტექსტის ფერი: {isDarkBg ? 'თეთრი (#f8fafc)' : 'მუქი (#0f172a)'} (კონტრასტულია)
                        </span>
                      </div>
                    </div>

                    {/* ფონის პრესეტები */}
                    <div className="flex items-center gap-2">
                      {BG_PRESETS.map(preset => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => handleBackgroundColorChange(preset.color)}
                          style={{ backgroundColor: preset.color }}
                          className={`w-7 h-7 rounded-[12px] border border-gray-300 dark:border-gray-700 transition-all ${
                            settings.backgroundColor === preset.color 
                              ? 'ring-2 ring-blue-500 scale-110 shadow-md' 
                              : 'opacity-75 hover:opacity-100'
                          }`}
                          title={preset.title}
                        />
                      ))}
                    </div>
                  </div>

                  {/* შრიფტის ზომა */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span>ტექსტის ზომა</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{settings.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="96"
                      step="2"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>მცირე (24px)</span>
                      <span>სტანდარტული (46px)</span>
                      <span>უზარმაზარი პროექტორი (96px)</span>
                    </div>
                  </div>

                  {/* სრული ეკრანი და სარკე */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={settings.startFullscreen}
                        onChange={(e) => updateSetting('startFullscreen', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-[6px] border-gray-300 focus:ring-blue-500"
                      />
                      <span className="flex items-center gap-1.5">
                        <MaximizeIcon className="w-3.5 h-3.5 text-blue-600" />
                        პირდაპირ სრულ ეკრანზე გაშვება
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={settings.mirrorMode}
                        onChange={(e) => updateSetting('mirrorMode', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-[6px] border-gray-300 focus:ring-blue-500"
                      />
                      <span>სარკისებრი რეჟიმი (Mirror)</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* მარჯვენა მხარე (5 სვეტი): სუფლიორის პირდაპირი გადახედვა (Live Studio Preview) */}
              <div className="lg:col-span-5 sticky top-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      სუფლიორის გადახედვა (Live Monitor)
                    </span>
                  </div>
                  
                  {/* გადახედვის პაუზა/დაკვრა */}
                  <button
                    type="button"
                    onClick={() => setPreviewIsPlaying(prev => !prev)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[12px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-all"
                  >
                    {previewIsPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                    <span>{previewIsPlaying ? 'პაუზა' : 'ტესტი'}</span>
                  </button>
                </div>

                {/* მონიტორის ჩარჩო 12px კუთხეებით და რეალური კონტრასტით */}
                <div 
                  className="w-full h-80 rounded-[12px] border-2 border-gray-800 shadow-xl overflow-hidden flex flex-col justify-between relative transition-all duration-300"
                  style={{
                    backgroundColor: settings.backgroundColor,
                    color: settings.textColor,
                  }}
                >
                  {/* მონიტორის ზედა ინდიკატორი */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 backdrop-blur-sm border-b border-white/10 text-[10px] select-none font-mono">
                    <span className="opacity-80">
                      რეჟიმი: {settings.mode}
                    </span>
                    <span className="text-blue-400 font-bold">
                      {isDarkBg ? 'ტექსტი: თეთრი' : 'ტექსტი: მუქი'}
                    </span>
                  </div>

                  {/* მონიტორის შიგთავსი რეჟიმების მიხედვით */}
                  <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative teleprompter-preview-screen">
                    
                    {/* 1: უწყვეტი სქროლვის გადახედვა */}
                    {settings.mode === 'continuous' && (
                      <div 
                        ref={previewScrollRef} 
                        className="w-full h-full overflow-y-auto no-scrollbar space-y-3 text-center teleprompter-preview-content"
                        style={{ fontSize: `${Math.max(14, Math.round(settings.fontSize * 0.45))}px` }}
                      >
                        <div style={{ paddingTop: '80px', paddingBottom: '80px' }}>
                          {activeSentences.slice(0, 8).map((s, idx) => (
                            <p key={idx} className="mb-2 leading-relaxed opacity-95">
                              {s.text}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2: წინადადებების გადახედვა (რეალური CSS ანიმაციით) */}
                    {settings.mode === 'sentence' && (
                      <div className="text-center w-full px-2">
                        {activeSentences.length > 0 ? (
                          <div
                            key={previewSentenceIdx}
                            className={`teleprompter-preview-content font-medium ${
                              settings.sentenceEffect === 'slide'
                                ? 'teleprompter-anim-slide'
                                : settings.sentenceEffect === 'fade'
                                ? 'teleprompter-anim-fade'
                                : 'teleprompter-anim-pop'
                            }`}
                            style={{ 
                              fontSize: `${Math.max(16, Math.round(settings.fontSize * 0.5))}px`,
                              lineHeight: 1.4
                            }}
                          >
                            {settings.showSentenceCounter && (
                              <div className="text-[10px] font-mono opacity-60 mb-2 uppercase tracking-widest">
                                წინადადება {previewSentenceIdx + 1} / {activeSentences.length}
                              </div>
                            )}
                            <p style={{ color: 'inherit' }}>
                              {activeSentences[previewSentenceIdx]?.text || 'ტექსტი ცარიელია'}
                            </p>
                          </div>
                        ) : (
                          <div className="opacity-40 text-xs">ტექსტი ცარიელია</div>
                        )}
                      </div>
                    )}

                    {/* 3: მორბენალი სტრიქონის გადახედვა */}
                    {settings.mode === 'marquee' && (
                      <div className="w-full overflow-hidden flex items-center">
                        <div 
                          ref={previewMarqueeRef}
                          className="whitespace-nowrap font-medium teleprompter-preview-content animate-marquee"
                          style={{ 
                            fontSize: `${Math.max(16, Math.round(settings.fontSize * 0.48))}px`,
                            animation: `marqueeAnim ${Math.max(12, 1000 / settings.marqueeSpeed * 2.5)}s linear infinite`
                          }}
                        >
                          {previewMarqueeText}
                        </div>
                        <style>{`
                          @keyframes marqueeAnim {
                            0% { transform: translateX(100%); }
                            100% { transform: translateX(-100%); }
                          }
                        `}</style>
                      </div>
                    )}

                    {/* 4: სტროფების გადახედვა */}
                    {settings.mode === 'stanza' && (
                      <div className="w-full space-y-2 text-center teleprompter-preview-content text-xs">
                        {stanzas.slice(0, 3).map((st, idx) => (
                          <div 
                            key={st.id}
                            className={`p-2 rounded-[8px] transition-all ${
                              idx === 0 
                                ? 'border-l-4 border-blue-500 opacity-100 font-bold bg-white/10' 
                                : 'opacity-40'
                            }`}
                          >
                            {st.text.slice(0, 90)}...
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 5: სიტყვების გადიდების გადახედვა */}
                    {settings.mode === 'word_zoom' && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 text-center leading-relaxed">
                        {previewWords.slice(0, 20).map((w, idx) => {
                          const isActive = idx === previewWordIdx;
                          return (
                            <span
                              key={w.id}
                              className="transition-all duration-150 inline-block px-1"
                              style={{
                                transform: isActive ? `scale(${settings.wordZoomScale})` : 'scale(1)',
                                color: isActive ? settings.wordHighlightColor : 'inherit',
                                fontWeight: isActive ? 700 : 400,
                                opacity: isActive ? 1 : 0.6,
                              }}
                            >
                              {w.word}
                            </span>
                          );
                        })}
                      </div>
                    )}

                  </div>

                  {/* მონიტორის ქვედა კონტროლერები წინადადებების გადასართავად */}
                  {settings.mode === 'sentence' && activeSentences.length > 1 && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 backdrop-blur-md border-t border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewSentenceIdx(prev => (prev - 1 + activeSentences.length) % activeSentences.length)}
                        className="px-2 py-0.5 rounded-[12px] bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-[11px]"
                      >
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                        <span>წინა</span>
                      </button>
                      
                      <span className="text-[11px] font-mono text-white/70">
                        {previewSentenceIdx + 1} / {activeSentences.length}
                      </span>

                      <button
                        type="button"
                        onClick={() => setPreviewSentenceIdx(prev => (prev + 1) % activeSentences.length)}
                        className="px-2 py-0.5 rounded-[12px] bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-[11px]"
                      >
                        <span>შემდეგი</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* განმარტებითი ბარათი 12px კუთხეებით */}
                <div className="p-3 rounded-[12px] bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 text-xs space-y-1">
                  <div className="font-bold text-blue-900 dark:text-blue-300">
                    💡 პროექტორის & ეკრანის გარანტია
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
                    ყველა ანიმაცია, სიჩქარე და კონტრასტი ოპტიმიზებულია როგორც პრეზენტაციებისთვის, ისე პროფესიონალური ტელესუფლიორის მინისთვის.
                  </p>
                </div>

              </div>

            </div>
          ) : (
            /* წინადადებების შერჩევის ხელსაწყო (Sentence Selector Tool) */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-[12px] border border-blue-200/50 dark:border-blue-800/40">
                <div>
                  <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300">
                    მონიშნეთ კონკრეტული წინადადებები (წერტილიდან წერტილამდე)
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    მხოლოდ მონიშნული წინადადებები გამოვა ანიმაციასა და პრეზენტატორში
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllSentences}
                    className="px-3.5 py-2 text-xs font-bold rounded-[12px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                  >
                    ყველას მონიშვნა
                  </button>
                  <button
                    type="button"
                    onClick={clearSentenceSelection}
                    className="px-3.5 py-2 text-xs font-semibold rounded-[12px] bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-all"
                  >
                    გასუფთავება
                  </button>
                </div>
              </div>

              <div className="text-xs font-medium text-gray-500 flex justify-between items-center px-1">
                <span>სულ წინადადებები: {allSentences.length}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  მონიშნულია: {selectedCount}
                </span>
              </div>

              {/* წინადადებების ჩამონათვალი 12px ბარათებით */}
              <div className="max-h-[55vh] overflow-y-auto space-y-2.5 pr-1">
                {allSentences.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    დოკუმენტში წინადადებები ვერ მოიძებნა
                  </div>
                ) : (
                  allSentences.map((sentence, idx) => {
                    const isSelected = (settings.selectedSentenceIndices || []).includes(idx);
                    return (
                      <div
                        key={sentence.id}
                        onClick={() => toggleSentenceSelection(idx)}
                        className={`p-3.5 rounded-[12px] border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded-[6px] border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="font-bold text-[10px] text-blue-600 mr-2 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-[6px]">
                            #{idx + 1}
                          </span>
                          <span className="leading-relaxed font-medium">
                            {sentence.text}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* ქვედა ღილაკები 12px კუთხეებით */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[12px] transition-all"
            >
              <SaveIcon className="w-4 h-4" />
              <span>პარამეტრების შენახვა</span>
            </button>
            {savedSuccess && (
              <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                ✓ შენახულია
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-[12px] transition-all"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-[12px] shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
            >
              <PlayIcon className="w-4 h-4 fill-white" />
              <span>ტექსტის გაშვება</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeleprompterModal;
