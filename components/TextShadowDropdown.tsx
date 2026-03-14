import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TextShadowDropdownProps {
  targetRef: React.RefObject<HTMLElement>;
  initialValue: string;
  onApply: (shadow: string) => void;
  onRemove: () => void;
  onClose: () => void;
  t: (key: string) => string;
  isBottom?: boolean;
}

interface ShadowState {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
    opacity: number;
}

function hexToRgba(hex: string, alpha: number): string {
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

function rgbaToHex(rgba: string): { hex: string, alpha: number } {
    if (!rgba || !rgba.startsWith('rgb')) return { hex: '#000000', alpha: 1 };
    const parts = rgba.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return { hex: '#000000', alpha: 1 };

    const r = parseInt(parts[0]).toString(16).padStart(2, '0');
    const g = parseInt(parts[1]).toString(16).padStart(2, '0');
    const b = parseInt(parts[2]).toString(16).padStart(2, '0');
    
    const alpha = parts.length >= 4 ? parseFloat(parts[3]) : 1;

    return { hex: `#${r}${g}${b}`, alpha };
}

const TextShadowDropdown: React.FC<TextShadowDropdownProps> = ({ targetRef, initialValue, onApply, onRemove, onClose, t, isBottom }) => {
    const [shadow, setShadow] = useState<ShadowState>({ offsetX: 2, offsetY: 2, blur: 2, color: '#000000', opacity: 1 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            const dropdownHeight = 360; // Estimated height
            let top = rect.bottom + 4;
            let left = rect.left;

            if (isBottom || (top + dropdownHeight > window.innerHeight)) {
                top = rect.top - dropdownHeight - 4;
            }

            if (left + 256 > window.innerWidth) {
                left = window.innerWidth - 256 - 16;
            }

            setPosition({ top, left });
        }
    }, [targetRef, isBottom]);

    useEffect(() => {
        const defaultState: ShadowState = { offsetX: 2, offsetY: 2, blur: 2, color: '#000000', opacity: 1 };
        if (!initialValue || initialValue === 'none') {
            setShadow(defaultState);
            return;
        }

        const colorMatch = /(rgba?\(.+?\)|#\w+)/.exec(initialValue);
        const pxValues = initialValue.match(/-?\d+(\.\d+)?px/g) || [];
        
        let color = defaultState.color;
        let opacity = defaultState.opacity;

        if (colorMatch) {
            const parsedColor = rgbaToHex(colorMatch[0]);
            color = parsedColor.hex;
            opacity = parsedColor.alpha;
        }

        setShadow({
            offsetX: pxValues[0] ? parseFloat(pxValues[0]) : defaultState.offsetX,
            offsetY: pxValues[1] ? parseFloat(pxValues[1]) : defaultState.offsetY,
            blur: pxValues[2] ? parseFloat(pxValues[2]) : defaultState.blur,
            color,
            opacity,
        });
    }, [initialValue]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                targetRef.current && !targetRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, targetRef]);

    const handleApply = () => {
        const rgbaColor = hexToRgba(shadow.color, shadow.opacity);
        const shadowString = `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${rgbaColor}`;
        onApply(shadowString);
        onClose();
    };
    
    const handleRemove = () => {
        onRemove();
        onClose();
    };

    if (!position) return null;
    
    const renderSlider = (label: string, prop: keyof Omit<ShadowState, 'color'>, min: number, max: number, step = 1) => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{label}</label>
                <span className="text-[10px] font-black bg-white/20 dark:bg-white/5 px-2 py-0.5 rounded-lg text-gray-600 dark:text-gray-300 backdrop-blur-sm border border-white/10">{shadow[prop]}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={shadow[prop]}
                onChange={e => setShadow(prev => ({ ...prev, [prop]: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all hover:accent-blue-500"
            />
        </div>
    );

    return createPortal(
        <div 
            ref={dropdownRef} 
            style={{ top: `${position.top}px`, left: `${position.left}px` }} 
            className="fixed w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-white/5 z-[60] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[80vh]"
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/5 bg-white/20 dark:bg-gray-900/20">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    {t('toolbar.textShadow')}
                </h3>
                <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/20 dark:hover:bg-white/10 rounded-xl transition-all text-gray-500 dark:text-gray-400 active:scale-90"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
                {renderSlider(t('panes.image.xOffset'), 'offsetX', -20, 20)}
                {renderSlider(t('panes.image.yOffset'), 'offsetY', -20, 20)}
                {renderSlider(t('panes.image.blur'), 'blur', 0, 30)}
                
                <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{t('panes.image.color')}</label>
                     <div className="flex items-center gap-4 p-3 bg-white/20 dark:bg-gray-900/20 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-md">
                        <input 
                            type="color" 
                            value={shadow.color} 
                            onChange={e => setShadow(prev => ({ ...prev, color: e.target.value }))}
                            className="w-10 h-10 p-0.5 border border-white/20 dark:border-white/10 rounded-xl cursor-pointer bg-white dark:bg-gray-800 shadow-inner"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-gray-900 dark:text-gray-100 uppercase font-black tracking-wider">{shadow.color}</span>
                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-[0.1em]">Shadow Color</span>
                        </div>
                     </div>
                </div>

                {renderSlider(t('panes.image.opacity'), 'opacity', 0, 1, 0.01)}
            </div>

            <div className="p-4 bg-white/20 dark:bg-gray-900/20 border-t border-white/20 dark:border-white/5 flex gap-3 backdrop-blur-md">
                <button 
                    onClick={handleRemove}
                    className="flex-1 px-4 py-2.5 text-[10px] font-black rounded-xl bg-white/40 dark:bg-gray-800/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 border border-white/20 dark:border-white/5 transition-all shadow-sm active:scale-95 uppercase tracking-[0.15em]"
                >
                    {t('common.remove')}
                </button>
                <button 
                    onClick={handleApply}
                    className="flex-1 px-4 py-2.5 text-[10px] font-black rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-[0.15em]"
                >
                    {t('common.apply')}
                </button>
            </div>
        </div>,
        document.body
    );
};

export default TextShadowDropdown;