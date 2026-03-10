
import React, { useState, useEffect } from 'react';
import { LinkOffIcon } from '../icons/EditorIcons';

interface LinkPaneProps {
  onApplyLink: (data: { url: string; text: string }, elementToUpdate: HTMLAnchorElement | null) => void;
  onClose: () => void;
  editingElement: HTMLAnchorElement | null;
  t: (key: string) => string;
}

const LinkPane: React.FC<LinkPaneProps> = ({ onApplyLink, onClose, editingElement, t }) => {
    const [url, setUrl] = useState('');
    const [text, setText] = useState('');
    
    const isEditing = !!editingElement;

    useEffect(() => {
        if (editingElement) {
            setUrl(editingElement.href);
            setText(editingElement.innerText);
        } else {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            setText(selectedText);
            setUrl('https://');
        }
    }, [editingElement]);

    const handleApply = () => {
        if (!url.trim() || !text.trim()) return;
        onApplyLink({ url, text }, editingElement);
    };
    
    const handleRemoveLink = () => {
        if (editingElement) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(editingElement);
            selection?.addRange(range);
            document.execCommand('unlink', false);
            selection?.collapseToEnd();
            onClose();
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="link-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('panes.link.textToDisplay')}</label>
                <input
                    type="text"
                    id="link-text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            <div>
                <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('panes.link.url')}</label>
                <input
                    type="text"
                    id="link-url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            <div className="flex justify-between items-center pt-2">
                 <button
                    onClick={handleApply}
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                 >
                    {isEditing ? t('panes.link.update') : t('panes.link.apply')}
                </button>
                {isEditing && (
                     <button
                        onClick={handleRemoveLink}
                        type="button"
                        title={t('panes.link.removeLink')}
                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                    >
                        <LinkOffIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

export default LinkPane;