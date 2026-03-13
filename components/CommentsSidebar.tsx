

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
    <div className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-5 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed">{comment.text}</p>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">{formattedDate}</span>
        </div>
        <button 
            onClick={() => onResolve(comment.id)}
            className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all px-3 py-1.5 rounded-xl hover:bg-blue-500/10 active:scale-90"
        >
            {t('comments.resolve')}
        </button>
      </div>
    </div>
  );
};

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ comments, onResolve, onClose, onAddComment, t }) => {
  return (
    <aside className="w-full md:w-80 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl md:border-l border-white/20 dark:border-white/5 flex flex-col h-full animate-in slide-in-from-right duration-500 ease-out">
      <header className="p-6 border-b border-white/20 dark:border-white/5 flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)] animate-pulse"></div>
          <h2 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{t('comments.title')}</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200/50 dark:hover:bg-white/10 transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90" aria-label={t('comments.close')}>
          <CloseIcon className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
        {comments.length > 0 ? (
          <div className="space-y-5">
            {comments.map(comment => (
              <CommentCard key={comment.id} comment={comment} onResolve={onResolve} t={t} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 flex flex-col items-center opacity-30">
            <div className="w-20 h-20 bg-gray-200/50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <MessageSquareIcon className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('comments.noComments')}</p>
          </div>
        )}
      </div>
      <footer className="p-6 border-t border-white/20 dark:border-white/5 flex-shrink-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
          <button
            onClick={onAddComment}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
          >
            <MessageSquareIcon className="w-5 h-5" />
            {t('comments.addComment')}
          </button>
      </footer>
    </aside>
  );
};

export default CommentsSidebar;