import React, { useState, useEffect, useCallback } from 'react';
import type { ImageOptions } from '../../App';
import { SparklesIcon, ScissorsIcon } from '../icons/EditorIcons';

interface ImagePaneProps {
  onApplyImageSettings: (options: ImageOptions, elementToUpdate: HTMLImageElement | null, keepPanelOpen?: boolean) => void;
  onClose: () => void;
  editingElement: HTMLImageElement | null;
  onUpdateElementStyle: (element: HTMLElement, styles: React.CSSProperties) => void;
  onChangeZIndex: (element: HTMLElement, direction: 'front' | 'back') => void;
  onAiImageEdit: (prompt: string) => void;
  onOpenCropModal: () => void;
  t: (key: string) => string;
}

interface ShadowState {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
}

const parseStyle = (value: string | undefined | null, defaultValue: number): number => {
    if (value === undefined || value === null || value === 'auto') return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

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

const ImagePane: React.FC<ImagePaneProps> = ({ onApplyImageSettings, editingElement, onUpdateElementStyle, onChangeZIndex, onAiImageEdit, onOpenCropModal, t }) => {
    const [sourceType, setSourceType] = useState<'url' | 'upload'>('url');
    const [url, setUrl] = useState('');
    const [fileSrc, setFileSrc] = useState('');
    const [aiEditPrompt, setAiEditPrompt] = useState('');
    
    const [styles, setStyles] = useState({
        width: '',
        height: '',
        align: 'none' as ImageOptions['align'],
        opacity: 1,
        borderRadius: '0px',
        transform: 'rotate(0deg)',
        boxShadow: 'none',
    });
    
    const isEditing = !!editingElement;

    useEffect(() => {
        if (editingElement) {
            const computedStyle = window.getComputedStyle(editingElement);
            const src = editingElement.src;
            if (src.startsWith('data:')) {
                setSourceType('upload');
                setFileSrc(src);
                setUrl('');
            } else {
                setSourceType('url');
                setUrl(src);
                setFileSrc('');
            }

            const float = computedStyle.float;
            const display = computedStyle.display;
            const position = computedStyle.position;
            let currentAlign: ImageOptions['align'] = 'none';
            
            if (position === 'absolute') {
                currentAlign = 'absolute';
            } else if (float === 'left') {
                currentAlign = 'left';
            } else if (float === 'right') {
                currentAlign = 'right';
            } else if (display === 'block') {
                currentAlign = 'center';
            }
            
            setStyles({
                width: computedStyle.width.replace('px', ''),
                height: computedStyle.height.replace('px', ''),
                align: currentAlign,
                opacity: parseFloat(computedStyle.opacity) || 1,
                borderRadius: computedStyle.borderRadius,
                transform: computedStyle.transform,
                boxShadow: computedStyle.boxShadow,
            });
        }
    }, [editingElement]);
    
    const handleStyleChange = useCallback((newStyles: Partial<React.CSSProperties>) => {
        if (editingElement) {
            setStyles(prev => ({...prev, ...newStyles} as typeof prev));
            onUpdateElementStyle(editingElement, newStyles);
        }
    }, [editingElement, onUpdateElementStyle]);
    
    const handleShadowChange = (prop: keyof ShadowState, value: any) => {
      const currentShadow = parseBoxShadow(styles.boxShadow);
      const newShadowState = { ...currentShadow, [prop]: value };
      
      if (!newShadowState.enabled) {
          handleStyleChange({ boxShadow: 'none' });
      } else {
          const shadowString = `${newShadowState.offsetX}px ${newShadowState.offsetY}px ${newShadowState.blur}px ${newShadowState.color}`;
          handleStyleChange({ boxShadow: shadowString });
      }
  };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFileSrc(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleApply = () => {
        const src = sourceType === 'url' ? url.trim() : fileSrc;
        if (src) {
            onApplyImageSettings({ src, width: styles.width, height: styles.height, align: styles.align }, editingElement);
        }
    };
    
    const handleAiEdit = () => {
        if(aiEditPrompt.trim()) {
            onAiImageEdit(aiEditPrompt);
            setAiEditPrompt('');
        }
    };

    const handleAlignmentChange = (align: ImageOptions['align']) => {
        if (editingElement) {
            const options: ImageOptions = {
                src: editingElement.src,
                width: editingElement.style.width.replace(/px$/, ''),
                height: editingElement.style.height.replace(/px$/, ''),
                align,
            };
            onApplyImageSettings(options, editingElement, true);
            setStyles(s => ({ ...s, align }));
        }
    };

    const isApplyDisabled = sourceType === 'url' ? !url.trim() : !fileSrc;
    const currentRotation = parseTransform(styles.transform);
    const currentShadow = parseBoxShadow(styles.boxShadow);

    return (
        <div className="space-y-6 text-sm animate-in fade-in slide-in-from-right-4 duration-300 custom-scrollbar max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8">
            {isEditing && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('panes.image.actions')}</h3>
                    <div className="space-y-3">
                        <button onClick={onOpenCropModal} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95">
                            <ScissorsIcon className="w-4 h-4 opacity-70" />
                            <span>{t('panes.image.cropImage')}</span>
                        </button>
                        <div className="space-y-2">
                            <label htmlFor="ai-image-edit" className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.aiEdit')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="ai-image-edit"
                                    value={aiEditPrompt}
                                    onChange={e => setAiEditPrompt(e.target.value)}
                                    placeholder={t('panes.image.aiEditPlaceholder')}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                                    className="flex-grow px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                                />
                                <button 
                                    onClick={handleAiEdit} 
                                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 relative overflow-hidden group/ai" 
                                    disabled={!aiEditPrompt.trim()}
                                >
                                    <SparklesIcon className="w-4 h-4 relative z-10" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isEditing && (
              <div className="space-y-4">
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button onClick={() => setSourceType('url')} className={`px-4 py-2 text-xs font-semibold rounded-lg flex-1 transition-all ${sourceType === 'url' ? 'bg-white dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('panes.image.fromUrl')}</button>
                    <button onClick={() => setSourceType('upload')} className={`px-4 py-2 text-xs font-semibold rounded-lg flex-1 transition-all ${sourceType === 'upload' ? 'bg-white dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('panes.image.upload')}</button>
                </div>

                {sourceType === 'url' ? (
                     <div className="space-y-2">
                        <label htmlFor="image-url" className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.imageUrl')}</label>
                        <input
                            type="text"
                            id="image-url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://example.com/image.png"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label htmlFor="image-upload" className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.uploadFile')}</label>
                        <div className="relative group">
                            <input
                                type="file"
                                id="image-upload"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-600 hover:file:bg-blue-600 hover:file:text-white transition-all cursor-pointer"
                            />
                        </div>
                         {fileSrc && (
                             <div className="mt-4 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <img src={fileSrc} alt="Preview" className="rounded-lg max-w-full h-auto" />
                             </div>
                         )}
                    </div>
                )}
              </div>
            )}
            
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('panes.image.transform')}</h3>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label htmlFor="image-width" className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.width')}</label>
                        <input
                            type="number"
                            id="image-width"
                            value={parseStyle(styles.width, 0)}
                            onChange={e => handleStyleChange({ width: `${e.target.value}px` })}
                            placeholder="auto"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                        />
                    </div>
                     <div className="space-y-2">
                        <label htmlFor="image-height" className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.height')}</label>
                        <input
                            type="number"
                            id="image-height"
                            value={parseStyle(styles.height, 0)}
                            onChange={e => handleStyleChange({ height: `${e.target.value}px` })}
                            placeholder="auto"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('panes.image.rotation')}</label>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-600/10 px-2 py-0.5 rounded-full">{currentRotation}°</span>
                    </div>
                    <input
                        type="range"
                        min="-180" max="180" step="1"
                        value={currentRotation}
                        onChange={e => handleStyleChange({ transform: `rotate(${e.target.value}deg)`})}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="image-wrapping" className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.wrapping')}</label>
                    <select
                        id="image-wrapping"
                        value={styles.align}
                        onChange={e => handleAlignmentChange(e.target.value as ImageOptions['align'])}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                        <option value="none">{t('panes.image.wrappingOptions.inline')}</option>
                        <option value="left">{t('panes.image.wrappingOptions.squareLeft')}</option>
                        <option value="right">{t('panes.image.wrappingOptions.squareRight')}</option>
                        <option value="center">{t('panes.image.wrappingOptions.topBottom')}</option>
                        <option value="absolute">{t('panes.image.wrappingOptions.inFront')}</option>
                    </select>
                </div>
            </div>
            
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('panes.image.style')}</h3>
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('panes.image.opacity')}</label>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-600/10 px-2 py-0.5 rounded-full">{Math.round(styles.opacity * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.1"
                            value={styles.opacity}
                            onChange={e => handleStyleChange({ opacity: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.cornerRadius')}</label>
                        <input 
                            type="number" min="0" 
                            value={parseStyle(styles.borderRadius, 0)} 
                            onChange={e => handleStyleChange({ borderRadius: `${e.target.value}px` })} 
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"/>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('panes.image.shadow')}</h3>
                    <div className="flex items-center group cursor-pointer">
                        <input id="shadow-enabled" type="checkbox" checked={currentShadow.enabled} onChange={e => handleShadowChange('enabled', e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-700 rounded focus:ring-blue-500/20 bg-white dark:bg-gray-800 transition-all cursor-pointer" />
                        <label htmlFor="shadow-enabled" className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{t('panes.image.enableShadow')}</label>
                    </div>
                </div>
                {currentShadow.enabled && (
                    <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.xOffset')}</label>
                                <input type="number" value={currentShadow.offsetX} onChange={e => handleShadowChange('offsetX', parseInt(e.target.value, 10))} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"/>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.yOffset')}</label>
                                <input type="number" value={currentShadow.offsetY} onChange={e => handleShadowChange('offsetY', parseInt(e.target.value, 10))} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.blur')}</label>
                            <input type="number" min="0" value={currentShadow.blur} onChange={e => handleShadowChange('blur', parseInt(e.target.value, 10))} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"/>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{t('panes.image.color')}</label>
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                <input type="color" value={currentShadow.color} onChange={e => handleShadowChange('color', e.target.value)} className="w-8 h-8 p-0 border-none rounded-lg cursor-pointer bg-transparent"/>
                                <span className="text-xs font-mono text-gray-500 font-semibold">{currentShadow.color}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isEditing && styles.align === 'absolute' && (
                 <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('panes.image.arrange')}</h3>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onChangeZIndex(editingElement!, 'front')} className="px-4 py-2 text-xs font-semibold rounded-lg flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all active:scale-95">{t('panes.image.bringForward')}</button>
                        <button onClick={() => onChangeZIndex(editingElement!, 'back')} className="px-4 py-2 text-xs font-semibold rounded-lg flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all active:scale-95">{t('panes.image.sendBackward')}</button>
                    </div>
                </div>
            )}

            {!isEditing && (
                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleApply}
                        disabled={isApplyDisabled}
                        type="button"
                        className="px-8 py-3 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {t('panes.image.insert')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImagePane;