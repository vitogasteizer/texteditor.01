
import React, { useState, useRef, useEffect } from 'react';
import type { Doc } from '../App';
import { 
  GridViewIcon, 
  ListViewIcon, 
  MoreVerticalIcon, 
  FileTextIcon, 
  Trash2Icon, 
  EditIcon, 
  ArrowLeftIcon, 
  CopyIcon, 
  EyeIcon, 
  DownloadIcon, 
  UploadCloudIcon, 
  CloudIcon, 
  LocalStorageIcon,
  CheckIcon,
  RotateCcwIcon,
  ExternalLinkIcon,
  KeyIcon,
  SmartphoneIcon,
  ShieldCheckIcon,
  CloseIcon,
  EyeOffIcon,
  InfoIcon,
} from './icons/EditorIcons';
import { 
  syncAllDocumentsToFirebase, 
  syncSingleDocumentToFirebase,
  fetchUserCloudDocuments, 
  deleteUserCloudDocument, 
  getOrCreateUserCloudId,
  setUserCloudId,
  generateNewUserCloudId,
} from '../lib/firebaseSyncService';
import { saveToDrive } from '../lib/googleDrive';

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
  onOpenCloudDoc?: (doc: Doc) => void;
  onRestoreCloudDocuments?: (cloudDocs: Doc[]) => void;
}

const DocumentItemMenu: React.FC<{
  doc: Doc;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onUploadToFirebase: (doc: Doc) => void;
  onUploadToGoogleDrive: (doc: Doc) => void;
  t: (key: string) => string;
}> = ({ doc, onRename, onDelete, onDuplicate, onPreview, onUploadToFirebase, onUploadToGoogleDrive, t }) => {
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
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        aria-label={t('drive.options')}
        title="მენიუ"
      >
        <MoreVerticalIcon className="w-5 h-5" />
      </button>
      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-2 sm:mb-0 sm:mt-1.5 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl py-2 z-50 border border-gray-200/90 dark:border-gray-700/90 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPreview(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg mx-2"
          >
            <EyeIcon className="w-4 h-4 mr-2.5 opacity-60 text-indigo-500" />
            <span>{t('drive.preview')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRename(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg mx-2"
          >
            <EditIcon className="w-4 h-4 mr-2.5 opacity-60 text-blue-500" />
            <span>{t('drive.rename')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg mx-2"
          >
            <CopyIcon className="w-4 h-4 mr-2.5 opacity-60 text-emerald-500" />
            <span>{t('drive.duplicate')}</span>
          </button>

          {/* Cloud Upload / Sync Options */}
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-1.5 mx-2"></div>
          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            ღრუბელში გადატანა
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUploadToFirebase(doc); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all rounded-lg mx-2"
            title="დოკუმენტის ატვირთვა Firebase პირად ღრუბელში"
          >
            <UploadCloudIcon className="w-4 h-4 mr-2.5 text-indigo-500" />
            <span>Firebase პირად ღრუბელში</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUploadToGoogleDrive(doc); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all rounded-lg mx-2"
            title="დოკუმენტის ატვირთვა Google Drive-ში"
          >
            <CloudIcon className="w-4 h-4 mr-2.5 text-blue-500" />
            <span>Google Drive-ში</span>
          </button>

          <div className="h-px bg-gray-100 dark:bg-gray-800 my-1.5 mx-2"></div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
            className="flex items-center w-[calc(100%-16px)] text-left px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-lg mx-2"
          >
            <Trash2Icon className="w-4 h-4 mr-2.5 opacity-60 text-red-500" />
            <span>{t('drive.delete')}</span>
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
  onUploadToFirebase: (doc: Doc) => void;
  onUploadToGoogleDrive: (doc: Doc) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}> = ({ doc, viewMode, onOpenDocument, onRenameDocument, onDeleteDocument, onDuplicateDocument, onPreviewDocument, onUploadToFirebase, onUploadToGoogleDrive, t }) => {
  
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
        className="group cursor-pointer flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-500/50 transition-all duration-300 relative animate-in fade-in zoom-in-95 hover:shadow-md"
      >
        {doc.googleDriveId && (
            <div className="absolute top-3 left-3 text-blue-500 bg-blue-50 dark:bg-blue-900/50 rounded-full p-1.5 border border-blue-100 dark:border-blue-800 z-10" title="Synced with Google Drive">
                <UploadCloudIcon isMenuIcon className="w-3.5 h-3.5"/>
            </div>
        )}
        <div className="flex-grow p-6 flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800/20 group-hover:bg-indigo-50/40 dark:group-hover:bg-indigo-900/10 transition-colors rounded-t-xl overflow-hidden">
          <FileTextIcon className="w-16 h-16 text-gray-200 dark:text-gray-700 group-hover:text-indigo-500/50 group-hover:scale-110 transition-all duration-300" />
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between rounded-b-xl">
          <div className="flex-grow overflow-hidden pr-2">
            <p className="font-semibold text-xs truncate text-gray-800 dark:text-gray-100">{doc.name}</p>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1">{t('drive.updated')}: {formattedDate}</p>
          </div>
          <div className="flex-shrink-0 -mr-1">
            <DocumentItemMenu 
              doc={doc}
              onRename={handleRename} 
              onDelete={handleDelete} 
              onDuplicate={handleDuplicate} 
              onPreview={handlePreview} 
              onUploadToFirebase={onUploadToFirebase}
              onUploadToGoogleDrive={onUploadToGoogleDrive}
              t={t} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenDocument(doc.id)}
      className="group cursor-pointer flex items-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-100 dark:hover:border-gray-800 transition-all duration-200 animate-in fade-in slide-in-from-left-2 relative"
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
         <DocumentItemMenu 
           doc={doc}
           onRename={handleRename} 
           onDelete={handleDelete} 
           onDuplicate={handleDuplicate} 
           onPreview={handlePreview} 
           onUploadToFirebase={onUploadToFirebase}
           onUploadToGoogleDrive={onUploadToGoogleDrive}
           t={t} 
         />
      </div>
    </div>
  );
};


const DriveView: React.FC<DriveViewProps> = (props) => {
  const { t, currentDocId, onClose, onCreateNewDocument, onExportAllDocuments, onImportAllDocuments, 
          isDriveInitialized, isDriveLoggedIn, onDriveLogin, onDriveLogout, cloudDocs, onOpenFromCloud, onOpenCloudDoc, onRestoreCloudDocuments } = props;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [cloudService, setCloudService] = useState<'firebase' | 'googledrive'>('firebase');
  const [firebaseDocs, setFirebaseDocs] = useState<Doc[]>([]);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [userCloudId, setUserCloudIdState] = useState<string>('');
  const [isCopiedId, setIsCopiedId] = useState<boolean>(false);
  const [isIdRevealed, setIsIdRevealed] = useState<boolean>(false);
  const [showInfoBanner, setShowInfoBanner] = useState<boolean>(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; name: string } | null>(null);
  const [isEditingCloudId, setIsEditingCloudId] = useState<boolean>(false);
  const [inputCloudId, setInputCloudId] = useState<string>('');
  const [cloudIdError, setCloudIdError] = useState<string>('');
  const [isRestoringToLocal, setIsRestoringToLocal] = useState<boolean>(false);

  const sortedDocs = [...props.documents].sort((a, b) => b.updatedAt - a.updatedAt);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadFirebaseDocs = async (targetId?: string) => {
    setIsFirebaseLoading(true);
    try {
      const uid = targetId || getOrCreateUserCloudId();
      setUserCloudIdState(uid);
      const docs = await fetchUserCloudDocuments(uid);
      setFirebaseDocs(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud' && cloudService === 'firebase') {
      loadFirebaseDocs();
    }
  }, [activeTab, cloudService]);

  const handleCopyCloudId = async () => {
    if (!userCloudId) return;
    try {
      await navigator.clipboard.writeText(userCloudId);
      setIsCopiedId(true);
      setTimeout(() => setIsCopiedId(false), 2000);
    } catch {
      prompt('დააკოპირეთ თქვენი პირადი Cloud ID:', userCloudId);
    }
  };

  const handleConnectCloudId = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCloudIdError('');
    if (!inputCloudId.trim()) {
      setCloudIdError('გთხოვთ შეიყვანოთ პირადი Cloud ID');
      return;
    }

    const res = setUserCloudId(inputCloudId);
    if (!res.success) {
      setCloudIdError(res.error || 'არასწორი ID ფორმატი');
      return;
    }

    const newUid = inputCloudId.trim();
    setUserCloudIdState(newUid);
    setIsEditingCloudId(false);
    setInputCloudId('');
    setSyncResult({ success: true, message: `წარმატებით დაუკავშირდა პირად ღრუბელს ID: ${newUid}` });
    await loadFirebaseDocs(newUid);
  };

  const handleGenerateNewId = async () => {
    if (window.confirm('ნამდვილად გსურთ ახალი პირადი ID-ს შექმნა? ძველი ID-ს ფაილები ღრუბელში შენარჩუნდება, თუმცა ამ მოწყობილობაზე გააქტიურდება ახალი პირადი სივრცე.')) {
      const newUid = generateNewUserCloudId();
      setUserCloudIdState(newUid);
      setIsEditingCloudId(false);
      setSyncResult({ success: true, message: `შეიქმნა ახალი პირადი ID: ${newUid}` });
      await loadFirebaseDocs(newUid);
    }
  };

  const handleRestoreAllToLocal = async () => {
    if (firebaseDocs.length === 0) {
      alert('თქვენი პირადი ღრუბელი ცარიელია, გადმოსაწერი ფაილები არ მოიძებნა.');
      return;
    }
    setIsRestoringToLocal(true);
    try {
      if (onRestoreCloudDocuments) {
        await onRestoreCloudDocuments(firebaseDocs);
      } else {
        for (const doc of firebaseDocs) {
          await onOpenCloudDoc?.(doc);
        }
      }
      setSyncResult({ success: true, message: `წარმატებით გადმოიწერა ${firebaseDocs.length} დოკუმენტი თქვენს მოწყობილობაში!` });
    } catch (err: any) {
      setSyncResult({ success: false, message: 'შეცდომა დოკუმენტების მოწყობილობაში გადმოწერისას' });
    } finally {
      setIsRestoringToLocal(false);
    }
  };

  const handleUploadDocToFirebase = async (docToUpload: Doc) => {
    try {
      setSyncStatus(`იტვირთება „${docToUpload.name}“...`);
      await syncSingleDocumentToFirebase(docToUpload);
      setSyncResult({ success: true, message: `„${docToUpload.name}“ წარმატებით აიტვირთა Firebase პირად ღრუბელში!` });
      await loadFirebaseDocs();
    } catch (e: any) {
      setSyncResult({ success: false, message: `შეცდომა ატვირთვისას: ${e?.message || 'ვერ მოხერხდა'}` });
    }
  };

  const handleUploadDocToGoogleDrive = async (docToUpload: Doc) => {
    if (!isDriveLoggedIn) {
      if (onDriveLogin) {
        onDriveLogin();
      } else {
        alert('Google Drive-ში ასატვირთად გთხოვთ ჯერ გაიაროთ ავტორიზაცია Google Drive-ში.');
      }
      return;
    }
    try {
      const res = await saveToDrive(docToUpload);
      if (res && res.id) {
        setSyncResult({ success: true, message: `„${docToUpload.name}“ წარმატებით აიტვირთა Google Drive-ში!` });
      } else {
        setSyncResult({ success: false, message: `Google Drive-ში ატვირთვა ვერ მოხერხდა.` });
      }
    } catch (e: any) {
      setSyncResult({ success: false, message: `შეცდომა: ${e?.message || 'Google Drive ატვირთვა ჩაიშალა'}` });
    }
  };

  const handleSaveCloudDocToLocal = (e: React.MouseEvent, docToSave: Doc) => {
    e.stopPropagation();
    if (onRestoreCloudDocuments) {
      onRestoreCloudDocuments([docToSave]);
    } else {
      onOpenCloudDoc?.(docToSave);
    }
    setSyncResult({ success: true, message: `„${docToSave.name}“ წარმატებით გადმოიწერა მოწყობილობაში!` });
  };

  const handleSyncToFirebase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncStatus('სინქრონიზაცია იწყება...');
    try {
      const result = await syncAllDocumentsToFirebase(props.documents, (cur, total, name) => {
        setSyncStatus(`იტვირთება: ${name} (${cur}/${total})...`);
      });
      if (result.success) {
        setSyncResult({ success: true, message: `წარმატებით დასინქრონდა ${result.syncedCount} დოკუმენტი თქვენს პირად ღრუბელში!` });
        await loadFirebaseDocs();
      } else {
        setSyncResult({ success: false, message: `შეცდომა: ${result.error || 'სინქრონიზაცია ვერ მოხერხდა'}` });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: err?.message || 'შეცდომა სინქრონიზაციისას' });
    } finally {
      setIsSyncing(false);
      setSyncStatus('');
    }
  };

  const handleDeleteFromFirebase = (e: React.MouseEvent, docId: string, docName: string) => {
    e.stopPropagation();
    setConfirmDeleteDoc({ id: docId, name: docName });
  };

  const handleExecuteDeleteFromFirebase = async () => {
    if (!confirmDeleteDoc) return;
    const { id: docId, name: docName } = confirmDeleteDoc;
    setConfirmDeleteDoc(null);
    try {
      const ok = await deleteUserCloudDocument(docId, userCloudId);
      if (ok) {
        setFirebaseDocs(prev => prev.filter(d => d.id !== docId));
        setSyncResult({ success: true, message: `„${docName}“ წარმატებით წაიშალა პირადი ღრუბლიდან!` });
      } else {
        setSyncResult({ success: false, message: `„${docName}“-ის წაშლა ვერ მოხერხდა.` });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: `შეცდომა წაშლისას: ${err?.message || 'უცნობი'}` });
    }
  };

  const handleOpenFirebaseDoc = (docToOpen: Doc) => {
    if (onOpenCloudDoc) {
      onOpenCloudDoc(docToOpen);
    } else {
      props.onOpenDocument(docToOpen.id);
    }
  };

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
                        {sortedDocs.map(doc => (
                          <DocumentItem 
                            key={doc.id} 
                            doc={doc} 
                            viewMode="grid" 
                            {...props} 
                            onUploadToFirebase={handleUploadDocToFirebase}
                            onUploadToGoogleDrive={handleUploadDocToGoogleDrive}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedDocs.map(doc => (
                          <DocumentItem 
                            key={doc.id} 
                            doc={doc} 
                            viewMode="list" 
                            {...props} 
                            onUploadToFirebase={handleUploadDocToFirebase}
                            onUploadToGoogleDrive={handleUploadDocToGoogleDrive}
                          />
                        ))}
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
                    {/* ღრუბლოვანი სერვისის გადამრთველი და მოწყობილობის მართვა */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200/60 dark:border-gray-800 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setCloudService('firebase')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            cloudService === 'firebase'
                              ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Firebase პირადი ღრუბელი (უფასო)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloudService('googledrive')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            cloudService === 'googledrive'
                              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          <CloudIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>Google Drive</span>
                        </button>
                      </div>

                      {/* მოწყობილობის პირადი ID და მოწყობილობის მართვა */}
                      {userCloudId && (
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="ონლაინ" />
                            <KeyIcon className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-400">ID:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 tracking-wider">
                              {isIdRevealed ? userCloudId : `${userCloudId.slice(0, 4)}••••••••`}
                            </span>
                            
                            {/* ჩვენება / დამალვა (Eye toggle) */}
                            <button
                              type="button"
                              onClick={() => setIsIdRevealed(!isIdRevealed)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title={isIdRevealed ? 'ID-ს დაფარვა' : 'ID-ს გამოჩენა'}
                            >
                              {isIdRevealed ? <EyeOffIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                            </button>

                            {/* კოპირება */}
                            <button
                              type="button"
                              onClick={handleCopyCloudId}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[10px] font-sans font-medium transition-colors"
                              title="ID-ს კოპირება"
                            >
                              {isCopiedId ? (
                                <>
                                  <CheckIcon className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">დაკოპირდა!</span>
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="w-3 h-3" />
                                  <span className="hidden sm:inline">კოპირება</span>
                                </>
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingCloudId(!isEditingCloudId);
                              setCloudIdError('');
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              isEditingCloudId
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-gray-800 hover:border-indigo-500'
                            }`}
                          >
                            <SmartphoneIcon className="w-3 h-3 text-indigo-500" />
                            <span>დაკავშირება</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 1. FIREBASE პირადი ღრუბელი */}
                    {cloudService === 'firebase' && (
                      <div className="space-y-4">
                        {/* სხვა მოწყობილობასთან დაკავშირების პანელი (Cross-Device Sync Modal/Panel) */}
                        {isEditingCloudId && (
                          <div className="p-4 rounded-[12px] bg-white dark:bg-gray-900 border border-indigo-500/80 shadow-lg space-y-3 animate-in fade-in zoom-in-95">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                  <SmartphoneIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    სხვა მოწყობილობის დაკავშირება
                                  </h4>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    შეიყვანეთ სხვა მოწყობილობის პირადი ID იმავე ფაილებზე წვდომისთვის
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsEditingCloudId(false)}
                                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              >
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>

                            <form onSubmit={handleConnectCloudId} className="space-y-2">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-grow">
                                  <input
                                    type="text"
                                    value={inputCloudId}
                                    onChange={(e) => {
                                      setInputCloudId(e.target.value);
                                      if (cloudIdError) setCloudIdError('');
                                    }}
                                    placeholder="ჩასვით სხვა მოწყობილობის ID (მაგ: usr_...)"
                                    className="w-full px-3 py-2 rounded-[8px] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="px-4 py-2 rounded-[8px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                >
                                  <CheckIcon className="w-3.5 h-3.5" />
                                  <span>დაკავშირება</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleGenerateNewId}
                                  className="px-3 py-2 rounded-[8px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                                  title="ახალი სუფთა ID-ს შექმნა"
                                >
                                  <RotateCcwIcon className="w-3 h-3" />
                                  <span>ახალი ID</span>
                                </button>
                              </div>

                              {cloudIdError && (
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                  ⚠️ {cloudIdError}
                                </p>
                              )}
                            </form>
                          </div>
                        )}

                        {/* კომპაქტური მართვის პანელი (სინქრონიზაციის ზოლი) */}
                        <div className="p-3 rounded-[12px] bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* სტატისტიკა & წესების ღილაკი */}
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                              📁 ლოკალური: {props.documents.length}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                              ☁️ ღრუბელი: {firebaseDocs.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowInfoBanner(!showInfoBanner)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                showInfoBanner
                                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              <InfoIcon className="w-3 h-3" />
                              <span>{showInfoBanner ? 'წესების დამალვა' : 'წესები'}</span>
                            </button>
                          </div>

                          {/* მოქმედების ღილაკები */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleSyncToFirebase}
                              disabled={isSyncing}
                              className="px-3 py-1.5 rounded-[8px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                              title="ყველა დოკუმენტის ატვირთვა პირად ღრუბელში"
                            >
                              <UploadCloudIcon className="w-3.5 h-3.5" />
                              <span>{isSyncing ? 'სინქრონირდება...' : 'სინქრონიზაცია'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleRestoreAllToLocal}
                              disabled={isRestoringToLocal || firebaseDocs.length === 0}
                              className="px-3 py-1.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                              title="ღრუბელში არსებული ყველა ფაილის გადმოწერა მოწყობილობაში"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                              <span>{isRestoringToLocal ? 'გადმოწერა...' : 'გადმოწერა'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => loadFirebaseDocs()}
                              disabled={isFirebaseLoading}
                              title="ღრუბლის სიის განახლება"
                              className="p-1.5 rounded-[8px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <RotateCcwIcon className={`w-3.5 h-3.5 ${isFirebaseLoading ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* ჩაკეცილი მოკლე საინფორმაციო ბარათი (გამოდის მხოლოდ "წესები"-ზე დაჭერისას) */}
                        {showInfoBanner && (
                          <div className="p-3.5 rounded-[12px] bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-950 dark:text-indigo-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900 dark:text-indigo-100">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                <span>პირადი ღრუბლის წესები და უსაფრთხოება</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowInfoBanner(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              >
                                <CloseIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-indigo-900/80 dark:text-indigo-300/80 text-[11px]">
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span><strong>იზოლირებული:</strong> ფაილებზე წვდომა აქვს მხოლოდ თქვენს პირად ID-ს.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span><strong>Cross-Device:</strong> სხვა მოწყობილობაზე გახსენით ეს ID და ფაილები იქაც გამოჩნდება.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-amber-500 font-bold">•</span>
                                <span><strong>ზომის ლიმიტი:</strong> Firestore-ში თითო დოკუმენტის მაქსიმალური ზომაა 1 მეგაბაიტი.</span>
                              </li>
                            </ul>
                          </div>
                        )}

                        {/* პროგრესის ზოლი სინქრონიზაციისას */}
                        {isSyncing && (
                          <div className="p-3.5 rounded-[10px] bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span>{syncStatus}</span>
                          </div>
                        )}

                        {/* შედეგის შეტყობინება (დახურვადი) */}
                        {syncResult && (
                          <div className={`p-3.5 rounded-[10px] text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 ${
                            syncResult.success 
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            <div className="flex items-center gap-2">
                              {syncResult.success ? <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : null}
                              <span>{syncResult.message}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSyncResult(null)}
                              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600"
                              title="დახურვა"
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* ღრუბელში არსებული დოკუმენტები */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              ღრუბელში შენახული დოკუმენტები ({firebaseDocs.length})
                            </h3>
                          </div>

                          {isFirebaseLoading ? (
                            <div className="text-center py-12 text-gray-400 text-xs flex flex-col items-center gap-2">
                              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span>იტვირთება ღრუბლის დოკუმენტები...</span>
                            </div>
                          ) : firebaseDocs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {firebaseDocs.map(doc => {
                                const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                });
                                return (
                                  <div
                                    key={doc.id}
                                    onClick={() => handleOpenFirebaseDoc(doc)}
                                    className="group cursor-pointer flex flex-col bg-white dark:bg-gray-900 rounded-[12px] border border-gray-200/80 dark:border-gray-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-all p-4 shadow-sm hover:shadow-md relative overflow-hidden"
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                      <div className="w-10 h-10 rounded-[8px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <FileTextIcon className="w-5 h-5" />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => handleSaveCloudDocToLocal(e, doc)}
                                          title="ამ მოწყობილობაში შენახვა"
                                          className="p-1.5 rounded-[6px] text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                        >
                                          <DownloadIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteFromFirebase(e, doc.id, doc.name)}
                                          title="წაშლა პირადი ღრუბლიდან"
                                          className="p-1.5 rounded-[6px] text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                        >
                                          <Trash2Icon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate mb-1">
                                      {doc.name}
                                    </h4>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
                                      განახლდა: {formattedDate}
                                    </p>

                                    <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                      <span>გახსნა რედაქტორში</span>
                                      <ExternalLinkIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12 rounded-[12px] border-2 border-dashed border-gray-200 dark:border-gray-800 p-8 bg-gray-50/50 dark:bg-gray-900/30">
                              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                                <CloudIcon className="w-6 h-6" />
                              </div>
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                თქვენს პირად ღრუბელში დოკუმენტები ჯერ არ არის
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                                დააჭირეთ „ყველა დოკუმენტის სინქრონიზაციას“ არსებული დოკუმენტების ასატვირთად ან გამოიყენეთ 3-წერტილიანი მენიუ ცალკეული ფაილისთვის.
                              </p>
                              <button
                                type="button"
                                onClick={handleSyncToFirebase}
                                disabled={isSyncing}
                                className="px-5 py-2.5 rounded-[8px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
                              >
                                <UploadCloudIcon className="w-4 h-4" />
                                <span>ყველა დოკუმენტის სინქრონიზაცია</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 2. GOOGLE DRIVE */}
                    {cloudService === 'googledrive' && (
                      <div className="space-y-6">
                        {!isDriveLoggedIn ? (
                            <div className="text-center py-16 flex flex-col items-center rounded-[12px] border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
                                <CloudIcon className="w-16 h-16 text-blue-300 dark:text-blue-900 mb-4" />
                                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Google Drive სინქრონიზაცია</h2>
                                <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                                    დაუკავშირეთ თქვენი პირადი Google ანგარიში დოკუმენტების სარეზერვო ასლების Google Drive-ზე შესანახად.
                                </p>
                                {isDriveInitialized ? (
                                  <button onClick={onDriveLogin} className="flex items-center gap-3 px-6 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700 font-semibold text-xs">
                                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                      Sign in with Google
                                  </button>
                                ) : (
                                  <div className="max-w-md mx-auto p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs text-center space-y-1">
                                      <p className="font-semibold">Google Drive ინიციალიზდება...</p>
                                      <p className="text-amber-700 dark:text-amber-400">თქვენი დოკუმენტები სრულად დაცულია. შეგიძლიათ გამოიყენოთ „Firebase პირადი ღრუბელი“ მყისიერი სინქრონიზაციისთვის.</p>
                                  </div>
                                )}
                            </div>
                        ) : (
                            <>
                              <div className="flex justify-between items-center mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                  <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Connected to Google Drive</span>
                                  </div>
                                  <button onClick={onDriveLogout} className="text-xs text-red-600 hover:text-red-700 font-semibold">Sign Out</button>
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
                                  <div className="text-center py-10 text-gray-500 text-xs">
                                      Google Drive-ზე დოკუმენტები ჯერ არ მოიძებნა.
                                  </div>
                              )}
                            </>
                        )}
                      </div>
                    )}
                  </div>
              )}

           </div>
        </main>

        {/* დოკუმენტის წაშლის დადასტურების მოდალი (In-App Modal) */}
        {confirmDeleteDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-[12px] p-5 max-w-sm w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-3.5">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                  <Trash2Icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  დოკუმენტის წაშლა ღრუბლიდან
                </h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                ნამდვილად გსურთ <strong className="text-gray-900 dark:text-gray-100">„{confirmDeleteDoc.name}“</strong>-ის წაშლა თქვენი პირადი Firebase ღრუბლიდან?
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteDoc(null)}
                  className="px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteFromFirebase}
                  className="px-3.5 py-1.5 rounded-[8px] text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
                >
                  წაშლა
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default DriveView;
