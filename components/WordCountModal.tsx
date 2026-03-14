
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
            className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in" 
            onClick={handleWrapperClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-count-title"
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <h3 id="word-count-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('modals.wordCount.title')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center transition-all">
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('modals.wordCount.words')}</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.words}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center transition-all">
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('modals.wordCount.characters')}</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.characters}</span>
                        </div>
                    </div>
                </div>

                <footer className="p-3 border-t border-gray-100 dark:border-gray-800">
                    <button 
                        onClick={onClose} 
                        type="button" 
                        className="w-full px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                        {t('modals.wordCount.ok')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default WordCountModal;