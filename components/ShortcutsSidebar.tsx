import React from 'react';
import { CloseIcon } from './icons/EditorIcons';

interface ShortcutsSidebarProps {
  onClose: () => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const ShortcutsSidebar: React.FC<ShortcutsSidebarProps> = ({ onClose, t }) => {
  const shortcuts = t('modals.about.shortcuts');

  return (
    <aside className="w-full md:w-80 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl md:border-l border-white/20 dark:border-white/5 flex flex-col h-full animate-in slide-in-from-right duration-500 ease-out">
      <header className="p-6 border-b border-white/20 dark:border-white/5 flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)] animate-pulse"></div>
          <h2 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{t('modals.about.shortcutsTitle')}</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200/50 dark:hover:bg-white/10 transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90" aria-label={t('settings.close')}>
          <CloseIcon className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          {Object.values(shortcuts).map((shortcut: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{shortcut.split(': ')[0]}</span>
              <span className="font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1.5 px-2.5 rounded-xl text-[10px] font-bold shadow-sm text-blue-600 dark:text-blue-400">{shortcut.split(': ')[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default ShortcutsSidebar;