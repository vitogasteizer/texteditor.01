import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TextShadowDropdownProps {
  targetRef: React.RefObject<HTMLElement>;
  initialValue: string;
  onApply: (shadow: string) => void;
  onRemove: () => void;
  onClose: () => void;
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

const TextShadowDropdown: React.FC<TextShadowDropdownProps> = ({ targetRef, initialValue, onApply, onRemove, onClose }) => {
    const [shadow, setShadow] = useState<ShadowState>({ offsetX: 2, offsetY: 2, blur: 2, color: '#000000', opacity: 1 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            setPosition({ top: rect.bottom + 4, left: rect.left });
        }
    }, [targetRef]);

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
        <div>
            <label className="block text-xs text-gray-500 mb-1">{label} ({shadow[prop]})</label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={shadow[prop]}
                onChange={e => setShadow(prev => ({ ...prev, [prop]: parseFloat(e.target.value) }))}
                className="w-full"
            />
        </div>
    );

    return createPortal(
        <div 
            ref={dropdownRef} 
            style={{ top: `${position.top}px`, left: `${position.left}px` }} 
            className="fixed w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700 text-sm"
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="space-y-3">
                {renderSlider('X Offset', 'offsetX', -10, 10)}
                {renderSlider('Y Offset', 'offsetY', -10, 10)}
                {renderSlider('Blur', 'blur', 0, 20)}
                
                <div>
                     <label className="block text-xs text-gray-500 mb-1">Color</label>
                     <input 
                        type="color" 
                        value={shadow.color} 
                        onChange={e => setShadow(prev => ({...prev, color: e.target.value}))} 
                        className="w-full h-8 p-0 border-none rounded-md cursor-pointer"
                    />
                </div>

                {renderSlider('Opacity', 'opacity', 0, 1, 0.05)}

                <div className="flex justify-between items-center pt-2">
                    <button onClick={handleRemove} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded-md hover:bg-red-200 dark:hover:bg-red-900">
                        Remove
                    </button>
                    <button onClick={handleApply} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        Apply
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TextShadowDropdown;