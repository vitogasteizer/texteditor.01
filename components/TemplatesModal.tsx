
import React from 'react';
import { templates, Template } from '../lib/templates';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string, templateObj?: Template) => void;
  t: (key: string) => string;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose, onSelect, t }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-[100] p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-title"
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <h3 id="templates-title" className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">Choose a Template</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <button 
                    onClick={() => onSelect('<p><br></p>')}
                    className="flex flex-col items-center p-4 bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
                >
                    <div className="w-full aspect-[3/4] bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-300 group-hover:text-blue-500 text-3xl font-light transition-colors">+</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Blank Document</span>
                </button>

                {templates.map(template => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template.content, template)}
                        className="flex flex-col items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
                    >
                        <div className="w-full aspect-[3/4] bg-white dark:bg-gray-900 rounded-lg mb-4 p-3 overflow-hidden relative border border-gray-100 dark:border-gray-800">
                            <div className="absolute inset-0 p-3 transform scale-[0.3] origin-top-left w-[333%] h-[333%]" dangerouslySetInnerHTML={{__html: template.content}} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{template.name}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
