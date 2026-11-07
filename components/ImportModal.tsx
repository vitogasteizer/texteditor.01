import React, { useState, useRef } from 'react';
import { CloseIcon, UploadCloudIcon, SparklesIcon, EyeIcon } from './icons/EditorIcons';
import { 
  extractTextFromPdf, 
  renderPdfPageToDataUrl, 
  renderAllPdfPagesToDataUrls,
  getPdfInfo
} from '../lib/pdfHelper';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDocument: (htmlContent: string, mode: 'replace' | 'append', orientation?: 'portrait' | 'landscape') => void;
  onPerformAiOcr?: (base64Image: string) => Promise<string>;
  t: (key: string) => string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportDocument,
  onPerformAiOcr,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [pdfPagesCount, setPdfPagesCount] = useState<number>(1);
  const [detectedOrientation, setDetectedOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  // ჩატვირთვის რეჟიმი: 'visual' (ვიზუალური გვერდები) თუ 'text' (რედაქტირებადი ტექსტი)
  const [importType, setImportType] = useState<'visual' | 'text'>('visual');
  // მიმართულება: 'replace' (ახალ დოკუმენტად) თუ 'append' (არსებულზე დამატება)
  const [destMode, setDestMode] = useState<'replace' | 'append'>('replace');

  // პროცესის სტატუსი
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');

  // სურათის მოჭრა (Crop)
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropStartCoords = useRef({ x: 0, y: 0 });

  if (!isOpen) return null;

  // ფაილის არჩევა
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setCrop({ x: 0, y: 0, width: 0, height: 0 });

      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      setFileType(isPdf ? 'pdf' : 'image');
      setImportType(isPdf ? 'visual' : 'text');

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setFileDataUrl(dataUrl);

        if (isPdf) {
          setIsLoading(true);
          setProgressStatus('PDF ფაილის ანალიზი...');
          try {
            const thumb = await renderPdfPageToDataUrl(dataUrl, 1);
            setPreviewThumbnail(thumb);
            const pdfInfo = await getPdfInfo(dataUrl);
            setPdfPagesCount(pdfInfo.pagesCount || 1);
            setDetectedOrientation(pdfInfo.orientation);
          } catch (err) {
            console.warn('PDF-ის მინიატურის შეცდომა:', err);
          } finally {
            setIsLoading(false);
            setProgressStatus('');
          }
        } else {
          setPreviewThumbnail(dataUrl);
          const img = new Image();
          img.onload = () => {
            const isLandscape = img.naturalWidth > img.naturalHeight;
            setDetectedOrientation(isLandscape ? 'landscape' : 'portrait');
          };
          img.src = dataUrl;
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  // მთავარი ქმედება: დოკუმენტში ჩატვირთვა
  const handleExecuteImport = async () => {
    if (!fileDataUrl || !fileType) return;
    setIsLoading(true);

    try {
      if (fileType === 'pdf') {
        if (importType === 'visual') {
          // 1. ვიზუალური გვერდების რენდერი (თითოეული გვერდი რეალურ ფურცლად)
          setProgressStatus(`მუშავდება 1 / ${pdfPagesCount} გვერდი...`);
          const renderResult = await renderAllPdfPagesToDataUrls(
            fileDataUrl, 
            60, 
            (cur, total) => setProgressStatus(`მუშავდება ${cur} / ${total} გვერდი...`)
          );

          const htmlSheets = renderResult.pages.map((pageDataUrl, idx) => `
            <div class="pdf-page-sheet w-full" data-pdf-page="${idx + 1}" data-aspect-ratio="${renderResult.aspectRatio}" data-orientation="${renderResult.orientation}">
              <img 
                src="${pageDataUrl}" 
                alt="გვერდი ${idx + 1}" 
                class="pdf-page-img"
              />
            </div>
          `).join('\n<div class="page-break-indicator"></div>\n');

          onImportDocument(htmlSheets, destMode, renderResult.orientation);
          handleClose();
        } else {
          // 2. ტექსტის ამოღება
          setProgressStatus('ტექსტური შრის ამოღება...');
          const { formattedHtml, text, orientation } = await extractTextFromPdf(fileDataUrl);

          // თუ ციფრული ტექსტი მოიძებნა
          if (text && text.trim().length > 30) {
            onImportDocument(formattedHtml, destMode, orientation);
            handleClose();
            return;
          }

          // თუ სკანირებულია, გავუშვათ Gemini OCR პირველ გვერდზე
          if (onPerformAiOcr) {
            setProgressStatus('სკანირებული PDF-ის ამოცნობა (Gemini AI OCR)...');
            const pageImg = previewThumbnail || await renderPdfPageToDataUrl(fileDataUrl, 1);
            const ocrResult = await onPerformAiOcr(pageImg);
            const html = ocrResult.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
            onImportDocument(html, destMode, orientation || detectedOrientation);
            handleClose();
          } else {
            onImportDocument(formattedHtml, destMode, orientation);
            handleClose();
          }
        }
      } else {
        // სურათის დამუშავება
        let targetImg = fileDataUrl;
        if (crop.width > 20 && crop.height > 20 && imageRef.current && canvasRef.current) {
          const img = imageRef.current;
          const canvas = canvasRef.current;
          const scaleX = img.naturalWidth / img.width;
          const scaleY = img.naturalHeight / img.height;
          canvas.width = crop.width * scaleX;
          canvas.height = crop.height * scaleY;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
            targetImg = canvas.toDataURL('image/jpeg', 0.9);
          }
        }

        if (importType === 'text' && onPerformAiOcr) {
          setProgressStatus('სურათიდან ტექსტის ამოცნობა (Gemini AI OCR)...');
          const ocrResult = await onPerformAiOcr(targetImg);
          const html = ocrResult.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
          onImportDocument(html, destMode, detectedOrientation);
        } else {
          // სურათად ჩასმა
          const imgHtml = `<p class="text-center my-4"><img src="${targetImg}" style="max-width:100%; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" alt="${file?.name || 'სურათი'}" /></p>`;
          onImportDocument(imgHtml, destMode, detectedOrientation);
        }
        handleClose();
      }
    } catch (err: any) {
      console.error('იმპორტის შეცდომა:', err);
      alert('შეცდომა ფაილის დამუშავებისას: ' + (err?.message || 'უცნობი ხარვეზი'));
    } finally {
      setIsLoading(false);
      setProgressStatus('');
    }
  };

  const handleClose = () => {
    setFile(null);
    setFileDataUrl(null);
    setFileType(null);
    setPreviewThumbnail(null);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    onClose();
  };

  // Crop კოორდინატები
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

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-[12px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100" 
        onClick={e => e.stopPropagation()}
      >
        {/* სათაურის ზოლი */}
        <header className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UploadCloudIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ფაილის დოკუმენტში ჩატვირთვა (PDF & სურათი)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ფაილი ჩაიტვირთება პირდაპირ რედაქტორში, რის შემდეგაც შესაძლებელია წიგნის რეჟიმზე გადასვლაც
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        {/* მთავარი შიგთავსი */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {!fileDataUrl ? (
            /* ფაილის ატვირთვის ზონა */
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-[12px] bg-slate-50/50 dark:bg-slate-800/20 transition-all text-center group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm">
                <UploadCloudIcon className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                ჩააგდეთ PDF ან სურათი აქ, ან აირჩიეთ კომპიუტერიდან
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
                მხარდაჭერილია PDF (.pdf), PNG, JPEG, WEBP
              </p>
              <label className="cursor-pointer px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-[8px] transition-colors shadow-sm inline-flex items-center gap-1.5">
                <span>ფაილის არჩევა</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/pdf,image/*" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>
          ) : (
            /* ატვირთული ფაილის პარამეტრები */
            <div className="flex flex-col gap-5">
              {/* ფაილის ბანერი */}
              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-red-600/10 text-red-600 font-bold text-xs flex items-center justify-center">
                    {fileType === 'pdf' ? 'PDF' : 'IMG'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {file?.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {fileType === 'pdf' ? `${pdfPagesCount} გვერდი · ` : ''}
                        {((file?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
                        {detectedOrientation === 'landscape' ? '📐 ალბომური (Landscape)' : '📄 ვერტიკალური (Portrait)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileDataUrl(null);
                    setFileType(null);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  შეცვლა
                </button>
              </div>

              {/* 1. ფორმატი: ვიზუალური გვერდები თუ ტექსტი */}
              {fileType === 'pdf' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ჩატვირთვის ფორმატი დოკუმენტში:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setImportType('visual')}
                      className={`p-3.5 rounded-[12px] border text-left flex flex-col gap-1 transition-all ${
                        importType === 'visual'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-300">
                        <EyeIcon className="w-4 h-4" />
                        <span>ვიზუალური გვერდები (A4 Sheets)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        გარანტირებული 1:1 ორიგინალი ვიზუალი — ყველა გვერდი ჩაიტვირთება დოკუმენტის ფურცლებად
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportType('text')}
                      className={`p-3.5 rounded-[12px] border text-left flex flex-col gap-1 transition-all ${
                        importType === 'text'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-300">
                        <SparklesIcon className="w-4 h-4" />
                        <span>ტექსტის ამოცნობა (რედაქტირებადი)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        ამოიღებს ტექსტს, სათაურებსა და აბზაცებს დოკუმენტში პირდაპირ ჩასასწორებლად
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. დანიშნულება: ახალი დოკუმენტი თუ დამატება */}
              <div className="flex items-center justify-between p-3 rounded-[12px] bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  დოკუმენტის დანიშნულება:
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="destMode"
                      checked={destMode === 'replace'}
                      onChange={() => setDestMode('replace')}
                      className="accent-indigo-600 cursor-pointer"
                    />
                    <span>ახალ დოკუმენტად (ჩანაცვლება)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="destMode"
                      checked={destMode === 'append'}
                      onChange={() => setDestMode('append')}
                      className="accent-indigo-600 cursor-pointer"
                    />
                    <span>არსებულზე დამატება</span>
                  </label>
                </div>
              </div>

              {/* პროგრესის ინდიკატორი */}
              {isLoading && (
                <div className="p-4 rounded-[12px] bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="font-semibold">{progressStatus || 'მუშავდება...'}</span>
                </div>
              )}

              {/* მინიატურის გადახედვა */}
              {previewThumbnail && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    გადახედვა:
                  </span>
                  <div className="max-h-48 overflow-auto rounded-[8px] border border-slate-200 dark:border-slate-700 p-2 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                    <img 
                      src={previewThumbnail} 
                      alt="Preview" 
                      className="max-h-44 object-contain rounded shadow-sm border border-slate-200 dark:border-slate-700" 
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* ქვედა ზოლი */}
        <footer className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[8px] transition-colors"
          >
            გაუქმება
          </button>

          {fileDataUrl && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-[8px] transition-colors shadow-sm flex items-center gap-2"
            >
              <span>✓ დოკუმენტში ჩატვირთვა</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ImportModal;
