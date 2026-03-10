
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
        onClick={handleWrapperClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-code-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl flex flex-col h-4/5" 
        onClick={e => e.stopPropagation()}
      >
        <h3 id="source-code-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('modals.sourceCode.title')}</h3>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          className="flex-grow w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          spellCheck="false"
        />
        <div className="mt-4 flex justify-end gap-3">
            <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border border-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
                {t('modals.sourceCode.cancel')}
            </button>
            <button
                onClick={handleSave}
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                {t('modals.sourceCode.save')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SourceCodeModal;