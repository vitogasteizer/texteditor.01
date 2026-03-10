
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" 
            onClick={handleWrapperClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-count-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xs text-center" 
                onClick={e => e.stopPropagation()}
            >
                <h3 id="word-count-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('modals.wordCount.title')}</h3>
                <div className="space-y-2 text-left text-gray-800 dark:text-gray-200">
                    <p><span className="font-medium">{t('modals.wordCount.words')}:</span> {stats.words}</p>
                    <p><span className="font-medium">{t('modals.wordCount.characters')}:</span> {stats.characters}</p>
                </div>
                <div className="mt-6">
                    <button 
                        onClick={onClose} 
                        type="button" 
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {t('modals.wordCount.ok')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WordCountModal;