import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BoldIcon, ItalicIcon, UnderlineIcon, LinkIcon, MessageSquareIcon, SparklesIcon, ChevronRightIcon, BookTextIcon, PenLineIcon, Wand2Icon, LanguagesIcon, SmileIcon } from './icons/EditorIcons';

const iconProps = {
    className: "w-5 h-5",
    strokeWidth: "2",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
};

interface FloatingToolbarProps {
  top: number;
  left: number;
  onAddComment: () => void;
  onCommand: (command: string) => void;
  onInsertLink: () => void;
  onAiAction: (action: string, option?: string) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ top, left, onAddComment, onCommand, onInsertLink, onAiAction, t }) => {
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent the editor from losing focus when clicking the toolbar
    e.preventDefault();
  };
  
  const ToolbarButton: React.FC<{ onClick?: () => void; title: string; children: React.ReactNode; buttonRef?: React.RefObject<HTMLButtonElement> }> = ({ onClick, title, children, buttonRef }) => (
      <button
          ref={buttonRef}
          onClick={onClick}
          className="p-2 rounded-md hover:bg-gray-700"
          title={title}
      >
        {children}
      </button>
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node) &&
        aiButtonRef.current && !aiButtonRef.current.contains(event.target as Node)
      ) {
        setIsAiMenuOpen(false);
        setOpenSubmenu(null);
      }
    };
    if (isAiMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAiMenuOpen]);

  const AiMenu = () => {
    const menuItems = [
      { key: 'summarize', label: t('floatingToolbar.summarize'), icon: <BookTextIcon className="w-5 h-5 text-white" />, action: () => onAiAction('summarize') },
      { key: 'fix-grammar', label: t('floatingToolbar.fixGrammar'), icon: <PenLineIcon className="w-5 h-5 text-white" />, action: () => onAiAction('fix-grammar') },
      { key: 'continue-writing', label: t('floatingToolbar.continueWriting'), icon: <Wand2Icon className="w-5 h-5 text-white" />, action: () => onAiAction('continue-writing') },
      { key: 'translate', label: t('floatingToolbar.translate'), icon: <LanguagesIcon className="w-5 h-5 text-white" />, subItems: [
        { key: 'en', label: t('menu.langEnglish'), action: () => onAiAction('translate', 'English') },
        { key: 'es', label: t('menu.langSpanish'), action: () => onAiAction('translate', 'Spanish') },
        { key: 'ka', label: t('menu.langGeorgian'), action: () => onAiAction('translate', 'Georgian') },
      ] },
      { key: 'change-tone', label: t('floatingToolbar.changeTone'), icon: <SmileIcon className="w-5 h-5 text-white" />, subItems: [
        { key: 'formal', label: t('floatingToolbar.formal'), action: () => onAiAction('change-tone', 'Formal') },
        { key: 'casual', label: t('floatingToolbar.casual'), action: () => onAiAction('change-tone', 'Casual') },
        { key: 'professional', label: t('floatingToolbar.professional'), action: () => onAiAction('change-tone', 'Professional') },
      ] },
    ];

    const handleAction = (action: () => void) => {
      action();
      setIsAiMenuOpen(false);
      setOpenSubmenu(null);
    };

    return createPortal(
      <div 
        ref={aiMenuRef}
        className="absolute w-56 bg-gray-900 text-white rounded-md shadow-lg py-1 z-30"
        style={{
          top: `${top + 40}px`,
          left: `${left}px`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={e => e.preventDefault()}
      >
        {menuItems.map(item => (
          <div key={item.key} className="relative" onMouseEnter={() => setOpenSubmenu(item.subItems ? item.key : null)} onMouseLeave={() => setOpenSubmenu(null)}>
            <button 
              onClick={() => item.action && handleAction(item.action)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.subItems && <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
            </button>
            {item.subItems && openSubmenu === item.key && (
              <div className="absolute left-full -top-1 ml-1 w-40 bg-gray-900 rounded-md shadow-lg py-1">
                {item.subItems.map(subItem => (
                  <button 
                    key={subItem.key} 
                    onClick={() => handleAction(subItem.action)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 flex items-center gap-2"
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>,
      document.body
    );
  };


  return (
    <>
      <div
        className="fixed z-20 bg-gray-900 text-white rounded-md shadow-lg p-1 flex items-center gap-1"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={handleMouseDown}
      >
        <ToolbarButton onClick={() => onCommand('bold')} title={t('floatingToolbar.bold')}>
          <BoldIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <ToolbarButton onClick={() => onCommand('italic')} title={t('floatingToolbar.italic')}>
          <ItalicIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <ToolbarButton onClick={() => onCommand('underline')} title={t('floatingToolbar.underline')}>
          <UnderlineIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1"></div>
        <ToolbarButton onClick={onInsertLink} title={t('floatingToolbar.insertLink')}>
          <LinkIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <ToolbarButton onClick={onAddComment} title={t('floatingToolbar.addComment')}>
          <MessageSquareIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-600 mx-1"></div>
        <ToolbarButton
          buttonRef={aiButtonRef}
          onClick={() => setIsAiMenuOpen(prev => !prev)} 
          title={t('floatingToolbar.aiAssist')}
        >
          <SparklesIcon className="w-5 h-5 text-yellow-300" />
        </ToolbarButton>
      </div>
      {isAiMenuOpen && <AiMenu />}
    </>
  );
};

export default FloatingToolbar;