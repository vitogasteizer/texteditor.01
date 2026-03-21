
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '../store/uiStore';
import { MenuIcon, CloseIcon, FilePlusIcon, SaveIcon, FolderIcon, DownloadIcon, PrinterIcon, UndoIcon, RedoIcon, ScissorsIcon, CopyIcon, ClipboardIcon, SelectAllIcon, SearchIcon, LinkIcon, ImageIcon, TableIcon, MinusIcon, MessageSquareIcon, CodeIcon, BarChartIcon, EyeIcon, MaximizeIcon, InfoIcon, OmegaIcon, PaintBrushIcon, PdfIcon, SquareIcon, CircleIcon, TriangleIcon, TypeIcon, ChevronRightIcon, FileTextIcon, SplitSquareVerticalIcon, RectangleVerticalIcon, RectangleHorizontalIcon, LanguageIcon, SparklesIcon, Volume2Icon, KeyboardIcon, ChecklistIcon, UploadCloudIcon, PencilIcon, SlashIcon, MathIcon, SunIcon, MoonIcon } from './icons/EditorIcons';
import type { ShapeType } from '../App';
import type { Language } from '../lib/translations';

type MenuItem =
  | {
      label: string;
      action?: () => void;
      icon?: React.ReactNode;
      shortcut?: string;
      separator?: false;
      items?: MenuItem[];
    }
  | {
      label?: string;
      action?: () => void;
      icon?: React.ReactNode;
      shortcut?: string;
      separator: true;
      items?: never;
    };

interface MenuBarProps {
  onNewDocument: () => void;
  onNewFromTemplate: () => void;
  onSave: () => void;
  onViewSaved: () => void;
  onExportToWord: () => void;
  onExportToPdf: () => void;
  onPrint: () => void;
  onEditAction: (command: string) => void;
  onOpenFindReplace: () => void;
  onCopyFormatting: () => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onCalculateFormulas: () => void;
  onInsertShape: (shapeType: ShapeType) => void;
  onInsertHorizontalRule: () => void;
  onInsertPageBreak: () => void;
  onInsertDrawing: () => void;
  onInsertMath: () => void;
  onAddComment: () => void;
  onOpenSourceCode: () => void;
  onOpenWordCount: () => void;
  onToggleFullscreen: () => void;
  onPreview: () => void;
  onShowComments: () => void;
  onToggleAiSidekick: () => void;
  onOpenSpecialCharacters: () => void;
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: number | null;
  isDocumentSaved: boolean;
  onCancel: () => void;
  onOpenPageSetup: () => void;
  onOpenAboutModal: () => void;
  onOpenShortcuts: () => void;
  onSetLanguage: (lang: Language) => void;
  onReadAloud: () => void;
  isReadingAloud: boolean;
  onToggleSpellcheck: () => void;
  isSpellcheckEnabled: boolean;
  onToggleRuler: () => void;
  isRulerVisible: boolean;
  onOpenFileImport: () => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const MenuDropdown: React.FC<{ label: string; items: MenuItem[] }> = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{top: number, left: number} | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
          const portals = document.querySelectorAll('[role="menu"]');
          let isClickInsidePortal = false;
          portals.forEach(portal => { if (portal.contains(target)) { isClickInsidePortal = true; } });
          if (!isClickInsidePortal) {
              setIsOpen(false);
              setOpenSubmenu(null);
          }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action?: () => void) => {
    if (action) {
      action();
      setIsOpen(false);
      setOpenSubmenu(null);
    }
  };

  const handleSubmenuEnter = (e: React.MouseEvent, item: MenuItem) => {
    if (item.items) {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const submenuWidth = 192; // w-48
        
        let left = rect.right;
        if (left + submenuWidth > window.innerWidth) {
            left = rect.left - submenuWidth;
        }

        setSubmenuPosition({ top: rect.top, left });
        setOpenSubmenu(item.label);
    } else {
        setOpenSubmenu(null);
    }
  };


  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 focus:outline-none ${
          isOpen 
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div 
          className="absolute left-0 mt-1 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-1 z-50 border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-left" 
          role="menu" 
          onMouseLeave={() => setOpenSubmenu(null)}
        >
          {items.map((item, index) =>
            item.separator ? (
              <div key={`sep-${index}`} className="border-t border-white/20 dark:border-white/5 my-2 mx-2" />
            ) : (
              <div key={item.label} className="px-2" onMouseEnter={(e) => handleSubmenuEnter(e, item)}>
                  <button
                    onClick={() => handleAction(item.action)}
                    className={`text-left w-full px-3 py-1.5 text-xs font-medium rounded-lg flex items-center justify-between transition-colors duration-150 ${
                      openSubmenu === item.label
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                    role="menuitem"
                    disabled={!item.action && !item.items}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`transition-transform duration-200 ${openSubmenu === item.label ? 'scale-110' : 'opacity-70'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {item.shortcut && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${openSubmenu === item.label ? 'border-white/40 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-400'} font-mono`}>{item.shortcut}</span>}
                        {item.items && <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${openSubmenu === item.label ? 'translate-x-0.5' : 'opacity-50'}`} />}
                    </div>
                  </button>
                  {item.items && openSubmenu === item.label && submenuPosition && createPortal(
                    <div 
                        className="fixed w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-1 z-[60] border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 slide-in-from-left-1 duration-200"
                        style={{ top: `${submenuPosition.top}px`, left: `${submenuPosition.left}px`}}
                        onMouseEnter={() => setOpenSubmenu(item.label)}
                        onMouseLeave={() => setOpenSubmenu(null)}
                        role="menu"
                    >
                        {item.items.map(subItem => (
                             <div key={subItem.label} className="px-1">
                                <button
                                    onClick={() => handleAction(subItem.action)}
                                    className="text-left w-full px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg flex items-center gap-3 transition-all"
                                    role="menuitem"
                                >
                                    <span className="opacity-70">{subItem.icon}</span>
                                    <span>{subItem.label}</span>
                                </button>
                             </div>
                        ))}
                    </div>,
                    document.body
                  )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};


const MobileAccordionItem: React.FC<{ 
    label: string; 
    items: MenuItem[]; 
    onAction: (action?: () => void) => void;
    isOpen: boolean;
    onToggle: () => void;
}> = ({ label, items, onAction, isOpen, onToggle }) => {
    return (
        <li className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full text-left flex justify-between items-center p-5 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                aria-expanded={isOpen}
            >
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{label}</span>
                <ChevronRightIcon className={`w-5 h-5 transform transition-transform text-gray-400 ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="pb-4 px-2 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="space-y-1">
                        {items.map((item, index) =>
                            item.separator ? (
                                <div key={`sep-${index}`} className="border-t border-gray-200 dark:border-gray-700 my-2 mx-4" />
                            ) : item.items ? (
                                <div key={item.label} className="mt-2">
                                    <h3 className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                        {item.icon} {item.label}
                                    </h3>
                                    <div className="space-y-1">
                                        {item.items.map(subItem => (
                                             <button
                                                key={subItem.label}
                                                onClick={() => onAction(subItem.action)}
                                                className="text-left block w-full px-6 py-3 text-base text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg flex items-center gap-3"
                                            >
                                                <span className="opacity-70">{subItem.icon}</span>
                                                <span>{subItem.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    key={item.label}
                                    onClick={() => onAction(item.action)}
                                    className="text-left block w-full px-4 py-3 text-base text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg flex items-center gap-3"
                                >
                                    <span className="opacity-70">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

const AutoSaveStatus: React.FC<{ isSaving: boolean; lastSaved: number | null; isDocumentSaved: boolean; t: (key: string, replacements?: { [key: string]: string | number }) => string; }> = ({ isSaving, lastSaved, isDocumentSaved, t }) => {
    if (!isDocumentSaved) return null;

    let statusText = '';
    if (isSaving) {
        statusText = t('autosave.saving');
    } else if (lastSaved) {
        const time = new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        statusText = t('autosave.savedAt', { time });
    }

    return (
        <div className="hidden md:flex items-center text-sm text-gray-500 dark:text-gray-400 transition-opacity">
            {statusText}
        </div>
    );
};

const MenuBar: React.FC<MenuBarProps> = (props) => {
    const { t } = props;
    const { theme, toggleTheme } = useUIStore();
    const [internalIsMobileMenuOpen, setInternalIsMobileMenuOpen] = useState(false);
    const isMobileMenuOpen = props.isMobileMenuOpen !== undefined ? props.isMobileMenuOpen : internalIsMobileMenuOpen;
    const setIsMobileMenuOpen = props.setIsMobileMenuOpen !== undefined ? props.setIsMobileMenuOpen : setInternalIsMobileMenuOpen;
    
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const handleAccordionToggle = (label: string) => {
        setOpenAccordion(currentOpen => (currentOpen === label ? null : label));
    };

    const fileMenuItems: MenuItem[] = [
        { label: t('menu.fileNew'), action: props.onNewDocument, icon: <FilePlusIcon isMenuIcon />, shortcut: 'Ctrl+N' },
        { label: 'New from Template...', action: props.onNewFromTemplate, icon: <FileTextIcon isMenuIcon /> },
        { label: t('menu.fileSave'), action: props.onSave, icon: <SaveIcon isMenuIcon />, shortcut: 'Ctrl+S' },
        { label: t('menu.fileViewSaved'), action: props.onViewSaved, icon: <FolderIcon isMenuIcon />, shortcut: 'Ctrl+O' },
        { separator: true },
        { label: t('menu.fileImport'), action: props.onOpenFileImport, icon: <UploadCloudIcon isMenuIcon />, shortcut: 'Ctrl+I' },
        { separator: true },
        { label: t('menu.fileExportWord'), action: props.onExportToWord, icon: <DownloadIcon isMenuIcon /> },
        { label: t('menu.fileExportPdf'), action: props.onExportToPdf, icon: <PdfIcon isMenuIcon />, shortcut: 'Ctrl+P' },
        { separator: true },
        { label: t('menu.filePageSetup'), action: props.onOpenPageSetup, icon: <FileTextIcon isMenuIcon /> },
        { separator: true },
        { label: t('menu.filePrint'), action: props.onPrint, icon: <PrinterIcon isMenuIcon />, shortcut: 'Ctrl+P' },
    ];

    const editMenuItems: MenuItem[] = [
        { label: t('menu.editUndo'), action: () => props.onEditAction('undo'), icon: <UndoIcon isMenuIcon />, shortcut: 'Ctrl+Z' },
        { label: t('menu.editRedo'), action: () => props.onEditAction('redo'), icon: <RedoIcon isMenuIcon />, shortcut: 'Ctrl+Y' },
        { separator: true },
        { label: t('menu.editCut'), action: () => props.onEditAction('cut'), icon: <ScissorsIcon isMenuIcon />, shortcut: 'Ctrl+X' },
        { label: t('menu.editCopy'), action: () => props.onEditAction('copy'), icon: <CopyIcon isMenuIcon />, shortcut: 'Ctrl+C' },
        { label: t('menu.editPaste'), action: () => props.onEditAction('paste'), icon: <ClipboardIcon isMenuIcon />, shortcut: 'Ctrl+V' },
        { separator: true },
        { label: t('menu.editFormatPainter'), action: props.onCopyFormatting, icon: <PaintBrushIcon isMenuIcon />, shortcut: 'Ctrl+Shift+C' },
        { separator: true },
        { label: t('menu.editSelectAll'), action: () => props.onEditAction('selectAll'), icon: <SelectAllIcon isMenuIcon />, shortcut: 'Ctrl+A' },
        { separator: true },
        { label: t('menu.editFindReplace'), action: props.onOpenFindReplace, icon: <SearchIcon isMenuIcon />, shortcut: 'Ctrl+F' },
    ];
    
    const insertMenuItems: MenuItem[] = [
        { label: t('menu.insertLink'), action: props.onInsertLink, icon: <LinkIcon isMenuIcon />, shortcut: 'Ctrl+K' },
        { label: t('menu.insertImage'), action: props.onInsertImage, icon: <ImageIcon isMenuIcon /> },
        { label: t('menu.insertDrawing'), action: props.onInsertDrawing, icon: <PencilIcon isMenuIcon /> },
        { label: t('menu.insertTable'), action: props.onInsertTable, icon: <TableIcon isMenuIcon /> },
        { label: t('menu.calculateFormulas'), action: props.onCalculateFormulas, icon: <MathIcon isMenuIcon />, shortcut: 'Ctrl+Enter' },
        { label: t('menu.insertShapes'), icon: <SquareIcon isMenuIcon />, items: [
            { label: t('menu.shapeTextbox'), action: () => props.onInsertShape('textbox'), icon: <TypeIcon isMenuIcon /> },
            { label: t('menu.shapeRectangle'), action: () => props.onInsertShape('rectangle'), icon: <SquareIcon isMenuIcon /> },
            { label: t('menu.shapeCircle'), action: () => props.onInsertShape('circle'), icon: <CircleIcon isMenuIcon /> },
            { label: t('menu.shapeTriangle'), action: () => props.onInsertShape('triangle'), icon: <TriangleIcon isMenuIcon /> },
            { label: t('menu.shapeLine'), action: () => props.onInsertShape('line'), icon: <SlashIcon isMenuIcon /> },
        ] },
        { label: t('menu.insertHorizontalLine'), action: props.onInsertHorizontalRule, icon: <MinusIcon isMenuIcon /> },
        { label: t('menu.insertPageBreak'), action: props.onInsertPageBreak, icon: <SplitSquareVerticalIcon isMenuIcon /> },
        { label: 'Equation (KaTeX)', action: props.onInsertMath, icon: <MathIcon isMenuIcon /> },
        { label: t('menu.insertSpecialChar'), action: props.onOpenSpecialCharacters, icon: <OmegaIcon isMenuIcon /> },
        { separator: true },
        { label: t('menu.insertComment'), action: props.onAddComment, icon: <MessageSquareIcon isMenuIcon /> },
    ];
    
    const formatMenuItems: MenuItem[] = [
        {
            label: t('menu.formatPageOrientation'),
            icon: <RectangleHorizontalIcon isMenuIcon />,
            items: [
                { label: t('menu.orientationPortrait'), action: () => {}, icon: <RectangleVerticalIcon isMenuIcon /> },
                { label: t('menu.orientationLandscape'), action: () => {}, icon: <RectangleHorizontalIcon isMenuIcon /> },
            ]
        }
    ];
    
    const toolsMenuItems: MenuItem[] = [
        { label: t('menu.toolsAiAssistant'), action: props.onToggleAiSidekick, icon: <SparklesIcon isMenuIcon /> },
        { label: t('menu.toolsSourceCode'), action: props.onOpenSourceCode, icon: <CodeIcon isMenuIcon /> },
        { label: t('menu.toolsWordCount'), action: props.onOpenWordCount, icon: <BarChartIcon isMenuIcon /> },
        { 
            label: props.isReadingAloud ? t('menu.aiStopReading') : t('menu.aiReadAloud'), 
            action: props.onReadAloud, 
            icon: props.isReadingAloud ? <SquareIcon isMenuIcon /> : <Volume2Icon isMenuIcon /> 
        },
        { separator: true },
        {
            label: t('menu.toolsLanguage'),
            icon: <LanguageIcon isMenuIcon />,
            items: [
                { label: t('menu.langEnglish'), action: () => props.onSetLanguage('en') },
                { label: t('menu.langGeorgian'), action: () => props.onSetLanguage('ka') },
                { label: t('menu.langSpanish'), action: () => props.onSetLanguage('es') },
            ]
        },
    ];

    const viewMenuItems: MenuItem[] = [
        { label: t('menu.viewPreview'), action: props.onPreview, icon: <EyeIcon isMenuIcon /> },
        { label: t('menu.viewFullscreen'), action: props.onToggleFullscreen, icon: <MaximizeIcon isMenuIcon /> },
        { separator: true },
        { label: t('menu.viewShowComments'), action: props.onShowComments, icon: <MessageSquareIcon isMenuIcon /> },
        { separator: true },
        { label: props.isSpellcheckEnabled ? t('menu.viewHideSpelling') : t('menu.viewShowSpelling'), action: props.onToggleSpellcheck, icon: <ChecklistIcon isMenuIcon /> },
        { label: props.isRulerVisible ? t('menu.viewHideRuler') : t('menu.viewShowRuler'), action: props.onToggleRuler, icon: <MinusIcon isMenuIcon /> },
    ];

    const helpMenuItems: MenuItem[] = [
        { label: t('menu.helpShortcuts'), action: props.onOpenShortcuts, icon: <KeyboardIcon isMenuIcon /> },
        { label: t('menu.helpAbout'), action: props.onOpenAboutModal, icon: <InfoIcon isMenuIcon /> }
    ];

    const menus = [
        { label: t('menu.file'), items: fileMenuItems },
        { label: t('menu.edit'), items: editMenuItems },
        { label: t('menu.insert'), items: insertMenuItems },
        { label: t('menu.tools'), items: toolsMenuItems },
        { label: t('menu.view'), items: viewMenuItems },
        { label: t('menu.help'), items: helpMenuItems },
    ];

    const handleMobileAction = (action?: () => void) => {
        if(action) action();
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="px-2 py-1 flex items-center md:w-full">
            <div className="hidden">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Open menu"
                >
                    <MenuIcon />
                </button>
            </div>

            <div className="hidden md:flex items-center gap-1">
                {menus.map(menu => <MenuDropdown key={menu.label} label={menu.label} items={menu.items} />)}
            </div>
            
            <div className="flex-grow hidden" />

            <div className="flex items-center gap-2 mr-4">
                {props.isDirty && (
                    <>
                        <button
                            onClick={props.onSave}
                            disabled={props.isSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <SaveIcon className="w-3.5 h-3.5" />
                            {t('menu.fileSave')}
                        </button>
                        <button
                            onClick={props.onCancel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-all active:scale-95"
                        >
                            <CloseIcon className="w-3.5 h-3.5" />
                            {t('common.cancel')}
                        </button>
                    </>
                )}
            </div>

            <AutoSaveStatus isSaving={props.isSaving} lastSaved={props.lastSaved} isDocumentSaved={props.isDocumentSaved} t={t} />
            
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[100] flex flex-col animate-in slide-in-from-bottom duration-300" role="dialog" aria-modal="true">
                    <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('menu.file')} & {t('menu.tools')}</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full" aria-label="Close menu">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <ul className="flex-grow overflow-y-auto pb-20">
                        <li className="border-b border-gray-100 dark:border-gray-800">
                            <button
                                onClick={toggleTheme}
                                className="w-full text-left flex justify-between items-center p-5 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
                                    </span>
                                    <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                        {theme === 'light' ? t('toolbar.darkMode') : t('toolbar.lightMode')}
                                    </span>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
                                </div>
                            </button>
                        </li>
                        {menus.map(menu => (
                            <MobileAccordionItem 
                                key={menu.label} 
                                label={menu.label} 
                                items={menu.items} 
                                onAction={handleMobileAction} 
                                isOpen={openAccordion === menu.label} 
                                onToggle={() => handleAccordionToggle(menu.label)} 
                            />
                        ))}
                    </ul>
                </div>
            )}
        </nav>
    );
};

export default MenuBar;
