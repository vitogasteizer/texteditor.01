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
      className="fixed z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 w-56 text-sm transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        Basic Blocks
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            onSelect(item.id);
            onClose();
          }}
          className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition-colors"
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SlashMenu;
