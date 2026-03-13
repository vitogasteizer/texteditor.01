

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
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300 animate-in fade-in"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <h3 id="about-title" className="text-xl font-black mb-4 text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{t('modals.about.title')}</h3>
        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-8 uppercase tracking-[0.15em] leading-relaxed">{t('modals.about.description')}</p>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="w-full px-6 py-3 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-[0.2em]"
          >
            {t('modals.about.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;