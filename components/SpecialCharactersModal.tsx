import React, { useState } from 'react';

interface SpecialCharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (char: string) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const characters = {
  common: ['©', '®', '™', '§', '°', '•', '·', '–', '—', '…'],
  spanish: ['¿', '¡', 'ñ', 'Ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü'],
  math: ['≠', '≈', '≤', '≥', '±', '÷', '×', '√', '∞', 'π', '∑', '∫'],
  currency: ['€', '£', '¥', '¢', '$', '₾'],
  arrows: ['←', '↑', '→', '↓', '↔', '↕', '↖', '↗', '↘', '↙'],
  punctuation: ['“', '”', '‘', '’', '«', '»', '‹', '›'],
  symbols: ['★', '☆', '♥', '♡', '✓', '✔', '✗', '✘', '♪', '♫', '♠', '♣', '♥', '♦'],
};

const SpecialCharactersModal: React.FC<SpecialCharactersModalProps> = ({ isOpen, onClose, onInsert, t }) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof characters>('common');

  if (!isOpen) return null;

  const handleWrapperClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const categories = Object.keys(characters) as (keyof typeof characters)[];

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-[100] p-4 transition-all duration-300 animate-in fade-in"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-chars-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl flex flex-col h-[70vh] overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 id="special-chars-title" className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('modals.specialChars.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>
        
        <div className="flex flex-grow overflow-hidden">
          <aside className="w-1/3 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`w-full text-left px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {t(`modals.specialChars.categories.${category}`)}
              </button>
            ))}
          </aside>
          <main className="w-2/3 p-5 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {characters[activeCategory].map(char => (
                <button
                  key={char}
                  onClick={() => onInsert(char)}
                  className="flex items-center justify-center p-2 text-2xl h-12 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                  title={`Insert ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </main>
        </div>
        
        <footer className="p-4 flex justify-end flex-shrink-0 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            type="button"
            className="px-6 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            {t('modals.specialChars.close')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SpecialCharactersModal;
