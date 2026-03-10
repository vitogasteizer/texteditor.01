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
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ editorRef, content }) => {
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
    <div className="hidden lg:block w-64 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider">
        <List className="w-4 h-4" />
        <span>სარჩევი</span>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              item.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`block w-full text-left text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors`}
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
