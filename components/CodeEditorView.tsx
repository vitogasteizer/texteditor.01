
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, CodeIcon, EyeIcon, CopyIcon, DownloadIcon, ListOrderedIcon, UndoIcon, RedoIcon, TextColorIcon, SearchIcon } from '../components/icons/EditorIcons';

interface CodeEditorViewProps {
  initialCode: string;
  onChange: (code: string) => void;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
  onOpenFindReplace: () => void;
  t: (key: string) => string;
}

const CodeEditorView: React.FC<CodeEditorViewProps> = ({ initialCode, onChange, showLineNumbers, onToggleLineNumbers, onOpenFindReplace, t }) => {
  const [code, setCode] = useState(initialCode);
  const [debouncedCode, setDebouncedCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  
  // History for undo/redo
  const [history, setHistory] = useState<string[]>([initialCode]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setCode(initialCode);
    setDebouncedCode(initialCode);
    setHistory([initialCode]);
    setHistoryIndex(0);
  }, [initialCode]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCode(code);
    }, 500);
    return () => clearTimeout(timeout);
  }, [code]);

  const handleRun = () => {
    setDebouncedCode(code);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    // Limit history size
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onChange(newCode);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevCode = history[prevIndex];
      isInternalChange.current = true;
      setHistoryIndex(prevIndex);
      setCode(prevCode);
      onChange(prevCode);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextCode = history[nextIndex];
      isInternalChange.current = true;
      setHistoryIndex(nextIndex);
      setCode(nextCode);
      onChange(nextCode);
    }
  };

  const handleColorPick = () => {
    const input = document.createElement('input');
    input.type = 'color';
    input.onchange = (e) => {
      const color = (e.target as HTMLInputElement).value;
      navigator.clipboard.writeText(color);
    };
    input.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <div className="flex items-center gap-1.5">
              <CodeIcon size={14} />
              {t('codeEditor.editor')}
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <div className="flex items-center gap-1.5">
              <EyeIcon size={14} />
              {t('codeEditor.preview')}
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('split')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'split' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-3 border border-current rounded-sm opacity-50" />
                <div className="w-1.5 h-3 border border-current rounded-sm" />
              </div>
              {t('codeEditor.split')}
            </div>
          </button>
          
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-800 pr-2 mr-1">
            <button 
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className={`p-2 rounded-md transition-all ${historyIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
              title={t('toolbar.undo')}
            >
              <UndoIcon size={18} />
            </button>
            <button 
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className={`p-2 rounded-md transition-all ${historyIndex === history.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
              title={t('toolbar.redo')}
            >
              <RedoIcon size={18} />
            </button>
          </div>

          <button 
            onClick={handleColorPick}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('toolbar.textColor')}
          >
            <TextColorIcon size={18} />
          </button>

          <button 
            onClick={onOpenFindReplace}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('menu.editFindReplace')}
          >
            <SearchIcon size={18} />
          </button>

          <button 
            onClick={onToggleLineNumbers}
            className={`p-2 rounded-md transition-all ${showLineNumbers ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            title={showLineNumbers ? t('toolbar.hideLineNumbers') : t('toolbar.showLineNumbers')}
          >
            <ListOrderedIcon size={18} />
          </button>
          <button 
            onClick={handleCopy}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('codeEditor.copy')}
          >
            <CopyIcon size={18} />
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('codeEditor.download')}
          >
            <DownloadIcon size={18} />
          </button>
          <button 
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md transition-all shadow-lg shadow-green-500/20"
          >
            <PlayIcon size={14} />
            {t('codeEditor.run')}
          </button>
        </div>
      </div>
      
      <div className="flex-grow flex overflow-hidden">
        {(activeTab === 'editor' || activeTab === 'split') && (
          <div className={`h-full flex ${activeTab === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-800' : 'w-full'}`}>
            {showLineNumbers && (
              <div className="flex-none w-12 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 py-4 text-right pr-2 select-none overflow-hidden">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="text-[10px] leading-[20px] font-mono text-gray-400 dark:text-gray-600">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={code}
              onChange={handleCodeChange}
              className="flex-grow h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 focus:outline-none resize-none custom-scrollbar leading-[20px]"
              spellCheck={false}
              placeholder="<!-- Write your HTML/CSS/JS here -->"
              onScroll={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const gutter = target.previousElementSibling as HTMLDivElement;
                if (gutter) {
                  gutter.scrollTop = target.scrollTop;
                }
              }}
            />
          </div>
        )}

                {(activeTab === 'preview' || activeTab === 'split') && (
          <div className={`h-full bg-white ${activeTab === 'split' ? 'w-1/2' : 'w-full'}`}>
            <iframe
              srcDoc={debouncedCode}
              title="Code Preview"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-modals allow-forms"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditorView;
