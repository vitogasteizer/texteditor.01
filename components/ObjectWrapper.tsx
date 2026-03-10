
import React, { useEffect, useRef } from 'react';

interface ObjectWrapperProps {
  targetElement: HTMLElement;
  onUpdate: (element: HTMLElement, styles: React.CSSProperties) => void;
  onDeselect: () => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  zoomLevel: number; // Add zoomLevel prop
}

const ObjectWrapper: React.FC<ObjectWrapperProps> = ({ targetElement, onUpdate, onDeselect, onDoubleClick, zoomLevel }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
    handle: ''
  });

  const isAbsolute = targetElement.style.position === 'absolute';

  const updatePosition = () => {
    if (!targetElement || !wrapperRef.current) return;
    
    const editorPage = document.getElementById('editor-page');
    if (!editorPage) return;

    // Get raw visual rects
    const parentRect = editorPage.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Calculate scale factor (transform: scale(x))
    // We can assume the passed zoomLevel prop is the source of truth, 
    // or calculate it from the visual width vs offsetWidth.
    // Using prop is safer if provided correctly.
    const scale = zoomLevel / 100;

    // Calculate offset in CSS pixels (unscaled)
    const top = (targetRect.top - parentRect.top) / scale;
    const left = (targetRect.left - parentRect.left) / scale;
    const width = targetRect.width / scale;
    const height = targetRect.height / scale;

    wrapperRef.current.style.top = `${top}px`;
    wrapperRef.current.style.left = `${left}px`;
    wrapperRef.current.style.width = `${width}px`;
    wrapperRef.current.style.height = `${height}px`;
  };

  useEffect(() => {
    updatePosition();
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('selectionchange', updatePosition);
    
    const observer = new MutationObserver(updatePosition);
    observer.observe(targetElement, { 
      attributes: true, 
      childList: true, 
      subtree: true,
      attributeFilter: ['style', 'class', 'width', 'height'] 
    });

    const frameId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('selectionchange', updatePosition);
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [targetElement, zoomLevel]); // Re-run when zoomLevel changes
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const interaction = interactionRef.current;
    interaction.startX = e.clientX;
    interaction.startY = e.clientY;
    
    // Use offsetWidth/Height for the element's actual CSS size (unscaled internally)
    interaction.startWidth = targetElement.offsetWidth;
    interaction.startHeight = targetElement.offsetHeight;

    if (handle) {
      interaction.isResizing = true;
      interaction.handle = handle;
      interaction.startLeft = targetElement.offsetLeft;
      interaction.startTop = targetElement.offsetTop;
    } else {
      if (!isAbsolute) return;
      interaction.isDragging = true;
      interaction.startLeft = targetElement.offsetLeft;
      interaction.startTop = targetElement.offsetTop;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    const interaction = interactionRef.current;
    if (!interaction.isDragging && !interaction.isResizing) return;

    const scale = zoomLevel / 100;

    // Adjust delta by scale to map back to CSS pixels
    const dx = (e.clientX - interaction.startX) / scale;
    const dy = (e.clientY - interaction.startY) / scale;

    const newStyles: React.CSSProperties = {};

    if (interaction.isDragging) {
      newStyles.left = `${interaction.startLeft + dx}px`;
      newStyles.top = `${interaction.startTop + dy}px`;
    } else if (interaction.isResizing) {
        let newWidth = interaction.startWidth;
        let newHeight = interaction.startHeight;

        if (interaction.handle.includes('e')) newWidth += dx;
        if (interaction.handle.includes('w')) newWidth -= dx;
        if (interaction.handle.includes('s')) newHeight += dy;
        if (interaction.handle.includes('n')) newHeight -= dy;
        
        if (newWidth > 10) newStyles.width = `${newWidth}px`;
        if (newHeight > 10) newStyles.height = `${newHeight}px`;

        if (isAbsolute) {
            let newLeft = interaction.startLeft;
            let newTop = interaction.startTop;
            if (interaction.handle.includes('w')) newLeft += dx;
            if (interaction.handle.includes('n')) newTop += dy;
            
            if (newWidth > 10) newStyles.left = `${newLeft}px`;
            if (newHeight > 10) newStyles.top = `${newTop}px`;
        }
    }
    
    Object.assign(targetElement.style, newStyles);
    updatePosition();
  };
  
  const handleMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    const interaction = interactionRef.current;
    
    if (interaction.isDragging || interaction.isResizing) {
        const finalStyles: React.CSSProperties = {
            width: targetElement.style.width,
            height: targetElement.style.height,
        };
        if (isAbsolute) {
            finalStyles.left = targetElement.style.left;
            finalStyles.top = targetElement.style.top;
            finalStyles.position = 'absolute';
        }
        onUpdate(targetElement, finalStyles);
    }
    
    interaction.isDragging = false;
    interaction.isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

  return (
    <div
      ref={wrapperRef}
      className="absolute border-2 border-blue-500 pointer-events-none z-20"
      onMouseDown={(e) => handleMouseDown(e)}
      onDoubleClick={onDoubleClick}
      style={{ pointerEvents: 'auto', cursor: isAbsolute ? 'move' : 'default' }}
    >
      {handles.map(handle => (
        <div
          key={handle}
          onMouseDown={(e) => handleMouseDown(e, handle)}
          className={`absolute w-3 h-3 bg-white border border-blue-600 rounded-full z-30 cursor-${handle}-resize`}
          style={{
            top: handle.includes('n') ? '-7px' : handle.includes('s') ? 'calc(100% - 7px)' : 'calc(50% - 7px)',
            left: handle.includes('w') ? '-7px' : handle.includes('e') ? 'calc(100% - 7px)' : 'calc(50% - 7px)',
            pointerEvents: 'auto'
          }}
        />
      ))}
    </div>
  );
};

export default ObjectWrapper;
