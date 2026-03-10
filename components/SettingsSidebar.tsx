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
        <aside className="w-full md:w-80 bg-gray-100 dark:bg-gray-800 md:border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t('settings.close')}>
                <CloseIcon />
                </button>
            </header>
            <div className="flex-grow p-4 overflow-y-auto">
                {activePanel === 'link' && <LinkPane onApplyLink={props.onApplyLink} onClose={onClose} editingElement={editingElement as HTMLAnchorElement | null} t={t} />}
                {activePanel === 'image' && <ImagePane onApplyImageSettings={props.onApplyImageSettings} onClose={onClose} editingElement={editingElement as HTMLImageElement | null} onUpdateElementStyle={props.onUpdateElementStyle} onChangeZIndex={props.onChangeZIndex} onAiImageEdit={props.onAiImageEdit} onOpenCropModal={props.onOpenCropModal} t={t} />}
                {activePanel === 'table' && !editingElement && <TablePane onInsertTable={props.onInsertTable} t={t} />}
                {activePanel === 'table' && editingElement && <EditTablePane editingElement={editingElement as HTMLTableElement} onTableAction={props.onTableAction} onTableStyle={props.onTableStyle} onChangeZIndex={props.onChangeZIndex} t={t} />}
                {activePanel === 'findReplace' && <FindReplacePane onReplaceAll={props.onReplaceAll} t={t} />}
                {activePanel === 'shape' && editingElement && <ShapePane editingElement={editingElement} onUpdateStyle={props.onUpdateElementStyle} onChangeZIndex={props.onChangeZIndex} t={t} />}
            </div>
        </aside>
    );
};

export default SettingsSidebar;