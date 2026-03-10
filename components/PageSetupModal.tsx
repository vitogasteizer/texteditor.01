
import React, { useState, useEffect } from 'react';
import type { PageSize, PageOrientation, PageMargins } from '../App';

interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: {
    size: PageSize;
    orientation: PageOrientation;
    margins: PageMargins;
    color: string;
    setAsDefault: boolean;
  }) => void;
  pageSettings: {
    size: PageSize;
    orientation: PageOrientation;
    margins: PageMargins;
    color: string;
  };
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const PageSetupModal: React.FC<PageSetupModalProps> = ({ isOpen, onClose, onApply, pageSettings, t }) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'pageless'>('pages');
  const [orientation, setOrientation] = useState<PageOrientation>(pageSettings.orientation);
  const [size, setSize] = useState<PageSize>(pageSettings.size);
  const [color, setColor] = useState(pageSettings.color);
  const [margins, setMargins] = useState<PageMargins>(pageSettings.margins);
  const [setAsDefault, setSetAsDefault] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        setOrientation(pageSettings.orientation);
        setSize(pageSettings.size);
        setColor(pageSettings.color);
        setMargins(pageSettings.margins);
        setSetAsDefault(false);
    }
  }, [isOpen, pageSettings]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ size, orientation, margins, color, setAsDefault });
  };
  
  const handleMarginChange = (side: keyof PageMargins, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
        setMargins(prev => ({...prev, [side]: numValue }));
    }
  };

  const paperSizes: { value: PageSize, label: string }[] = [
    { value: 'Letter', label: `Letter (8.5" x 11")` },
    { value: 'Legal', label: `Legal (8.5" x 14")` },
    { value: 'Tabloid', label: `Tabloid (11" x 17")` },
    { value: 'Statement', label: `Statement (5.5" x 8.5")` },
    { value: 'Executive', label: `Executive (7.25" x 10.5")` },
    { value: 'A3', label: `A3 (297mm x 420mm)` },
    { value: 'A4', label: `A4 (210mm x 297mm)` },
    { value: 'A5', label: `A5 (148mm x 210mm)` },
    { value: 'B4', label: `B4 (250mm x 353mm)` },
    { value: 'B5', label: `B5 (176mm x 250mm)` },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-setup-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6">
            <h3 id="page-setup-title" className="text-2xl font-normal mb-4 text-gray-900 dark:text-gray-100">{t('modals.pageSetup.title')}</h3>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('pages')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'pages' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        {t('modals.pageSetup.tabs.pages')}
                    </button>
                    <button disabled className="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed">
                        {t('modals.pageSetup.tabs.pageless')}
                    </button>
                </nav>
            </div>

            <div className="pt-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modals.pageSetup.orientation')}</label>
                    <div className="mt-2 flex items-center gap-6">
                        <label className="inline-flex items-center">
                            <input type="radio" className="form-radio h-4 w-4 text-blue-600" name="orientation" value="portrait" checked={orientation === 'portrait'} onChange={() => setOrientation('portrait')} />
                            <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{t('modals.pageSetup.portrait')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" className="form-radio h-4 w-4 text-blue-600" name="orientation" value="landscape" checked={orientation === 'landscape'} onChange={() => setOrientation('landscape')} />
                            <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">{t('modals.pageSetup.landscape')}</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="paper-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modals.pageSetup.paperSize')}</label>
                        <select id="paper-size" value={size} onChange={e => setSize(e.target.value as PageSize)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
                            {paperSizes.map(ps => <option key={ps.value} value={ps.value}>{ps.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="page-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modals.pageSetup.pageColor')}</label>
                        <input type="color" id="page-color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-9 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modals.pageSetup.margins')}</label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                             <div key={side}>
                                <label htmlFor={`margin-${side}`} className="block text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">{t(`modals.pageSetup.${side}`)}</label>
                                <input type="number" id={`margin-${side}`} value={margins[side]} onChange={e => handleMarginChange(side, e.target.value)} step="0.1" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
            <button onClick={() => setSetAsDefault(true)} className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                {t('modals.pageSetup.setAsDefault')}
            </button>
            <div className="flex gap-3">
                <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    {t('modals.pageSetup.cancel')}
                </button>
                <button onClick={handleApply} type="button" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    {t('modals.pageSetup.ok')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PageSetupModal;
