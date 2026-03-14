
import React, { useState, useEffect, useRef } from 'react';

interface UrlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  submitButtonText?: string;
  t: (key: string) => string;
}

const UrlInputModal: React.FC<UrlInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  placeholder = '',
  initialValue = '',
  submitButtonText = 'Insert',
  t,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(value);
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
        aria-labelledby="url-input-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 id="url-input-title" className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{title}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="url-input" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 ml-1">{label}</label>
            <input
              ref={inputRef}
              type="text"
              id="url-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 transition-all text-sm"
              placeholder={placeholder}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
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
            onClick={handleSubmit} 
            type="button" 
            className="px-8 py-2.5 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitButtonText}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UrlInputModal;
