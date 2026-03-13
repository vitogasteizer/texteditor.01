
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
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] transition-all duration-300 animate-in fade-in" 
        onClick={handleWrapperClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="url-input-title"
    >
      <div 
        className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"></div>
                <h3 id="url-input-title" className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{title}</h3>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-gray-400 active:scale-90">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <div className="p-8 space-y-6">
          <div>
            <label htmlFor="url-input" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] mb-3 ml-1">{label}</label>
            <input
              ref={inputRef}
              type="text"
              id="url-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full px-4 py-3.5 bg-white/20 dark:bg-gray-900/40 border border-white/20 dark:border-white/5 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 transition-all font-black text-xs"
              placeholder={placeholder}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <footer className="p-6 border-t border-white/20 dark:border-white/5 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            type="button" 
            className="px-6 py-3.5 text-[10px] font-black text-gray-500 dark:text-gray-400 bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-2xl hover:bg-white/30 dark:hover:bg-white/10 transition-all active:scale-95 uppercase tracking-[0.2em]"
          >
            {t('modals.sourceCode.cancel')}
          </button>
          <button 
            onClick={handleSubmit} 
            type="button" 
            className="px-8 py-3.5 text-[10px] font-black text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitButtonText}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UrlInputModal;
