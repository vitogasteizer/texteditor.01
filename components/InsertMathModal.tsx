
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
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-black mb-6 text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">Insert Math Formula</h3>
        
        <div className="mb-6">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-[0.15em]">LaTeX Equation</label>
            <textarea
                value={latex}
                onChange={e => setLatex(e.target.value)}
                placeholder="e.g. E = mc^2"
                className="w-full px-4 py-3 bg-white/20 dark:bg-gray-900/40 border border-white/20 dark:border-white/5 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 font-mono text-sm transition-all"
                rows={3}
            />
        </div>

        <div className="mb-8 p-6 bg-white/20 dark:bg-gray-900/40 rounded-2xl border border-white/20 dark:border-white/5 min-h-[100px] flex items-center justify-center shadow-inner">
            <div ref={previewRef} className="text-xl text-gray-800 dark:text-gray-200"></div>
        </div>

        <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-gray-700 dark:text-gray-200 bg-white/20 dark:bg-white/5 rounded-2xl hover:bg-white/30 dark:hover:bg-white/10 transition-all active:scale-95 uppercase tracking-[0.2em]">
                Cancel
            </button>
            <button onClick={() => onInsert(latex)} className="px-8 py-3 text-[10px] font-black text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-[0.2em]">
                {initialLatex ? 'Update' : 'Insert'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default InsertMathModal;
