import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon } from '../icons/EditorIcons';

interface ShapePaneProps {
  editingElement: HTMLElement;
  onUpdateStyle: (element: HTMLElement, styles: React.CSSProperties) => void;
  onChangeZIndex: (element: HTMLElement, direction: 'front' | 'back') => void;
  t: (key: string) => string;
}

interface ShadowState {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
}

const getTextColorForBackground = (rgbaBg: string): string => {
    if (!rgbaBg) return '#000000';
    const match = rgbaBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    // Luma formula to determine brightness
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    
    return luma > 128 ? '#000000' : '#FFFFFF';
};

const ShapePane: React.FC<ShapePaneProps> = ({ editingElement, onUpdateStyle, onChangeZIndex, t }) => {
  const [styles, setStyles] = useState<React.CSSProperties>({});
  const [wrapping, setWrapping] = useState<'absolute' | 'left' | 'right'>('absolute');
  const shapeType = editingElement.dataset.shapeType;
  const isLine = shapeType === 'line';

  const parseStyle = (value: string | undefined, defaultValue: number): number => {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  const parseColor = (value: string | undefined, defaultValue: string): string => {
    return value || defaultValue;
  }
  
  const parseTransform = (transform: string | undefined): number => {
    if (!transform) return 0;
    const match = /rotate\(([-]?\d*\.?\d+)deg\)/.exec(transform);
    return match ? parseFloat(match[1]) : 0;
  };
  
  const parseBoxShadow = (boxShadow: string | undefined): ShadowState => {
      const defaultState: ShadowState = { enabled: false, offsetX: 2, offsetY: 2, blur: 4, color: '#000000' };
      if (!boxShadow || boxShadow === 'none') return defaultState;
      
      const colorMatch = /(rgba?\(.+?\)|#\w+)/.exec(boxShadow);
      const color = colorMatch ? colorMatch[0] : '#000000';
      
      const pxValues = boxShadow.match(/-?\d+px/g) || [];
      
      return {
          enabled: true,
          offsetX: parseInt(pxValues[0], 10) || 0,
          offsetY: parseInt(pxValues[1], 10) || 0,
          blur: parseInt(pxValues[2], 10) || 0,
          color: color,
      };
  };
  
  const rgbaToHex = (rgba: string): {hex: string, alpha: number} => {
    if (!rgba || !rgba.startsWith('rgb')) return { hex: '#000000', alpha: 1 };
    const parts = rgba.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return { hex: '#000000', alpha: 1 };

    const r = parseInt(parts[0]).toString(16).padStart(2, '0');
    const g = parseInt(parts[1]).toString(16).padStart(2, '0');
    const b = parseInt(parts[2]).toString(16).padStart(2, '0');
    
    const alpha = parts.length >= 4 ? parseFloat(parts[3]) : 1;

    return { hex: `#${r}${g}${b}`, alpha };
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }


  useEffect(() => {
    if (editingElement) {
        const computed = window.getComputedStyle(editingElement);
        const initialStyles: React.CSSProperties = {
            width: computed.width,
            height: computed.height,
            top: computed.top,
            left: computed.left,
            backgroundColor: computed.backgroundColor,
            borderColor: computed.borderColor,
            borderWidth: computed.borderWidth,
            borderStyle: computed.borderStyle,
            borderRadius: computed.borderRadius,
            padding: computed.padding,
            opacity: computed.opacity,
            transform: computed.transform,
            boxShadow: computed.boxShadow,
            position: computed.position,
            float: computed.float,
        };
        setStyles(initialStyles);

        if (computed.position === 'absolute') {
            setWrapping('absolute');
        } else if (computed.float === 'left') {
            setWrapping('left');
        } else if (computed.float === 'right') {
            setWrapping('right');
        }
    }
  }, [editingElement]);
  
  const handleStyleChange = useCallback((newStyles: Partial<React.CSSProperties>) => {
    let stylesToApply = { ...newStyles };
    let updatedState = { ...styles, ...newStyles };

    if (shapeType === 'textbox') {
        const currentBg = rgbaToHex(styles.backgroundColor as string);
        let finalBgColor = styles.backgroundColor as string;

        if ('opacity' in newStyles) {
            const newOpacity = parseFloat(newStyles.opacity as string);
            finalBgColor = hexToRgba(currentBg.hex, newOpacity);
        } else if ('backgroundColor' in newStyles) {
            const newBgHex = newStyles.backgroundColor as string;
            finalBgColor = hexToRgba(newBgHex, currentBg.alpha);
        }
        
        updatedState.backgroundColor = finalBgColor;
        stylesToApply.backgroundColor = finalBgColor;
        
        // Auto text color contrast logic
        const textColor = getTextColorForBackground(finalBgColor);
        const innerEditableDiv = editingElement.querySelector('[contenteditable="true"]');
        if (innerEditableDiv instanceof HTMLElement) {
            (innerEditableDiv as HTMLElement).style.color = textColor;
        }

        // For textbox, opacity controls background alpha, not the element itself
        delete stylesToApply.opacity;
        delete updatedState.opacity;
    }

    setStyles(updatedState);
    onUpdateStyle(editingElement, stylesToApply);
  }, [editingElement, onUpdateStyle, shapeType, styles]);

  const handleWrappingChange = (mode: 'absolute' | 'left' | 'right') => {
    setWrapping(mode);
    let newStyles: React.CSSProperties = {};
    if (mode === 'absolute') {
        newStyles = {
            position: 'absolute' as const,
            float: 'none' as const,
            margin: '',
            top: styles.top || '100px',
            left: styles.left || '100px'
        };
    } else { // left or right
        newStyles = {
            position: 'relative' as const,
            float: mode,
            margin: mode === 'left' ? '0.5rem 1rem 0.5rem 0' : '0.5rem 0 0.5rem 1rem',
            top: '',
            left: ''
        };
    }
    handleStyleChange(newStyles);
  };
  
  const handleShadowChange = (prop: keyof ShadowState, value: any) => {
      const currentShadow = parseBoxShadow(styles.boxShadow as string);
      const newShadowState = { ...currentShadow, [prop]: value };
      
      if (!newShadowState.enabled) {
          handleStyleChange({ boxShadow: 'none' });
      } else {
          const shadowString = `${newShadowState.offsetX}px ${newShadowState.offsetY}px ${newShadowState.blur}px ${newShadowState.color}`;
          handleStyleChange({ boxShadow: shadowString });
      }
  };

  const currentRotation = parseTransform(styles.transform as string);
  const currentShadow = parseBoxShadow(styles.boxShadow as string);

  const {hex: currentBgColor, alpha: currentBgAlpha} = rgbaToHex(styles.backgroundColor as string);
  const currentOpacity = shapeType === 'textbox' ? currentBgAlpha : parseFloat(styles.opacity as string) || 1;
  
  return (
    <div className="space-y-6 text-sm animate-in fade-in slide-in-from-right-4 duration-300 custom-scrollbar max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8">
        <details className="group bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden transition-all" open>
            <summary className="flex items-center justify-between font-black cursor-pointer p-5 hover:bg-white/60 dark:hover:bg-gray-900/80 transition-colors">
                <span className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('panes.shape.wrapping')}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
            </summary>
            <div className="p-5 pt-0 space-y-4">
                <div className="space-y-2">
                    <select
                        value={wrapping}
                        onChange={(e) => handleWrappingChange(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100 shadow-sm cursor-pointer backdrop-blur-sm"
                    >
                        <option value="absolute">{t('panes.shape.wrappingOptions.inFront')}</option>
                        <option value="left">{t('panes.shape.wrappingOptions.squareLeft')}</option>
                        <option value="right">{t('panes.shape.wrappingOptions.squareRight')}</option>
                    </select>
                </div>
            </div>
        </details>

        {/* Position & Size */}
        <details className="group bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden transition-all" open>
            <summary className="flex items-center justify-between font-black cursor-pointer p-5 hover:bg-white/60 dark:hover:bg-gray-900/80 transition-colors">
                <span className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('panes.shape.transform')}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
            </summary>
            <div className="p-5 pt-0 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.left')}</label>
                        <div className="relative group/input">
                            <input type="number" value={parseStyle(styles.left as string, 0)} onChange={e => handleStyleChange({ left: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm disabled:opacity-50 backdrop-blur-sm" disabled={wrapping !== 'absolute'}/>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.top')}</label>
                        <div className="relative group/input">
                            <input type="number" value={parseStyle(styles.top as string, 0)} onChange={e => handleStyleChange({ top: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm disabled:opacity-50 backdrop-blur-sm" disabled={wrapping !== 'absolute'}/>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{isLine ? t('panes.shape.length') : t('panes.shape.width')}</label>
                        <div className="relative group/input">
                            <input type="number" value={parseStyle(styles.width as string, 100)} onChange={e => handleStyleChange({ width: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{isLine ? t('panes.shape.lineThickness') : t('panes.shape.height')}</label>
                        <div className="relative group/input">
                            <input type="number" value={parseStyle(styles.height as string, isLine ? 2 : 100)} onChange={e => handleStyleChange({ height: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                        </div>
                    </div>
                </div>
                <div className="pt-2 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{t('panes.shape.rotation')}</label>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-600/10 px-2.5 py-1 rounded-full shadow-sm">{currentRotation}°</span>
                    </div>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={currentRotation}
                        onChange={e => handleStyleChange({ transform: `rotate(${e.target.value}deg)`})}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
            </div>
        </details>
        
        {/* Fill & Border */}
        <details className="group bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden transition-all" open>
            <summary className="flex items-center justify-between font-black cursor-pointer p-5 hover:bg-white/60 dark:hover:bg-gray-900/80 transition-colors">
                <span className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('panes.shape.style')}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
            </summary>
            <div className="p-5 pt-0 space-y-6">
                 <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{isLine ? t('panes.shape.lineColor') : t('panes.shape.fillColor')}</label>
                    <div className="flex items-center gap-4 p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-sm">
                        <input type="color" value={currentBgColor} onChange={e => handleStyleChange({ backgroundColor: e.target.value })} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer bg-transparent"/>
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-gray-900 dark:text-gray-100 uppercase font-black">{currentBgColor}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-black">Hex Code</span>
                        </div>
                    </div>
                </div>
                {!isLine && (
                    <>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{shapeType === 'textbox' ? t('panes.shape.bgOpacity') : t('panes.shape.opacity')}</label>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-600/10 px-2.5 py-1 rounded-full shadow-sm">{Math.round(currentOpacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={currentOpacity}
                                onChange={e => handleStyleChange({ opacity: e.target.value })}
                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.borderColor')}</label>
                                <div className="flex items-center gap-3 p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-sm">
                                    <input type="color" value={parseColor(styles.borderColor, '#000000')} onChange={e => handleStyleChange({ borderColor: e.target.value })} className="w-8 h-8 p-0 border-none rounded-lg cursor-pointer bg-transparent"/>
                                    <span className="text-[10px] font-mono text-gray-500 uppercase font-black">{parseColor(styles.borderColor, '#000000')}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.borderWidth')}</label>
                                <div className="relative">
                                    <input type="number" min="0" value={parseStyle(styles.borderWidth as string, 1)} onChange={e => handleStyleChange({ borderWidth: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.borderStyle')}</label>
                            <select
                                value={styles.borderStyle}
                                onChange={(e) => handleStyleChange({ borderStyle: e.target.value })}
                                className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100 shadow-sm cursor-pointer backdrop-blur-sm"
                            >
                                <option value="solid">{t('panes.shape.borderStyles.solid')}</option>
                                <option value="dashed">{t('panes.shape.borderStyles.dashed')}</option>
                                <option value="dotted">{t('panes.shape.borderStyles.dotted')}</option>
                                <option value="none">{t('panes.shape.borderStyles.none')}</option>
                            </select>
                        </div>
                        {(shapeType === 'rectangle' || shapeType === 'textbox') && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.cornerRadius')}</label>
                                <div className="relative">
                                    <input type="number" min="0" value={parseStyle(styles.borderRadius as string, 0)} onChange={e => handleStyleChange({ borderRadius: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </details>
        
        <details className="group bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden transition-all" open>
            <summary className="flex items-center justify-between font-black cursor-pointer p-5 hover:bg-white/60 dark:hover:bg-gray-900/80 transition-colors">
                <span className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('panes.shape.shadow')}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
            </summary>
            <div className="p-5 pt-0 space-y-6">
                <div className="flex items-center p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white/20 dark:border-white/5 shadow-sm group cursor-pointer backdrop-blur-sm">
                    <input id="shadow-enabled" type="checkbox" checked={currentShadow.enabled} onChange={e => handleShadowChange('enabled', e.target.checked)} className="h-5 w-5 text-blue-600 border-white/20 dark:border-white/5 rounded-lg focus:ring-blue-500/20 transition-all cursor-pointer" />
                    <label htmlFor="shadow-enabled" className="ml-3 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] cursor-pointer group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{t('panes.image.enableShadow')}</label>
                </div>
                {currentShadow.enabled && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.image.xOffset')}</label>
                                <input type="number" value={currentShadow.offsetX} onChange={e => handleShadowChange('offsetX', parseInt(e.target.value, 10))} className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.image.yOffset')}</label>
                                <input type="number" value={currentShadow.offsetY} onChange={e => handleShadowChange('offsetY', parseInt(e.target.value, 10))} className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.image.blur')}</label>
                            <input type="number" min="0" value={currentShadow.blur} onChange={e => handleShadowChange('blur', parseInt(e.target.value, 10))} className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.image.color')}</label>
                            <div className="flex items-center gap-4 p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-sm">
                                <input type="color" value={currentShadow.color} onChange={e => handleShadowChange('color', e.target.value)} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer bg-transparent"/>
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100 uppercase font-black">{currentShadow.color}</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-black">Shadow Color</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </details>

        {shapeType === 'textbox' && (
             <details className="group bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden transition-all" open>
                <summary className="flex items-center justify-between font-black cursor-pointer p-5 hover:bg-white/60 dark:hover:bg-gray-900/80 transition-colors">
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('panes.shape.text')}</span>
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                </summary>
                 <div className="p-5 pt-0 space-y-4">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.shape.padding')}</label>
                        <div className="relative group/input">
                            <input type="number" min="0" value={parseStyle(styles.padding as string, 5)} onChange={e => handleStyleChange({ padding: `${e.target.value}px` })} className="w-full pl-4 pr-10 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"/>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase tracking-tighter">px</span>
                        </div>
                    </div>
                </div>
            </details>
        )}
        
        <details className="group bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden transition-all" open>
            <summary className="flex items-center justify-between font-black cursor-pointer p-5 hover:bg-white/60 dark:hover:bg-gray-900/80 transition-colors">
                <span className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{t('panes.shape.arrange')}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
            </summary>
            <div className="p-5 pt-0 flex items-center gap-3">
                <button disabled={wrapping !== 'absolute'} onClick={() => onChangeZIndex(editingElement, 'front')} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl flex-1 bg-white/40 dark:bg-gray-800/40 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white border border-white/20 dark:border-white/5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md">{t('panes.image.bringForward')}</button>
                <button disabled={wrapping !== 'absolute'} onClick={() => onChangeZIndex(editingElement, 'back')} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl flex-1 bg-white/40 dark:bg-gray-800/40 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white border border-white/20 dark:border-white/5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md">{t('panes.image.sendBackward')}</button>
            </div>
        </details>
    </div>
  );
};

export default ShapePane;