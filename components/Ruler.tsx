
import React, { useMemo } from 'react';
import type { PageMargins } from '../App';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number; // in pixels (at 100% zoom)
  zoom: number;
  margins: PageMargins;
  pageWidth: number;
  pageHeight: number;
}

const DPI = 96;
const PX_PER_CM = DPI / 2.54; // ~37.8px per cm
const PX_PER_INCH = DPI;

const Ruler: React.FC<RulerProps> = ({ orientation, length, zoom, margins, pageWidth, pageHeight }) => {
  const isHorizontal = orientation === 'horizontal';
  const scale = zoom / 100;
  
  // Visual length needs to scale with zoom
  const visualLength = length * scale;
  
  // Calculate total centimeters based on the unscaled length (logical size)
  const totalCm = length / PX_PER_CM;
  
  // Generate ticks
  const ticks = useMemo(() => {
    const items = [];
    for (let i = 0; i <= Math.ceil(totalCm); i++) {
      const pos = i * PX_PER_CM * scale;
      if (pos > visualLength) break;

      // Main number tick
      items.push(
        <g key={`cm-${i}`} transform={isHorizontal ? `translate(${pos}, 0)` : `translate(0, ${pos})`}>
          <line
            x1="0" y1="0"
            x2={isHorizontal ? "0" : "15"}
            y2={isHorizontal ? "15" : "0"}
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <text
            x={isHorizontal ? "2" : "2"}
            y={isHorizontal ? "12" : "12"}
            fontSize="10"
            fill="#6b7280"
            transform={!isHorizontal ? "rotate(-90, 2, 12)" : undefined}
            style={{ pointerEvents: 'none', userSelect: 'none', fontSize: '9px' }}
          >
            {i}
          </text>
        </g>
      );

      // Half-cm tick
      const halfPos = pos + ((PX_PER_CM / 2) * scale);
      if (halfPos <= visualLength) {
        items.push(
          <line
            key={`half-${i}`}
            x1={isHorizontal ? halfPos : 0}
            y1={isHorizontal ? 0 : halfPos}
            x2={isHorizontal ? halfPos : 8}
            y2={isHorizontal ? 8 : halfPos}
            stroke="#d1d5db"
            strokeWidth="1"
          />
        );
      }
    }
    return items;
  }, [visualLength, isHorizontal, totalCm, scale]);

  // Gray out margins
  const marginOverlay = useMemo(() => {
      const overlays = [];
      const leftMarginPx = margins.left * PX_PER_INCH * scale;
      const rightMarginPx = margins.right * PX_PER_INCH * scale;
      const topMarginPx = margins.top * PX_PER_INCH * scale;
      const bottomMarginPx = margins.bottom * PX_PER_INCH * scale;
      const widthPx = pageWidth * scale;
      const heightPx = pageHeight * scale;

      if (isHorizontal) {
          overlays.push(<rect key="m-left" x="0" y="0" width={leftMarginPx} height="20" fill="rgba(0,0,0,0.05)" />);
          overlays.push(<rect key="m-right" x={widthPx - rightMarginPx} y="0" width={rightMarginPx} height="20" fill="rgba(0,0,0,0.05)" />);
      } else {
          overlays.push(<rect key="m-top" x="0" y="0" width="20" height={topMarginPx} fill="rgba(0,0,0,0.05)" />);
          overlays.push(<rect key="m-bottom" x="0" y={heightPx - bottomMarginPx} width="20" height={bottomMarginPx} fill="rgba(0,0,0,0.05)" />);
      }
      return overlays;
  }, [isHorizontal, margins, pageWidth, pageHeight, scale]);

  const style: React.CSSProperties = isHorizontal 
    ? { width: visualLength, height: 20, backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }
    : { width: 20, height: visualLength, backgroundColor: '#fff', borderRight: '1px solid #e5e7eb' };

  return (
    <div style={style} className="select-none">
      <svg width="100%" height="100%">
        {ticks}
        {marginOverlay}
      </svg>
    </div>
  );
};

export default Ruler;
