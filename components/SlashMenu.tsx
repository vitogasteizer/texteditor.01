import React, { useEffect, useRef, useState } from 'react';
import { ImageIcon, TableIcon, BotIcon, TypeIcon, ListOrderedIcon, ListUnorderedIcon } from './icons/EditorIcons';

interface SlashMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (command: string) => void;
  t: (key: string) => string;
}

const SlashMenu: React.FC<SlashMenuProps> = ({ x, y, onClose, onSelect, t }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newTop = y + 20; // below cursor
      let newLeft = x;

      if (newTop + rect.height > window.innerHeight) {
        newTop = y - rect.height - 10;
      }
      if (newLeft + rect.width > window.innerWidth) {
        newLeft = window.innerWidth - rect.width - 10;
      }
      setPosition({ top: newTop, left: newLeft });
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [x, y, onClose]);

  const items = [
    { id: 'h1', label: 'Heading 1', icon: <TypeIcon className="w-4 h-4" /> },
    { id: 'h2', label: 'Heading 2', icon: <TypeIcon className="w-4 h-4" /> },
    { id: 'ul', label: 'Bulleted List', icon: <ListUnorderedIcon className="w-4 h-4" /> },
    { id: 'ol', label: 'Numbered List', icon: <ListOrderedIcon className="w-4 h-4" /> },
    { id: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'table', label: 'Table', icon: <TableIcon className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Assistant', icon: <BotIcon className="w-4 h-4 text-blue-500" /> },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/5 py-3 w-64 transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-5 py-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
        Basic Blocks
      </div>
      <div className="space-y-1 px-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              onClose();
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-blue-600 hover:text-white flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-all rounded-xl font-black text-[10px] uppercase tracking-[0.15em] group"
          >
            <span className="opacity-50 group-hover:opacity-100 transition-opacity">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SlashMenu;
