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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-chars-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-[60vh]" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 id="special-chars-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('modals.specialChars.title')}</h3>
        </header>
        
        <div className="flex flex-grow overflow-hidden">
          <aside className="w-1/4 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <nav className="p-2 space-y-1">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t(`modals.specialChars.categories.${category}`)}
                </button>
              ))}
            </nav>
          </aside>
          <main className="w-3/4 p-4 overflow-y-auto">
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {characters[activeCategory].map(char => (
                <button
                  key={char}
                  onClick={() => onInsert(char)}
                  className="flex items-center justify-center p-2 text-2xl h-12 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  title={`Insert ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </main>
        </div>
        
        <footer className="p-4 flex justify-end flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            {t('modals.specialChars.close')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SpecialCharactersModal;
