import React, { useState, useRef, useCallback } from 'react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (base64Image: string) => void;
  t: (key: string) => string;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, t }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropStartCoords = useRef({ x: 0, y: 0 });
  
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setCrop({ x: 0, y: 0, width: 0, height: 0 });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

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
    if (!isCropping) return;
    const { x, y } = getCoords(e);
    const startX = cropStartCoords.current.x;
    const startY = cropStartCoords.current.y;
    
    setCrop({
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY)
    });
  };

  const handleMouseUp = () => {
    setIsCropping(false);
  };

  const handleExtract = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || crop.width === 0 || crop.height === 0) return;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

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

    onImport(canvas.toDataURL('image/jpeg'));
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <h3 id="import-title" className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('modals.import.title')}</h3>
        <div className="flex-grow overflow-y-auto">
          {!imageSrc ? (
            <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('modals.import.instructions')}</p>
              <label className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">
                <span>{t('modals.import.selectFile')}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
          ) : (
            <div>
                <p className="mb-2 text-sm text-center text-gray-600 dark:text-gray-400">{t('modals.import.cropInstruction')}</p>
                <div 
                    className="relative select-none" 
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img ref={imageRef} src={imageSrc} alt="Document preview" className="max-w-full max-h-[60vh] mx-auto" />
                    {crop.width > 0 && (
                        <div 
                            className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-25" 
                            style={{
                                left: crop.x,
                                top: crop.y,
                                width: crop.width,
                                height: crop.height,
                            }}
                        />
                    )}
                </div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="mt-4 flex justify-end gap-3">
            <button
                onClick={handleClose}
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 border border-transparent rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
                {t('modals.import.cancel')}
            </button>
            <button
                onClick={handleExtract}
                type="button"
                disabled={crop.width === 0 || crop.height === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {t('modals.import.extract')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
