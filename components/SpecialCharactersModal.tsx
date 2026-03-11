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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300 animate-in fade-in"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-chars-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-[70vh] overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                <h3 id="special-chars-title" className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('modals.specialChars.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>
        
        <div className="flex flex-grow overflow-hidden bg-gray-50 dark:bg-gray-950">
          <aside className="w-1/3 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {t(`modals.specialChars.categories.${category}`)}
              </button>
            ))}
          </aside>
          <main className="w-2/3 p-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {characters[activeCategory].map(char => (
                <button
                  key={char}
                  onClick={() => onInsert(char)}
                  className="flex items-center justify-center p-2 text-2xl h-14 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm hover:shadow-md active:scale-90"
                  title={`Insert ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </main>
        </div>
        
        <footer className="p-5 flex justify-end flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            type="button"
            className="px-8 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 uppercase tracking-wider"
          >
            {t('modals.specialChars.close')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SpecialCharactersModal;
