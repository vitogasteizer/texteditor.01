

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
    <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
      <p className="text-sm text-gray-800 dark:text-gray-100 mb-2">{comment.text}</p>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formattedDate}</span>
        <button 
            onClick={() => onResolve(comment.id)}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
            {t('comments.resolve')}
        </button>
      </div>
    </div>
  );
};

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ comments, onResolve, onClose, onAddComment, t }) => {
  return (
    <aside className="w-full md:w-80 bg-gray-100 dark:bg-gray-800 md:border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('comments.title')}</h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t('comments.close')}>
          <CloseIcon />
        </button>
      </header>
      <div className="flex-grow p-4 overflow-y-auto">
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <CommentCard key={comment.id} comment={comment} onResolve={onResolve} t={t} />
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-10 flex flex-col items-center">
            <MessageSquareIcon />
            <p className="mt-2">{t('comments.noComments')}</p>
          </div>
        )}
      </div>
      <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onAddComment}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <MessageSquareIcon className="w-5 h-5" />
            {t('comments.addComment')}
          </button>
      </footer>
    </aside>
  );
};

export default CommentsSidebar;