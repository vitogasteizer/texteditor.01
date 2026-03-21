

import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  const handleWrapperClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 transition-all duration-300 animate-in fade-in"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 w-full max-w-md border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <h3 id="about-title" className="text-base font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('modals.about.title')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{t('modals.about.description')}</p>
        
        <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>{t('modals.about.creator')}</span>
            <a 
              href="https://avma.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              avma.vercel.app
            </a>
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="w-full px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
          >
            {t('modals.about.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;