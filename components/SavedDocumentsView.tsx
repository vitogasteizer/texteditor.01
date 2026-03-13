
import React, { useState, useRef, useEffect } from 'react';
import type { Doc } from '../App';
import { GridViewIcon, ListViewIcon, MoreVerticalIcon, FileTextIcon, Trash2Icon, EditIcon, ArrowLeftIcon, CopyIcon } from './icons/EditorIcons';
import { ConfirmDialog, PromptDialog } from './Dialogs';

interface DriveViewProps {
  documents: Doc[];
  onOpenDocument: (docId: string) => void;
  onRenameDocument: (docId: string, newName: string) => void;
  onDeleteDocument: (docId: string) => void;
  onDuplicateDocument: (docId: string) => void;
  onCreateNewDocument: () => void;
  onClose: () => void;
  currentDocId: string | null;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const DocumentItemMenu: React.FC<{
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  t: (key: string) => string;
}> = ({ onRename, onDelete, onDuplicate, t }) => {
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
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => { e.stopPropagation(); onRename(); setIsOpen(false); }}
            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <EditIcon className="w-4 h-4 mr-2" /> {t('drive.rename')}
          </button>
           <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <CopyIcon className="w-4 h-4 mr-2" /> {t('drive.duplicate')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <Trash2Icon className="w-4 h-4 mr-2" /> {t('drive.delete')}
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
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}> = ({ doc, viewMode, onOpenDocument, onRenameDocument, onDeleteDocument, onDuplicateDocument, t }) => {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const handleRename = () => {
    setIsRenameOpen(true);
  };

  const handleConfirmRename = (newName: string) => {
    if (newName && newName.trim() !== "") {
      onRenameDocument(doc.id, newName.trim());
    }
    setIsRenameOpen(false);
  };

  const handleDelete = () => {
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    onDeleteDocument(doc.id);
    setIsDeleteOpen(false);
  };
  
  const handleDuplicate = () => {
      onDuplicateDocument(doc.id);
  };

  const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <>
      <PromptDialog
        isOpen={isRenameOpen}
        title={t('drive.renamePrompt')}
        defaultValue={doc.name}
        onConfirm={handleConfirmRename}
        onCancel={() => setIsRenameOpen(false)}
        confirmText={t('drive.rename')}
        cancelText={t('modals.import.cancel')}
      />
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title={t('drive.deleteConfirmTitle') || 'Delete Document'}
        message={t('drive.deleteConfirm', { name: doc.name })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
        confirmText={t('drive.delete')}
        cancelText={t('modals.import.cancel')}
      />
      {viewMode === 'grid' ? (
        <div
          onClick={() => onOpenDocument(doc.id)}
          className="group cursor-pointer flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200"
        >
          <div className="flex-grow p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center h-32">
            <FileTextIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="p-3 flex items-center justify-between">
            <div className="flex-grow overflow-hidden">
              <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-100">{doc.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('drive.updated')}: {formattedDate}</p>
            </div>
            <div className="flex-shrink-0 -mr-2">
              <DocumentItemMenu onRename={handleRename} onDelete={handleDelete} onDuplicate={handleDuplicate} t={t} />
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => onOpenDocument(doc.id)}
          className="group cursor-pointer flex items-center p-3 bg-white dark:bg-gray-800 rounded-md border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-700 transition-colors duration-150"
        >
          <FileTextIcon className="w-6 h-6 mr-4 text-gray-400 dark:text-gray-500" />
          <div className="flex-grow">
            <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{doc.name}</p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 w-40 text-right hidden md:block">
            {t('drive.updated')}: {formattedDate}
          </div>
          <div className="ml-4 flex-shrink-0">
             <DocumentItemMenu onRename={handleRename} onDelete={handleDelete} onDuplicate={handleDuplicate} t={t} />
          </div>
        </div>
      )}
    </>
  );
};


const DriveView: React.FC<DriveViewProps> = (props) => {
  const { t, currentDocId, onClose, onCreateNewDocument } = props;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const sortedDocs = [...props.documents].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="h-full flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-4">
            {currentDocId && (
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t('drive.backToEditor')}>
                    <ArrowLeftIcon />
                </button>
            )}
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('drive.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={onCreateNewDocument}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                {t('drive.newDoc')}
            </button>
            <div className="flex items-center bg-gray-100 dark:bg-gray-900/50 p-1 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                aria-label={t('drive.gridView')}
              >
                <GridViewIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                aria-label={t('drive.listView')}
              >
                <ListViewIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
           <div className="max-w-5xl mx-auto p-4 md:p-6">
              {sortedDocs.length > 0 ? (
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
                  <FileTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('drive.emptyState')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('drive.emptyStateSub')}</p>
                </div>
              )}
           </div>
        </main>
    </div>
  );
};

export default DriveView;
