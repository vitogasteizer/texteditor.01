
import React from 'react';

interface WordCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: { words: number; characters: number };
  t: (key: string) => string;
}

const WordCountModal: React.FC<WordCountModalProps> = ({ isOpen, onClose, stats, t }) => {
    if (!isOpen) return null;

    const handleWrapperClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in" 
            onClick={handleWrapperClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-count-title"
        >
            <div 
                className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300" 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-6 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"></div>
                        <h3 id="word-count-title" className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{t('modals.wordCount.title')}</h3>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-gray-400 active:scale-90">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/20 dark:bg-gray-900/40 p-6 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm text-center group hover:bg-white/30 dark:hover:bg-gray-900/60 transition-all">
                            <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-2">{t('modals.wordCount.words')}</span>
                            <span className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter group-hover:scale-110 transition-transform inline-block">{stats.words}</span>
                        </div>
                        <div className="bg-white/20 dark:bg-gray-900/40 p-6 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm text-center group hover:bg-white/30 dark:hover:bg-gray-900/60 transition-all">
                            <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-2">{t('modals.wordCount.characters')}</span>
                            <span className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter group-hover:scale-110 transition-transform inline-block">{stats.characters}</span>
                        </div>
                    </div>
                </div>

                <footer className="p-6 border-t border-white/20 dark:border-white/5">
                    <button 
                        onClick={onClose} 
                        type="button" 
                        className="w-full px-6 py-3.5 text-[10px] font-black text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-[0.2em]"
                    >
                        {t('modals.wordCount.ok')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default WordCountModal;