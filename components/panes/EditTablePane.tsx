import React, { useState, useEffect, useCallback } from 'react';
import { Trash2Icon, RowInsertTopIcon, RowInsertBottomIcon, ColumnInsertLeftIcon, ColumnInsertRightIcon, MergeCellsIcon, SplitCellIcon, ChevronDownIcon } from '../icons/EditorIcons';

interface EditTablePaneProps {
  editingElement: HTMLTableElement;
  onTableAction: (action: 'addRowAbove' | 'addRowBelow' | 'deleteRow' | 'addColLeft' | 'addColRight' | 'deleteCol' | 'deleteTable' | 'mergeCells' | 'splitCell') => void;
  onTableStyle: (style: React.CSSProperties, applyTo: 'cell' | 'table') => void;
  onChangeZIndex: (element: HTMLElement, direction: 'front' | 'back') => void;
  t: (key: string) => string;
}

const EditTablePane: React.FC<EditTablePaneProps> = ({ editingElement, onTableAction, onTableStyle, onChangeZIndex, t }) => {
    const [selectionState, setSelectionState] = useState({
        isCursorInTable: false,
        cellCount: 0,
        isMerged: false,
    });
    const [cellBgColor, setCellBgColor] = useState('#ffffff');
    const [borderColor, setBorderColor] = useState('#cccccc');
    const [borderWidth, setBorderWidth] = useState(1);
    const [wrapping, setWrapping] = useState<'topBottom' | 'left' | 'right' | 'absolute'>('topBottom');

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

        return () => document.removeEventListener('selectionchange', checkSelectionState);
    }, [checkSelectionState, editingElement]);

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

    return (
        <div className="space-y-6 text-sm animate-in fade-in slide-in-from-right-4 duration-300 custom-scrollbar max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8">
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
                <div className="p-5 pt-0">
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