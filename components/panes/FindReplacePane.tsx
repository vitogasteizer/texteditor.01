
import React, { useState } from 'react';

interface FindReplacePaneProps {
  onReplaceAll: (find: string, replace: string, options: { matchCase: boolean, wholeWord: boolean }) => void;
  t: (key: string) => string;
}

const FindReplacePane: React.FC<FindReplacePaneProps> = ({ onReplaceAll, t }) => {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);

    const handleReplace = () => {
        if (findText) {
            onReplaceAll(findText, replaceText, { matchCase, wholeWord });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-2">
                    <label htmlFor="find" className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 ml-1">{t('panes.findReplace.find')}</label>
                    <input
                        type="text"
                        id="find"
                        value={findText}
                        onChange={e => setFindText(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="replace" className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 ml-1">{t('panes.findReplace.replaceWith')}</label>
                    <input
                        type="text"
                        id="replace"
                        value={replaceText}
                        onChange={e => setReplaceText(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                    />
                </div>
            </div>
            <div className="flex items-center gap-6 pt-2 px-2">
                <div className="flex items-center group cursor-pointer">
                    <input
                        id="match-case"
                        type="checkbox"
                        checked={matchCase}
                        onChange={e => setMatchCase(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-200 dark:border-gray-700 rounded focus:ring-blue-500/20 bg-white dark:bg-gray-800 transition-all cursor-pointer"
                    />
                    <label htmlFor="match-case" className="ml-2 block text-[10px] font-medium text-gray-500 dark:text-gray-400 cursor-pointer group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{t('panes.findReplace.matchCase')}</label>
                </div>
                <div className="flex items-center group cursor-pointer">
                    <input
                        id="whole-word"
                        type="checkbox"
                        checked={wholeWord}
                        onChange={e => setWholeWord(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-200 dark:border-gray-700 rounded focus:ring-blue-500/20 bg-white dark:bg-gray-800 transition-all cursor-pointer"
                    />
                    <label htmlFor="whole-word" className="ml-2 block text-[10px] font-medium text-gray-500 dark:text-gray-400 cursor-pointer group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{t('panes.findReplace.wholeWord')}</label>
                </div>
            </div>
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleReplace}
                    disabled={!findText}
                    type="button"
                    className="px-10 py-4 text-[10px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                    {t('panes.findReplace.replaceAll')}
                </button>
            </div>
        </div>
    );
};

export default FindReplacePane;