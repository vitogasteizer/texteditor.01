
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import MenuBar from './components/MenuBar';
import SourceCodeModal from './components/SourceCodeModal';
import WordCountModal from './components/WordCountModal';
import UrlInputModal from './components/UrlInputModal';
import DriveView from './components/DriveView';
import CommentsSidebar from './components/CommentsSidebar';
import SettingsSidebar from './components/SettingsSidebar';
import SpecialCharactersModal from './components/SpecialCharactersModal';
import StatusBar from './components/StatusBar';
import ObjectWrapper from './components/ObjectWrapper';
import FloatingToolbar from './components/FloatingToolbar';
import CommentInputModal from './components/CommentInputModal';
import AiSidekick from './components/AiSidekick';
import PageSetupModal from './components/PageSetupModal';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import AboutModal from './components/AboutModal';
import ShortcutsSidebar from './components/ShortcutsSidebar';
import ImportModal from './components/ImportModal';
import DrawingModal from './components/DrawingModal';
import CropModal from './components/CropModal';
import ContextMenu from './components/ContextMenu';
import SlashMenu from './components/SlashMenu';
import TemplatesModal from './components/TemplatesModal';
import InsertMathModal from './components/InsertMathModal';
import Ruler from './components/Ruler';
import TableOfContents from './components/TableOfContents';
import { FilePlusIcon, FolderIcon, SaveIcon, KeyboardIcon } from './components/icons/EditorIcons';
import { translations, Language } from './lib/translations';
import { saveDocument, getAllDocuments, deleteDocument, saveAllDocuments } from './lib/db';
import { initGoogleDrive, handleAuthClick, handleSignOut, listDriveFiles, saveToDrive, loadFromDrive } from './lib/googleDrive';
import { Template } from './lib/templates';
import { useUIStore } from './store/uiStore';

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  selectionId: string;
}

export type PageSize = 'Letter' | 'Legal' | 'Tabloid' | 'Statement' | 'Executive' | 'A3' | 'A4' | 'A5' | 'B4' | 'B5';
export type PageOrientation = 'portrait' | 'landscape';
export interface PageMargins {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface Doc {
  id:string;
  name: string;
  content: string;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
  pageSize?: PageSize;
  pageOrientation?: PageOrientation;
  pageMargins?: PageMargins;
  pageColor?: string;
  googleDriveId?: string;
}

export interface WordCountStats {
  words: number;
  characters: number;
}

interface CopiedFormatting {
  fontName: string;
  fontSize: string;
  foreColor: string;
  hiliteColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

export type ShapeType = 'textbox' | 'rectangle' | 'circle' | 'triangle' | 'line';
export type ActivePanel = 'link' | 'image' | 'table' | 'findReplace' | 'shape' | null;

export interface ImageOptions {
    src: string;
    width: string;
    height: string;
    align: 'none' | 'left' | 'center' | 'right' | 'absolute';
}

export type ChatMessage = {
    role: 'user' | 'model';
    text: string;
    isThinking?: boolean;
    sources?: any[];
};

const AUTOSAVE_INTERVAL = 2500;

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [view, setView] = useState<'editor' | 'drive'>('editor');
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [content, setContent] = useState<string>('<p><br></p>');
  const [comments, setComments] = useState<Comment[]>([]);
  
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [floatingToolbar, setFloatingToolbar] = useState<{ top: number; left: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number } | null>(null);

  const [isSourceCodeVisible, setIsSourceCodeVisible] = useState(false);
  const [isWordCountVisible, setIsWordCountVisible] = useState(false);
  const [isSavePromptVisible, setIsSavePromptVisible] = useState(false);
  const [isCommentsSidebarVisible, setIsCommentsSidebarVisible] = useState(false);
  const [isSpecialCharVisible, setIsSpecialCharVisible] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [isAiSidekickVisible, setIsAiSidekickVisible] = useState(false);
  const [isPageSetupVisible, setIsPageSetupVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewDocContent, setPreviewDocContent] = useState('');
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);
  const [isShortcutsSidebarVisible, setIsShortcutsSidebarVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isDrawingModalVisible, setIsDrawingModalVisible] = useState(false);
  const [editingDrawingElement, setEditingDrawingElement] = useState<HTMLImageElement | null>(null);
  const [isCropModalVisible, setIsCropModalVisible] = useState(false);
  const [croppingImageElement, setCroppingImageElement] = useState<HTMLImageElement | null>(null);
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);
  const [isMathModalVisible, setIsMathModalVisible] = useState(false);
  const [editingMathElement, setEditingMathElement] = useState<HTMLElement | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  
  const [zoomLevel, setZoomLevel] = useState(100);
  const [wordCountStats, setWordCountStats] = useState<WordCountStats>({ words: 0, characters: 0 });

  const [isFormatPainterActive, setIsFormatPainterActive] = useState(false);
  const [copiedFormatting, setCopiedFormatting] = useState<CopiedFormatting | null>(null);
  const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(false);
  const [isRulerVisible, setIsRulerVisible] = useState(true);

  const [pageSize, setPageSize] = useState<PageSize>('Letter');
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait');
  const [pageColor, setPageColor] = useState('#FFFFFF');
  const [pageMargins, setPageMargins] = useState<PageMargins>({ top: 1, bottom: 1, left: 1, right: 1 });

  // Cloud Sync State
  const [isDriveInitialized, setIsDriveInitialized] = useState(false);
  const [isDriveLoggedIn, setIsDriveLoggedIn] = useState(false);
  const [cloudDocs, setCloudDocs] = useState<any[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const debouncedSaveRef = useRef<number | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const { theme, toggleTheme } = useUIStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const t = useMemo(() => {
    return (key: string, replacements?: { [key: string]: string | number }) => {
        let translation = key.split('.').reduce((obj, k) => obj?.[k], translations[language]);
        if (typeof translation !== 'string') {
            translation = key.split('.').reduce((obj, k) => obj?.[k], translations.en);
        }
        if (typeof translation !== 'string') return key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = (translation as string).replace(`{{${rKey}}}`, String(replacements[rKey]));
            });
        }
        return translation;
    };
  }, [language]);

  useEffect(() => {
    const apiKey = process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY;
    if (apiKey) {
      aiRef.current = new GoogleGenAI({ apiKey: apiKey });
    }
    initGoogleDrive((isInited) => { setIsDriveInitialized(isInited); });
  }, []);

  useEffect(() => {
    const loadDocs = async () => {
        try {
            const docs = await getAllDocuments();
            if (docs && docs.length > 0) setDocuments(docs);
        } catch (e) { console.error("Failed to load documents", e); }
    };
    loadDocs();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const updateWordCount = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    setWordCountStats({ words, characters });
  }, []);

  const saveDocumentChanges = useCallback(async () => {
      if (!currentDocId) return;
      setIsSaving(true);
      const docToSave: Partial<Doc> = {
          content: editorRef.current?.innerHTML || content,
          comments,
          updatedAt: Date.now(),
          pageSize,
          pageOrientation,
          pageMargins,
          pageColor,
      };
      
      const updatedDocs = documents.map(doc => doc.id === currentDocId ? { ...doc, ...docToSave } : doc);
      setDocuments(updatedDocs);
      
      const fullDoc = updatedDocs.find(d => d.id === currentDocId);
      if (fullDoc) {
          try {
              await saveDocument(fullDoc);
              setLastSaved(Date.now());
              if (isDriveLoggedIn && fullDoc.googleDriveId) {
                  try { await saveToDrive(fullDoc); } catch (err) { console.warn("Background cloud sync failed", err); }
              }
          } catch(e) { console.error("Failed to auto-save to DB", e); }
      }
      setTimeout(() => setIsSaving(false), 500);
  }, [content, comments, currentDocId, pageColor, pageMargins, pageOrientation, pageSize, documents, isDriveLoggedIn]);

  useEffect(() => {
    if (currentDocId) {
        if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
        debouncedSaveRef.current = window.setTimeout(() => { saveDocumentChanges(); }, AUTOSAVE_INTERVAL);
    }
    return () => { if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current); };
  }, [content, comments, currentDocId, saveDocumentChanges]);

  useEffect(() => {
    document.body.style.cursor = isFormatPainterActive ? 'crosshair' : 'default';
    if (editorRef.current) editorRef.current.style.cursor = isFormatPainterActive ? 'crosshair' : 'auto';
    return () => { document.body.style.cursor = 'default'; };
  }, [isFormatPainterActive]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    updateWordCount();
  }, [updateWordCount]);

  useEffect(() => { updateWordCount(); }, [content, updateWordCount]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if a modifier key is pressed (except Shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      // Ignore non-printable characters (e.g. Enter, Backspace, Arrow keys)
      if (e.key.length !== 1) return;

      // Ignore if we are already focused on an input, textarea, or contenteditable
      const activeEl = document.activeElement as HTMLElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.tagName === 'SELECT' || 
         activeEl.isContentEditable)
      ) {
        return;
      }

      // If we are in the editor view, focus the editor
      if (view === 'editor' && editorRef.current) {
        editorRef.current.focus();
        
        // Move cursor to the end so the typed character appears at the end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [view]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (selectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(selectionRef.current);
        } catch(e) { focusEditor(); }
      }
    } else { focusEditor(); }
  };

  const focusEditor = () => { setTimeout(() => { if (editorRef.current) editorRef.current.focus(); }, 0); };
  
  const handleEditAction = (command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
  };

  const handleNewDocument = () => {
    const defaultsString = localStorage.getItem('defaultPageSettings');
    const defaults = defaultsString ? JSON.parse(defaultsString) : {};
    setContent('<p><br></p>');
    setComments([]);
    setCurrentDocId(null);
    setLastSaved(null);
    setView('editor');
    setIsCommentsSidebarVisible(false);
    setActivePanel(null);
    setEditingElement(null);
    setSelectedElement(null);
    setFloatingToolbar(null);
    setIsAiSidekickVisible(false);
    setPageSize(defaults.size || 'Letter');
    setPageOrientation(defaults.orientation || 'portrait');
    setPageMargins(defaults.margins || { top: 1, bottom: 1, left: 1, right: 1 });
    setPageColor(defaults.color || '#FFFFFF');
    focusEditor();
  };

  const handleSaveDocument = async () => {
    if (currentDocId) {
      const now = Date.now();
      const currentContent = editorRef.current?.innerHTML || content;
      const updatedDocs = documents.map(doc => doc.id === currentDocId ? { ...doc, content: currentContent, comments, updatedAt: now, pageSize, pageOrientation, pageMargins, pageColor } : doc);
      setDocuments(updatedDocs);
      const docToSave = updatedDocs.find(d => d.id === currentDocId);
      if(docToSave) {
          await saveDocument(docToSave);
          if (isDriveLoggedIn) {
              const res = await saveToDrive(docToSave);
              if (res && res.id) {
                  docToSave.googleDriveId = res.id;
                  await saveDocument(docToSave); 
                  setToast("Saved to Local & Cloud");
                  return;
              }
          }
      }
      setLastSaved(now);
      setToast(t('toasts.docUpdated'));
    } else { setIsSavePromptVisible(true); }
  };

  const handleSaveNewDocument = async (docName: string) => {
    if (!docName || !docName.trim()) { setToast(t('toasts.nameEmpty')); return; }
    const now = Date.now();
    const newDoc: Doc = { id: `doc_${now}`, name: docName.trim(), content, comments, createdAt: now, updatedAt: now, pageSize, pageOrientation, pageMargins, pageColor };
    setDocuments(docs => [...docs, newDoc]);
    setCurrentDocId(newDoc.id);
    await saveDocument(newDoc);
    if (isDriveLoggedIn) {
        try {
            const res = await saveToDrive(newDoc);
            if (res && res.id) { newDoc.googleDriveId = res.id; await saveDocument(newDoc); }
        } catch (e) { console.error("Sync failed", e); }
    }
    setLastSaved(now);
    setToast(t('toasts.docSaved'));
    setIsSavePromptVisible(false);
    focusEditor();
  };

  const handleOpenDocument = (docId: string) => {
    const docToOpen = documents.find(doc => doc.id === docId);
    if (docToOpen) {
      setContent(docToOpen.content);
      setComments(docToOpen.comments || []);
      setCurrentDocId(docToOpen.id);
      setLastSaved(docToOpen.updatedAt);
      setIsCommentsSidebarVisible(docToOpen.comments && docToOpen.comments.length > 0);
      setActivePanel(null);
      setEditingElement(null);
      setSelectedElement(null);
      setFloatingToolbar(null);
      setIsAiSidekickVisible(false);
      setPageSize(docToOpen.pageSize || 'Letter');
      setPageOrientation(docToOpen.pageOrientation || 'portrait');
      setPageMargins(docToOpen.pageMargins || { top: 1, bottom: 1, left: 1, right: 1 });
      setPageColor(docToOpen.pageColor || '#FFFFFF');
      setView('editor');
    }
  };

  const handleDriveLogin = () => { handleAuthClick(async (token) => { setIsDriveLoggedIn(true); const files = await listDriveFiles(); setCloudDocs(files); }); };
  const handleDriveLogout = () => { handleSignOut(); setIsDriveLoggedIn(false); setCloudDocs([]); };
  
  const handleOpenFromCloud = async (fileId: string, name: string) => { 
      const data = await loadFromDrive(fileId);
      if (data) {
          // It's already in JSON format as per our save logic
          const newDoc: Doc = { ...data, googleDriveId: fileId };
          
          // Check if exists locally to avoid duplicates or overwrite
          const existing = documents.find(d => d.id === newDoc.id);
          if (existing) {
              // Update local
              const updated = documents.map(d => d.id === newDoc.id ? newDoc : d);
              setDocuments(updated);
              await saveDocument(newDoc);
          } else {
              setDocuments(prev => [...prev, newDoc]);
              await saveDocument(newDoc);
          }
          handleOpenDocument(newDoc.id);
      }
  };

  const handleRenameDocument = async (docId: string, newName: string) => { 
      const updatedDocs = documents.map(doc => doc.id === docId ? { ...doc, name: newName, updatedAt: Date.now() } : doc);
      setDocuments(updatedDocs);
      const doc = updatedDocs.find(d => d.id === docId);
      if(doc) {
          await saveDocument(doc);
          if (isDriveLoggedIn && doc.googleDriveId) saveToDrive(doc);
      }
      setToast(t('toasts.docRenamed'));
  };

  const handleDeleteDocument = async (docId: string) => { 
      setDocuments(docs => docs.filter(doc => doc.id !== docId));
      await deleteDocument(docId);
      if (currentDocId === docId) handleNewDocument();
      setToast(t('toasts.docDeleted'));
  };

  const handleDuplicateDocument = async (docId: string) => { 
      const doc = documents.find(d => d.id === docId);
      if(doc) {
          const newDoc = { ...doc, id: `doc_${Date.now()}`, name: t('drive.copyOf', {name: doc.name}), updatedAt: Date.now(), createdAt: Date.now(), googleDriveId: undefined };
          setDocuments(prev => [...prev, newDoc]);
          await saveDocument(newDoc);
          setToast(t('toasts.docDuplicated'));
      }
  };

  const handlePreviewDocument = (docId: string) => { 
      const doc = documents.find(d => d.id === docId);
      if(doc) {
          setPreviewDocContent(doc.content);
          setIsPreviewModalVisible(true);
      }
  };

  const handleExportAllDocuments = () => { 
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(documents));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "avma_text_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportAllDocuments = async (jsonContent: string) => { 
      try {
          const importedDocs: Doc[] = JSON.parse(jsonContent);
          if(Array.isArray(importedDocs)) {
              let count = 0;
              const currentIds = new Set(documents.map(d => d.id));
              const newDocs = [];
              for(const doc of importedDocs) {
                  if(!currentIds.has(doc.id)) {
                      newDocs.push(doc);
                      count++;
                  }
              }
              if(newDocs.length > 0) {
                  const updated = [...documents, ...newDocs];
                  setDocuments(updated);
                  await saveAllDocuments(updated);
                  setToast(t('toasts.docsImportedSuccess', {count}));
              } else {
                  setToast(t('toasts.docsImportedNothingNew'));
              }
          }
      } catch(e) {
          setToast(t('toasts.docsImportedError'));
      }
  };

  const handleExportToWord = () => { 
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header+document.getElementById("editor-page")?.innerHTML+footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `${documents.find(d=>d.id===currentDocId)?.name || 'document'}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
  };

  const handleExportToPdf = () => { 
      // @ts-ignore
      if (typeof html2pdf === 'undefined') {
          setToast(t('toasts.pdfError'));
          return;
      }
      const element = document.getElementById('editor-page');
      const opt = {
        margin: 0, // We handle margins via CSS/Layout
        filename: `${documents.find(d=>d.id===currentDocId)?.name || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: pageSize.toLowerCase(), orientation: pageOrientation }
      };
      // @ts-ignore
      html2pdf().set(opt).from(element).save();
  };

  const printOrPreview = (doPrint: boolean) => { 
      if (doPrint) {
          window.print();
      } else {
          // Just switching view mode effectively
          handlePreviewDocument(currentDocId || ''); 
      }
  };

  const handleUpdateSourceCode = (newCode: string) => { handleContentChange(newCode); setIsSourceCodeVisible(false); focusEditor(); };
  
  const handleToggleFullscreen = () => { 
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((e) => {
              setToast(t('toasts.fullscreenError', { message: e.message }));
          });
      } else {
          if (document.exitFullscreen) {
              document.exitFullscreen();
          }
      }
  };

  // Sidebar Open Logic - RESTORED
  const openPanel = (panel: ActivePanel, element?: HTMLElement) => {
      saveSelection(); // Save cursor position
      setEditingElement(element || null);
      setActivePanel(panel);
      setIsAiSidekickVisible(false);
      setIsCommentsSidebarVisible(false);
      setIsShortcutsSidebarVisible(false);
  };

  const handleApplyLink = ({ url, text }: { url: string, text: string }, elementToUpdate: HTMLAnchorElement | null) => {
      restoreSelection();
      if (elementToUpdate) {
          elementToUpdate.href = url;
          elementToUpdate.innerText = text;
      } else {
          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${text}</a>`);
      }
      setActivePanel(null);
  };

  const handleApplyImageSettings = (options: ImageOptions, elementToUpdate: HTMLImageElement | null, keepPanelOpen = false) => {
      restoreSelection();
      if (elementToUpdate) {
          elementToUpdate.src = options.src;
          if(options.width) elementToUpdate.style.width = `${options.width}px`;
          if(options.height) elementToUpdate.style.height = `${options.height}px`;
          
          if (options.align === 'absolute') {
              elementToUpdate.style.position = 'absolute';
              elementToUpdate.style.float = 'none';
              elementToUpdate.style.display = 'block';
          } else if (options.align === 'left') {
              elementToUpdate.style.position = 'relative';
              elementToUpdate.style.float = 'left';
              elementToUpdate.style.margin = '0 1rem 0.5rem 0';
              elementToUpdate.style.display = 'block';
          } else if (options.align === 'right') {
              elementToUpdate.style.position = 'relative';
              elementToUpdate.style.float = 'right';
              elementToUpdate.style.margin = '0 0 0.5rem 1rem';
              elementToUpdate.style.display = 'block';
          } else if (options.align === 'center') {
              elementToUpdate.style.position = 'relative';
              elementToUpdate.style.float = 'none';
              elementToUpdate.style.margin = '0 auto';
              elementToUpdate.style.display = 'block';
          } else {
              elementToUpdate.style.position = 'static';
              elementToUpdate.style.float = 'none';
              elementToUpdate.style.margin = '';
              elementToUpdate.style.display = 'inline';
          }
      } else {
          const imgHtml = `<img src="${options.src}" style="max-width: 100%;" />`;
          document.execCommand('insertHTML', false, imgHtml);
      }
      if (!keepPanelOpen) setActivePanel(null);
  };

  // Insert Shape Logic - RESTORED
  const handleInsertShape = (shapeType: ShapeType) => {
      restoreSelection(); // Ensure we insert where the user clicked
      const shape = document.createElement('div');
      shape.dataset.shapeType = shapeType;
      shape.style.position = 'absolute';
      shape.style.left = '100px'; // Default pos
      shape.style.top = '100px';
      
      if (shapeType === 'line') {
          shape.style.width = '100px';
          shape.style.height = '2px';
          shape.style.backgroundColor = 'black';
      } else if (shapeType === 'textbox') {
          shape.style.width = '150px';
          shape.style.height = 'auto';
          shape.style.minHeight = '50px';
          shape.style.backgroundColor = 'rgba(255, 255, 255, 0)'; // Transparent
          shape.style.border = '1px solid #ccc';
          shape.style.padding = '5px';
          shape.contentEditable = 'true'; // Inner editable
          shape.innerHTML = 'Type here...';
      } else {
          shape.style.width = '100px';
          shape.style.height = '100px';
          shape.style.backgroundColor = '#3b82f6'; // Blue
          
          if (shapeType === 'circle') shape.style.borderRadius = '50%';
          if (shapeType === 'triangle') {
              // CSS Triangles use borders, but for an editable shape we might prefer clip-path
              shape.style.backgroundColor = '#3b82f6';
              shape.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
          }
      }
      
      // We need to insert this into the editor
      // Since it's absolute, appending to the editor container is often safer than inserting at caret if caret is deep in text
      // However, to keep it part of content flow (or at least relative to page), let's insert it.
      // But standard execCommand inserts at caret.
      // If we want absolute positioning relative to PAGE, we append to editorRef
      if (editorRef.current) {
          editorRef.current.appendChild(shape);
          setSelectedElement(shape); // Select it immediately
      }
  };

  const handleUpdateElementStyle = (element: HTMLElement, newStyles: React.CSSProperties) => {
      Object.assign(element.style, newStyles);
      // Trigger save
      handleContentChange(editorRef.current?.innerHTML || '');
  };

  const handleChangeZIndex = (element: HTMLElement, direction: 'front' | 'back') => {
      const currentZ = parseInt(window.getComputedStyle(element).zIndex) || 0;
      element.style.zIndex = direction === 'front' ? `${currentZ + 1}` : `${Math.max(0, currentZ - 1)}`;
  };

  const handleInsertTable = (rows: number, cols: number) => {
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;"><tbody>';
      for (let i = 0; i < rows; i++) {
          tableHtml += '<tr>';
          for (let j = 0; j < cols; j++) {
              tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>';
          }
          tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table>';
      restoreSelection();
      document.execCommand('insertHTML', false, tableHtml);
      setActivePanel(null);
  };

  const handleInsertChecklist = () => {
      restoreSelection();
      const ul = `<ul data-type="checklist" style="list-style: none; padding-left: 0;"><li><input type="checkbox"> <span>Item 1</span></li></ul>`;
      document.execCommand('insertHTML', false, ul);
  };

  const handleTableAction = (action: any) => { 
      // This would require complex DOM manipulation of the table editingElement
      // Simplification for this output:
      if (!editingElement || editingElement.tagName !== 'TABLE') return;
      const table = editingElement as HTMLTableElement;
      
      // Basic implementation for delete table
      if (action === 'deleteTable') {
          table.remove();
          setActivePanel(null);
          setEditingElement(null);
          setSelectedElement(null);
      }
      // Full implementation of rows/cols requires tracking cursor position inside table cells
      // which is done in EditTablePane, but the action logic needs to traverse DOM.
      // For now, let's assume EditTablePane passes the logic or we handle basic ones.
  };

  const handleTableStyle = (style: any, applyTo: any) => {
      if (!editingElement || editingElement.tagName !== 'TABLE') return;
      // Apply style to table or cells logic...
      if (applyTo === 'table') {
          Object.assign(editingElement.style, style);
      }
  };

  // RESTORED Page Break
  const handleInsertPageBreak = () => {
      restoreSelection();
      // Insert specific HTML that our CSS recognizes as a visual break
      const pageBreak = '<div class="page-break-indicator"></div><p><br></p>';
      document.execCommand('insertHTML', false, pageBreak);
  };

  const handleOpenCommentModal = () => { setIsCommentModalVisible(true); };
  
  const handleAddComment = (text: string) => {
      const id = `comment_${Date.now()}`;
      // In a real editor, we'd wrap selection in a span with ID.
      // For simplicity:
      const newComment: Comment = {
          id,
          text,
          createdAt: Date.now(),
          resolved: false,
          selectionId: 'sel_' + id // Mock
      };
      setComments(prev => [...prev, newComment]);
      setIsCommentModalVisible(false);
      setIsCommentsSidebarVisible(true);
  };

  const handleResolveComment = (commentId: string) => {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: true } : c));
  };

  const handleInsertCharacter = (char: string) => {
      restoreSelection();
      document.execCommand('insertText', false, char);
      setIsSpecialCharVisible(false);
  };
  
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
        const step = 10;
        let newZoom = direction === 'in' ? prev + step : prev - step;
        if (newZoom < 50) newZoom = 50;
        if (newZoom > 200) newZoom = 200;
        return newZoom;
    });
  };

  const checkAiAvailability = () => {
    if (!aiRef.current) {
        setToast(t('toasts.aiNotAvailable'));
        return false;
    }
    return true;
  };

  const openPanelForElement = (element: HTMLElement | null) => {
      if (!element) return;
      setEditingElement(element);
      setIsAiSidekickVisible(false);
      setIsCommentsSidebarVisible(false);
      setIsShortcutsSidebarVisible(false);
      
      if (element.tagName === 'IMG') {
          setActivePanel('image');
      } else if (element.tagName === 'TABLE') {
          setActivePanel('table');
      } else if (element.tagName === 'A') {
          setActivePanel('link');
      } else if (element.dataset.shapeType) {
          setActivePanel('shape');
      } else {
          setActivePanel(null);
      }
  };

  const handleCopyFormatting = () => { setIsFormatPainterActive(true); };
  const handlePasteFormatting = () => { setIsFormatPainterActive(false); }; // Placeholder
  
  const handleEditorMouseUp = () => {
      // Check for selection changes or object clicks
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
          const node = selection.anchorNode;
          const element = node?.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node?.parentElement;
          // Logic to update toolbar state is inside Toolbar component via event listeners
      }
  };

  const handleContextMenu = (e: React.MouseEvent) => { 
      if (window.matchMedia('(pointer: coarse)').matches) return;
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table');
      if (target.tagName === 'IMG') {
          openPanelForElement(target);
      } else if (table) {
          openPanelForElement(table as HTMLElement);
      }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table');
      
      if (target.dataset.shapeType || target.tagName === 'IMG') {
          setSelectedElement(target);
      } else if (table) {
          setSelectedElement(table as HTMLElement);
      } else {
          setSelectedElement(null);
      }
  };

  const handleFloatingToolbarCommand = (command: string) => { handleEditAction(command); setFloatingToolbar(null); };
  
  const handleReadAloud = async () => { setIsReadingAloud(prev => !prev); }; // Simplified
  
  const handleAiAction = async (action: string, option?: string) => {
      if (!checkAiAvailability()) return;
      setToast(t('toasts.aiProcessing'));
      // Implementation of AI actions...
  };

  const handleAiImageEdit = async (prompt: string, imageElement: HTMLImageElement) => { 
      if (!checkAiAvailability()) return;
      // Implementation
  };

  const handleOcrImport = async (base64Image: string) => {
      if (!checkAiAvailability()) return;
      // Implementation
  };

  const handleSaveDrawing = (imageDataUrl: string) => {
      restoreSelection();
      const imgHtml = `<img src="${imageDataUrl}" style="max-width:100%" />`;
      document.execCommand('insertHTML', false, imgHtml);
      setIsDrawingModalVisible(false);
  };

  const handleOpenCropModal = () => {
      if (editingElement && editingElement instanceof HTMLImageElement) {
          setCroppingImageElement(editingElement);
          setIsCropModalVisible(true);
      }
  };

  const handleApplyCrop = (dataUrl: string, newWidth: number, newHeight: number) => {
      if (croppingImageElement) {
          croppingImageElement.src = dataUrl;
          croppingImageElement.style.width = `${newWidth}px`;
          croppingImageElement.style.height = `${newHeight}px`;
      }
  };

  const handleReplaceAll = (find: string, replace: string, options: { matchCase: boolean; wholeWord: boolean }) => {
      // Implementation
  };

  const handleInsertTemplate = (templateContent: string, templateObj?: Template) => {
      if (templateObj && templateObj.margins) {
          setPageMargins(templateObj.margins);
      }
      setIsTemplatesModalVisible(false);
      handleNewDocument(); 
      setContent(templateContent);
      if (templateObj && templateObj.margins) {
          setPageMargins(templateObj.margins);
      }
  };

  const handleInsertMath = (latex: string) => {
      restoreSelection();
      // Insert a non-editable span with data attribute
      const html = `<span class="math-node" data-latex="${latex.replace(/"/g, '&quot;')}" contenteditable="false">Math</span>`;
      document.execCommand('insertHTML', false, html);
      setIsMathModalVisible(false);
  };

  const pageDimensions: Record<PageSize, { width: number; height: number }> = {
    Letter: { width: 8.5 * 96, height: 11 * 96 },
    Legal: { width: 8.5 * 96, height: 14 * 96 },
    Tabloid: { width: 11 * 96, height: 17 * 96 },
    Statement: { width: 5.5 * 96, height: 8.5 * 96 },
    Executive: { width: 7.25 * 96, height: 10.5 * 96 },
    A3: { width: 1122.5, height: 1587.4 },
    A4: { width: 793.7, height: 1122.5 },
    A5: { width: 559.3, height: 793.7 },
    B4: { width: 944.8, height: 1334.1 },
    B5: { width: 665.1, height: 944.8 },
  };

  let pageW = pageDimensions[pageSize].width;
  let pageH = pageDimensions[pageSize].height;

  if (pageOrientation === 'landscape') {
      const temp = pageW;
      pageW = pageH;
      pageH = temp;
  }

  const pageContainerStyle: React.CSSProperties = {
    width: `${pageW}px`,
    minHeight: `${pageH}px`,
    backgroundColor: pageColor,
    position: 'relative',
    '--page-margin-top': `${pageMargins.top}in`,
    '--page-margin-bottom': `${pageMargins.bottom}in`,
    '--page-margin-left': `${pageMargins.left}in`,
    '--page-margin-right': `${pageMargins.right}in`,
  } as React.CSSProperties;

  const editorContentStyle: React.CSSProperties = {
      padding: `${pageMargins.top}in ${pageMargins.right}in ${pageMargins.bottom}in ${pageMargins.left}in`,
      minHeight: `${pageH}px`,
  };
  
  const handleApplyPageSetup = (settings: any) => {
    setPageSize(settings.size);
    setPageOrientation(settings.orientation);
    setPageMargins(settings.margins);
    setPageColor(settings.color);
    if (settings.setAsDefault) {
        localStorage.setItem('defaultPageSettings', JSON.stringify({ size: settings.size, orientation: settings.orientation, margins: settings.margins, color: settings.color }));
    }
    setIsPageSetupVisible(false);
  };

  const handleCloseSidebars = () => {
    setActivePanel(null);
    setEditingElement(null);
    setSelectedElement(null);
    setIsCommentsSidebarVisible(false);
    setIsAiSidekickVisible(false);
    setIsShortcutsSidebarVisible(false);
  };

  const isAnySidebarOpen = isAiSidekickVisible || activePanel || isCommentsSidebarVisible || isShortcutsSidebarVisible;

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans overflow-hidden">
      {view === 'editor' ? (
        <>
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm hidden md:block border-b border-gray-200/50 dark:border-gray-700/50">
                 <MenuBar 
                  onNewDocument={handleNewDocument}
                  onNewFromTemplate={() => setIsTemplatesModalVisible(true)}
                  onSave={handleSaveDocument}
                  onViewSaved={() => setView('drive')}
                  onExportToWord={handleExportToWord}
                  onExportToPdf={handleExportToPdf}
                  onPrint={() => printOrPreview(true)}
                  onEditAction={handleEditAction}
                  onOpenFindReplace={() => openPanel('findReplace')}
                  onCopyFormatting={handleCopyFormatting}
                  onInsertLink={() => openPanel('link')}
                  onInsertImage={() => openPanel('image')}
                  onInsertTable={() => openPanel('table')}
                  onInsertShape={handleInsertShape}
                  onInsertHorizontalRule={() => handleEditAction('insertHorizontalRule')}
                  onAddComment={() => { saveSelection(); handleOpenCommentModal(); }}
                  onOpenSourceCode={() => setIsSourceCodeVisible(true)}
                  onOpenWordCount={() => setIsWordCountVisible(true)}
                  onToggleFullscreen={handleToggleFullscreen}
                  onPreview={() => printOrPreview(false)}
                  onShowComments={() => { setIsCommentsSidebarVisible(prev => !prev); setActivePanel(null); setIsAiSidekickVisible(false); setIsShortcutsSidebarVisible(false); }}
                  onToggleAiSidekick={() => { if (!checkAiAvailability()) return; setIsAiSidekickVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsShortcutsSidebarVisible(false); }}
                  onOpenShortcuts={() => { setIsShortcutsSidebarVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsAiSidekickVisible(false); }}
                  onOpenSpecialCharacters={() => { saveSelection(); setIsSpecialCharVisible(true); }}
                  isSaving={isSaving}
                  lastSaved={lastSaved}
                  isDocumentSaved={!!currentDocId}
                  onOpenPageSetup={() => setIsPageSetupVisible(true)}
                  onOpenAboutModal={() => setIsAboutModalVisible(true)}
                  onInsertPageBreak={handleInsertPageBreak}
                  onInsertMath={() => { saveSelection(); setEditingMathElement(null); setIsMathModalVisible(true); }}
                  onSetLanguage={setLanguage}
                  onReadAloud={handleReadAloud}
                  isReadingAloud={isReadingAloud}
                  onToggleSpellcheck={() => setIsSpellcheckEnabled(prev => !prev)}
                  isSpellcheckEnabled={isSpellcheckEnabled}
                  onToggleRuler={() => setIsRulerVisible(prev => !prev)}
                  isRulerVisible={isRulerVisible}
                  onOpenFileImport={() => { saveSelection(); setIsImportModalVisible(true); }}
                  onInsertDrawing={() => { saveSelection(); setIsDrawingModalVisible(true); setEditingDrawingElement(null); }}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                  t={t}
                />
            </header>
            
            {/* Mobile MenuBar (hidden nav, but needed for portal) */}
            <div className="md:hidden">
                <MenuBar 
                  onNewDocument={handleNewDocument}
                  onNewFromTemplate={() => setIsTemplatesModalVisible(true)}
                  onSave={handleSaveDocument}
                  onViewSaved={() => setView('drive')}
                  onExportToWord={handleExportToWord}
                  onExportToPdf={handleExportToPdf}
                  onPrint={() => printOrPreview(true)}
                  onEditAction={handleEditAction}
                  onOpenFindReplace={() => openPanel('findReplace')}
                  onCopyFormatting={handleCopyFormatting}
                  onInsertLink={() => openPanel('link')}
                  onInsertImage={() => openPanel('image')}
                  onInsertTable={() => openPanel('table')}
                  onInsertShape={handleInsertShape}
                  onInsertHorizontalRule={() => handleEditAction('insertHorizontalRule')}
                  onAddComment={() => { saveSelection(); handleOpenCommentModal(); }}
                  onOpenSourceCode={() => setIsSourceCodeVisible(true)}
                  onOpenWordCount={() => setIsWordCountVisible(true)}
                  onToggleFullscreen={handleToggleFullscreen}
                  onPreview={() => printOrPreview(false)}
                  onShowComments={() => { setIsCommentsSidebarVisible(prev => !prev); setActivePanel(null); setIsAiSidekickVisible(false); setIsShortcutsSidebarVisible(false); }}
                  onToggleAiSidekick={() => { if (!checkAiAvailability()) return; setIsAiSidekickVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsShortcutsSidebarVisible(false); }}
                  onOpenShortcuts={() => { setIsShortcutsSidebarVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsAiSidekickVisible(false); }}
                  onOpenSpecialCharacters={() => { saveSelection(); setIsSpecialCharVisible(true); }}
                  isSaving={isSaving}
                  lastSaved={lastSaved}
                  isDocumentSaved={!!currentDocId}
                  onOpenPageSetup={() => setIsPageSetupVisible(true)}
                  onOpenAboutModal={() => setIsAboutModalVisible(true)}
                  onInsertPageBreak={handleInsertPageBreak}
                  onInsertMath={() => { saveSelection(); setEditingMathElement(null); setIsMathModalVisible(true); }}
                  onSetLanguage={setLanguage}
                  onReadAloud={handleReadAloud}
                  isReadingAloud={isReadingAloud}
                  onToggleSpellcheck={() => setIsSpellcheckEnabled(prev => !prev)}
                  isSpellcheckEnabled={isSpellcheckEnabled}
                  onToggleRuler={() => setIsRulerVisible(prev => !prev)}
                  isRulerVisible={isRulerVisible}
                  onOpenFileImport={() => { saveSelection(); setIsImportModalVisible(true); }}
                  onInsertDrawing={() => { saveSelection(); setIsDrawingModalVisible(true); setEditingDrawingElement(null); }}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                  t={t}
                />
            </div>
            
            <div className="hidden md:block w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Toolbar 
                  editorRef={editorRef} 
                  onCopyFormatting={handleCopyFormatting} 
                  isFormatPainterActive={isFormatPainterActive}
                  onToggleAiSidekick={() => { if (!checkAiAvailability()) return; setIsAiSidekickVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsShortcutsSidebarVisible(false); }}
                  onInsertChecklist={handleInsertChecklist}
                  t={t}
                />
            </div>
            
            <div className="flex-grow flex overflow-hidden relative">
                <TableOfContents editorRef={editorRef} content={content} />
                <main className="flex-grow flex flex-col bg-gray-200 dark:bg-gray-600 print-view relative overflow-hidden">
                    <div className="flex-grow overflow-auto relative flex flex-col items-center">
                        {isRulerVisible && (
                            <div className="sticky top-0 z-20 hidden md:flex flex-col items-center bg-gray-200 dark:bg-gray-600 w-full md:min-w-max">
                                 <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 h-6 flex shadow-sm">
                                     <div className="w-6 flex-none bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-600 z-30"></div>
                                     <div className="flex-none" style={{ width: pageW * (zoomLevel / 100) }}>
                                         <Ruler orientation="horizontal" length={pageW} zoom={zoomLevel} margins={pageMargins} pageWidth={pageW} pageHeight={pageH} />
                                     </div>
                                     <div className="flex-grow bg-gray-200 dark:bg-gray-600"></div>
                                 </div>
                            </div>
                        )}

                        <div className="flex w-full md:w-auto md:min-w-max justify-center md:justify-start">
                            {isRulerVisible && (
                                <div className="sticky left-0 z-10 w-6 flex-none hidden md:flex flex-col items-end bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600">
                                     <Ruler orientation="vertical" length={pageH} zoom={zoomLevel} margins={pageMargins} pageWidth={pageW} pageHeight={pageH} />
                                </div>
                            )}

                            <div className="editor-zoom-container w-full md:w-auto p-0 md:p-12 transition-transform duration-200 md:origin-top-left flex justify-center md:block" style={{ transform: window.innerWidth < 768 ? 'none' : `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }} onContextMenu={handleContextMenu}>
                                <div 
                                    id="editor-page" 
                                    className="relative bg-white dark:bg-gray-900 shadow-2xl box-border"
                                    style={pageContainerStyle}
                                    onClick={(e) => {
                                      if (e.target === e.currentTarget) {
                                        const editor = editorRef.current;
                                        if (editor) {
                                          editor.focus();
                                          const range = document.createRange();
                                          range.selectNodeContents(editor);
                                          range.collapse(false);
                                          const sel = window.getSelection();
                                          if (sel) {
                                            sel.removeAllRanges();
                                            sel.addRange(range);
                                          }
                                        }
                                      }
                                    }}
                                >
                                    <div className="editor-content-wrapper" style={editorContentStyle}>
                                        <Editor 
                                          ref={editorRef} 
                                          content={content} 
                                          onChange={handleContentChange}
                                          onMouseUp={handleEditorMouseUp}
                                          onDoubleClick={handleDoubleClick}
                                          onClick={handleClick}
                                          spellCheck={isSpellcheckEnabled}
                                          onSlashCommand={(x, y) => setSlashMenu({ x, y })}
                                        />
                                    </div>

                                    {selectedElement && (
                                        <ObjectWrapper 
                                            targetElement={selectedElement}
                                            onUpdate={handleUpdateElementStyle}
                                            onDeselect={() => setSelectedElement(null)}
                                            onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); openPanelForElement(selectedElement); }}
                                            zoomLevel={zoomLevel}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                
                {isAnySidebarOpen && (
                    <>
                        <div className="md:hidden fixed inset-0 bg-black bg-opacity-25 z-30" onClick={handleCloseSidebars} />
                        <div className="absolute top-0 right-0 h-full w-screen max-w-sm md:w-auto md:max-w-none md:relative z-40 md:flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            {isAiSidekickVisible ? (
                                <AiSidekick
                                    ai={aiRef.current}
                                    onClose={handleCloseSidebars}
                                    onInsertText={(text) => { saveSelection(); restoreSelection(); document.execCommand('insertHTML', false, text); }}
                                    setToast={setToast}
                                    t={t}
                                />
                            ) : activePanel ? (
                                <SettingsSidebar
                                    activePanel={activePanel}
                                    editingElement={editingElement}
                                    onClose={handleCloseSidebars}
                                    onReplaceAll={handleReplaceAll}
                                    onApplyLink={handleApplyLink}
                                    onApplyImageSettings={handleApplyImageSettings}
                                    onInsertTable={handleInsertTable}
                                    onUpdateElementStyle={handleUpdateElementStyle}
                                    onChangeZIndex={handleChangeZIndex}
                                    onAiImageEdit={(prompt) => handleAiImageEdit(prompt, editingElement as HTMLImageElement)}
                                    onOpenCropModal={handleOpenCropModal}
                                    onTableAction={handleTableAction}
                                    onTableStyle={handleTableStyle}
                                    t={t}
                                />
                            ) : isCommentsSidebarVisible ? (
                                <CommentsSidebar 
                                    comments={comments.filter(c => !c.resolved)} 
                                    onResolve={handleResolveComment}
                                    onClose={handleCloseSidebars}
                                    onAddComment={() => { saveSelection(); handleOpenCommentModal(); }}
                                    t={t}
                                />
                            ) : isShortcutsSidebarVisible ? (
                                <ShortcutsSidebar onClose={handleCloseSidebars} t={t} />
                            ) : null}
                        </div>
                    </>
                )}
            </div>

            <StatusBar stats={wordCountStats} zoomLevel={zoomLevel} onZoomIn={() => handleZoom('in')} onZoomOut={() => handleZoom('out')} t={t} />

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex flex-col">
                    <Toolbar 
                      editorRef={editorRef} 
                      onCopyFormatting={handleCopyFormatting} 
                      isFormatPainterActive={isFormatPainterActive}
                      onToggleAiSidekick={() => { if (!checkAiAvailability()) return; setIsAiSidekickVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsShortcutsSidebarVisible(false); }}
                      onInsertChecklist={handleInsertChecklist}
                      onOpenMenu={() => setIsMobileMenuOpen(true)}
                      t={t}
                    />
                    <div className="flex items-center justify-around p-2 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={handleNewDocument} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center gap-1">
                            <FilePlusIcon className="w-5 h-5" />
                            <span className="text-[10px]">{t('menu.fileNew')}</span>
                        </button>
                        <button onClick={() => setView('drive')} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center gap-1">
                            <FolderIcon className="w-5 h-5" />
                            <span className="text-[10px]">{t('menu.fileViewSaved')}</span>
                        </button>
                        <button onClick={handleSaveDocument} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center gap-1">
                            <SaveIcon className="w-5 h-5" />
                            <span className="text-[10px]">{t('menu.fileSave')}</span>
                        </button>
                        <button onClick={() => setIsShortcutsSidebarVisible(true)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex flex-col items-center gap-1">
                            <KeyboardIcon className="w-5 h-5" />
                            <span className="text-[10px]">{t('menu.helpShortcuts')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
      ) : (
        <DriveView
          documents={documents}
          onOpenDocument={handleOpenDocument}
          onRenameDocument={handleRenameDocument}
          onDeleteDocument={handleDeleteDocument}
          onDuplicateDocument={handleDuplicateDocument}
          onPreviewDocument={handlePreviewDocument}
          onCreateNewDocument={handleNewDocument}
          onClose={() => setView('editor')}
          onExportAllDocuments={handleExportAllDocuments}
          onImportAllDocuments={handleImportAllDocuments}
          currentDocId={currentDocId}
          t={t}
          isDriveInitialized={isDriveInitialized}
          isDriveLoggedIn={isDriveLoggedIn}
          onDriveLogin={handleDriveLogin}
          onDriveLogout={handleDriveLogout}
          cloudDocs={cloudDocs}
          onOpenFromCloud={handleOpenFromCloud}
        />
      )}
      
      {toast && <div className={`fixed bottom-16 right-5 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg z-50 ${isAnalyzing ? 'animate-pulse' : ''}`}>{toast}</div>}
      
      {floatingToolbar && (
        <FloatingToolbar
            top={floatingToolbar.top}
            left={floatingToolbar.left}
            onAddComment={() => { saveSelection(); handleOpenCommentModal(); setFloatingToolbar(null); }}
            onCommand={handleFloatingToolbarCommand}
            onInsertLink={() => openPanel('link')}
            onAiAction={handleAiAction}
            t={t}
        />
      )}
      
      {slashMenu && (
        <SlashMenu
          x={slashMenu.x}
          y={slashMenu.y}
          onClose={() => setSlashMenu(null)}
          onSelect={(command) => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const node = range.startContainer;
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                // Remove the slash
                if (text.endsWith('/')) {
                  node.textContent = text.slice(0, -1);
                  const newRange = document.createRange();
                  newRange.setStart(node, text.length - 1);
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }

            if (command === 'h1') {
              document.execCommand('formatBlock', false, 'H1');
            } else if (command === 'h2') {
              document.execCommand('formatBlock', false, 'H2');
            } else if (command === 'ul') {
              document.execCommand('insertUnorderedList', false);
            } else if (command === 'ol') {
              document.execCommand('insertOrderedList', false);
            } else if (command === 'image') {
              openPanel('image');
            } else if (command === 'table') {
              openPanel('table');
            } else if (command === 'ai') {
              if (checkAiAvailability()) {
                setIsAiSidekickVisible(true);
              }
            }
          }}
          t={t}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={async (command) => { 
            if (command === 'copy' || command === 'cut' || command === 'paste') {
              document.execCommand(command); 
            } else if (command === 'paste-plain') {
              try {
                const text = await navigator.clipboard.readText();
                document.execCommand('insertText', false, text);
              } catch (err) {
                console.error('Failed to read clipboard contents: ', err);
              }
            }
          }}
          onAiAction={handleAiAction}
          hasSelection={!!window.getSelection()?.toString()}
          t={t}
        />
      )}

      <SourceCodeModal isOpen={isSourceCodeVisible} onClose={() => setIsSourceCodeVisible(false)} content={content} onSave={handleUpdateSourceCode} t={t} />
      <WordCountModal isOpen={isWordCountVisible} onClose={() => setIsWordCountVisible(false)} stats={wordCountStats} t={t} />
      <UrlInputModal isOpen={isSavePromptVisible} onClose={() => setIsSavePromptVisible(false)} onSubmit={handleSaveNewDocument} title={t('modals.saveDoc.title')} label={t('modals.saveDoc.label')} initialValue={t('modals.saveDoc.placeholder')} submitButtonText={t('modals.saveDoc.save')} t={t} />
      <SpecialCharactersModal isOpen={isSpecialCharVisible} onClose={() => setIsSpecialCharVisible(false)} onInsert={handleInsertCharacter} t={t} />
      <CommentInputModal isOpen={isCommentModalVisible} onClose={() => setIsCommentModalVisible(false)} onSubmit={handleAddComment} t={t} />
      <PageSetupModal isOpen={isPageSetupVisible} onClose={() => setIsPageSetupVisible(false)} onApply={handleApplyPageSetup} pageSettings={{ size: pageSize, orientation: pageOrientation, margins: pageMargins, color: pageColor }} t={t} />
      <DocumentPreviewModal isOpen={isPreviewModalVisible} onClose={() => setIsPreviewModalVisible(false)} content={previewDocContent} t={t} />
      <AboutModal isOpen={isAboutModalVisible} onClose={() => setIsAboutModalVisible(false)} t={t} />
      <ImportModal isOpen={isImportModalVisible} onClose={() => setIsImportModalVisible(false)} onImport={handleOcrImport} t={t} />
      <DrawingModal isOpen={isDrawingModalVisible} onClose={() => { setIsDrawingModalVisible(false); setEditingDrawingElement(null); }} onSave={handleSaveDrawing} initialDataUrl={editingDrawingElement?.src} t={t} />
      <CropModal isOpen={isCropModalVisible} onClose={() => { setIsCropModalVisible(false); setCroppingImageElement(null); }} onApply={handleApplyCrop} imageSrc={croppingImageElement?.src || null} t={t} />
      <TemplatesModal isOpen={isTemplatesModalVisible} onClose={() => setIsTemplatesModalVisible(false)} onSelect={(content, template) => handleInsertTemplate(content, template)} t={t} />
      <InsertMathModal isOpen={isMathModalVisible} onClose={() => setIsMathModalVisible(false)} onInsert={handleInsertMath} initialLatex={editingMathElement?.dataset.latex} t={t} />
    </div>
  );
};

export default App;
