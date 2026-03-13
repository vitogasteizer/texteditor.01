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
          className="p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-90 group"
          title={title}
      >
        <div className="group-hover:scale-110 transition-transform duration-200">
          {children}
        </div>
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
        className="fixed w-64 bg-gray-900/90 dark:bg-black/90 backdrop-blur-xl text-white rounded-2xl shadow-2xl py-3 z-[100] border border-white/10 animate-in fade-in zoom-in-95 duration-200"
        style={{
          top: `${top + 55}px`,
          left: `${left}px`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={e => e.preventDefault()}
      >
        <div className="px-5 py-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <SparklesIcon className="w-3.5 h-3.5 text-yellow-400" /> AI Assistant
        </div>
        <div className="px-2 space-y-1">
          {menuItems.map(item => (
            <div key={item.key} className="relative" onMouseEnter={() => setOpenSubmenu(item.subItems ? item.key : null)} onMouseLeave={() => setOpenSubmenu(null)}>
              <button 
                onClick={() => item.action && handleAction(item.action)}
                className={`w-full text-left px-4 py-2.5 text-[10px] font-black rounded-xl flex items-center justify-between transition-all uppercase tracking-[0.15em] ${
                  openSubmenu === item.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="opacity-70">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.subItems && <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${openSubmenu === item.key ? 'translate-x-0.5' : 'opacity-50'}`} />}
              </button>
              {item.subItems && openSubmenu === item.key && (
                <div className="absolute left-full -top-1 ml-2 w-48 bg-gray-900/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl py-3 border border-white/10 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="px-2 space-y-1">
                    {item.subItems.map(subItem => (
                      <button 
                          key={subItem.key}
                          onClick={() => handleAction(subItem.action)}
                          className="w-full text-left px-4 py-2.5 text-[10px] font-black hover:bg-blue-600 hover:text-white rounded-xl transition-all uppercase tracking-[0.15em]"
                      >
                          {subItem.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>,
      document.body
    );
  };


  return (
    <>
      <div
        className="fixed z-20 bg-gray-900/90 dark:bg-black/90 backdrop-blur-xl text-white rounded-2xl shadow-2xl p-2 flex items-center gap-1 border border-white/10 animate-in fade-in zoom-in-95 duration-300"
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
        <div className="w-px h-6 bg-white/10 mx-1.5"></div>
        <ToolbarButton onClick={onInsertLink} title={t('floatingToolbar.insertLink')}>
          <LinkIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <ToolbarButton onClick={onAddComment} title={t('floatingToolbar.addComment')}>
          <MessageSquareIcon className="w-5 h-5 text-white" />
        </ToolbarButton>
        <div className="w-px h-6 bg-white/10 mx-1.5"></div>
        <ToolbarButton
          buttonRef={aiButtonRef}
          onClick={() => setIsAiMenuOpen(prev => !prev)} 
          title={t('floatingToolbar.aiAssist')}
        >
          <SparklesIcon className={`w-5 h-5 transition-all duration-300 ${isAiMenuOpen ? 'text-yellow-400 scale-110' : 'text-yellow-300'}`} />
        </ToolbarButton>
      </div>
      {isAiMenuOpen && <AiMenu />}
    </>
  );
};

export default FloatingToolbar;