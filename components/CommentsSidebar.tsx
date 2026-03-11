

import React from 'react';
import type { Comment } from '../App';
import { CloseIcon, MessageSquareIcon } from './icons/EditorIcons';

interface CommentsSidebarProps {
  comments: Comment[];
  onResolve: (commentId: string) => void;
  onClose: () => void;
  onAddComment: () => void;
  t: (key: string) => string;
}

const CommentCard: React.FC<{ comment: Comment; onResolve: (id: string) => void; t: (key: string) => string; }> = ({ comment, onResolve, t }) => {
  const formattedDate = new Date(comment.createdAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="group bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed">{comment.text}</p>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{formattedDate}</span>
        </div>
        <button 
            onClick={() => onResolve(comment.id)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
            {t('comments.resolve')}
        </button>
      </div>
    </div>
  );
};

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ comments, onResolve, onClose, onAddComment, t }) => {
  return (
    <aside className="w-full md:w-80 bg-gray-50 dark:bg-gray-900 md:border-l border-gray-200 dark:border-gray-800 flex flex-col h-full animate-in slide-in-from-right duration-300">
      <header className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('comments.title')}</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400" aria-label={t('comments.close')}>
          <CloseIcon className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-grow p-5 overflow-y-auto custom-scrollbar">
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <CommentCard key={comment.id} comment={comment} onResolve={onResolve} t={t} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 flex flex-col items-center opacity-40">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquareIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('comments.noComments')}</p>
          </div>
        )}
      </div>
      <footer className="p-5 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
          <button
            onClick={onAddComment}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <MessageSquareIcon className="w-5 h-5" />
            {t('comments.addComment')}
          </button>
      </footer>
    </aside>
  );
};

export default CommentsSidebar;