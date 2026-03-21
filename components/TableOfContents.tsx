import React, { useEffect, useState } from 'react';
import { List } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface TableOfContentsProps {
  editorRef: React.RefObject<HTMLDivElement>;
  content: string; // Used to trigger re-renders
  t: (key: string) => string;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ editorRef, content, t }) => {
  const [items, setItems] = useState<TOCItem[]>([]);

  useEffect(() => {
    if (!editorRef.current) return;
    
    const timeout = setTimeout(() => {
      const headings = editorRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (!headings) return;

      const newItems: TOCItem[] = Array.from(headings).map((el, index) => {
        const heading = el as HTMLElement;
        // Ensure heading has an ID for scrolling
        if (!heading.id) {
          heading.id = `heading-${index}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return {
          id: heading.id,
          text: heading.textContent || '',
          level: parseInt(heading.tagName.replace('H', ''), 10),
          element: heading,
        };
      });
      setItems(newItems);
    }, 500); // Debounce

    return () => clearTimeout(timeout);
  }, [content, editorRef]);

  if (items.length === 0) return null;

  return (
    <div className="hidden lg:block w-64 flex-shrink-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-r border-white/20 dark:border-white/5 overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center gap-3 mb-6 text-gray-900 dark:text-gray-100 font-black text-[11px] uppercase tracking-[0.2em]">
        <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
        <List className="w-4 h-4 opacity-50" />
        <span>{t('toc.title')}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              item.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`block w-full text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-all hover:translate-x-1`}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
            title={item.text}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableOfContents;
