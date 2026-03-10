import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PencilIcon, EraserIcon, UndoIcon, RedoIcon, TrashIcon, SlashIcon } from './icons/EditorIcons';

interface DrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialDataUrl?: string | null;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

type Tool = 'pencil' | 'eraser' | 'line';

const DrawingModal: React.FC<DrawingModalProps> = ({ isOpen, onClose, onSave, initialDataUrl, t }) => {
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);
  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);

  const saveState = useCallback(() => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      history.current.splice(historyIndex.current + 1);
      history.current.push(dataUrl);
      historyIndex.current = history.current.length - 1;
    }
  }, []);
  
  const restoreState = useCallback((index: number) => {
    if (canvasRef.current && history.current[index]) {
      const ctx = contextRef.current;
      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx?.drawImage(img, 0, 0);
      };
      img.src = history.current[index];
    }
  }, []);

  const handleUndo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      restoreState(historyIndex.current);
    }
  };

  const handleRedo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current += 1;
      restoreState(historyIndex.current);
    }
  };

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      contextRef.current = ctx;

      const container = canvas.parentElement as HTMLElement;
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;

      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      history.current = [];
      historyIndex.current = -1;

      if (initialDataUrl) {
          const img = new Image();
          img.onload = () => {
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              saveState();
          };
          img.crossOrigin = 'anonymous';
          img.src = initialDataUrl;
      } else {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          saveState();
      }
    }
  }, [isOpen, initialDataUrl, saveState]);
  
  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (!contextRef.current) return;
    const { x, y } = getMousePos(e);
    setIsDrawing(true);
    startPos.current = { x, y };
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    snapshot.current = contextRef.current.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };
  
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !contextRef.current) return;
    const { x, y } = getMousePos(e);
    
    contextRef.current.lineWidth = lineWidth;
    contextRef.current.strokeStyle = color;
    
    if (tool === 'eraser') {
      contextRef.current.globalCompositeOperation = 'destination-out';
    } else {
      contextRef.current.globalCompositeOperation = 'source-over';
    }

    if (tool === 'pencil' || tool === 'eraser') {
      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
    } else if (tool === 'line') {
      if (snapshot.current) {
        contextRef.current.putImageData(snapshot.current, 0, 0);
      }
      contextRef.current.beginPath();
      contextRef.current.moveTo(startPos.current.x, startPos.current.y);
      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
    }
  };
  
  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    contextRef.current?.closePath();
    saveState();
  };

  const handleClear = () => {
    if (canvasRef.current && contextRef.current) {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveState();
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
  };
  
  const ToolButton: React.FC<{ myTool: Tool; label: string; children: React.ReactNode; }> = ({ myTool, label, children }) => (
    <button
      title={label}
      onClick={() => setTool(myTool)}
      className={`p-2 rounded-md transition-colors ${tool === myTool ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawing-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 id="drawing-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('modals.drawing.title')}</h3>
        </header>

        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
                <ToolButton myTool="pencil" label={t('modals.drawing.tools.pencil')}><PencilIcon /></ToolButton>
                <ToolButton myTool="eraser" label={t('modals.drawing.tools.eraser')}><EraserIcon /></ToolButton>
                <ToolButton myTool="line" label={t('modals.drawing.tools.line')}><SlashIcon /></ToolButton>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-2"></div>
                <button onClick={handleUndo} disabled={historyIndex.current <= 0} title={t('toolbar.undo')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><UndoIcon /></button>
                <button onClick={handleRedo} disabled={historyIndex.current >= history.current.length - 1} title={t('toolbar.redo')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><RedoIcon /></button>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-2"></div>
                <button onClick={handleClear} title={t('modals.drawing.tools.clear')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><TrashIcon /></button>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-300" htmlFor="lineWidth">{t('modals.drawing.tools.lineWidth')}:</label>
                <input type="range" id="lineWidth" min="1" max="50" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-24" />
                <input type="color" value={color} onChange={e => setColor(e.target.value)} title={t('modals.drawing.tools.color')} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
            </div>
        </div>
        
        <main className="flex-grow bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="cursor-crosshair bg-white w-full h-full"
            />
        </main>
        
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border rounded-md hover:bg-gray-200 dark:hover:bg-gray-500">
            {t('modals.sourceCode.cancel')}
          </button>
          <button onClick={handleSave} type="button" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700">
            {initialDataUrl ? t('modals.drawing.update') : t('modals.drawing.insert')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default DrawingModal;