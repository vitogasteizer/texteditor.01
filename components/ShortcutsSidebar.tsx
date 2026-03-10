import React from 'react';
import { CloseIcon } from './icons/EditorIcons';

interface ShortcutsSidebarProps {
  onClose: () => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const ShortcutsSidebar: React.FC<ShortcutsSidebarProps> = ({ onClose, t }) => {
  const shortcuts = t('modals.about.shortcuts');

  return (
    <aside className="w-full md:w-80 bg-gray-100 dark:bg-gray-800 md:border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('modals.about.shortcutsTitle')}</h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t('settings.close')}>
          <CloseIcon />
        </button>
      </header>
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {Object.values(shortcuts).map((shortcut: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-1">
              <span>{shortcut.split(': ')[0]}</span>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 p-1 px-2 rounded-md text-xs">{shortcut.split(': ')[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default ShortcutsSidebar;