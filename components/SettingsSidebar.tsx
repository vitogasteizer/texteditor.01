import React from 'react';
import { CloseIcon } from './icons/EditorIcons';
import type { ActivePanel, ImageOptions } from '../App';
import LinkPane from './panes/LinkPane';
import ImagePane from './panes/ImagePane';
import TablePane from './panes/TablePane';
import FindReplacePane from './panes/FindReplacePane';
import ShapePane from './panes/ShapePane';
import EditTablePane from './panes/EditTablePane';


interface SettingsSidebarProps {
  activePanel: ActivePanel;
  editingElement: HTMLElement | null;
  onClose: () => void;
  onReplaceAll: (find: string, replace: string, options: { matchCase: boolean; wholeWord: boolean }) => void;
  onApplyLink: (data: { url: string; text: string }, elementToUpdate: HTMLAnchorElement | null) => void;
  onApplyImageSettings: (options: ImageOptions, elementToUpdate: HTMLImageElement | null, keepPanelOpen?: boolean) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onUpdateElementStyle: (element: HTMLElement, styles: React.CSSProperties) => void;
  onChangeZIndex: (element: HTMLElement, direction: 'front' | 'back') => void;
  onAiImageEdit: (prompt: string) => void;
  onOpenCropModal: () => void;
  onTableAction: (action: 'addRowAbove' | 'addRowBelow' | 'deleteRow' | 'addColLeft' | 'addColRight' | 'deleteCol' | 'deleteTable' | 'mergeCells' | 'splitCell') => void;
  onCalculateFormulas: () => void;
  onTableStyle: (style: React.CSSProperties, applyTo: 'cell' | 'table') => void;
  t: (key: string) => string;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = (props) => {
    const { activePanel, onClose, editingElement, t } = props;
    
    let title = '';
    if (activePanel) {
        const panelTitles: Record<NonNullable<ActivePanel>, string> = {
            link: t('settings.linkTitle'),
            image: t('settings.imageTitle'),
            table: editingElement ? t('settings.tableEditTitle') : t('settings.tableTitle'),
            findReplace: t('settings.findReplaceTitle'),
            shape: t('settings.shapeTitle')
        };
        title = panelTitles[activePanel];
    }
    
    return (
        <aside className="w-full md:w-80 bg-white dark:bg-gray-900 md:border-l border-gray-100 dark:border-gray-800 flex flex-col h-full animate-in slide-in-from-right duration-500 ease-out">
            <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{title}</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </header>
            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                {activePanel === 'link' && <LinkPane onApplyLink={props.onApplyLink} onClose={onClose} editingElement={editingElement as HTMLAnchorElement | null} t={t} />}
                {activePanel === 'image' && <ImagePane onApplyImageSettings={props.onApplyImageSettings} onClose={onClose} editingElement={editingElement as HTMLImageElement | null} onUpdateElementStyle={props.onUpdateElementStyle} onChangeZIndex={props.onChangeZIndex} onAiImageEdit={props.onAiImageEdit} onOpenCropModal={props.onOpenCropModal} t={t} />}
                {activePanel === 'table' && !editingElement && <TablePane onInsertTable={props.onInsertTable} t={t} />}
                {activePanel === 'table' && editingElement && <EditTablePane editingElement={editingElement as HTMLTableElement} onTableAction={props.onTableAction} onCalculateFormulas={props.onCalculateFormulas} onTableStyle={props.onTableStyle} onChangeZIndex={props.onChangeZIndex} t={t} />}
                {activePanel === 'findReplace' && <FindReplacePane onReplaceAll={props.onReplaceAll} t={t} />}
                {activePanel === 'shape' && editingElement && <ShapePane editingElement={editingElement} onUpdateStyle={props.onUpdateElementStyle} onChangeZIndex={props.onChangeZIndex} t={t} />}
            </div>
        </aside>
    );
};

export default SettingsSidebar;