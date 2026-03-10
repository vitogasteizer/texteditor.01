
import React, { useState, useEffect, useRef } from 'react';

interface CommentInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (commentText: string) => void;
  t: (key: string) => string;
}

const CommentInputModal: React.FC<CommentInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  t,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
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
        aria-labelledby="comment-input-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 id="comment-input-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('modals.comment.title')}</h3>
        <div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={t('modals.comment.placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border border-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            {t('modals.comment.cancel')}
          </button>
          <button onClick={handleSubmit} type="button" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!text.trim()}>
            {t('modals.comment.comment')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentInputModal;
