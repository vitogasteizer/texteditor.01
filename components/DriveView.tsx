
import React, { useState, useRef, useEffect } from 'react';
import type { Doc } from '../App';
import { GridViewIcon, ListViewIcon, MoreVerticalIcon, FileTextIcon, Trash2Icon, EditIcon, ArrowLeftIcon, CopyIcon, EyeIcon, DownloadIcon, UploadCloudIcon, CloudIcon, LocalStorageIcon } from './icons/EditorIcons';

interface DriveViewProps {
  documents: Doc[];
  onOpenDocument: (docId: string) => void;
  onRenameDocument: (docId: string, newName: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDuplicateDocument: (docId: string) => void;
  onPreviewDocument: (docId: string) => void;
  onCreateNewDocument: () => void;
  onClose: () => void;
  onExportAllDocuments: () => void;
  onImportAllDocuments: (content: string) => void;
  currentDocId: string | null;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  // Cloud Props
  isDriveInitialized?: boolean;
  isDriveLoggedIn?: boolean;
  onDriveLogin?: () => void;
  onDriveLogout?: () => void;
  cloudDocs?: any[];
  onOpenFromCloud?: (fileId: string, name: string) => void;
}

const DocumentItemMenu: React.FC<{
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  t: (key: string) => string;
}> = ({ onRename, onDelete, onDuplicate, onPreview, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
        aria-label={t('drive.options')}
      >
        <MoreVerticalIcon className="w-5 h-5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg py-2 z-50 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg mx-2"
          >
            <EyeIcon className="w-4 h-4 mr-3 opacity-50" /> {t('drive.preview')}
          </button>
           <button
            onClick={(e) => { e.stopPropagation(); onRename(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg mx-2"
          >
            <EditIcon className="w-4 h-4 mr-3 opacity-50" /> {t('drive.rename')}
          </button>
           <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg mx-2"
          >
            <CopyIcon className="w-4 h-4 mr-3 opacity-50" /> {t('drive.duplicate')}
          </button>
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-lg mx-2"
          >
            <Trash2Icon className="w-4 h-4 mr-3 opacity-50" /> {t('drive.delete')}
          </button>
        </div>
      )}
    </div>
  );
};

const DocumentItem: React.FC<{
  doc: Doc;
  viewMode: 'grid' | 'list';
  onOpenDocument: (docId: string) => void;
  onRenameDocument: (docId: string, newName: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDuplicateDocument: (docId: string) => void;
  onPreviewDocument: (docId: string) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}> = ({ doc, viewMode, onOpenDocument, onRenameDocument, onDeleteDocument, onDuplicateDocument, onPreviewDocument, t }) => {
  
  const handleRename = () => {
    const newName = prompt(t('drive.renamePrompt'), doc.name);
    if (newName && newName.trim() !== "") {
      onRenameDocument(doc.id, newName.trim());
    }
  };

  const handleDelete = () => {
    if (window.confirm(t('drive.deleteConfirm', { name: doc.name }))) {
      onDeleteDocument(doc.id);
    }
  };
  
  const handleDuplicate = () => {
      onDuplicateDocument(doc.id);
  };
  
  const handlePreview = () => {
      onPreviewDocument(doc.id);
  };

  const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onOpenDocument(doc.id)}
        className="group cursor-pointer flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden animate-in fade-in zoom-in-95"
      >
        {doc.googleDriveId && (
            <div className="absolute top-3 left-3 text-blue-500 bg-blue-50 dark:bg-blue-900/50 rounded-full p-1.5 border border-blue-100 dark:border-blue-800 z-10" title="Synced with Google Drive">
                <UploadCloudIcon isMenuIcon className="w-3.5 h-3.5"/>
            </div>
        )}
        <div className="flex-grow p-6 flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800/20 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
          <FileTextIcon className="w-16 h-16 text-gray-200 dark:text-gray-700 group-hover:text-blue-500/50 group-hover:scale-110 transition-all duration-300" />
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex-grow overflow-hidden">
            <p className="font-semibold text-xs truncate text-gray-800 dark:text-gray-100">{doc.name}</p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1">{t('drive.updated')}: {formattedDate}</p>
          </div>
          <div className="flex-shrink-0 -mr-1">
            <DocumentItemMenu onRename={handleRename} onDelete={handleDelete} onDuplicate={handleDuplicate} onPreview={handlePreview} t={t} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenDocument(doc.id)}
      className="group cursor-pointer flex items-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-100 dark:hover:border-gray-800 transition-all duration-200 animate-in fade-in slide-in-from-left-2"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
        <FileTextIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-xs text-gray-800 dark:text-gray-100 flex items-center gap-2">
            {doc.name}
            {doc.googleDriveId && <UploadCloudIcon isMenuIcon className="w-3.5 h-3.5 text-blue-500 opacity-50" />}
        </p>
        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 md:hidden mt-0.5">
          {formattedDate}
        </p>
      </div>
      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 w-40 text-right hidden md:block">
        {formattedDate}
      </div>
      <div className="ml-4 flex-shrink-0">
         <DocumentItemMenu onRename={handleRename} onDelete={handleDelete} onDuplicate={handleDuplicate} onPreview={handlePreview} t={t} />
      </div>
    </div>
  );
};


const DriveView: React.FC<DriveViewProps> = (props) => {
  const { t, currentDocId, onClose, onCreateNewDocument, onExportAllDocuments, onImportAllDocuments, 
          isDriveInitialized, isDriveLoggedIn, onDriveLogin, onDriveLogout, cloudDocs, onOpenFromCloud } = props;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const sortedDocs = [...props.documents].sort((a, b) => b.updatedAt - a.updatedAt);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            onImportAllDocuments(content);
        } catch (error) {
            console.error("Failed to read file", error);
        }
    };
    reader.onerror = (error) => console.error("File reading error", error);
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <header className="sticky top-0 z-20 px-6 py-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                {currentDocId && (
                    <button 
                      onClick={onClose} 
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 border border-gray-100 dark:border-gray-800" 
                      aria-label={t('drive.backToEditor')}
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t('drive.title')}
                    </h1>
                  </div>
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                    {t('drive.subtitle') || 'Manage your documents'}
                  </p>
                </div>
              </div>
              
              <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => setActiveTab('local')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'local' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                      <LocalStorageIcon className="w-3.5 h-3.5" />
                      Local
                  </button>
                  <button 
                    onClick={() => setActiveTab('cloud')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'cloud' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                      <CloudIcon className="w-3.5 h-3.5" />
                      Cloud
                  </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                    onClick={onCreateNewDocument}
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all active:scale-95"
                >
                    {t('drive.newDoc')}
                </button>
                <div className="flex items-center bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-800">
                    <button onClick={onExportAllDocuments} title={t('drive.exportAll')} className="p-2 text-gray-500 hover:text-blue-600 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1"></div>
                    <button onClick={handleImportClick} title={t('drive.importAll')} className="p-2 text-gray-500 hover:text-blue-600 transition-colors"><UploadCloudIcon className="w-4 h-4" /></button>
                    <input type="file" ref={importInputRef} className="hidden" accept=".json,application/json" onChange={handleFileImport} />
                </div>
                <div className="hidden md:flex items-center bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    aria-label={t('drive.gridView')}
                  >
                    <GridViewIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    aria-label={t('drive.listView')}
                  >
                    <ListViewIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow overflow-y-auto bg-gray-50/30 dark:bg-gray-950 custom-scrollbar">
           <div className="max-w-6xl mx-auto p-6 md:p-10">
              
              {/* LOCAL TAB */}
              {activeTab === 'local' && (
                  sortedDocs.length > 0 ? (
                    viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {sortedDocs.map(doc => <DocumentItem key={doc.id} doc={doc} viewMode="grid" {...props} />)}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedDocs.map(doc => <DocumentItem key={doc.id} doc={doc} viewMode="list" {...props} />)}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-16">
                      <LocalStorageIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('drive.emptyState')}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('drive.emptyStateSub')}</p>
                    </div>
                  )
              )}

              {/* CLOUD TAB */}
              {activeTab === 'cloud' && (
                  <div className="space-y-6">
                      {!isDriveLoggedIn ? (
                          <div className="text-center py-20 flex flex-col items-center">
                              <CloudIcon className="w-20 h-20 text-blue-200 dark:text-blue-900 mb-6" />
                              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Sync with Google Drive</h2>
                              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
                                  Connect your Google Account to back up your documents and access them from any device.
                              </p>
                              {isDriveInitialized ? (
                                <button onClick={onDriveLogin} className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700 font-medium">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Sign in with Google
                                </button>
                              ) : (
                                <div className="text-sm text-red-500 bg-red-50 p-3 rounded border border-red-200">
                                    Google Drive API not configured in code. Please check lib/googleDrive.ts.
                                </div>
                              )}
                          </div>
                      ) : (
                          <>
                            <div className="flex justify-between items-center mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Connected to Google Drive</span>
                                </div>
                                <button onClick={onDriveLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">Sign Out</button>
                            </div>

                            {cloudDocs && cloudDocs.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {cloudDocs.map(file => (
                                        <div 
                                            key={file.id} 
                                            onClick={() => onOpenFromCloud && onOpenFromCloud(file.id, file.name)}
                                            className="group cursor-pointer flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-500 transition-all p-4"
                                        >
                                            <FileTextIcon className="w-10 h-10 text-blue-400 mb-3" />
                                            <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-100">{file.name.replace('.json', '')}</p>
                                            <p className="text-xs text-gray-500 mt-1">Cloud File</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    No documents found in Google Drive matching OTE format.
                                    <br/>
                                    Create a new document locally and save it to sync.
                                </div>
                            )}
                          </>
                      )}
                  </div>
              )}

           </div>
        </main>
    </div>
  );
};

export default DriveView;
