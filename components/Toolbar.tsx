

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, ListOrderedIcon, ListUnorderedIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon, UndoIcon, RedoIcon, ClearFormattingIcon, ChevronDownIcon, TextColorIcon, BgColorIcon, LineHeightIcon, PaintBrushIcon, TextShadowIcon, SparklesIcon, ChecklistIcon, ChevronRightIcon, SunIcon, MoonIcon, MenuIcon, ImageIcon, LinkIcon, TableIcon } from './icons/EditorIcons';
import TextShadowDropdown from './TextShadowDropdown';
import { useUIStore } from '../store/uiStore';

interface ToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
  onCopyFormatting: () => void;
  isFormatPainterActive: boolean;
  onToggleAiSidekick: () => void;
  onInsertChecklist: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleLineNumbers?: () => void;
  showLineNumbers?: boolean;
  onOpenMenu?: () => void;
  isBottom?: boolean;
  appMode?: 'standard' | 'code';
  onInsertCode?: (snippet: string) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

interface FontWeight {
  label: string;
  value: number; // e.g. 400 for normal, 700 for bold
}
interface FontFamily {
  value: string;
  label: string;
  weights?: FontWeight[];
}

const fontFamilies: FontFamily[] = [
  // System fonts
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' },
  { value: "'Courier New', Courier, monospace", label: 'Courier New' },
  // Georgian fonts from Google Fonts
  { value: "'Noto Sans Georgian', sans-serif", label: 'Google Sans Georgia', weights: [{ label: 'Light', value: 300 }, { label: 'Normal', value: 400 }, { label: 'Medium', value: 500 }, { label: 'Bold', value: 700 }, { label: 'Black', value: 900 }] },
  { value: "'FiraGO', sans-serif", label: 'FiraGO', weights: [{ label: 'Light', value: 300 }, { label: 'Normal', value: 400 }, { label: 'Medium', value: 500 }, { label: 'Bold', value: 700 }, { label: 'Black', value: 900 }] },
  { value: "'Arimo', sans-serif", label: 'Arimo', weights: [{ label: 'Light', value: 300 }, { label: 'Normal', value: 400 }, { label: 'Medium', value: 500 }, { label: 'Bold', value: 700 }, { label: 'Black', value: 900 }] },
  // Other Google Fonts
  { value: "'Roboto', sans-serif", label: 'Roboto', weights: [{ label: 'Light', value: 300 }, { label: 'Normal', value: 400 }, { label: 'Medium', value: 500 }, { label: 'Bold', value: 700 }] },
  { value: "'Lato', sans-serif", label: 'Lato', weights: [{ label: 'Light', value: 300 }, { label: 'Normal', value: 400 }, { label: 'Bold', value: 700 }] },
  { value: "'Montserrat', sans-serif", label: 'Montserrat', weights: [{ label: 'Light', value: 300 }, { label: 'Normal', value: 400 }, { label: 'Medium', value: 500 }, { label: 'Bold', value: 700 }] },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Raleway', sans-serif", label: 'Raleway' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Lobster', cursive", label: 'Lobster' },
];

const ToolbarButton: React.FC<{ onAction: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; tooltip: string; isActive?: boolean; isDisabled?: boolean; buttonRef?: React.RefObject<HTMLButtonElement> }> = ({ onAction, children, tooltip, isActive = false, isDisabled = false, buttonRef }) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => { 
    if (isDisabled) return;
    e.preventDefault(); 
    onAction(e); 
  };
  return (
    <div className="relative group">
      <button 
        ref={buttonRef} 
        onMouseDown={handleMouseDown} 
        aria-label={tooltip} 
        disabled={isDisabled}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isDisabled
            ? 'opacity-30 cursor-not-allowed text-gray-400'
            : isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        } focus:outline-none`}
      >
        {children}
      </button>
      {!isDisabled && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl border border-white/10 translate-y-1 group-hover:translate-y-0">
          {tooltip}
        </div>
      )}
    </div>
  );
};

const FontFamilyMenuItem: React.FC<{
    item: FontFamily;
    onSelect: (family: string, weight?: number) => void;
}> = ({ item, onSelect }) => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const [isMobileAccordionOpen, setIsMobileAccordionOpen] = useState(false);
    const itemRef = useRef<HTMLButtonElement>(null);
    const submenuTimer = useRef<number | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState<{ top: string; left: string } | null>(null);

    const handleMouseEnter = () => {
        if (isMobile) return;
        if (submenuTimer.current) clearTimeout(submenuTimer.current);
        if (item.weights) {
            if (itemRef.current) {
                const rect = itemRef.current.getBoundingClientRect();
                const submenuWidth = 160; // w-40
                const viewportWidth = window.innerWidth;

                let left = rect.right + 4;
                if (left + submenuWidth > viewportWidth) {
                    left = rect.left - submenuWidth - 4;
                }
                
                setSubmenuPosition({ top: `${rect.top}px`, left: `${left}px` });
            }
            setIsSubmenuOpen(true);
        }
    };

    const handleMouseLeave = () => {
        if (isMobile) return;
        submenuTimer.current = window.setTimeout(() => {
            setIsSubmenuOpen(false);
        }, 200);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isMobile) {
            if (item.weights) {
                setIsMobileAccordionOpen(prev => !prev);
            } else {
                onSelect(item.value);
            }
        } else {
            if (!item.weights) {
                onSelect(item.value);
            }
        }
    };
    
    const handleWeightSelect = (weight: number) => {
        onSelect(item.value, weight);
        setIsMobileAccordionOpen(false);
    };

    const SubmenuPortal = (!isMobile && item.weights && isSubmenuOpen && submenuPosition) ? createPortal(
        <div 
            data-menu-part="true"
            className="fixed w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-1 z-[100] border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 slide-in-from-left-1 duration-200"
            style={{ top: submenuPosition.top, left: submenuPosition.left }}
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
        >
            {item.weights.map(weight => (
                <button 
                    key={weight.value} 
                    onMouseDown={(e) => { e.preventDefault(); onSelect(item.value, weight.value); }} 
                    className="w-full text-left px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white transition-all"
                >
                    <span style={{ fontFamily: item.value, fontWeight: weight.value }}>{weight.label}</span>
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="px-2">
            <button
                ref={itemRef}
                onMouseDown={handleMouseDown}
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between transition-all group"
            >
                <span style={{ fontFamily: item.value }} className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                {item.weights && <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
            </button>
            {isMobile && isMobileAccordionOpen && item.weights && (
                <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 pl-2 animate-in slide-in-from-top-2 duration-200">
                    {item.weights.map(weight => (
                        <button 
                            key={weight.value} 
                            onMouseDown={(e) => { e.preventDefault(); handleWeightSelect(weight.value); }} 
                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                        >
                            <span style={{ fontFamily: item.value, fontWeight: weight.value }}>{weight.label}</span>
                        </button>
                    ))}
                </div>
            )}
            {SubmenuPortal}
        </div>
    );
};


const FontFamilyDropdown: React.FC<{
    label: string;
    items: FontFamily[];
    onSelect: (family: string, weight?: number) => void;
    isBottom?: boolean;
}> = ({ label, items, onSelect, isBottom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    
    const handleSelect = (family: string, weight?: number) => {
        onSelect(family, weight);
        setIsOpen(false);
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const menuWidth = 224; // w-56
            const menuMaxHeight = 320; // max-h-80
    
            let top = rect.bottom + 4;
            let left = rect.left;
    
            if (left + menuWidth > window.innerWidth) {
                left = rect.right - menuWidth;
            }
            if (left < 0) { left = 4; }
    
            if (isBottom || (top + menuMaxHeight > window.innerHeight && rect.top > menuMaxHeight)) {
                top = rect.top - menuMaxHeight - 4;
            }
            if (top < 0) { top = 4; }
    
            setMenuPosition({ top, left });
            setIsOpen(true);
        }
    }

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-menu-part="true"]')) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const MenuPortal = menuPosition ? createPortal(
        <div data-menu-part="true" ref={menuRef} style={{ 
            top: `${menuPosition.top}px`, 
            left: `${menuPosition.left}px` 
        }} className="fixed w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl py-1 z-[100] border border-gray-200 dark:border-gray-800 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar" role="menu">
            {items.map(item => (
                <FontFamilyMenuItem key={item.value} item={item} onSelect={handleSelect} />
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div ref={containerRef} data-menu-part="true" className="relative flex items-center border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-sm">
            <div className="flex-grow pl-3 pr-1 py-1 text-[11px] font-medium text-left truncate text-gray-700 dark:text-gray-300" style={{ maxWidth: '140px' }}>
                {label}
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800"></div>
            <button onMouseDown={handleToggle} aria-haspopup="true" aria-expanded={isOpen} className="p-1.5 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && MenuPortal}
        </div>
    );
};


const ToolbarDropdown: React.FC<{ label: React.ReactNode; items: { value: string; label: string }[]; onSelect: (value: string) => void; widthClass?: string; isBottom?: boolean; }> = ({ label, items, onSelect, widthClass = "w-48", isBottom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (isOpen) {
            setIsOpen(false);
            return;
        }
    
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            
            const widthMap: {[key: string]: number} = {
                'w-28': 112, 'w-48': 192, 'w-56': 224
            };
            const menuWidth = widthMap[widthClass] || 192;
            const menuHeight = (items.length * 34) + 8; // Estimate height
    
            let top = rect.bottom + 4;
            let left = rect.left;
    
            if (left + menuWidth > window.innerWidth) {
                left = rect.right - menuWidth;
            }
            if (left < 0) { left = 4; }
    
            if (isBottom || (top + menuHeight > window.innerHeight && rect.top > menuHeight)) {
                top = rect.top - menuHeight - 4;
            }
            if (top < 0) { top = 4; }
    
            setMenuPosition({ top, left });
            setIsOpen(true);
        }
    };

    const handleSelect = (value: string) => { onSelect(value); setIsOpen(false); };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current && !buttonRef.current.contains(target)) {
                const portals = document.querySelectorAll('[role="menu"]');
                let isClickInsidePortal = false;
                portals.forEach(portal => { if (portal.contains(target)) { isClickInsidePortal = true; } });
                if (!isClickInsidePortal) { setIsOpen(false); }
            }
        };
        const handleScroll = () => setIsOpen(false);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const MenuPortal = menuPosition ? createPortal(
        <div style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }} className={`${widthClass} fixed bg-white dark:bg-gray-900 rounded-xl shadow-xl py-1 z-[100] border border-gray-200 dark:border-gray-800 flex flex-col animate-in fade-in zoom-in-95 duration-200`} role="menu">
            {items.map(item => (
                <button 
                    key={item.value} 
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(item.value); }} 
                    className="text-left w-full px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" 
                    role="menuitem"
                >
                    {item.label}
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <>
            <button 
                ref={buttonRef} 
                onMouseDown={handleToggle} 
                aria-haspopup="true" 
                aria-expanded={isOpen} 
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    isOpen 
                        ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
                <span className="truncate max-w-[120px]">{label}</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && MenuPortal}
        </>
    );
};


const ColorPicker: React.FC<{ onAction: (color: string) => void; tooltip: string; children: React.ReactNode }> = ({ onAction, tooltip, children }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => { onAction(e.target.value); };
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); inputRef.current?.click(); };
    return (
        <div className="relative group">
            <button onMouseDown={handleButtonClick} aria-label={tooltip} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150">
                {children}
            </button>
            <input type="color" ref={inputRef} onChange={handleColorChange} className="absolute w-0 h-0 opacity-0" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {tooltip}
            </div>
        </div>
    );
};

const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72];

const FontSizeCombobox: React.FC<{ value: string; onChange: (size: number) => void; isBottom?: boolean; }> = ({ value, onChange, isBottom }) => {
    const [inputValue, setInputValue] = useState(String(parseInt(value, 10) || 12));
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<number | null>(null);

    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setInputValue(String(parseInt(value, 10) || 12));
        }
    }, [value]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const handleValueChange = (newStringValue: string) => {
        setInputValue(newStringValue);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = window.setTimeout(() => {
            const size = parseInt(newStringValue, 10);
            if (!isNaN(size) && size > 0) {
                onChange(size);
            }
        }, 300);
    };

    const handleBlur = () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        const size = parseInt(inputValue, 10);
        if (!isNaN(size) && size > 0) {
            if(size !== (parseInt(value, 10) || 12)) onChange(size);
        } else {
            setInputValue(String(parseInt(value, 10) || 12));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            const size = parseInt(inputValue, 10);
            if (!isNaN(size) && size > 0) {
                onChange(size);
            }
            inputRef.current?.blur();
        }
    };
    
    const handleSelect = (size: number) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setInputValue(String(size));
        onChange(size);
        setIsOpen(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const dropdownMaxHeight = 240; // max-h-60
    const containerRect = containerRef.current?.getBoundingClientRect();
    let dropdownTop = (containerRect?.bottom || 0) + 4;
    if (isBottom && containerRect) {
        dropdownTop = containerRect.top - dropdownMaxHeight - 4;
    }

    return (
        <div ref={containerRef} className="relative flex items-center border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-sm">
            <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={(e) => handleValueChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-10 pl-2 py-1 text-center bg-transparent focus:outline-none text-[11px] font-medium text-gray-700 dark:text-gray-300 [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800"></div>
            <button onMouseDown={(e) => { e.preventDefault(); setIsOpen(prev => !prev); }} className="p-1.5 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && createPortal(
                <div 
                    style={{ 
                        top: `${dropdownTop}px`, 
                        left: `${containerRect?.left}px`,
                        width: `${containerRect?.width}px`
                    }}
                    className="fixed bg-white dark:bg-gray-900 rounded-xl shadow-xl py-1 z-[100] border border-gray-200 dark:border-gray-800 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar"
                >
                    {fontSizes.map(size => (
                        <button 
                            key={size}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(size); }}
                            className="w-full text-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                            {size}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};


const Toolbar: React.FC<ToolbarProps> = ({ 
    editorRef, 
    onCopyFormatting, 
    isFormatPainterActive, 
    onToggleAiSidekick, 
    onInsertChecklist, 
    onUndo, 
    onRedo, 
    canUndo, 
    canRedo, 
    onToggleLineNumbers,
    showLineNumbers,
    onOpenMenu, 
    isBottom, 
    appMode = 'standard',
    onInsertCode,
    t 
}) => {
    const { theme, toggleTheme } = useUIStore();
    const [toolbarState, setToolbarState] = useState({
        fontName: 'Arial',
        fontWeight: 400,
        fontSize: '12pt',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        ol: false,
        ul: false,
        align: 'left' as 'left' | 'center' | 'right' | 'justify',
        textShadow: 'none',
    });
    const [isTextShadowDropdownOpen, setIsTextShadowDropdownOpen] = useState(false);
    const textShadowButtonRef = useRef<HTMLButtonElement>(null);
    
    const updateToolbarState = useCallback(() => {
        if (!editorRef.current || !document.getSelection()?.rangeCount) return;
        
        let element = window.getSelection()?.anchorNode;
        if (element?.nodeType !== Node.ELEMENT_NODE) {
            element = element?.parentElement;
        }
        if (!element || !editorRef.current.contains(element)) return;
        
        const styles = window.getComputedStyle(element as Element);
        const fontName = styles.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || 'Arial';
        const fontWeight = parseInt(styles.fontWeight, 10) || 400;
        
        const fontSizePx = parseFloat(styles.fontSize);
        const fontSizePt = Math.round(fontSizePx * 0.75); // 1px = 0.75pt
        const fontSize = `${fontSizePt}pt`;

        const textShadow = styles.textShadow;
        
        setToolbarState({
            fontName, fontWeight, fontSize,
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikethrough: document.queryCommandState('strikethrough'),
            ol: document.queryCommandState('insertOrderedList'),
            ul: document.queryCommandState('insertUnorderedList'),
            align: document.queryCommandState('justifyCenter') ? 'center' : document.queryCommandState('justifyRight') ? 'right' : document.queryCommandState('justifyFull') ? 'justify' : 'left',
            textShadow,
        });
    }, [editorRef]);

    useEffect(() => {
        const editor = editorRef.current;
        const handleSelectionChange = () => requestAnimationFrame(updateToolbarState);
        document.addEventListener('selectionchange', handleSelectionChange);
        if (editor) {
            editor.addEventListener('click', handleSelectionChange);
            editor.addEventListener('keyup', handleSelectionChange);
            editor.addEventListener('focus', handleSelectionChange);
        }
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            if (editor) {
                editor.removeEventListener('click', handleSelectionChange);
                editor.removeEventListener('keyup', handleSelectionChange);
                editor.removeEventListener('focus', handleSelectionChange);
            }
        };
    }, [editorRef, updateToolbarState]);

  const executeCommand = (command: string, value?: string) => {
    if (command === 'undo' && onUndo) {
        onUndo();
        return;
    }
    if (command === 'redo' && onRedo) {
        onRedo();
        return;
    }
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    setTimeout(updateToolbarState, 0);
  };

  const applyInlineStyle = (style: React.CSSProperties) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      if (range.collapsed) {
          const span = document.createElement('span');
          Object.assign(span.style, style);
          span.innerHTML = '&#8203;'; // Zero-width space for cursor placement
          range.insertNode(span);
          range.setStart(span, 1);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
      }

      const propsToClean = Object.keys(style).map(key => key.replace(/([A-Z])/g, "-$1").toLowerCase());
      
      const contents = range.extractContents();
      
      const cleaner = (node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              propsToClean.forEach(prop => el.style.removeProperty(prop));
              if (el.style.length === 0) el.removeAttribute('style');
              Array.from(el.childNodes).forEach(cleaner);
          }
      };

      cleaner(contents);

      const wrapperSpan = document.createElement('span');
      Object.assign(wrapperSpan.style, style);
      wrapperSpan.appendChild(contents);
      range.insertNode(wrapperSpan);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapperSpan);
      selection.addRange(newRange);
  };

  const applyFontFamily = (family: string, weight?: number) => {
    const style: React.CSSProperties = { fontFamily: family };
    if (weight) {
      style.fontWeight = weight;
    }
    applyInlineStyle(style);
    setTimeout(updateToolbarState, 0);
  };

  const applyFontSize = (sizeInPt: number) => {
    applyInlineStyle({ fontSize: `${sizeInPt}pt` });
    setTimeout(updateToolbarState, 0);
  };

  const applyLineHeight = (value: string) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let commonAncestor = range.commonAncestorContainer;
      
      // Find the block-level parent(s) for the selection
      const getBlockParents = (node: Node): HTMLElement[] => {
          let current: Node | null = node;
          const parents: HTMLElement[] = [];
          while (current && current !== editorRef.current) {
              if (current.nodeType === Node.ELEMENT_NODE) {
                  const display = window.getComputedStyle(current as HTMLElement).display;
                  if (['block', 'list-item', 'table-cell', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes((current as HTMLElement).tagName.toLowerCase()) || ['block', 'list-item', 'table-cell'].includes(display)) {
                      parents.push(current as HTMLElement);
                  }
              }
              current = current.parentNode;
          }
          return parents;
      };
      
      const startBlock = getBlockParents(range.startContainer)[0];
      const endBlock = getBlockParents(range.endContainer)[0];

      if(startBlock) {
          let currentBlock: HTMLElement | null = startBlock;
          const blocksToModify: HTMLElement[] = [];
          while(currentBlock && currentBlock !== endBlock?.nextElementSibling) {
              if(editorRef.current?.contains(currentBlock)) {
                  blocksToModify.push(currentBlock);
              }
              currentBlock = currentBlock.nextElementSibling as HTMLElement | null;
          }
          blocksToModify.forEach(block => block.style.lineHeight = value);
      } else {
         document.execCommand('formatBlock', false, 'p');
         const newParentBlock = selection.getRangeAt(0).commonAncestorContainer.parentElement;
         if (newParentBlock && newParentBlock instanceof HTMLElement) {
             newParentBlock.style.lineHeight = value;
         }
      }
  };

  const currentFont = fontFamilies.find(f => f.value.toLowerCase().includes(toolbarState.fontName.toLowerCase())) || { label: toolbarState.fontName };
  const fontLabel = currentFont.label;
  const alignmentIcons = { left: <AlignLeftIcon />, center: <AlignCenterIcon />, right: <AlignRightIcon />, justify: <AlignJustifyIcon />, };
  const lineHeights = [ { value: '1', label: t('toolbar.lineHeights.single') }, { value: '1.5', label: '1.5' }, { value: '2', label: t('toolbar.lineHeights.double') }, { value: '2.5', label: '2.5' }, ];

  const insertCodeSnippet = (snippet: string) => {
    if (onInsertCode) {
      onInsertCode(snippet);
    }
  };

  if (appMode === 'code') {
    return (
      <div className="p-3 md:p-2 bg-white dark:bg-gray-900 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 min-h-[72px] md:min-h-0">
        <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-1 md:gap-1 overflow-x-auto md:overflow-visible">
          <div className="flex items-center gap-0.5 md:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 md:pr-2 mr-1 md:mr-2">
            <ToolbarButton onAction={() => executeCommand('undo')} tooltip={t('toolbar.undo')} isDisabled={!canUndo}><UndoIcon /></ToolbarButton>
            <ToolbarButton onAction={() => executeCommand('redo')} tooltip={t('toolbar.redo')} isDisabled={!canRedo}><RedoIcon /></ToolbarButton>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 md:pr-2 mr-1 md:mr-2">
            <ToolbarButton onAction={() => insertCodeSnippet('<div>\n  \n</div>')} tooltip="Insert <div>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">DIV</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<span></span>')} tooltip="Insert <span>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">SPAN</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<p>\n  \n</p>')} tooltip="Insert <p>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">P</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<h1></h1>')} tooltip="Insert <h1>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">H1</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<h2></h2>')} tooltip="Insert <h2>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">H2</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<h3></h3>')} tooltip="Insert <h3>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">H3</div>
            </ToolbarButton>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 md:pr-2 mr-1 md:mr-2">
            <ToolbarButton onAction={() => insertCodeSnippet('<style>\n  \n</style>')} tooltip="Insert <style>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">CSS</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<script>\n  \n</script>')} tooltip="Insert <script>">
              <div className="text-[10px] font-bold border border-current px-1 rounded">JS</div>
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<img src="" alt="" />')} tooltip="Insert <img>">
              <ImageIcon size={18} />
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<a href=""></a>')} tooltip="Insert <a>">
              <LinkIcon size={18} />
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<table>\n  <tr>\n    <td></td>\n  </tr>\n</table>')} tooltip="Insert <table>">
              <TableIcon size={18} />
            </ToolbarButton>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1">
             <ToolbarButton onAction={() => insertCodeSnippet('<ul>\n  <li></li>\n</ul>')} tooltip="Insert <ul>">
              <ListUnorderedIcon size={18} />
            </ToolbarButton>
            <ToolbarButton onAction={() => insertCodeSnippet('<ol>\n  <li></li>\n</ol>')} tooltip="Insert <ol>">
              <ListOrderedIcon size={18} />
            </ToolbarButton>
          </div>
        </div>
        <div className="hidden md:flex items-center pl-2 gap-1">
          <ToolbarButton onAction={toggleTheme} tooltip={theme === 'light' ? t('toolbar.darkMode') : t('toolbar.lightMode')}>
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </ToolbarButton>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-2 bg-white dark:bg-gray-900 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 min-h-[72px] md:min-h-0">
      <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-1 md:gap-1 overflow-x-auto md:overflow-visible">
        {onOpenMenu && (
          <div className="md:hidden flex items-center pr-2 border-r border-gray-300 dark:border-gray-600 mr-2">
            <ToolbarButton onAction={onOpenMenu} tooltip="Menu">
              <MenuIcon size={24} />
            </ToolbarButton>
          </div>
        )}
        <div className="flex items-center gap-0.5 md:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 md:pr-2 mr-1 md:mr-2">
          <ToolbarButton onAction={() => executeCommand('undo')} tooltip={t('toolbar.undo')} isDisabled={!canUndo}><UndoIcon /></ToolbarButton>
          <ToolbarButton onAction={() => executeCommand('redo')} tooltip={t('toolbar.redo')} isDisabled={!canRedo}><RedoIcon /></ToolbarButton>
          <ToolbarButton onAction={onCopyFormatting} tooltip={t('toolbar.formatPainter')} isActive={isFormatPainterActive}><PaintBrushIcon /></ToolbarButton>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 border-r border-gray-300 dark:border-gray-600 pr-1 md:pr-2 mr-1 md:mr-2">
           <FontFamilyDropdown label={fontLabel} items={fontFamilies} onSelect={applyFontFamily} isBottom={isBottom} />
           <FontSizeCombobox value={toolbarState.fontSize} onChange={applyFontSize} isBottom={isBottom} />
        </div>

        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton onAction={() => executeCommand('bold')} tooltip={t('toolbar.bold')} isActive={toolbarState.bold}><BoldIcon /></ToolbarButton>
          <ToolbarButton onAction={() => executeCommand('italic')} tooltip={t('toolbar.italic')} isActive={toolbarState.italic}><ItalicIcon /></ToolbarButton>
          <ToolbarButton onAction={() => executeCommand('underline')} tooltip={t('toolbar.underline')} isActive={toolbarState.underline}><UnderlineIcon /></ToolbarButton>
          <ToolbarButton onAction={() => executeCommand('strikethrough')} tooltip={t('toolbar.strikethrough')} isActive={toolbarState.strikethrough}><StrikethroughIcon /></ToolbarButton>
        </div>

        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton onAction={() => executeCommand('insertUnorderedList')} tooltip={t('toolbar.bulletedList')} isActive={toolbarState.ul}><ListUnorderedIcon /></ToolbarButton>
          <ToolbarButton onAction={() => executeCommand('insertOrderedList')} tooltip={t('toolbar.numberedList')} isActive={toolbarState.ol}><ListOrderedIcon /></ToolbarButton>
          {onToggleLineNumbers && (
            <ToolbarButton onAction={onToggleLineNumbers} tooltip={showLineNumbers ? t('toolbar.hideLineNumbers') : t('toolbar.showLineNumbers')} isActive={showLineNumbers}><ListOrderedIcon /></ToolbarButton>
          )}
          <ToolbarButton onAction={onInsertChecklist} tooltip={t('toolbar.checklist')}><ChecklistIcon /></ToolbarButton>
          <ToolbarButton onAction={() => executeCommand('removeFormat')} tooltip={t('toolbar.clearFormatting')}><ClearFormattingIcon /></ToolbarButton>
        </div>
        
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <ToolbarDropdown
                label={alignmentIcons[toolbarState.align]}
                items={[
                    { value: 'justifyLeft', label: t('toolbar.alignLeft') }, { value: 'justifyCenter', label: t('toolbar.alignCenter') },
                    { value: 'justifyRight', label: t('toolbar.alignRight') }, { value: 'justifyFull', label: t('toolbar.alignJustify') },
                ]}
                onSelect={executeCommand} widthClass="w-56" isBottom={isBottom}
            />
             <ToolbarDropdown label={<LineHeightIcon />} items={lineHeights} onSelect={applyLineHeight} widthClass="w-28" isBottom={isBottom} />
        </div>

        <div className="flex items-center gap-1">
            <ColorPicker onAction={(color) => executeCommand('foreColor', color)} tooltip={t('toolbar.textColor')}><TextColorIcon /></ColorPicker>
            <ColorPicker onAction={(color) => executeCommand('hiliteColor', color)} tooltip={t('toolbar.bgColor')}><BgColorIcon /></ColorPicker>
            <ToolbarButton buttonRef={textShadowButtonRef} onAction={() => setIsTextShadowDropdownOpen(true)} tooltip={t('toolbar.textShadow')} isActive={toolbarState.textShadow !== 'none'}><TextShadowIcon /></ToolbarButton>
        </div>
      </div>
      <div className="hidden md:flex items-center pl-2 gap-1">
        <ToolbarButton onAction={toggleTheme} tooltip={theme === 'light' ? t('toolbar.darkMode') : t('toolbar.lightMode')}>
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </ToolbarButton>
      </div>
      {isTextShadowDropdownOpen && (
          <TextShadowDropdown
            targetRef={textShadowButtonRef}
            initialValue={toolbarState.textShadow}
            onApply={(shadow) => applyInlineStyle({ textShadow: shadow })}
            onRemove={() => applyInlineStyle({ textShadow: 'none' })}
            onClose={() => setIsTextShadowDropdownOpen(false)}
            isBottom={isBottom}
            t={t}
          />
      )}
    </div>
  );
};

export default Toolbar;