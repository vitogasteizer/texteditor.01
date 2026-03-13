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
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-300 animate-in fade-in"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-chars-title"
    >
      <div 
        className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col h-[70vh] overflow-hidden border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"></div>
                <h3 id="special-chars-title" className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{t('modals.specialChars.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-gray-400 active:scale-90">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>
        
        <div className="flex flex-grow overflow-hidden">
          <aside className="w-1/3 flex-shrink-0 border-r border-white/20 dark:border-white/5 overflow-y-auto p-6 space-y-1 custom-scrollbar">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`w-full text-left px-4 py-3.5 text-[10px] font-black rounded-2xl transition-all uppercase tracking-[0.15em] ${
                  activeCategory === category
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {t(`modals.specialChars.categories.${category}`)}
              </button>
            ))}
          </aside>
          <main className="w-2/3 p-8 overflow-y-auto custom-scrollbar bg-white/10 dark:bg-black/10">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {characters[activeCategory].map(char => (
                <button
                  key={char}
                  onClick={() => onInsert(char)}
                  className="flex items-center justify-center p-2 text-2xl h-16 bg-white/20 dark:bg-gray-900/40 border border-white/20 dark:border-white/5 rounded-2xl hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm hover:shadow-md active:scale-90"
                  title={`Insert ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </main>
        </div>
        
        <footer className="p-6 flex justify-end flex-shrink-0 border-t border-white/20 dark:border-white/5">
          <button
            onClick={onClose}
            type="button"
            className="px-8 py-3.5 text-[10px] font-black text-gray-500 dark:text-gray-400 bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-2xl hover:bg-white/30 dark:hover:bg-white/10 transition-all active:scale-95 uppercase tracking-[0.2em]"
          >
            {t('modals.specialChars.close')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SpecialCharactersModal;
