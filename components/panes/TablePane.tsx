
import React, { useState } from 'react';

interface TablePaneProps {
  onInsertTable: (rows: number, cols: number) => void;
  t: (key: string) => string;
}

const TablePane: React.FC<TablePaneProps> = ({ onInsertTable, t }) => {
    const [rows, setRows] = useState(2);
    const [cols, setCols] = useState(2);

    const handleInsert = () => {
        if (rows > 0 && cols > 0) {
            onInsertTable(rows, cols);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4 p-5 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl">
                <div className="space-y-2">
                    <label htmlFor="table-rows" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.table.rows')}</label>
                    <input
                        type="number"
                        id="table-rows"
                        value={rows}
                        onChange={e => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min="1"
                        className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="table-cols" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">{t('panes.table.columns')}</label>
                    <input
                        type="number"
                        id="table-cols"
                        value={cols}
                        onChange={e => setCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min="1"
                        className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 border border-white/20 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm"
                    />
                </div>
            </div>
            <div className="flex justify-end pt-2">
                 <button
                    onClick={handleInsert}
                    type="button"
                    className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-xl shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
                 >
                    {t('panes.table.insert')}
                </button>
            </div>
        </div>
    );
};

export default TablePane;