
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Choose a Template</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <div className="flex-grow overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <button 
                    onClick={() => onSelect('<p><br></p>')}
                    className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                >
                    <div className="w-full aspect-[3/4] bg-white dark:bg-gray-700 shadow-sm mb-4 flex items-center justify-center">
                        <span className="text-gray-400 group-hover:text-blue-500 text-4xl">+</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Blank Document</span>
                </button>

                {templates.map(template => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template.content, template)}
                        className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg hover:border-blue-500 transition-all bg-white dark:bg-gray-800"
                    >
                        <div className="w-full aspect-[3/4] bg-gray-50 dark:bg-gray-900 shadow-sm mb-4 p-4 overflow-hidden relative">
                            <div className="absolute inset-0 p-4 transform scale-[0.3] origin-top-left w-[333%] h-[333%]" dangerouslySetInnerHTML={{__html: template.content}} />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-200">{template.name}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
