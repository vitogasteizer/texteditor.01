import React, { useState } from 'react';
import { 
  CloseIcon, 
  Share2Icon, 
  CopyIcon, 
  CheckIcon, 
  ExternalLinkIcon, 
  BookOpenIcon, 
  FileTextIcon 
} from './icons/EditorIcons';
import { uploadSharedDocument } from '../lib/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  htmlContent: string;
  pageOrientation: 'portrait' | 'landscape';
  aspectRatio?: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  htmlContent,
  pageOrientation,
  aspectRatio,
}) => {
  const [selectedMode, setSelectedMode] = useState<'book' | 'doc'>('book');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [shareData, setShareData] = useState<{ bookUrl: string; docUrl: string; id: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // ლინკის შექმნა Firestore-ში შენახვით
  const handleGenerateLink = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setProgressPercent(10);
    setProgressStatus('ინიციალიზაცია...');

    try {
      const result = await uploadSharedDocument({
        title: documentTitle || 'დოკუმენტი',
        htmlContent,
        orientation: pageOrientation,
        aspectRatio: aspectRatio || (pageOrientation === 'landscape' ? 1.414 : 0.707),
        onProgress: (status, percent) => {
          setProgressStatus(status);
          setProgressPercent(percent);
        },
      });

      setShareData(result);
    } catch (err: unknown) {
      console.error('გაზიარების შეცდომა:', err);
      const message = err instanceof Error ? err.message : 'უცნობი შეცდომა';
      setErrorMsg(`ბმულის გენერირება ვერ მოხერხდა: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const activeUrl = shareData 
    ? (selectedMode === 'book' ? shareData.bookUrl : shareData.docUrl)
    : '';

  const handleCopyLink = async () => {
    if (!activeUrl) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.getElementById('share-link-input') as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[12px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* სათაურის ზოლი */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2Icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                დოკუმენტის საჯარო გაზიარება
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ნებისმიერი ადამიანი ბმულით პირდაპირ შეძლებს ნახვას
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* შიგთავსი */}
        <div className="p-6 space-y-5">
          {/* რეჟიმის არჩევა */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              მნახველისთვის გახსნის რეჟიმი:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMode('book')}
                className={`p-3 rounded-[10px] border text-left flex flex-col gap-1 transition-all ${
                  selectedMode === 'book'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <BookOpenIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>3D წიგნის ხედი (Flipbook)</span>
                </div>
                <p className="text-[10px] opacity-75 leading-relaxed">
                  პირდაპირ იხსნება 100% გაშლილ ელექტრონულ წიგნში
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('doc')}
                className={`p-3 rounded-[10px] border text-left flex flex-col gap-1 transition-all ${
                  selectedMode === 'doc'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <FileTextIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>დოკუმენტის ხედი</span>
                </div>
                <p className="text-[10px] opacity-75 leading-relaxed">
                  ჩვეულებრივი გვერდების ხედი რედაქტორის გარემოში
                </p>
              </button>
            </div>
          </div>

          {/* საინფორმაციო მინიშნება ღრუბლოვან წესებზე */}
          <div className="p-3 rounded-[10px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                ღრუბლოვანი გაზიარების წესები:
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              დოკუმენტი ავტომატურად იყოფა ოპტიმიზებულ ღრუბლოვან გვერდებად (1000 გვერდამდე). ბმულის გახსნა ნებისმიერ მოწყობილობაზეა შესაძლებელი ავტორიზაციის გარეშე.
            </p>
          </div>

          {/* პროგრესის ზოლი ატვირთვისას */}
          {isLoading && (
            <div className="space-y-2 p-3.5 rounded-[10px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  {progressStatus}
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* შეცდომის შეტყობინება */}
          {errorMsg && (
            <div className="p-3 rounded-[8px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* გენერირებული ბმულის ბლოკი */}
          {shareData && !isLoading && (
            <div className="space-y-3 p-4 rounded-[10px] bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ბმული წარმატებით შეიქმნა!
                </span>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  გახსნა <ExternalLinkIcon className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={activeUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-[8px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 select-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-[8px] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      დაკოპირდა!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      კოპირება
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                გაუგზავნეთ ეს ბმული მეგობრებს ან კოლეგებს. ნებისმიერი მოწყობილობიდან გახსნისას პირდაპირ ჩაიტვირთება დოკუმენტის შიგთავსი.
              </p>
            </div>
          )}
        </div>

        {/* ქვედა ღილაკები */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
          >
            დახურვა
          </button>

          {!shareData ? (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={isLoading}
              className="px-4 py-2 rounded-[8px] text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Share2Icon className="w-3.5 h-3.5" />
              {isLoading ? 'მუშავდება...' : 'საზიარო ბმულის შექმნა'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-[8px] text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              {copied ? 'ბმული დაკოპირებულია' : 'ბმულის კოპირება'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
