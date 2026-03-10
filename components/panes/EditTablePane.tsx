import React, { useState, useEffect, useCallback } from 'react';
import { Trash2Icon, RowInsertTopIcon, RowInsertBottomIcon, ColumnInsertLeftIcon, ColumnInsertRightIcon, MergeCellsIcon, SplitCellIcon } from '../icons/EditorIcons';

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
    }> = ({ onClick, icon, label, disabled }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {icon}
        <span>{label}</span>
      </button>
    );

    return (
        <div className="space-y-6 text-sm">
             <details className="space-y-2" open>
                <summary className="font-medium cursor-pointer">{t('panes.table.wrapping')}</summary>
                <div className="pt-2">
                    <select
                        value={wrapping}
                        onChange={(e) => handleWrappingChange(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <option value="topBottom">{t('panes.table.wrappingOptions.topBottom')}</option>
                        <option value="left">{t('panes.table.wrappingOptions.squareLeft')}</option>
                        <option value="right">{t('panes.table.wrappingOptions.squareRight')}</option>
                        <option value="absolute">{t('panes.table.wrappingOptions.inFront')}</option>
                    </select>
                </div>
            </details>
            <details className="space-y-2" open>
                <summary className="font-medium cursor-pointer">{t('panes.table.rowsAndCols')}</summary>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <ActionButton onClick={() => onTableAction('addRowAbove')} icon={<RowInsertTopIcon />} label={t('panes.table.addRowAbove')} disabled={!selectionState.isCursorInTable} />
                    <ActionButton onClick={() => onTableAction('addRowBelow')} icon={<RowInsertBottomIcon />} label={t('panes.table.addRowBelow')} disabled={!selectionState.isCursorInTable} />
                    <ActionButton onClick={() => onTableAction('addColLeft')} icon={<ColumnInsertLeftIcon />} label={t('panes.table.addColLeft')} disabled={!selectionState.isCursorInTable} />
                    <ActionButton onClick={() => onTableAction('addColRight')} icon={<ColumnInsertRightIcon />} label={t('panes.table.addColRight')} disabled={!selectionState.isCursorInTable} />
                    <ActionButton onClick={() => onTableAction('deleteRow')} icon={<Trash2Icon className="text-red-500"/>} label={t('panes.table.deleteRow')} disabled={!selectionState.isCursorInTable} />
                    <ActionButton onClick={() => onTableAction('deleteCol')} icon={<Trash2Icon className="text-red-500"/>} label={t('panes.table.deleteCol')} disabled={!selectionState.isCursorInTable} />
                    <ActionButton onClick={() => onTableAction('mergeCells')} icon={<MergeCellsIcon />} label={t('panes.table.mergeCells')} disabled={selectionState.cellCount < 2} />
                    <ActionButton onClick={() => onTableAction('splitCell')} icon={<SplitCellIcon />} label={t('panes.table.splitCell')} disabled={!selectionState.isMerged} />
                </div>
            </details>

            <details className="space-y-3" open>
                <summary className="font-medium cursor-pointer">{t('panes.table.styling')}</summary>
                 <div className="pt-2 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('panes.table.cellBackground')}</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={cellBgColor} onChange={e => setCellBgColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded cursor-pointer" />
                            <button onClick={() => onTableStyle({ backgroundColor: cellBgColor }, 'cell')} disabled={!selectionState.isCursorInTable} className="px-3 py-1.5 text-xs rounded flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">{t('panes.table.applyToCell')}</button>
                            <button onClick={() => onTableStyle({ backgroundColor: cellBgColor }, 'table')} className="px-3 py-1.5 text-xs rounded flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{t('panes.table.applyToTable')}</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('panes.table.borderColor')}</label>
                        <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('panes.table.borderWidth')}</label>
                        <input type="number" min="0" value={borderWidth} onChange={e => setBorderWidth(parseInt(e.target.value,10))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
                    </div>
                    <button onClick={() => onTableStyle({ borderColor, borderWidth: `${borderWidth}px` }, 'table')} className="w-full px-3 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{t('panes.table.applyBorderStyle')}</button>
                </div>
            </details>
            
            {wrapping === 'absolute' && (
                 <details className="space-y-2" open>
                    <summary className="font-medium cursor-pointer">{t('panes.table.arrange')}</summary>
                    <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => onChangeZIndex(editingElement, 'front')} className="px-3 py-1.5 text-xs rounded-md flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{t('panes.table.bringForward')}</button>
                        <button onClick={() => onChangeZIndex(editingElement, 'back')} className="px-3 py-1.5 text-xs rounded-md flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{t('panes.table.sendBackward')}</button>
                    </div>
                </details>
            )}

            <details className="space-y-2" open>
                <summary className="font-medium cursor-pointer">{t('panes.table.actions')}</summary>
                <div className="pt-2">
                    <button onClick={() => onTableAction('deleteTable')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded-md hover:bg-red-200 dark:hover:bg-red-900">
                      <Trash2Icon />
                      <span>{t('panes.table.deleteTable')}</span>
                    </button>
                </div>
            </details>
        </div>
    );
};

export default EditTablePane;