import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  CodeIcon, 
  EyeIcon, 
  CopyIcon, 
  DownloadIcon, 
  ListOrderedIcon, 
  UndoIcon, 
  RedoIcon, 
  TextColorIcon, 
  SearchIcon, 
  SparklesIcon, 
  CloseIcon, 
  SendIcon, 
  ChecklistIcon, 
  Wand2Icon 
} from '../components/icons/EditorIcons';

interface CodeEditorViewProps {
  initialCode: string;
  onChange: (code: string) => void;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
  onOpenFindReplace: () => void;
  onClose?: () => void;
  ai?: any; // GoogleGenAI ინსტანცია
  setToast?: (msg: string | null) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

type AiTab = 'review' | 'bugs' | 'ideas' | 'custom';

const CodeEditorView: React.FC<CodeEditorViewProps> = ({ 
  initialCode, 
  onChange, 
  showLineNumbers, 
  onToggleLineNumbers, 
  onOpenFindReplace, 
  onClose,
  ai,
  setToast,
  t 
}) => {
  const [code, setCode] = useState(initialCode);
  const [debouncedCode, setDebouncedCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  
  // ისტორია Undo/Redo ფუნქციონალისთვის
  const [history, setHistory] = useState<string[]>([initialCode]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isInternalChange = useRef(false);

  // AI ასისტენტის მდგომარეობა
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiTab, setAiTab] = useState<AiTab>('review');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  const [aiFixedCode, setAiFixedCode] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

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
    if (setToast) {
      setToast(t('codeEditor.run') + ' ✓');
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    updateCodeWithHistory(newCode);
  };

  const updateCodeWithHistory = (newCode: string) => {
    setCode(newCode);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCode);
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
      if (setToast) {
        setToast(`${color} დაკოპირდა!`);
      }
    };
    input.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    if (setToast) {
      setToast(t('codeEditor.aiCopied'));
    }
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

  // კოდის ბლოკების ამოღება AI-ის პასუხიდან
  const extractCodeBlocks = (text: string): string[] => {
    const regex = /```(?:html|css|js|javascript)?\n?([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        blocks.push(match[1].trim());
      }
    }
    return blocks;
  };

  // AI-ის გამოძახება დავალების მიხედვით
  const handleExecuteAi = async (mode: AiTab, userCustomQuery?: string) => {
    if (!ai) {
      const errorMsg = t('codeEditor.aiNoKey');
      setAiOutput(errorMsg);
      if (setToast) setToast(errorMsg);
      return;
    }

    setAiLoading(true);
    setAiOutput('');
    setAiFixedCode(null);

    try {
      let systemPrompt = '';
      let promptContent = '';

      if (mode === 'review') {
        systemPrompt = 'შენ ხარ პროფესიონალი Senior Web დეველოპერი და Code Reviewer. გააანალიზე მოწოდებული კოდი ქართულ ენაზე. შეაფასე: 1. კოდის სტრუქტურა და არქიტექტურა; 2. წაკითხვადობა და სტილისტური სისუფთავე; 3. პერფორმანსი და სემანტიკა; 4. რეკომენდაციები კოდის გასაუმჯობესებლად.';
        promptContent = `შეაფასე და განიხილე შემდეგი კოდი:\n\n\`\`\`html\n${code}\n\`\`\``;
      } else if (mode === 'bugs') {
        systemPrompt = 'შენ ხარ ექსპერტი დებაგერი და QA ინჟინერი. შეამოწმე მოწოდებული კოდი სინტაქსურ შეცდომებზე, დაუხურავ თეგებზე, ლოგიკურ ხარვეზებზე და უსაფრთხოების რისკებზე. პასუხი მოგვაწოდე ქართულად: 1. შეცდომების ჩამონათვალი და განმარტება; 2. სრული გამოსწორებული კოდი მოათავსე აუცილებლად ცალკე კოდის ბლოკში (\`\`\`html ... \`\`\`), რათა მომხმარებელმა შეძლოს მისი პირდაპირ გამოყენება.';
        promptContent = `იპოვე ყველა შეცდომა და მოგვაწოდე გამოსწორებული კოდი:\n\n\`\`\`html\n${code}\n\`\`\``;
      } else if (mode === 'ideas') {
        systemPrompt = 'შენ ხარ კრეატიული Frontend დიზაინერი და არქიტექტორი. გაეცანი არსებულ კოდს და შესთავაზე 3-4 შთამბეჭდავი იდეა კოდის გასამდიდრებლად (მაგ. თანამედროვე CSS/Tailwind ანიმაციები, ინტერაქციები, მუქი თემა, რესპონსიული ბადე, ახალი კომპონენტები). თითოეულ იდეას ქართულად დაურთე განმარტება და მოკლე კოდის ფრაგმენტი \`\`\`html ბლოკში.';
        promptContent = `შემომთავაზე იდეები და გაუმჯობესებები ამ კოდისთვის:\n\n\`\`\`html\n${code}\n\`\`\``;
      } else if (mode === 'custom') {
        const query = userCustomQuery || customPrompt;
        if (!query.trim()) return;
        systemPrompt = 'შენ ხარ კოდირების ასისტენტი. უპასუხე მომხმარებლის კითხვას მოწოდებულ კოდთან დაკავშირებით ქართულ ენაზე. თუ კოდის ცვლილებაა საჭირო, მოგვაწოდე შესაბამისი კოდის ბლოკი \`\`\`html ... \`\`\`.';
        promptContent = `კითხვა/დავალება: "${query}"\n\nკოდის კონტექსტი:\n\`\`\`html\n${code}\n\`\`\``;
      }

      // ვიყენებთ gemini-3.8-flash უფასო კვოტისთვის
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptContent,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        }
      });

      const responseText = response.text || '';
      setAiOutput(responseText);

      // ვამოწმებთ შეიცავს თუ არა გამოსწორებულ კოდს
      const blocks = extractCodeBlocks(responseText);
      if (blocks.length > 0) {
        // პირველი ყველაზე სრული ბლოკი მივიჩნიოთ გამოსაყენებელ კოდად
        setAiFixedCode(blocks[0]);
      }

      if (setToast) {
        setToast(t('codeEditor.aiSuccess'));
      }
    } catch (err: any) {
      console.error('AI Code Assistant Error:', err);
      const errorText = `${t('codeEditor.aiError')}: ${err?.message || 'შეცდომა კავშირისას'}`;
      setAiOutput(errorText);
      if (setToast) setToast(errorText);
    } finally {
      setAiLoading(false);
    }
  };

  // გასწორებული კოდის გამოყენება რედაქტორში
  const handleApplyFixedCode = () => {
    if (!aiFixedCode) return;
    updateCodeWithHistory(aiFixedCode);
    if (setToast) {
      setToast('✨ ' + t('codeEditor.aiApplyFix') + '!');
    }
  };

  const handleCopySnippet = (snippet: string, idx: number) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetIndex(idx);
    if (setToast) setToast(t('codeEditor.aiCopied'));
    setTimeout(() => setCopiedSnippetIndex(null), 2000);
  };

  const lineCount = code.split('\n').length;
  const extractedSnippets = aiOutput ? extractCodeBlocks(aiOutput) : [];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden select-none">
      {/* მთავარი ხელსაწყოთა ზოლი */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-2">
          {/* რეჟიმების გადამრთველი */}
          <button 
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'editor' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <div className="flex items-center gap-1.5">
              <CodeIcon size={14} />
              {t('codeEditor.editor')}
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
          >
            <div className="flex items-center gap-1.5">
              <EyeIcon size={14} />
              {t('codeEditor.preview')}
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('split')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
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

          {/* AI ასისტენტის ღილაკი */}
          <button 
            onClick={() => setIsAiOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${
              isAiOpen 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/20' 
                : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
            }`}
            title={t('codeEditor.aiAssistant')}
          >
            <SparklesIcon size={14} className={isAiOpen ? 'animate-spin' : ''} />
            <span>{t('codeEditor.aiAssistant')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
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

          {/* ფერის არჩევა და კოპირება */}
          <button 
            onClick={handleColorPick}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('toolbar.textColor')}
          >
            <TextColorIcon size={18} />
          </button>

          {/* ძიება / შეცვლა */}
          <button 
            onClick={onOpenFindReplace}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('menu.editFindReplace')}
          >
            <SearchIcon size={18} />
          </button>

          {/* ხაზების ნუმერაცია */}
          <button 
            onClick={onToggleLineNumbers}
            className={`p-2 rounded-md transition-all ${showLineNumbers ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            title={showLineNumbers ? t('toolbar.hideLineNumbers') : t('toolbar.showLineNumbers')}
          >
            <ListOrderedIcon size={18} />
          </button>

          {/* კოპირება */}
          <button 
            onClick={handleCopy}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('codeEditor.copy')}
          >
            <CopyIcon size={18} />
          </button>

          {/* ჩამოტვირთვა */}
          <button 
            onClick={handleDownload}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-all"
            title={t('codeEditor.download')}
          >
            <DownloadIcon size={18} />
          </button>

          {/* გაშვება */}
          <button 
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md transition-all shadow-md shadow-green-500/20 active:scale-95"
          >
            <PlayIcon size={14} />
            {t('codeEditor.run')}
          </button>

        </div>
      </div>
      
      {/* სამუშაო სივრცე (რედაქტორი + Preview + AI პანელი) */}
      <div className="flex-grow flex overflow-hidden relative">
        {/* რედაქტორის ნაწილი */}
        {(activeTab === 'editor' || activeTab === 'split') && (
          <div className={`h-full flex ${activeTab === 'split' ? (isAiOpen ? 'w-2/5' : 'w-1/2') : (isAiOpen ? 'w-2/3' : 'w-full')} border-r border-gray-200 dark:border-gray-800 transition-all duration-300`}>
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
              className="flex-grow h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 focus:outline-none resize-none custom-scrollbar leading-[20px] select-text"
              spellCheck={false}
              placeholder="<!-- დაწერეთ თქვენი HTML/CSS/JS კოდი აქ -->"
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

        {/* გადახედვის (Preview) ნაწილი */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div className={`h-full bg-white dark:bg-gray-900 ${activeTab === 'split' ? (isAiOpen ? 'w-1/3' : 'w-1/2') : (isAiOpen ? 'w-2/3' : 'w-full')} transition-all duration-300`}>
            <iframe
              srcDoc={debouncedCode}
              title="Code Preview"
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-modals allow-forms"
            />
          </div>
        )}

        {/* AI ასისტენტის გვერდითი პანელი (Glassmorphism Drawer) */}
        {isAiOpen && (
          <div className="w-96 flex-none h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl z-20 animate-in slide-in-from-right duration-200">
            {/* პანელის სათაური */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <SparklesIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    {t('codeEditor.aiAssistant')}
                    <span className="text-[10px] font-normal px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded">
                      Gemini Flash
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t('codeEditor.aiPanelSubtitle')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAiOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="დახურვა"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* ტაბების ნავიგაცია */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-gray-100 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800 text-xs">
              <button
                onClick={() => { setAiTab('review'); handleExecuteAi('review'); }}
                className={`py-1.5 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-1 ${aiTab === 'review' ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                <EyeIcon size={14} />
                <span className="text-[10px]">{t('codeEditor.aiReview')}</span>
              </button>
              <button
                onClick={() => { setAiTab('bugs'); handleExecuteAi('bugs'); }}
                className={`py-1.5 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-1 ${aiTab === 'bugs' ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                <ChecklistIcon size={14} />
                <span className="text-[10px]">{t('codeEditor.aiBugs')}</span>
              </button>
              <button
                onClick={() => { setAiTab('ideas'); handleExecuteAi('ideas'); }}
                className={`py-1.5 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-1 ${aiTab === 'ideas' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                <Wand2Icon size={14} />
                <span className="text-[10px]">{t('codeEditor.aiIdeas')}</span>
              </button>
              <button
                onClick={() => setAiTab('custom')}
                className={`py-1.5 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-1 ${aiTab === 'custom' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                <SendIcon size={14} />
                <span className="text-[10px]">{t('codeEditor.aiCustom')}</span>
              </button>
            </div>

            {/* AI კონტენტის სივრცე */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar text-sm select-text">
              {/* ჩასატარებელი ქმედების მოკლე აღწერა და სწრაფი გაშვება */}
              {aiTab === 'custom' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('codeEditor.aiCustom')}:
                  </label>
                  <div className="relative">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={t('codeEditor.aiPromptPlaceholder')}
                      rows={3}
                      className="w-full p-2.5 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-800 dark:text-gray-200"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleExecuteAi('custom');
                        }
                      }}
                    />
                    <button
                      onClick={() => handleExecuteAi('custom')}
                      disabled={aiLoading || !customPrompt.trim()}
                      className="absolute bottom-2 right-2 p-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-md transition-all"
                      title="გაგზავნა"
                    >
                      <SendIcon size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* გამოსწორებული კოდის ბანერი და 1-დაწკაპუნებით ჩასმა */}
              {aiFixedCode && (
                <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <SparklesIcon size={14} />
                      შემოთავაზებულია კოდის განახლება
                    </span>
                    <button
                      onClick={() => handleCopySnippet(aiFixedCode, -1)}
                      className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline"
                    >
                      {copiedSnippetIndex === -1 ? 'დაკოპირდა!' : 'კოპირება'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    შეგიძლიათ ერთი დაწკაპუნებით განაახლოთ რედაქტორის კოდი.
                  </p>
                  <button
                    onClick={handleApplyFixedCode}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <Wand2Icon size={14} />
                    {t('codeEditor.aiApplyFix')}
                  </button>
                </div>
              )}

              {/* იტვირთება */}
              {aiLoading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin" />
                    <SparklesIcon size={16} className="absolute inset-0 m-auto text-purple-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t('codeEditor.aiAnalyzing')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Gemini 3.8 Flash უფასო ტარიფით...
                    </p>
                  </div>
                </div>
              )}

              {/* შედეგის ჩვენება */}
              {!aiLoading && aiOutput && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {aiTab === 'review' ? 'მიმოხილვის ანგარიში' : aiTab === 'bugs' ? 'დიაგნოსტიკის შედეგი' : aiTab === 'ideas' ? 'იდეების კატალოგი' : 'პასუხი'}
                    </span>
                    <button
                      onClick={() => handleExecuteAi(aiTab)}
                      className="text-purple-600 hover:underline text-[11px]"
                    >
                      ხელახლა ანალიზი
                    </button>
                  </div>

                  <div className="text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans break-words bg-gray-50/50 dark:bg-gray-950/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800/60">
                    {aiOutput}
                  </div>

                  {/* კოდის ფრაგმენტების სია ცალკე კოპირებით */}
                  {extractedSnippets.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        გენერირებული კოდის ფრაგმენტები:
                      </h4>
                      {extractedSnippets.map((snippet, idx) => (
                        <div key={idx} className="bg-gray-900 text-gray-100 rounded-lg p-3 text-[11px] font-mono relative overflow-hidden border border-gray-800 shadow-sm">
                          <div className="flex justify-between items-center mb-1 pb-1 border-b border-gray-800 text-[10px] text-gray-400">
                            <span>ფრაგმენტი #{idx + 1}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopySnippet(snippet, idx)}
                                className="hover:text-white transition-colors flex items-center gap-1"
                              >
                                <CopyIcon size={12} />
                                {copiedSnippetIndex === idx ? 'დაკოპირდა!' : 'კოპირება'}
                              </button>
                              <button
                                onClick={() => updateCodeWithHistory(snippet)}
                                className="hover:text-emerald-400 text-emerald-500 transition-colors flex items-center gap-1"
                                title="ჩასმა რედაქტორში"
                              >
                                <Wand2Icon size={12} />
                                ჩასმა
                              </button>
                            </div>
                          </div>
                          <pre className="max-h-36 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                            {snippet}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* საწყისი მდგომარეობა, თუ ჯერ არ გაშვებულა */}
              {!aiLoading && !aiOutput && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600">
                    <SparklesIcon size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      აირჩიეთ სასურველი მოქმედება
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-[220px] mx-auto">
                      AI დაგეხმარებათ კოდის გადაკითხვაში, შეცდომების პოვნაში ან იდეების გენერაციაში.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => { setAiTab('review'); handleExecuteAi('review'); }}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg transition-colors border border-purple-200 dark:border-purple-800/50 flex items-center justify-center gap-2"
                    >
                      <EyeIcon size={14} />
                      {t('codeEditor.aiReview')}
                    </button>
                    <button
                      onClick={() => { setAiTab('bugs'); handleExecuteAi('bugs'); }}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-800/50 flex items-center justify-center gap-2"
                    >
                      <ChecklistIcon size={14} />
                      {t('codeEditor.aiBugs')}
                    </button>
                    <button
                      onClick={() => { setAiTab('ideas'); handleExecuteAi('ideas'); }}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center gap-2"
                    >
                      <Wand2Icon size={14} />
                      {t('codeEditor.aiIdeas')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditorView;
