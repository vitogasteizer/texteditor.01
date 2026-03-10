
import React, { useState, useEffect, useRef } from 'react';

declare var katex: any;

interface InsertMathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  initialLatex?: string;
  t: (key: string) => string;
}

const InsertMathModal: React.FC<InsertMathModalProps> = ({ isOpen, onClose, onInsert, initialLatex = '', t }) => {
  const [latex, setLatex] = useState(initialLatex);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setLatex(initialLatex);
    }
  }, [isOpen, initialLatex]);

  useEffect(() => {
    if (previewRef.current && typeof katex !== 'undefined') {
        try {
            katex.render(latex, previewRef.current, {
                throwOnError: false,
                displayMode: true
            });
        } catch (e) {
            previewRef.current.innerHTML = '<span class="text-red-500 text-sm">Invalid LaTeX</span>';
        }
    }
  }, [latex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6" 
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Insert Math Formula</h3>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">LaTeX Equation</label>
            <textarea
                value={latex}
                onChange={e => setLatex(e.target.value)}
                placeholder="e.g. E = mc^2"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                rows={3}
            />
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-md min-h-[60px] flex items-center justify-center">
            <div ref={previewRef} className="text-lg text-gray-800 dark:text-gray-200"></div>
        </div>

        <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500">
                Cancel
            </button>
            <button onClick={() => onInsert(latex)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                {initialLatex ? 'Update' : 'Insert'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default InsertMathModal;
