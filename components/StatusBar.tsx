
import React from 'react';
import type { WordCountStats } from '../App';
import { ZoomInIcon, ZoomOutIcon } from './icons/EditorIcons';

interface StatusBarProps {
  stats: WordCountStats;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  t: (key: string) => string;
}

const StatusBar: React.FC<StatusBarProps> = ({ stats, zoomLevel, onZoomIn, onZoomOut, t }) => {
  return (
    <footer className="hidden md:flex h-10 px-6 bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl border-t border-white/20 dark:border-white/5 items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 flex-shrink-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
          <span className="opacity-50">{t('statusbar.words')}:</span>
          <span className="text-gray-900 dark:text-gray-100">{stats.words}</span>
        </div>
        <div className="h-3 w-px bg-white/20 dark:bg-white/5"></div>
        <div className="flex items-center gap-2">
          <span className="opacity-50">{t('statusbar.characters')}:</span>
          <span className="text-gray-900 dark:text-gray-100">{stats.characters}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 bg-white/20 dark:bg-gray-900/40 px-3 py-1.5 rounded-2xl border border-white/20 dark:border-white/5 backdrop-blur-md shadow-sm">
        <button 
          onClick={onZoomOut} 
          className="p-1.5 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 hover:shadow-sm transition-all active:scale-90 text-gray-400 hover:text-blue-600 group" 
          aria-label="Zoom out"
        >
            <ZoomOutIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </button>
        <span className="w-12 text-center text-gray-900 dark:text-gray-100 font-black tracking-tighter">{zoomLevel}%</span>
        <button 
          onClick={onZoomIn} 
          className="p-1.5 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 hover:shadow-sm transition-all active:scale-90 text-gray-400 hover:text-blue-600 group" 
          aria-label="Zoom in"
        >
            <ZoomInIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </footer>
  );
};

export default StatusBar;