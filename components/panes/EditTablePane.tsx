import React, { useState, useEffect, useCallback } from 'react';
import { Trash2Icon, RowInsertTopIcon, RowInsertBottomIcon, ColumnInsertLeftIcon, ColumnInsertRightIcon, MergeCellsIcon, SplitCellIcon, ChevronDownIcon, MathIcon } from '../icons/EditorIcons';

interface EditTablePaneProps {
  editingElement: HTMLTableElement;
  onTableAction: (action: 'addRowAbove' | 'addRowBelow' | 'deleteRow' | 'addColLeft' | 'addColRight' | 'deleteCol' | 'deleteTable' | 'mergeCells' | 'splitCell') => void;
  onCalculateFormulas: () => void;
  onTableStyle: (style: React.CSSProperties, applyTo: 'cell' | 'table') => void;
  onChangeZIndex: (element: HTMLElement, direction: 'front' | 'back') => void;
  t: (key: string) => string;
}

const EditTablePane: React.FC<EditTablePaneProps> = ({ editingElement, onTableAction, onCalculateFormulas, onTableStyle, onChangeZIndex, t }) => {
    const [selectionState, setSelectionState] = useState({
        isCursorInTable: false,
        cellCount: 0,
        isMerged: false,
    });
    const [cellBgColor, setCellBgColor] = useState('#ffffff');
    const [borderColor, setBorderColor] = useState('#cccccc');
    const [borderWidth, setBorderWidth] = useState(1);
    const [wrapping, setWrapping] = useState<'topBottom' | 'left' | 'right' | 'absolute'>('topBottom');
    const [currentCellAddress, setCurrentCellAddress] = useState<string | null>(null);
    const [formulaRangeType, setFormulaRangeType] = useState<'column' | 'row'>('column');

    const refreshTableLabels = useCallback(() => {
        if (!editingElement) return;
        const rows = Array.from(editingElement.rows);
        rows.forEach((row, r) => {
            const rowEl = row as HTMLTableRowElement;
            Array.from(rowEl.cells).forEach((cell, c) => {
                const cellEl = cell as HTMLTableCellElement;
                cellEl.setAttribute('data-row-label', (r + 1).toString());
                cellEl.setAttribute('data-col-label', String.fromCharCode(65 + c));
            });
        });
        editingElement.classList.add('show-excel-headers');
    }, [editingElement]);

    const updateCellAddress = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setCurrentCellAddress(null);
            return;
        }
        const anchorNode = selection.anchorNode;
        const nodeToTest: Node | null = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode as Node;
        const cell = nodeToTest?.parentElement?.closest('td, th') as HTMLTableCellElement;
        
        if (cell && editingElement.contains(cell)) {
            const row = cell.parentElement as HTMLTableRowElement;
            const rowIndex = row.rowIndex + 1;
            const colIndex = cell.cellIndex;
            const colLetter = String.fromCharCode(65 + colIndex);
            setCurrentCellAddress(`${colLetter}${rowIndex}`);
        } else {
            setCurrentCellAddress(null);
        }
    }, [editingElement]);

    const checkSelectionState = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setSelectionState({ isCursorInTable: false, cellCount: 0, isMerged: false });
            return;
        }
        
        const anchorNode = selection.anchorNode;
        if (!anchorNode) {
            setSelectionState({ isCursorInTable: false, cellCount: 0, isMerged: false });
            return;
        }

        const nodeToTest: Node | null = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;

        if (!nodeToTest || !editingElement.contains(nodeToTest)) {
            setSelectionState({ isCursorInTable: false, cellCount: 0, isMerged: false });
            return;
        }

        const selectedCells: HTMLTableCellElement[] = [];
        const cells = editingElement.querySelectorAll('td, th');
        Array.from(cells).forEach(cell => {
            // FIX: Cast `cell` to `Node` to satisfy `selection.containsNode`'s expected argument type.
            if (selection.containsNode(cell as Node, true)) {
                selectedCells.push(cell as HTMLTableCellElement);
            }
        });
        
        const uniqueCells = [...new Set(selectedCells)];
        const isMerged = uniqueCells.length === 1 && (uniqueCells[0].colSpan > 1 || uniqueCells[0].rowSpan > 1);

        setSelectionState({
            isCursorInTable: true,
            cellCount: uniqueCells.length,
            isMerged: isMerged,
        });

    }, [editingElement]);
    
    useEffect(() => {
        document.addEventListener('selectionchange', checkSelectionState);
        checkSelectionState(); // Initial check
        updateCellAddress();
        refreshTableLabels();

        // Inject styles for excel headers if not present
        if (!document.getElementById('excel-headers-style')) {
            const style = document.createElement('style');
            style.id = 'excel-headers-style';
            style.innerHTML = `
                .show-excel-headers {
                    position: relative !important;
                    margin-top: 30px !important;
                    margin-left: 40px !important;
                    border-collapse: collapse !important;
                }
                .show-excel-headers tr:first-child td, .show-excel-headers tr:first-child th {
                    position: relative;
                }
                .show-excel-headers tr:first-child td::before, .show-excel-headers tr:first-child th::before {
                    content: attr(data-col-label);
                    position: absolute;
                    top: -26px;
                    left: -1px;
                    right: -1px;
                    height: 25px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    color: #64748b;
                    z-index: 10;
                }
                .show-excel-headers td:first-child, .show-excel-headers th:first-child {
                    position: relative;
                }
                .show-excel-headers td:first-child::after, .show-excel-headers th:first-child::after {
                    content: attr(data-row-label);
                    position: absolute;
                    left: -41px;
                    top: -1px;
                    bottom: -1px;
                    width: 40px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    color: #64748b;
                    z-index: 10;
                }
                .dark .show-excel-headers tr:first-child td::before, 
                .dark .show-excel-headers tr:first-child th::before,
                .dark .show-excel-headers td:first-child::after,
                .dark .show-excel-headers th:first-child::after {
                    background: #1e293b;
                    border-color: #334155;
                    color: #94a3b8;
                }
            `;
            document.head.appendChild(style);
        }

        // Set initial wrapping state
        const computed = window.getComputedStyle(editingElement);
        if (computed.position === 'absolute') {
            setWrapping('absolute');
        } else if (computed.float === 'left') {
            setWrapping('left');
        } else if (computed.float === 'right') {
            setWrapping('right');
        } else {
            setWrapping('topBottom');
        }

        return () => {
            document.removeEventListener('selectionchange', checkSelectionState);
            document.removeEventListener('selectionchange', updateCellAddress);
            if (editingElement) {
                editingElement.classList.remove('show-excel-headers');
            }
        };
    }, [checkSelectionState, updateCellAddress, refreshTableLabels, editingElement]);

    const handleWrappingChange = (mode: 'topBottom' | 'left' | 'right' | 'absolute') => {
        setWrapping(mode);
        let newStyles: React.CSSProperties = {};
        if (mode === 'absolute') {
            newStyles = {
                position: 'absolute' as const,
                float: 'none' as const,
                margin: '',
                top: editingElement.style.top || '100px',
                left: editingElement.style.left || '100px',
                width: editingElement.style.width !== '100%' ? editingElement.style.width : '50%',
            };
        } else if (mode === 'left' || mode === 'right') {
            newStyles = {
                position: 'relative' as const,
                float: mode,
                margin: mode === 'left' ? '0.5rem 1rem 0.5rem 0' : '0.5rem 0 0.5rem 1rem',
                top: '',
                left: '',
                width: editingElement.style.width !== '100%' ? editingElement.style.width : '50%',
            };
        } else { // topBottom
            newStyles = {
                position: 'relative' as const,
                float: 'none' as const,
                margin: '',
                top: '',
                left: '',
                width: '100%',
            };
        }
        onTableStyle(newStyles, 'table');
    };

    const ActionButton: React.FC<{
      onClick: () => void;
      icon: React.ReactNode;
      label: string;
      disabled?: boolean;
      variant?: 'default' | 'danger';
    }> = ({ onClick, icon, label, disabled, variant = 'default' }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-3 w-full px-5 py-3.5 text-[10px] font-semibold text-left rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border ${
            variant === 'danger' 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30 hover:bg-red-600 hover:text-white' 
            : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-500'
        }`}
      >
        <span className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>
        <span>{label}</span>
      </button>
    );

    const insertFormula = (type: 'SUM' | 'AVERAGE') => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const anchorNode = selection.anchorNode;
        const nodeToTest: Node | null = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode as Node;
        const cell = nodeToTest?.parentElement?.closest('td, th') as HTMLTableCellElement;
        
        if (!cell || !editingElement.contains(cell)) return;
        
        const row = cell.parentElement as HTMLTableRowElement;
        const rowIndex = row.rowIndex + 1;
        const colIndex = cell.cellIndex;
        const colLetter = String.fromCharCode(65 + colIndex);
        
        let range = '';
        if (formulaRangeType === 'column') {
            const lastRow = editingElement.rows.length;
            range = `${colLetter}1:${colLetter}${lastRow}`;
        } else {
            const lastColLetter = String.fromCharCode(65 + row.cells.length - 1);
            range = `A${rowIndex}:${lastColLetter}${rowIndex}`;
        }
        
        document.execCommand('insertText', false, `=${type}(${range})`);
    };

    return (
        <div className="space-y-6 text-sm animate-in fade-in slide-in-from-right-4 duration-300 custom-scrollbar max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8">
             <details className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all" open>
                <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{t('panes.table.formulas')} {currentCellAddress && `(${currentCellAddress})`}</span>
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                </summary>
                <div className="p-5 pt-0 space-y-4">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setFormulaRangeType('column')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${formulaRangeType === 'column' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
                        >
                            {t('panes.table.useColumn')}
                        </button>
                        <button 
                            onClick={() => setFormulaRangeType('row')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${formulaRangeType === 'row' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
                        >
                            {t('panes.table.useRow')}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => insertFormula('SUM')}
                            className="px-3 py-2 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            SUM
                        </button>
                        <button 
                            onClick={() => insertFormula('AVERAGE')}
                            className="px-3 py-2 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            AVERAGE
                        </button>
                        <button 
                            onClick={() => document.execCommand('insertText', false, '=A1-B1')}
                            className="px-3 py-2 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            {t('panes.table.subtract')} (-)
                        </button>
                        <button 
                            onClick={() => document.execCommand('insertText', false, '=A1*B1')}
                            className="px-3 py-2 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            {t('panes.table.multiply')} (*)
                        </button>
                        <button 
                            onClick={() => document.execCommand('insertText', false, '=A1/B1')}
                            className="px-3 py-2 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            {t('panes.table.divide')} (/)
                        </button>
                    </div>
                    <button 
                        onClick={onCalculateFormulas}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                    >
                        <MathIcon className="w-4 h-4" />
                        {t('panes.table.calculate')} (Ctrl+Enter)
                    </button>
                </div>
            </details>

             <details className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all" open>
                <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{t('panes.table.wrapping')}</span>
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                </summary>
                <div className="p-5 pt-0">
                    <select
                        value={wrapping}
                        onChange={(e) => handleWrappingChange(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                        <option value="topBottom">{t('panes.table.wrappingOptions.topBottom')}</option>
                        <option value="left">{t('panes.table.wrappingOptions.squareLeft')}</option>
                        <option value="right">{t('panes.table.wrappingOptions.squareRight')}</option>
                        <option value="absolute">{t('panes.table.wrappingOptions.inFront')}</option>
                    </select>
                </div>
            </details>

            <details className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all" open>
                <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{t('panes.table.rowsAndCols')}</span>
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                </summary>
                <div className="p-5 pt-0 grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton onClick={() => onTableAction('addRowAbove')} icon={<RowInsertTopIcon className="w-4 h-4" />} label={t('panes.table.addRowAbove')} disabled={!selectionState.isCursorInTable} />
                        <ActionButton onClick={() => onTableAction('addRowBelow')} icon={<RowInsertBottomIcon className="w-4 h-4" />} label={t('panes.table.addRowBelow')} disabled={!selectionState.isCursorInTable} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton onClick={() => onTableAction('addColLeft')} icon={<ColumnInsertLeftIcon className="w-4 h-4" />} label={t('panes.table.addColLeft')} disabled={!selectionState.isCursorInTable} />
                        <ActionButton onClick={() => onTableAction('addColRight')} icon={<ColumnInsertRightIcon className="w-4 h-4" />} label={t('panes.table.addColRight')} disabled={!selectionState.isCursorInTable} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton onClick={() => onTableAction('deleteRow')} icon={<Trash2Icon className="w-4 h-4"/>} label={t('panes.table.deleteRow')} disabled={!selectionState.isCursorInTable} variant="danger" />
                        <ActionButton onClick={() => onTableAction('deleteCol')} icon={<Trash2Icon className="w-4 h-4"/>} label={t('panes.table.deleteCol')} disabled={!selectionState.isCursorInTable} variant="danger" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton onClick={() => onTableAction('mergeCells')} icon={<MergeCellsIcon className="w-4 h-4" />} label={t('panes.table.mergeCells')} disabled={selectionState.cellCount < 2} />
                        <ActionButton onClick={() => onTableAction('splitCell')} icon={<SplitCellIcon className="w-4 h-4" />} label={t('panes.table.splitCell')} disabled={!selectionState.isMerged} />
                    </div>
                </div>
            </details>

            <details className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all" open>
                <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{t('panes.table.styling')}</span>
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                </summary>
                 <div className="p-5 pt-0 space-y-6">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 ml-1">{t('panes.table.cellBackground')}</label>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <input type="color" value={cellBgColor} onChange={e => setCellBgColor(e.target.value)} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer bg-transparent" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100 font-semibold">{cellBgColor}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">Hex Code</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onTableStyle({ backgroundColor: cellBgColor }, 'cell')} disabled={!selectionState.isCursorInTable} className="px-3 py-3 text-[10px] font-semibold rounded-xl flex-1 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white border border-gray-100 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50">{t('panes.table.applyToCell')}</button>
                                <button onClick={() => onTableStyle({ backgroundColor: cellBgColor }, 'table')} className="px-3 py-3 text-[10px] font-semibold rounded-xl flex-1 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white border border-gray-100 dark:border-gray-700 transition-all active:scale-95">{t('panes.table.applyToTable')}</button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 ml-1">{t('panes.table.borderColor')}</label>
                                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-lg cursor-pointer bg-transparent"/>
                                    <span className="text-[10px] font-mono text-gray-500 font-semibold">{borderColor}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 ml-1">{t('panes.table.borderWidth')}</label>
                                <div className="relative">
                                    <input type="number" min="0" value={borderWidth} onChange={e => setBorderWidth(parseInt(e.target.value,10))} className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"/>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-semibold">px</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => onTableStyle({ borderColor, borderWidth: `${borderWidth}px` }, 'table')} className="w-full px-4 py-4 text-[10px] font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all active:scale-95">{t('panes.table.applyBorderStyle')}</button>
                    </div>
                </div>
            </details>
            
            {wrapping === 'absolute' && (
                 <details className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all" open>
                    <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <span className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{t('panes.table.arrange')}</span>
                        </span>
                        <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                    </summary>
                    <div className="p-5 pt-0 flex items-center gap-3">
                        <button onClick={() => onChangeZIndex(editingElement, 'front')} className="px-4 py-3.5 text-[10px] font-semibold rounded-xl flex-1 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white border border-gray-100 dark:border-gray-700 transition-all active:scale-95">{t('panes.table.bringForward')}</button>
                        <button onClick={() => onChangeZIndex(editingElement, 'back')} className="px-4 py-3.5 text-[10px] font-semibold rounded-xl flex-1 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white border border-gray-100 dark:border-gray-700 transition-all active:scale-95">{t('panes.table.sendBackward')}</button>
                    </div>
                </details>
            )}

            <details className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all" open>
                <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{t('panes.table.actions')}</span>
                    </span>
                    <ChevronDownIcon className="w-4 h-4 transform group-open:rotate-180 transition-transform text-gray-400" />
                </summary>
                <div className="p-5 pt-0 space-y-3">
                    <button onClick={onCalculateFormulas} className="w-full flex items-center justify-center gap-3 px-4 py-4 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-600 hover:text-white border border-blue-100 dark:border-blue-900/30 transition-all active:scale-95">
                      <MathIcon className="w-4 h-4" />
                      <span>{t('panes.table.calculateFormulas')}</span>
                    </button>
                    <button onClick={() => onTableAction('deleteTable')} className="w-full flex items-center justify-center gap-3 px-4 py-4 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-600 hover:text-white border border-red-100 dark:border-red-900/30 transition-all active:scale-95">
                      <Trash2Icon className="w-4 h-4" />
                      <span>{t('panes.table.deleteTable')}</span>
                    </button>
                </div>
            </details>
        </div>
    );
};

export default EditTablePane;