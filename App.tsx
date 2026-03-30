
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
import CalculatorModal from './components/CalculatorModal';
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
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
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
  const [isDirty, setIsDirty] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('<p><br></p>');
  const [originalComments, setOriginalComments] = useState<Comment[]>([]);
  
  const [zoomLevel, setZoomLevel] = useState(100);
  const [wordCountStats, setWordCountStats] = useState<WordCountStats>({ words: 0, characters: 0 });

  // History State for Undo/Redo
  interface HistoryEntry {
    content: string;
    selection: number;
  }
  const [history, setHistory] = useState<HistoryEntry[]>([{ content: '<p><br></p>', selection: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const lastHistoryUpdate = useRef<number>(Date.now());
  const isUndoRedoAction = useRef(false);

  const getCaretPosition = useCallback(() => {
    if (!editorRef.current) return 0;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }, []);

  const setCaretPosition = useCallback((pos: number) => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    
    if (pos <= 0) {
      range.setStart(editorRef.current, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    let currentPos = 0;
    const nodeStack: Node[] = [editorRef.current];
    let found = false;

    while (nodeStack.length > 0 && !found) {
      const node = nodeStack.pop()!;
      if (node.nodeType === Node.TEXT_NODE) {
        const nextPos = currentPos + (node.textContent?.length || 0);
        if (pos <= nextPos) {
          range.setStart(node, pos - currentPos);
          range.collapse(true);
          found = true;
        }
        currentPos = nextPos;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    if (found) {
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // If not found (pos beyond text length), set to end of last text node or end of editor
      range.setStart(editorRef.current, editorRef.current.childNodes.length);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

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

  useEffect(() => {
    // Inject Excel-style table header styles
    const styleId = 'excel-table-headers-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .show-excel-headers {
          margin-top: 30px !important;
          margin-left: 45px !important;
          position: relative !important;
        }
        .show-excel-headers td, .show-excel-headers th {
          position: relative;
        }
        /* Column Headers (A, B, C...) */
        .show-excel-headers tr:first-child td::before, 
        .show-excel-headers tr:first-child th::before {
          content: attr(data-col-label);
          position: absolute;
          top: -25px;
          left: -1px;
          right: -1px;
          height: 25px;
          background: #f8f9fa;
          border: 1px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          color: #666;
          z-index: 1;
          pointer-events: auto;
          cursor: pointer;
        }
        .dark .show-excel-headers tr:first-child td::before,
        .dark .show-excel-headers tr:first-child th::before {
          background: #2d2d2d;
          border-color: #444;
          color: #aaa;
        }
        /* Row Headers (1, 2, 3...) */
        .show-excel-headers td:first-child::after,
        .show-excel-headers th:first-child::after {
          content: attr(data-row-label);
          position: absolute;
          left: -45px;
          top: -1px;
          bottom: -1px;
          width: 45px;
          background: #f8f9fa;
          border: 1px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          color: #666;
          z-index: 1;
          pointer-events: auto;
          cursor: pointer;
        }
        .dark .show-excel-headers td:first-child::after,
        .dark .show-excel-headers th:first-child::after {
          background: #2d2d2d;
          border-color: #444;
          color: #aaa;
        }
        /* Corner Piece */
        .show-excel-headers tr:first-child td:first-child::before {
          border-left: 1px solid #ccc;
        }
        .show-excel-headers tr:first-child td:first-child::after {
          border-top: 1px solid #ccc;
        }
        .dark .show-excel-headers tr:first-child td:first-child::before,
        .dark .show-excel-headers tr:first-child td:first-child::after {
          border-color: #444;
        }
        /* Selection highlight */
        .show-excel-headers td.selected-cell {
          background-color: rgba(59, 130, 246, 0.2) !important;
          outline: 2px solid #3b82f6;
          z-index: 2;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const t = useMemo(() => {
    return (key: string, replacements?: { [key: string]: string | number }) => {
        const getNested = (obj: any, path: string) => {
            return path.split('.').reduce((o, k) => o?.[k], obj);
        };
        
        let translation = getNested(translations[language], key);
        if (translation === undefined) {
            translation = getNested(translations.en, key);
        }
        
        if (translation === undefined) return key;
        
        if (typeof translation === 'string') {
            if (replacements) {
                let result = translation;
                Object.keys(replacements).forEach(rKey => {
                    result = result.replace(`{{${rKey}}}`, String(replacements[rKey]));
                });
                return result;
            }
            return translation;
        }
        
        // If it's an object (like shortcuts), return it as is
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
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

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
      const currentContent = editorRef.current?.innerHTML || content;
      const docToSave: Partial<Doc> = {
          content: currentContent,
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
              setOriginalContent(currentContent);
              setOriginalComments([...comments]);
              setIsDirty(false);
              if (isDriveLoggedIn && fullDoc.googleDriveId) {
                  try { await saveToDrive(fullDoc); } catch (err) { console.warn("Background cloud sync failed", err); }
              }
          } catch(e) { console.error("Failed to save to DB", e); }
      }
      setTimeout(() => setIsSaving(false), 500);
  }, [content, comments, currentDocId, pageColor, pageMargins, pageOrientation, pageSize, documents, isDriveLoggedIn]);

  const handleCancelChanges = useCallback(() => {
    if (window.confirm(t('prompts.confirmCancel'))) {
      if (currentDocId) {
        setContent(originalContent);
        setComments(originalComments);
        if (editorRef.current) {
          editorRef.current.innerHTML = originalContent;
        }
      } else {
        setContent('<p><br></p>');
        setComments([]);
        if (editorRef.current) {
          editorRef.current.innerHTML = '<p><br></p>';
        }
      }
      setIsDirty(false);
    }
  }, [originalContent, originalComments, t, currentDocId]);

  useEffect(() => {
    const currentContent = editorRef.current?.innerHTML || content;
    const isEmpty = !currentContent || currentContent === '<p><br></p>' || currentContent === '<p></p>' || currentContent === '<br>';
    
    if (currentDocId) {
        const hasContentChanged = currentContent !== originalContent;
        const hasCommentsChanged = JSON.stringify(comments) !== JSON.stringify(originalComments);
        setIsDirty(hasContentChanged || hasCommentsChanged);
    } else {
        setIsDirty(!isEmpty);
    }
  }, [content, comments, currentDocId, originalContent, originalComments]);

  useEffect(() => {
    document.body.style.cursor = isFormatPainterActive ? 'crosshair' : 'default';
    if (editorRef.current) editorRef.current.style.cursor = isFormatPainterActive ? 'crosshair' : 'auto';
    return () => { document.body.style.cursor = 'default'; };
  }, [isFormatPainterActive]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    updateWordCount();

    // Custom History Logic
    if (!isUndoRedoAction.current) {
        const now = Date.now();
        const timeDiff = now - lastHistoryUpdate.current;
        const lastEntry = history[historyIndex];
        const caretPos = getCaretPosition();
        
        // Use textContent to check for boundaries reliably
        const textContent = editorRef.current?.textContent || '';
        const lastChar = textContent.substring(0, caretPos).slice(-1);
        
        const lengthDiff = Math.abs(newContent.length - (lastEntry?.content.length || 0));
        
        // Push to history if:
        // 1. It's the first change in the document
        // 2. Boundary character reached (space, punctuation, newline)
        // 3. Significant time passed (1 second)
        // 4. Significant length change (5 chars)
        const isSignificant = 
            (historyIndex === 0 && lengthDiff > 0) ||
            (lengthDiff > 0 && (lastChar === ' ' || lastChar === '.' || lastChar === ',' || lastChar === '!' || lastChar === '?' || lastChar === '\n' || lastChar === '\t')) ||
            lengthDiff > 5 ||
            timeDiff > 1000;

        if (isSignificant) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push({ content: newContent, selection: caretPos });
            if (newHistory.length > 300) newHistory.shift(); // Increased limit to 300
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            lastHistoryUpdate.current = now;
        }
    }
  }, [updateWordCount, history, historyIndex, getCaretPosition]);

  const handleUndo = useCallback(() => {
    const currentContent = editorRef.current?.innerHTML || content;
    const lastEntry = history[historyIndex];
    const caretPos = getCaretPosition();

    // If current content is different from what's in history at current index,
    // it means there are unsaved changes. Save them so we can Redo back to them.
    if (currentContent !== lastEntry?.content) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ content: currentContent, selection: caretPos });
        setHistory(newHistory);
        
        // Now we are at the new entry (newHistory.length - 1).
        // We want to undo to the one before it (newHistory.length - 2).
        const targetIndex = newHistory.length - 2;
        const targetEntry = newHistory[targetIndex];
        
        isUndoRedoAction.current = true;
        setHistoryIndex(targetIndex);
        setContent(targetEntry.content);
        
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
                setCaretPosition(targetEntry.selection);
            }
            isUndoRedoAction.current = false;
        }, 50);
        return;
    }

    if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        const prevEntry = history[prevIndex];
        isUndoRedoAction.current = true;
        setHistoryIndex(prevIndex);
        setContent(prevEntry.content);
        
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
                setCaretPosition(prevEntry.selection);
            }
            isUndoRedoAction.current = false;
        }, 50); 
    }
  }, [history, historyIndex, content, setCaretPosition, getCaretPosition]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        const nextEntry = history[nextIndex];
        isUndoRedoAction.current = true;
        setHistoryIndex(nextIndex);
        setContent(nextEntry.content);
        
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
                setCaretPosition(nextEntry.selection);
            }
            isUndoRedoAction.current = false;
        }, 50);
    }
  }, [history, historyIndex, setCaretPosition]);

  useEffect(() => { updateWordCount(); }, [content, updateWordCount]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Handle shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSaveDocument();
            break;
          case 'n':
            e.preventDefault();
            handleNewDocument();
            break;
          case 'o':
            e.preventDefault();
            handleViewSaved();
            break;
          case 'p':
            e.preventDefault();
            printOrPreview(true);
            break;
          case 'i':
            e.preventDefault();
            setIsImportModalVisible(true);
            break;
          case 'k':
            e.preventDefault();
            openPanel('link');
            break;
          case 'a':
            e.preventDefault();
            if (editorRef.current) {
              editorRef.current.focus();
              // Use execCommand for better contenteditable support
              document.execCommand('selectAll', false, undefined);
            }
            break;
          case 'f':
            e.preventDefault();
            openPanel('findReplace');
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'enter':
            // Calculate formulas if inside a table
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const container = selection.getRangeAt(0).commonAncestorContainer;
                const element = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;
                if (element?.closest('table')) {
                    e.preventDefault();
                    handleCalculateFormulas();
                }
            }
            break;
        }
        
        if (e.shiftKey) {
            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCopyFormatting();
            }
        }
        return;
      }

      if (e.altKey) return;
      
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
    if (command === 'undo') {
        handleUndo();
    } else if (command === 'redo') {
        handleRedo();
    } else {
        // For other commands, push current state to history before executing
        const currentContent = editorRef.current?.innerHTML || content;
        const caretPos = getCaretPosition();
        if (history[historyIndex]?.content !== currentContent) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push({ content: currentContent, selection: caretPos });
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
        document.execCommand(command, false, value);
        // And push after executing
        setTimeout(() => {
            const afterContent = editorRef.current?.innerHTML || '';
            const afterCaretPos = getCaretPosition();
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push({ content: afterContent, selection: afterCaretPos });
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            lastHistoryUpdate.current = Date.now();
        }, 0);
    }
  };

  const handleNewDocument = () => {
    if (isDirty && !window.confirm(t('prompts.unsavedChanges'))) return;
    const defaultsString = localStorage.getItem('defaultPageSettings');
    const defaults = defaultsString ? JSON.parse(defaultsString) : {};
    setContent('<p><br></p>');
    setOriginalContent('<p><br></p>');
    setHistory([{ content: '<p><br></p>', selection: 0 }]);
    setHistoryIndex(0);
    setComments([]);
    setOriginalComments([]);
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
    if (!currentDocId) {
      setIsSavePromptVisible(true);
    } else {
      await saveDocumentChanges();
    }
  };

  const handleSaveNewDocument = async (docName: string) => {
    if (!docName || !docName.trim()) { setToast(t('toasts.nameEmpty')); return; }
    const now = Date.now();
    const newDoc: Doc = { id: `doc_${now}`, name: docName.trim(), content, comments, createdAt: now, updatedAt: now, pageSize, pageOrientation, pageMargins, pageColor };
    setDocuments(docs => [...docs, newDoc]);
    setCurrentDocId(newDoc.id);
    setOriginalContent(content);
    setOriginalComments([...comments]);
    setIsDirty(false);
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
    if (isDirty && !window.confirm(t('prompts.unsavedChanges'))) return;
    const docToOpen = documents.find(doc => doc.id === docId);
    if (docToOpen) {
      setContent(docToOpen.content);
      setOriginalContent(docToOpen.content);
      setHistory([{ content: docToOpen.content, selection: 0 }]);
      setHistoryIndex(0);
      setComments(docToOpen.comments || []);
      setOriginalComments(docToOpen.comments || []);
      setIsDirty(false);
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

  const handleViewSaved = () => {
    if (isDirty) {
      if (!window.confirm(t('prompts.unsavedChanges'))) {
        return;
      }
    }
    setView('drive');
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

  const getColLabel = (index: number) => {
      let label = '';
      let tempIndex = index;
      while (tempIndex >= 0) {
          label = String.fromCharCode((tempIndex % 26) + 65) + label;
          tempIndex = Math.floor(tempIndex / 26) - 1;
      }
      return label;
  };

  const refreshTableLabels = (table: HTMLTableElement) => {
      const rows = Array.from(table.rows);
      rows.forEach((row, r) => {
          Array.from(row.cells).forEach((cell, c) => {
              cell.setAttribute('data-row-label', (r + 1).toString());
              cell.setAttribute('data-col-label', getColLabel(c));
          });
      });
      table.classList.add('show-excel-headers');
  };

  const handleInsertTable = (rows: number, cols: number) => {
      let tableHtml = '<table class="show-excel-headers" style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;"><tbody>';
      for (let i = 0; i < rows; i++) {
          tableHtml += '<tr>';
          for (let j = 0; j < cols; j++) {
              tableHtml += `<td data-row-label="${i + 1}" data-col-label="${getColLabel(j)}" style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>`;
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

  const handleTableAction = (action: string) => { 
      if (!editingElement || editingElement.tagName !== 'TABLE') return;
      const table = editingElement as HTMLTableElement;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;
      const cell = element?.closest('td, th') as HTMLTableCellElement;

      if (action === 'deleteTable') {
          table.remove();
          setActivePanel(null);
          setEditingElement(null);
          setSelectedElement(null);
          handleContentChange(editorRef.current?.innerHTML || '');
          return;
      }

      if (!cell) return;
      const row = cell.parentElement as HTMLTableRowElement;
      const rowIndex = row.rowIndex;
      const cellIndex = cell.cellIndex;

      switch (action) {
          case 'addRowAbove':
              const newRowAbove = table.insertRow(rowIndex);
              for (let i = 0; i < row.cells.length; i++) {
                  const newCell = newRowAbove.insertCell(i);
                  newCell.innerHTML = '&nbsp;';
                  newCell.style.border = '1px solid #ccc';
                  newCell.style.padding = '8px';
              }
              refreshTableLabels(table);
              break;
          case 'addRowBelow':
              const newRowBelow = table.insertRow(rowIndex + 1);
              for (let i = 0; i < row.cells.length; i++) {
                  const newCell = newRowBelow.insertCell(i);
                  newCell.innerHTML = '&nbsp;';
                  newCell.style.border = '1px solid #ccc';
                  newCell.style.padding = '8px';
              }
              refreshTableLabels(table);
              break;
          case 'deleteRow':
              table.deleteRow(rowIndex);
              if (table.rows.length === 0) table.remove();
              else refreshTableLabels(table);
              break;
          case 'addColLeft':
              for (let i = 0; i < table.rows.length; i++) {
                  const newCell = table.rows[i].insertCell(cellIndex);
                  newCell.innerHTML = '&nbsp;';
                  newCell.style.border = '1px solid #ccc';
                  newCell.style.padding = '8px';
              }
              refreshTableLabels(table);
              break;
          case 'addColRight':
              for (let i = 0; i < table.rows.length; i++) {
                  const newCell = table.rows[i].insertCell(cellIndex + 1);
                  newCell.innerHTML = '&nbsp;';
                  newCell.style.border = '1px solid #ccc';
                  newCell.style.padding = '8px';
              }
              refreshTableLabels(table);
              break;
          case 'deleteCol':
              for (let i = 0; i < table.rows.length; i++) {
                  table.rows[i].deleteCell(cellIndex);
              }
              if (table.rows[0]?.cells.length === 0) table.remove();
              else refreshTableLabels(table);
              break;
          case 'selectRow':
              // Clear previous selection highlights
              table.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
              Array.from(row.cells).forEach(c => c.classList.add('selected-cell'));
              
              const rowRange = document.createRange();
              rowRange.selectNodeContents(row);
              const rowSel = window.getSelection();
              if (rowSel) {
                  rowSel.removeAllRanges();
                  rowSel.addRange(rowRange);
              }
              break;
          case 'selectCol':
              // Clear previous selection highlights
              table.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
              
              const colSelection = window.getSelection();
              if (colSelection) {
                  colSelection.removeAllRanges();
                  for (let i = 0; i < table.rows.length; i++) {
                      const c = table.rows[i].cells[cellIndex];
                      if (c) {
                          c.classList.add('selected-cell');
                          const r = document.createRange();
                          r.selectNodeContents(c);
                          colSelection.addRange(r);
                      }
                  }
              }
              break;
          case 'selectTable':
              // Clear previous selection highlights
              table.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
              table.querySelectorAll('td, th').forEach(c => c.classList.add('selected-cell'));

              const range = document.createRange();
              range.selectNode(table);
              const selection = window.getSelection();
              if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(range);
              }
              break;
          case 'copyTable':
              const copyRange = document.createRange();
              copyRange.selectNode(table);
              const copySelection = window.getSelection();
              if (copySelection) {
                  copySelection.removeAllRanges();
                  copySelection.addRange(copyRange);
                  try {
                    document.execCommand('copy');
                    setToast(t('toasts.docCopied'));
                  } catch (err) {
                    console.error('Failed to copy table', err);
                  }
                  // Don't remove ranges immediately, let the user see what was copied
              }
              break;
      }
      handleContentChange(editorRef.current?.innerHTML || '');
  };

  const handleTableStyle = (style: React.CSSProperties, applyTo: 'cell' | 'table') => {
      if (!editingElement || editingElement.tagName !== 'TABLE') return;
      const table = editingElement as HTMLTableElement;

      if (applyTo === 'table') {
          Object.assign(table.style, style);
      } else {
          // Apply to selected cells or current cell
          const selectedCells = table.querySelectorAll('.selected-cell');
          if (selectedCells.length > 0) {
              selectedCells.forEach(cell => {
                  Object.assign((cell as HTMLElement).style, style);
              });
          } else {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  const container = range.commonAncestorContainer;
                  const element = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;
                  const cell = element?.closest('td, th') as HTMLTableCellElement;
                  if (cell && table.contains(cell)) {
                      Object.assign(cell.style, style);
                  }
              }
          }
      }
      handleContentChange(editorRef.current?.innerHTML || '');
  };

  const handleCalculateFormulas = () => {
    const table = editingElement?.tagName === 'TABLE' ? editingElement as HTMLTableElement : null;
    
    if (!table) {
      setToast(t('toasts.tableActionContext'));
      return;
    }

    const rows = Array.from(table.rows);
    const data: string[][] = rows.map(row => Array.from(row.cells).map(cell => {
        // Use data-formula if exists, otherwise innerText
        return cell.getAttribute('data-formula') || cell.innerText.trim();
    }));

    const getCellValue = (r: number, c: number): number => {
      if (r < 0 || r >= data.length || !data[r] || c < 0 || c >= data[r].length) return 0;
      let rawValue = data[r][c].trim();
      
      if (rawValue.startsWith('=')) {
          const actualCell = table.rows[r]?.cells[c];
          if (actualCell) {
              const currentText = actualCell.innerText.trim();
              if (!currentText.startsWith('=')) {
                  // Try to parse the displayed text as a number
                  let cleaned = currentText.replace(/[^0-9.,-]/g, '');
                  if (cleaned.includes(',') && cleaned.includes('.')) {
                      // Likely 1,234.56 or 1.234,56
                      if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
                          cleaned = cleaned.replace(/,/g, ''); // 1,234.56 -> 1234.56
                      } else {
                          cleaned = cleaned.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
                      }
                  } else if (cleaned.includes(',')) {
                      cleaned = cleaned.replace(',', '.');
                  }
                  const val = parseFloat(cleaned);
                  return isNaN(val) ? 0 : val;
              }
          }
          return 0;
      }

      if (rawValue.endsWith('%')) {
          const val = parseFloat(rawValue.replace('%', ''));
          return isNaN(val) ? 0 : val / 100;
      }

      let cleaned = rawValue.replace(/[^0-9.,-]/g, '');
      if (cleaned.includes(',') && cleaned.includes('.')) {
          if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
              cleaned = cleaned.replace(/,/g, '');
          } else {
              cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          }
      } else if (cleaned.includes(',')) {
          cleaned = cleaned.replace(',', '.');
      }
      
      const val = parseFloat(cleaned);
      return isNaN(val) ? 0 : val;
    };

    const parseCellRef = (ref: string): { r: number, c: number } | null => {
      const match = ref.match(/^([A-Z]+)([0-9]+)$/i);
      if (!match) return null;
      const colStr = match[1].toUpperCase();
      const rowNum = parseInt(match[2], 10) - 1;
      
      let colNum = 0;
      for (let i = 0; i < colStr.length; i++) {
        colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
      }
      return { r: rowNum, c: colNum - 1 };
    };

    // Run calculation twice to handle simple dependencies (e.g., C1 depends on B1 which depends on A1)
    for (let pass = 0; pass < 2; pass++) {
      rows.forEach((row, r) => {
        Array.from(row.cells).forEach((cell, c) => {
          let text = cell.getAttribute('data-formula') || cell.innerText.trim();
          
          if (text.startsWith('=')) {
            // Always update data-formula when text starts with =
            cell.setAttribute('data-formula', text);
            
            const formula = text.substring(1).toUpperCase();
            let result: number | string = 0;

            try {
              if (formula.startsWith('SUM(')) {
                const rangeMatch = formula.match(/SUM\(([A-Z0-9:]+)\)/);
                if (rangeMatch) {
                  const rangeParts = rangeMatch[1].split(':');
                  if (rangeParts.length === 2) {
                    const start = parseCellRef(rangeParts[0]);
                    const end = parseCellRef(rangeParts[1]);
                    if (start && end) {
                      let sum = 0;
                      for (let i = Math.min(start.r, end.r); i <= Math.max(start.r, end.r); i++) {
                        for (let j = Math.min(start.c, end.c); j <= Math.max(start.c, end.c); j++) {
                          sum += getCellValue(i, j);
                        }
                      }
                      result = sum;
                    }
                  } else {
                      const cellRef = parseCellRef(rangeMatch[1]);
                      if (cellRef) result = getCellValue(cellRef.r, cellRef.c);
                  }
                }
              } else if (formula.startsWith('AVERAGE(')) {
                  const rangeMatch = formula.match(/AVERAGE\(([A-Z0-9:]+)\)/);
                  if (rangeMatch) {
                    const rangeParts = rangeMatch[1].split(':');
                    if (rangeParts.length === 2) {
                      const start = parseCellRef(rangeParts[0]);
                      const end = parseCellRef(rangeParts[1]);
                      if (start && end) {
                        let sum = 0;
                        let count = 0;
                        for (let i = Math.min(start.r, end.r); i <= Math.max(start.r, end.r); i++) {
                          for (let j = Math.min(start.c, end.c); j <= Math.max(start.c, end.c); j++) {
                            sum += getCellValue(i, j);
                            count++;
                          }
                        }
                        result = count > 0 ? sum / count : 0;
                      }
                    }
                  }
              } else if (formula.startsWith('ROUND(')) {
                  const match = formula.match(/ROUND\(([^,]+),?\s*([0-9]*)\)/);
                  if (match) {
                      const inner = match[1];
                      const decimals = parseInt(match[2] || '0', 10);
                      let val = 0;
                      const cellRef = parseCellRef(inner);
                      if (cellRef) {
                          val = getCellValue(cellRef.r, cellRef.c);
                      } else {
                          val = parseFloat(inner);
                      }
                      result = isNaN(val) ? 0 : Number(val.toFixed(decimals));
                  }
              } else if (formula.includes('+') || formula.includes('-') || formula.includes('*') || formula.includes('/')) {
                  let evalFormula = formula;
                  const cellRefs = formula.match(/[A-Z]+[0-9]+/g) || [];
                  cellRefs.sort((a, b) => b.length - a.length);
                  
                  cellRefs.forEach(ref => {
                      const coords = parseCellRef(ref);
                      if (coords) {
                          const val = getCellValue(coords.r, coords.c);
                          evalFormula = evalFormula.split(ref).join(val.toString());
                      }
                  });
                  
                  try {
                    // eslint-disable-next-line no-eval
                    result = eval(evalFormula);
                  } catch (e) {
                    result = '#ERROR!';
                  }
              } else {
                  const cellRef = parseCellRef(formula);
                  if (cellRef) result = getCellValue(cellRef.r, cellRef.c);
                  else result = '#VALUE!';
              }
            } catch (e) {
              result = 'Error';
            }
            
            cell.innerText = result.toString();
            data[r][c] = result.toString();
          }
        });
      });
    }
    
    handleContentChange(editorRef.current?.innerHTML || '');
    setToast(t('toasts.docUpdated'));
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

  const handleCopyDocument = () => {
    const editor = document.getElementById('editor-page');
    if (editor) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        setToast(t('toasts.docCopied'));
      }
    }
  };
  
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
      
      // Clear manual selection highlights
      const editor = editorRef.current;
      if (editor) {
          editor.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
      }

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
    <div className="h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden">
      {view === 'editor' ? (
        <>
            <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 hidden md:block border-b border-gray-200 dark:border-gray-800 select-none">
                 <MenuBar 
                  onNewDocument={handleNewDocument}
                  onNewFromTemplate={() => setIsTemplatesModalVisible(true)}
                  onSave={handleSaveDocument}
                  onViewSaved={handleViewSaved}
                  onExportToWord={handleExportToWord}
                  onExportToPdf={handleExportToPdf}
                  onPrint={() => printOrPreview(true)}
                  onEditAction={handleEditAction}
                  onCopyDocument={handleCopyDocument}
                  onOpenFindReplace={() => openPanel('findReplace')}
                  onCopyFormatting={handleCopyFormatting}
                  onInsertLink={() => openPanel('link')}
                  onInsertImage={() => openPanel('image')}
                  onInsertTable={() => openPanel('table')}
                  onCalculateFormulas={handleCalculateFormulas}
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
                  isDirty={isDirty}
                  lastSaved={lastSaved}
                  isDocumentSaved={!!currentDocId}
                  onCancel={handleCancelChanges}
                  onOpenPageSetup={() => setIsPageSetupVisible(true)}
                  onOpenAboutModal={() => setIsAboutModalVisible(true)}
                  onOpenCalculator={() => setIsCalculatorVisible(true)}
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
                  onViewSaved={handleViewSaved}
                  onExportToWord={handleExportToWord}
                  onExportToPdf={handleExportToPdf}
                  onPrint={() => printOrPreview(true)}
                  onEditAction={handleEditAction}
                  onCopyDocument={handleCopyDocument}
                  onOpenFindReplace={() => openPanel('findReplace')}
                  onCopyFormatting={handleCopyFormatting}
                  onInsertLink={() => openPanel('link')}
                  onInsertImage={() => openPanel('image')}
                  onInsertTable={() => openPanel('table')}
                  onCalculateFormulas={handleCalculateFormulas}
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
                  isDirty={isDirty}
                  lastSaved={lastSaved}
                  isDocumentSaved={!!currentDocId}
                  onCancel={handleCancelChanges}
                  onOpenPageSetup={() => setIsPageSetupVisible(true)}
                  onOpenAboutModal={() => setIsAboutModalVisible(true)}
                  onOpenCalculator={() => setIsCalculatorVisible(true)}
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
            
            <div className="hidden md:block w-full bg-white dark:bg-gray-900 select-none">
                <Toolbar 
                  editorRef={editorRef} 
                  onCopyFormatting={handleCopyFormatting} 
                  isFormatPainterActive={isFormatPainterActive}
                  onToggleAiSidekick={() => { if (!checkAiAvailability()) return; setIsAiSidekickVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsShortcutsSidebarVisible(false); }}
                  onInsertChecklist={handleInsertChecklist}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  t={t}
                />
            </div>
            
            <div className="flex-grow flex overflow-hidden relative">
                <TableOfContents editorRef={editorRef} content={content} t={t} />
                <main className="flex-grow flex flex-col bg-gray-200 dark:bg-gray-600 print-view relative overflow-hidden">
                    <div className="flex-grow overflow-auto relative flex flex-col items-center pb-20 md:pb-0">
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
                                          onTableAction={handleTableAction}
                                          spellCheck={isSpellcheckEnabled}
                                          onSlashCommand={(x, y) => setSlashMenu({ x, y })}
                                          t={t}
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
                        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={handleCloseSidebars} />
                        <div className="absolute top-0 right-0 h-full w-screen max-w-sm md:w-auto md:max-w-none md:relative z-40 md:flex-shrink-0 border-l border-white/20 dark:border-white/5 bg-transparent select-none">
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
                                    onCalculateFormulas={handleCalculateFormulas}
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
            
            {/* Mobile/Tablet Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex flex-col">
                        <Toolbar 
                            editorRef={editorRef} 
                            onCopyFormatting={handleCopyFormatting} 
                            isFormatPainterActive={isFormatPainterActive}
                            onToggleAiSidekick={() => { if (!checkAiAvailability()) return; setIsAiSidekickVisible(prev => !prev); setActivePanel(null); setIsCommentsSidebarVisible(false); setIsShortcutsSidebarVisible(false); }}
                            onInsertChecklist={handleInsertChecklist}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={historyIndex > 0}
                            canRedo={historyIndex < history.length - 1}
                            onOpenMenu={() => setIsMobileMenuOpen(true)}
                            isBottom={true}
                            t={t}
                        />
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
      <CalculatorModal isVisible={isCalculatorVisible} onClose={() => setIsCalculatorVisible(false)} t={t} />
      <ImportModal isOpen={isImportModalVisible} onClose={() => setIsImportModalVisible(false)} onImport={handleOcrImport} t={t} />
      <DrawingModal isOpen={isDrawingModalVisible} onClose={() => { setIsDrawingModalVisible(false); setEditingDrawingElement(null); }} onSave={handleSaveDrawing} initialDataUrl={editingDrawingElement?.src} t={t} />
      <CropModal isOpen={isCropModalVisible} onClose={() => { setIsCropModalVisible(false); setCroppingImageElement(null); }} onApply={handleApplyCrop} imageSrc={croppingImageElement?.src || null} t={t} />
      <TemplatesModal isOpen={isTemplatesModalVisible} onClose={() => setIsTemplatesModalVisible(false)} onSelect={(content, template) => handleInsertTemplate(content, template)} t={t} />
      <InsertMathModal isOpen={isMathModalVisible} onClose={() => setIsMathModalVisible(false)} onInsert={handleInsertMath} initialLatex={editingMathElement?.dataset.latex} t={t} />
    </div>
  );
};

export default App;
