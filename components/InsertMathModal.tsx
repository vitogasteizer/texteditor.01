
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
      className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">Insert Math Formula</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>
        
        <div className="p-6 space-y-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 ml-1">LaTeX Equation</label>
                <textarea
                    value={latex}
                    onChange={e => setLatex(e.target.value)}
                    placeholder="e.g. E = mc^2"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 font-mono text-sm transition-all"
                    rows={3}
                />
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[80px] flex items-center justify-center">
                <div ref={previewRef} className="text-xl text-gray-800 dark:text-gray-200"></div>
            </div>
        </div>

        <footer className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
            <button 
                onClick={onClose} 
                className="px-6 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
            >
                Cancel
            </button>
            <button 
                onClick={() => onInsert(latex)} 
                className="px-8 py-2.5 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95"
            >
                {initialLatex ? 'Update' : 'Insert'}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default InsertMathModal;
