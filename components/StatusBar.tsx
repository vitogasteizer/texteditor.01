
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
    <footer className="h-8 px-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <span>{t('statusbar.words')}: {stats.words}</span>
        <span>{t('statusbar.characters')}: {stats.characters}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onZoomOut} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Zoom out">
            <ZoomOutIcon className="w-4 h-4" />
        </button>
        <span className="w-12 text-center">{zoomLevel}%</span>
        <button onClick={onZoomIn} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Zoom in">
            <ZoomInIcon className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};

export default StatusBar;