
import React, { useState, useEffect } from 'react';
import type { PageSize, PageOrientation, PageMargins } from '../App';

interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: {
    size: PageSize;
    orientation: PageOrientation;
    margins: PageMargins;
    color: string;
    setAsDefault: boolean;
  }) => void;
  pageSettings: {
    size: PageSize;
    orientation: PageOrientation;
    margins: PageMargins;
    color: string;
  };
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const PageSetupModal: React.FC<PageSetupModalProps> = ({ isOpen, onClose, onApply, pageSettings, t }) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'pageless'>('pages');
  const [orientation, setOrientation] = useState<PageOrientation>(pageSettings.orientation);
  const [size, setSize] = useState<PageSize>(pageSettings.size);
  const [color, setColor] = useState(pageSettings.color);
  const [margins, setMargins] = useState<PageMargins>(pageSettings.margins);
  const [setAsDefault, setSetAsDefault] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        setOrientation(pageSettings.orientation);
        setSize(pageSettings.size);
        setColor(pageSettings.color);
        setMargins(pageSettings.margins);
        setSetAsDefault(false);
    }
  }, [isOpen, pageSettings]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ size, orientation, margins, color, setAsDefault });
  };
  
  const handleMarginChange = (side: keyof PageMargins, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
        setMargins(prev => ({...prev, [side]: numValue }));
    }
  };

  const paperSizes: { value: PageSize, label: string }[] = [
    { value: 'Letter', label: `Letter (8.5" x 11")` },
    { value: 'Legal', label: `Legal (8.5" x 14")` },
    { value: 'Tabloid', label: `Tabloid (11" x 17")` },
    { value: 'Statement', label: `Statement (5.5" x 8.5")` },
    { value: 'Executive', label: `Executive (7.25" x 10.5")` },
    { value: 'A3', label: `A3 (297mm x 420mm)` },
    { value: 'A4', label: `A4 (210mm x 297mm)` },
    { value: 'A5', label: `A5 (148mm x 210mm)` },
    { value: 'B4', label: `B4 (250mm x 353mm)` },
    { value: 'B5', label: `B5 (176mm x 250mm)` },
  ];

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-setup-title"
    >
      <div 
        className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"></div>
                <h3 id="page-setup-title" className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{t('modals.pageSetup.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-gray-400 active:scale-90">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <div className="p-8">
            <div className="border-b border-white/20 dark:border-white/5">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button 
                        onClick={() => setActiveTab('pages')} 
                        className={`whitespace-nowrap py-4 px-1 border-b-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                            activeTab === 'pages' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                        }`}
                    >
                        {t('modals.pageSetup.tabs.pages')}
                    </button>
                    <button 
                        disabled 
                        className="whitespace-nowrap py-4 px-1 border-b-2 text-[10px] font-black uppercase tracking-[0.2em] border-transparent text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    >
                        {t('modals.pageSetup.tabs.pageless')}
                    </button>
                </nav>
            </div>

            <div className="pt-8 space-y-8">
                <div className="bg-white/20 dark:bg-gray-900/40 p-6 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-4">{t('modals.pageSetup.orientation')}</label>
                    <div className="flex items-center gap-8">
                        <label className="inline-flex items-center group cursor-pointer">
                            <div className="relative flex items-center justify-center">
                                <input type="radio" className="peer sr-only" name="orientation" value="portrait" checked={orientation === 'portrait'} onChange={() => setOrientation('portrait')} />
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 rounded-full peer-checked:border-blue-600 peer-checked:border-[6px] transition-all"></div>
                            </div>
                            <span className="ml-3 text-[10px] font-black text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors uppercase tracking-[0.1em]">{t('modals.pageSetup.portrait')}</span>
                        </label>
                        <label className="inline-flex items-center group cursor-pointer">
                            <div className="relative flex items-center justify-center">
                                <input type="radio" className="peer sr-only" name="orientation" value="landscape" checked={orientation === 'landscape'} onChange={() => setOrientation('landscape')} />
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 rounded-full peer-checked:border-blue-600 peer-checked:border-[6px] transition-all"></div>
                            </div>
                            <span className="ml-3 text-[10px] font-black text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors uppercase tracking-[0.1em]">{t('modals.pageSetup.landscape')}</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="paper-size" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">{t('modals.pageSetup.paperSize')}</label>
                        <select 
                            id="paper-size" 
                            value={size} 
                            onChange={e => setSize(e.target.value as PageSize)} 
                            className="w-full px-4 py-3.5 bg-white/20 dark:bg-gray-900/40 border border-white/20 dark:border-white/5 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 text-[10px] font-black uppercase tracking-[0.1em] transition-all appearance-none cursor-pointer"
                        >
                            {paperSizes.map(ps => <option key={ps.value} value={ps.value} className="bg-white dark:bg-gray-900">{ps.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="page-color" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-2 ml-1">{t('modals.pageSetup.pageColor')}</label>
                        <div className="relative group">
                            <input 
                                type="color" 
                                id="page-color" 
                                value={color} 
                                onChange={e => setColor(e.target.value)} 
                                className="w-full h-[48px] p-2 bg-white/20 dark:bg-gray-900/40 border border-white/20 dark:border-white/5 rounded-2xl cursor-pointer shadow-sm transition-all" 
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-4 ml-1">{t('modals.pageSetup.margins')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                             <div key={side}>
                                <label htmlFor={`margin-${side}`} className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter mb-1.5 ml-1">{t(`modals.pageSetup.${side}`)}</label>
                                <input 
                                    type="number" 
                                    id={`margin-${side}`} 
                                    value={margins[side]} 
                                    onChange={e => handleMarginChange(side, e.target.value)} 
                                    step="0.1" 
                                    className="w-full px-4 py-3 bg-white/20 dark:bg-gray-900/40 border border-white/20 dark:border-white/5 rounded-2xl text-gray-900 dark:text-gray-100 text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm" 
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <footer className="p-8 border-t border-white/20 dark:border-white/5 flex justify-between items-center">
            <button 
                onClick={() => setSetAsDefault(true)} 
                className="px-4 py-2 text-[10px] font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all uppercase tracking-[0.2em] active:scale-95"
            >
                {t('modals.pageSetup.setAsDefault')}
            </button>
            <div className="flex gap-3">
                <button 
                    onClick={onClose} 
                    type="button" 
                    className="px-6 py-3.5 text-[10px] font-black text-gray-500 dark:text-gray-400 bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-2xl hover:bg-white/30 dark:hover:bg-white/10 transition-all active:scale-95 uppercase tracking-[0.2em]"
                >
                    {t('modals.pageSetup.cancel')}
                </button>
                <button 
                    onClick={handleApply} 
                    type="button" 
                    className="px-8 py-3.5 text-[10px] font-black text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-[0.2em]"
                >
                    {t('modals.pageSetup.ok')}
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default PageSetupModal;
