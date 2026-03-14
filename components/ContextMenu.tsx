
import React, { useEffect, useRef, useState } from 'react';
import { CopyIcon, ClipboardIcon, SparklesIcon, PenLineIcon, BookTextIcon, Wand2Icon, ScissorsIcon } from './icons/EditorIcons';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (command: string, arg?: string) => void;
  onAiAction: (action: string) => void;
  hasSelection: boolean;
  t: (key: string) => string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAction, onAiAction, hasSelection, t }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useEffect(() => {
    // Adjust position to prevent overflow
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newTop = y;
      let newLeft = x;

      if (y + rect.height > window.innerHeight) {
        newTop = y - rect.height;
      }
      if (x + rect.width > window.innerWidth) {
        newLeft = x - rect.width;
      }
      setPosition({ top: newTop, left: newLeft });
    }
    
    const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            onClose();
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', onClose, true);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', onClose, true);
    };
  }, [x, y, onClose]);

  const handleClick = (action: () => void) => {
      action();
      onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 py-1 w-64 transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
      style={{ top: position.top, left: position.left }}
    >
      {hasSelection && (
        <>
            <div className="px-4 py-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                {t('menu.edit')}
            </div>
            <div className="px-1 space-y-0.5">
                <button
                    onClick={() => handleClick(() => onAction('copy'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
                >
                    <CopyIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" /> {t('menu.editCopy')}
                </button>
                <button
                    onClick={() => handleClick(() => onAction('cut'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
                >
                    <ScissorsIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" /> {t('menu.editCut')}
                </button>
            </div>
        </>
      )}
      
      <div className="px-1 space-y-0.5 mt-0.5">
        <button
            onClick={() => handleClick(() => onAction('paste'))}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
        >
            <ClipboardIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" /> {t('menu.editPaste')}
        </button>
        <button
            onClick={() => handleClick(() => onAction('paste-plain'))}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
        >
            <ClipboardIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" /> {t('menu.editPastePlain') || 'Paste without formatting'}
        </button>
      </div>

      {hasSelection && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1 mx-1"></div>
            <div className="px-4 py-1.5 text-[11px] font-medium text-blue-500 flex items-center gap-2">
                <SparklesIcon className="w-3.5 h-3.5" /> AI Actions
            </div>
            <div className="px-1 space-y-0.5">
                <button
                    onClick={() => handleClick(() => onAiAction('fix-grammar'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
                >
                    <PenLineIcon className="w-4 h-4 text-blue-500 group-hover:text-white transition-colors" /> {t('floatingToolbar.fixGrammar')}
                </button>
                <button
                    onClick={() => handleClick(() => onAiAction('summarize'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
                >
                    <BookTextIcon className="w-4 h-4 text-blue-500 group-hover:text-white transition-colors" /> {t('floatingToolbar.summarize')}
                </button>
                <button
                    onClick={() => handleClick(() => onAiAction('continue-writing'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all rounded-lg font-medium text-xs group"
                >
                    <Wand2Icon className="w-4 h-4 text-blue-500 group-hover:text-white transition-colors" /> {t('floatingToolbar.continueWriting')}
                </button>
            </div>
          </>
      )}
    </div>
  );
};

export default ContextMenu;
