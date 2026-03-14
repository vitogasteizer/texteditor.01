
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
    <footer className="hidden md:flex h-9 px-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 items-center justify-between text-[11px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="opacity-60">{t('statusbar.words')}:</span>
          <span className="text-gray-700 dark:text-gray-300">{stats.words}</span>
        </div>
        <div className="h-3 w-px bg-gray-100 dark:bg-gray-800"></div>
        <div className="flex items-center gap-2">
          <span className="opacity-60">{t('statusbar.characters')}:</span>
          <span className="text-gray-700 dark:text-gray-300">{stats.characters}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onZoomOut} 
          className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-90 text-gray-400 hover:text-blue-600 group" 
          aria-label="Zoom out"
        >
            <ZoomOutIcon className="w-3.5 h-3.5" />
        </button>
        <span className="w-10 text-center text-gray-700 dark:text-gray-300 font-semibold">{zoomLevel}%</span>
        <button 
          onClick={onZoomIn} 
          className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-90 text-gray-400 hover:text-blue-600 group" 
          aria-label="Zoom in"
        >
            <ZoomInIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};

export default StatusBar;