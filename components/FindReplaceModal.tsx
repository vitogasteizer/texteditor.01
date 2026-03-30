
import React, { useState } from 'react';
import { CloseIcon, SearchIcon, ReplaceIcon } from './icons/EditorIcons';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (text: string, matchCase: boolean, wholeWord: boolean) => void;
  onReplace: (findText: string, replaceText: string, matchCase: boolean, wholeWord: boolean, replaceAll: boolean) => void;
  t: (key: string) => string;
}

const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ isOpen, onClose, onFind, onReplace, t }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  if (!isOpen) return null;

  const handleFind = (e: React.FormEvent) => {
    e.preventDefault();
    onFind(findText, matchCase, wholeWord);
  };

  const handleReplace = (replaceAll: boolean) => {
    onReplace(findText, replaceText, matchCase, wholeWord, replaceAll);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <SearchIcon size={20} />
            <h2 className="text-lg font-bold tracking-tight">{t('menu.editFindReplace')}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleFind} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                {t('findReplace.find')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder={t('findReplace.findPlaceholder')}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                {t('findReplace.replace')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder={t('findReplace.replacePlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 checked:bg-blue-600 checked:border-blue-600 transition-all"
                />
                <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                {t('findReplace.matchCase')}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 checked:bg-blue-600 checked:border-blue-600 transition-all"
                />
                <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                {t('findReplace.wholeWord')}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all active:scale-95"
            >
              <SearchIcon size={18} />
              {t('findReplace.findNext')}
            </button>
            <button
              type="button"
              onClick={() => handleReplace(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <ReplaceIcon size={18} />
              {t('findReplace.replace')}
            </button>
            <button
              type="button"
              onClick={() => handleReplace(true)}
              className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl transition-all active:scale-95"
            >
              <ReplaceIcon size={18} />
              {t('findReplace.replaceAll')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FindReplaceModal;
