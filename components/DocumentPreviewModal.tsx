
import React from 'react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  t: (key: string) => string;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, onClose, content, t }) => {
  if (!isOpen) return null;

  const handleWrapperClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                <h3 id="preview-title" className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('modals.preview.title')}</h3>
            </div>
            <button
                onClick={onClose}
                className="px-6 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 uppercase tracking-wider"
            >
                {t('modals.preview.close')}
            </button>
        </header>
        <div className="flex-grow p-10 overflow-y-auto bg-gray-50 dark:bg-gray-950 custom-scrollbar">
          <div className="bg-white dark:bg-gray-900 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mx-auto max-w-4xl">
            <div
                className="prose dark:prose-invert max-w-none prose-slate"
                dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
