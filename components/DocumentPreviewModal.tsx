
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
      onClick={handleWrapperClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col h-[90vh]">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 id="preview-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('modals.preview.title')}</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            {t('modals.preview.close')}
          </button>
        </header>
        <div className="flex-grow p-6 overflow-y-auto">
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
