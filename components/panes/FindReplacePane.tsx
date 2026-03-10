
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
        <div className="space-y-4">
            <div>
                <label htmlFor="find" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('panes.findReplace.find')}</label>
                <input
                    type="text"
                    id="find"
                    value={findText}
                    onChange={e => setFindText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            <div>
                <label htmlFor="replace" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('panes.findReplace.replaceWith')}</label>
                <input
                    type="text"
                    id="replace"
                    value={replaceText}
                    onChange={e => setReplaceText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center">
                    <input
                        id="match-case"
                        type="checkbox"
                        checked={matchCase}
                        onChange={e => setMatchCase(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 bg-gray-100 dark:bg-gray-600"
                    />
                    <label htmlFor="match-case" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('panes.findReplace.matchCase')}</label>
                </div>
                <div className="flex items-center">
                    <input
                        id="whole-word"
                        type="checkbox"
                        checked={wholeWord}
                        onChange={e => setWholeWord(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 bg-gray-100 dark:bg-gray-600"
                    />
                    <label htmlFor="whole-word" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('panes.findReplace.wholeWord')}</label>
                </div>
            </div>
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleReplace}
                    disabled={!findText}
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {t('panes.findReplace.replaceAll')}
                </button>
            </div>
        </div>
    );
};

export default FindReplacePane;