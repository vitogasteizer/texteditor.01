
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" 
        onClick={handleWrapperClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="url-input-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 id="url-input-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
          <input
            ref={inputRef}
            type="text"
            id="url-input"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={placeholder}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border border-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            {t('modals.sourceCode.cancel')}
          </button>
          <button onClick={handleSubmit} type="button" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrlInputModal;
