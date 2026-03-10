import React, { useState, useEffect, useCallback } from 'react';

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
    <div className="space-y-4 text-sm">
        <details className="space-y-2" open>
            <summary className="font-medium cursor-pointer">{t('panes.shape.wrapping')}</summary>
            <div className="pt-2">
                <select
                    value={wrapping}
                    onChange={(e) => handleWrappingChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                    <option value="absolute">{t('panes.shape.wrappingOptions.inFront')}</option>
                    <option value="left">{t('panes.shape.wrappingOptions.squareLeft')}</option>
                    <option value="right">{t('panes.shape.wrappingOptions.squareRight')}</option>
                </select>
            </div>
        </details>
        {/* Position & Size */}
        <details className="space-y-2" open>
            <summary className="font-medium cursor-pointer">{t('panes.shape.transform')}</summary>
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.left')}</label>
                    <input type="number" value={parseStyle(styles.left as string, 0)} onChange={e => handleStyleChange({ left: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 disabled:opacity-50" disabled={wrapping !== 'absolute'}/>
                </div>
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.top')}</label>
                    <input type="number" value={parseStyle(styles.top as string, 0)} onChange={e => handleStyleChange({ top: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 disabled:opacity-50" disabled={wrapping !== 'absolute'}/>
                </div>
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">{isLine ? t('panes.shape.length') : t('panes.shape.width')}</label>
                    <input type="number" value={parseStyle(styles.width as string, 100)} onChange={e => handleStyleChange({ width: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                </div>
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">{isLine ? t('panes.shape.lineThickness') : t('panes.shape.height')}</label>
                    <input type="number" value={parseStyle(styles.height as string, isLine ? 2 : 100)} onChange={e => handleStyleChange({ height: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                </div>
            </div>
            <div className="pt-2">
                <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.rotation')} ({currentRotation}°)</label>
                <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={currentRotation}
                    onChange={e => handleStyleChange({ transform: `rotate(${e.target.value}deg)`})}
                    className="w-full"
                />
            </div>
        </details>
        
        {/* Fill & Border */}
        <details className="space-y-2" open>
            <summary className="font-medium cursor-pointer">{t('panes.shape.style')}</summary>
            <div className="space-y-2 pt-2">
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">{isLine ? t('panes.shape.lineColor') : t('panes.shape.fillColor')}</label>
                    <input type="color" value={currentBgColor} onChange={e => handleStyleChange({ backgroundColor: e.target.value })} className="w-full h-8 p-0 border-none rounded-md cursor-pointer"/>
                </div>
                {!isLine && (
                    <>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">{shapeType === 'textbox' ? t('panes.shape.bgOpacity') : t('panes.shape.opacity')}</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={currentOpacity}
                                onChange={e => handleStyleChange({ opacity: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.borderColor')}</label>
                                <input type="color" value={parseColor(styles.borderColor, '#000000')} onChange={e => handleStyleChange({ borderColor: e.target.value })} className="w-full h-8 p-0 border-none rounded-md cursor-pointer"/>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.borderWidth')}</label>
                                <input type="number" min="0" value={parseStyle(styles.borderWidth as string, 1)} onChange={e => handleStyleChange({ borderWidth: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.borderStyle')}</label>
                            <select
                                value={styles.borderStyle}
                                onChange={(e) => handleStyleChange({ borderStyle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                                <option value="solid">{t('panes.shape.borderStyles.solid')}</option>
                                <option value="dashed">{t('panes.shape.borderStyles.dashed')}</option>
                                <option value="dotted">{t('panes.shape.borderStyles.dotted')}</option>
                                <option value="none">{t('panes.shape.borderStyles.none')}</option>
                            </select>
                        </div>
                        {(shapeType === 'rectangle' || shapeType === 'textbox') && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.cornerRadius')}</label>
                                <input type="number" min="0" value={parseStyle(styles.borderRadius as string, 0)} onChange={e => handleStyleChange({ borderRadius: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                            </div>
                        )}
                    </>
                )}
            </div>
        </details>

         <details className="space-y-2" open>
            <summary className="font-medium cursor-pointer">{t('panes.shape.shadow')}</summary>
            <div className="space-y-2 pt-2">
                <div className="flex items-center">
                    <input id="shadow-enabled" type="checkbox" checked={currentShadow.enabled} onChange={e => handleShadowChange('enabled', e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="shadow-enabled" className="ml-2 text-xs text-gray-700 dark:text-gray-300">{t('panes.image.enableShadow')}</label>
                </div>
                {currentShadow.enabled && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('panes.image.xOffset')}</label>
                                <input type="number" value={currentShadow.offsetX} onChange={e => handleShadowChange('offsetX', parseInt(e.target.value, 10))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('panes.image.yOffset')}</label>
                                <input type="number" value={currentShadow.offsetY} onChange={e => handleShadowChange('offsetY', parseInt(e.target.value, 10))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">{t('panes.image.blur')}</label>
                            <input type="number" min="0" value={currentShadow.blur} onChange={e => handleShadowChange('blur', parseInt(e.target.value, 10))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">{t('panes.image.color')}</label>
                            <input type="color" value={currentShadow.color} onChange={e => handleShadowChange('color', e.target.value)} className="w-full h-8 p-0 border-none rounded-md cursor-pointer"/>
                        </div>
                    </>
                )}
            </div>
        </details>

        {shapeType === 'textbox' && (
             <details className="space-y-2" open>
                <summary className="font-medium cursor-pointer">{t('panes.shape.text')}</summary>
                 <div className="space-y-2 pt-2">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('panes.shape.padding')}</label>
                        <input type="number" min="0" value={parseStyle(styles.padding as string, 5)} onChange={e => handleStyleChange({ padding: `${e.target.value}px` })} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                    </div>
                </div>
            </details>
        )}
        
        <details className="space-y-2" open>
            <summary className="font-medium cursor-pointer">{t('panes.shape.arrange')}</summary>
            <div className="flex items-center gap-2 pt-2">
                <button disabled={wrapping !== 'absolute'} onClick={() => onChangeZIndex(editingElement, 'front')} className="px-3 py-1.5 text-xs rounded-md flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">{t('panes.image.bringForward')}</button>
                <button disabled={wrapping !== 'absolute'} onClick={() => onChangeZIndex(editingElement, 'back')} className="px-3 py-1.5 text-xs rounded-md flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">{t('panes.image.sendBackward')}</button>
            </div>
        </details>
    </div>
  );
};

export default ShapePane;