
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
        className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in" 
        onClick={handleWrapperClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-input-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 id="comment-input-title" className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('modals.comment.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <div className="p-8 space-y-6">
          <div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 text-sm transition-all resize-none"
              placeholder={t('modals.comment.placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>

        <footer className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            type="button" 
            className="px-6 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            {t('modals.comment.cancel')}
          </button>
          <button 
            onClick={handleSubmit} 
            type="button" 
            className="px-8 py-2.5 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={!text.trim()}
          >
            {t('modals.comment.comment')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CommentInputModal;
