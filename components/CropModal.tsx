import React, { useState, useRef, useCallback, useEffect } from 'react';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (dataUrl: string, newWidth: number, newHeight: number) => void;
  imageSrc: string | null;
  t: (key: string) => string;
}

const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose, onApply, imageSrc, t }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropStartCoords = useRef({ x: 0, y: 0 });

  const resetState = useCallback(() => {
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    setIsCropping(false);
  }, []);
  
  const onImageLoad = () => {
    if (imageRef.current) {
        setCrop({ x: 0, y: 0, width: imageRef.current.width, height: imageRef.current.height });
    }
  };

  useEffect(() => {
    if (!isOpen) {
        resetState();
    }
  }, [isOpen, resetState]);

  if (!isOpen || !imageSrc) return null;

  const getCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getCoords(e);
    setIsCropping(true);
    cropStartCoords.current = { x, y };
    setCrop({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !imageRef.current) return;
    const { x, y } = getCoords(e);
    const startX = cropStartCoords.current.x;
    const startY = cropStartCoords.current.y;
    
    const newX = Math.min(startX, x);
    const newY = Math.min(startY, y);
    const newWidth = Math.abs(x - startX);
    const newHeight = Math.abs(y - startY);

    const imgWidth = imageRef.current.width;
    const imgHeight = imageRef.current.height;

    const constrainedX = Math.max(0, newX);
    const constrainedY = Math.max(0, newY);
    const constrainedWidth = Math.min(newWidth, imgWidth - constrainedX);
    const constrainedHeight = Math.min(newHeight, imgHeight - constrainedY);

    setCrop({
        x: constrainedX,
        y: constrainedY,
        width: constrainedWidth,
        height: constrainedHeight,
    });
  };

  const handleMouseUp = () => {
    setIsCropping(false);
  };

  const handleApply = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || crop.width <= 0 || crop.height <= 0) return;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const newWidth = crop.width * scaleX;
    const newHeight = crop.height * scaleY;

    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    onApply(canvas.toDataURL('image/png'), newWidth, newHeight);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <h3 id="crop-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('panes.image.cropImage')}</h3>
        <div className="flex-grow overflow-auto flex items-center justify-center bg-gray-200 dark:bg-gray-900 rounded-md">
            <div 
                className="relative select-none" 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img 
                    ref={imageRef} 
                    src={imageSrc} 
                    alt="Crop preview" 
                    className="max-w-full max-h-[65vh] mx-auto"
                    onLoad={onImageLoad}
                    crossOrigin="anonymous"
                />
                <div 
                    className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-25 pointer-events-none" 
                    style={{
                        left: crop.x,
                        top: crop.y,
                        width: crop.width,
                        height: crop.height,
                    }}
                />
            </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="mt-4 flex justify-end gap-3">
            <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border border-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
            >
                {t('modals.import.cancel')}
            </button>
            <button
                onClick={handleApply}
                type="button"
                disabled={crop.width <= 0 || crop.height <= 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
                {t('panes.image.applyCrop')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CropModal;