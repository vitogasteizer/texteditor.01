
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
        <div className="space-y-4">
            <div>
                <label htmlFor="table-rows" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('panes.table.rows')}</label>
                <input
                    type="number"
                    id="table-rows"
                    value={rows}
                    onChange={e => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            <div>
                <label htmlFor="table-cols" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('panes.table.columns')}</label>
                <input
                    type="number"
                    id="table-cols"
                    value={cols}
                    onChange={e => setCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            <div className="flex justify-end pt-2">
                 <button
                    onClick={handleInsert}
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                 >
                    {t('panes.table.insert')}
                </button>
            </div>
        </div>
    );
};

export default TablePane;