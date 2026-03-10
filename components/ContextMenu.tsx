
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
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 w-64 text-sm transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
      style={{ top: position.top, left: position.left }}
    >
      {hasSelection && (
        <>
            <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {t('menu.edit')}
            </div>
            <button
                onClick={() => handleClick(() => onAction('copy'))}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
            >
                <CopyIcon className="w-4 h-4 text-gray-500" /> {t('menu.editCopy')}
            </button>
             <button
                onClick={() => handleClick(() => onAction('cut'))}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
            >
                <ScissorsIcon className="w-4 h-4 text-gray-500" /> {t('menu.editCut')}
            </button>
        </>
      )}
      
      <button
        onClick={() => handleClick(() => onAction('paste'))}
        className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
      >
        <ClipboardIcon className="w-4 h-4 text-gray-500" /> {t('menu.editPaste')}
      </button>
      <button
        onClick={() => handleClick(() => onAction('paste-plain'))}
        className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
      >
        <ClipboardIcon className="w-4 h-4 text-gray-500" /> {t('menu.editPastePlain') || 'Paste without formatting'}
      </button>

      {hasSelection && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
            <div className="px-4 py-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" /> AI Actions
            </div>
            <button
                onClick={() => handleClick(() => onAiAction('fix-grammar'))}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
            >
                <PenLineIcon className="w-4 h-4 text-blue-500" /> {t('floatingToolbar.fixGrammar')}
            </button>
            <button
                onClick={() => handleClick(() => onAiAction('summarize'))}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
            >
                <BookTextIcon className="w-4 h-4 text-blue-500" /> {t('floatingToolbar.summarize')}
            </button>
             <button
                onClick={() => handleClick(() => onAiAction('continue-writing'))}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
            >
                <Wand2Icon className="w-4 h-4 text-blue-500" /> {t('floatingToolbar.continueWriting')}
            </button>
          </>
      )}
    </div>
  );
};

export default ContextMenu;
