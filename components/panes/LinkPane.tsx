
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
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/20 dark:border-white/5 space-y-6 shadow-xl">
                <div className="space-y-2">
                    <label htmlFor="link-text" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.link.textToDisplay')}</label>
                    <input
                        type="text"
                        id="link-text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="link-url" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.link.url')}</label>
                    <div className="relative group">
                        <input
                            type="text"
                            id="link-url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center px-2">
                 <button
                    onClick={handleApply}
                    type="button"
                    className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-xl shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                 >
                    {isEditing ? t('panes.link.update') : t('panes.link.apply')}
                </button>
                {isEditing && (
                     <button
                        onClick={handleRemoveLink}
                        type="button"
                        title={t('panes.link.removeLink')}
                        className="p-3.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-600/10 rounded-xl transition-all active:scale-90 border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-md"
                    >
                        <LinkOffIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default LinkPane;