
import React, { useState, useEffect } from 'react';

interface SourceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (newContent: string) => void;
  t: (key: string) => string;
}

const SourceCodeModal: React.FC<SourceCodeModalProps> = ({ isOpen, onClose, content, onSave, t }) => {
  const [code, setCode] = useState(content);

  useEffect(() => {
    if (isOpen) {
      setCode(content);
    }
  }, [isOpen, content]);

  if (!isOpen) return null;
  
  const handleSave = () => {
    onSave(code);
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in"
        onClick={handleWrapperClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-code-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl flex flex-col h-[85vh] overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 id="source-code-title" className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('modals.sourceCode.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <div className="flex-grow p-6 bg-gray-50 dark:bg-gray-900/50">
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full h-full p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl font-mono text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all custom-scrollbar resize-none"
              spellCheck="false"
            />
        </div>

        <footer className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button
                onClick={onClose}
                type="button"
                className="px-6 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
            >
                {t('modals.sourceCode.cancel')}
            </button>
            <button
                onClick={handleSave}
                type="button"
                className="px-8 py-2.5 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95"
            >
                {t('modals.sourceCode.save')}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default SourceCodeModal;