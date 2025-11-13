import React from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { DropdownActions } from './DropdownActions';
import type { ActionItem } from './DropdownActions';

export type Column<T> = {
    header: React.ReactNode;
    accessor: keyof T | ((row: T, index: number) => React.ReactNode);
    isVisible?: (data: T[]) => boolean;
    className?: string | ((row: T, index: number) => string);
    headerClassName?: string;
};

export type Action<T> = {
    label: string;
    icon?: React.ReactNode;
    onClick?: (row: T) => void;
    to?: string | ((row: T) => string);
    show?: boolean | ((row: T) => boolean);
    loading?: boolean | ((row: T) => boolean);
    disabled?: boolean | ((row: T) => boolean);
};

export type SubTableConfig<T> = {
    getSubData: (row: T) => any[] | undefined;
    hasSubData: (row: T) => boolean;
    renderSubTable: (subData: any[], parentRow: T) => React.ReactNode;
    expandedRows?: Record<string, boolean>;
    onToggleExpand?: (rowId: string) => void;
};

type Props<T> = {
    data: T[];
    columns: Column<T>[];
    actions?: Action<T>[];
    rowKey?: (row: T, index: number) => string | number;
    className?: string;
    actionTitle?: (row: T) => string;
    rowLoading?: (row: T) => boolean;
    subTable?: SubTableConfig<T>;
    hover?: boolean;
    striped?: boolean;
};

export function DataTable<T>({ 
    data, 
    columns, 
    actions, 
    rowKey, 
    className, 
    actionTitle, 
    rowLoading, 
    subTable, 
    hover = false, 
    striped = false 
}: Props<T>) {
    const hasActions = actions && actions.length > 0;
    const visibleColumns = columns.filter((col) => !col.isVisible || col.isVisible(data));

    return (
        <div className="relative w-full overflow-x-auto overflow-y-visible">
            <table className={`min-w-max w-full text-sm ${className ?? ''}`}>
                <thead className="relative z-10">
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                        {visibleColumns.map((col, idx) => (
                            <th key={idx} className={`text-left py-2 font-medium ${col.headerClassName ?? 'text-gray-700 dark:text-slate-300'}`}>
                                {col.header}
                            </th>
                        ))}
                        {(hasActions || subTable) && <th className="py-2" />}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => {
                        const currentRowKey = String(rowKey?.(row, rowIndex) ?? rowIndex);
                        const hasSubData = subTable?.hasSubData(row) || false;
                        const isExpanded = subTable?.expandedRows?.[currentRowKey] || false;
                        const subData = subTable?.getSubData(row);

                        const actionItems: ActionItem[] =
                            actions?.reduce<ActionItem[]>((acc, action) => {
                                const show = typeof action.show === 'function' ? action.show(row) : action.show !== false;

                                if (!show) return acc;

                                acc.push({
                                    label: action.label,
                                    icon: action.icon as JSX.Element,
                                    to: typeof action.to === 'function' ? action.to(row) : action.to,
                                    onClick: action.onClick ? () => action.onClick?.(row) : undefined,
                                    show: true,
                                    loading: typeof action.loading === 'function' ? action.loading(row) : action.loading || false,
                                    disabled: typeof action.disabled === 'function' ? action.disabled(row) : action.disabled || false,
                                });

                                return acc;
                            }, []) ?? [];

                        const isRowLoading = rowLoading ? rowLoading(row) : false;

                        const isOddRow = rowIndex % 2 === 1;
                        const hoverClasses = hover ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50' : '';
                        const stripedClasses = striped && isOddRow ? 'bg-gray-50 dark:bg-slate-800' : '';

                        return (
                            <React.Fragment key={currentRowKey}>
                                <tr
                                    className={`border-b border-gray-100 dark:border-slate-700 transition-all duration-200 ${hoverClasses} ${stripedClasses} ${
                                        isRowLoading ? 'opacity-70 bg-blue-50/50 dark:bg-blue-900/10' : ''
                                    }`}
                                >
                                    {visibleColumns.map((col, colIndex) => {
                                        const content = typeof col.accessor === 'function' ? col.accessor(row, rowIndex) : (row as any)[col.accessor];

                                        const cellClass = typeof col.className === 'function' ? col.className(row, rowIndex) : col.className ?? '';

                                        return (
                                            <td
                                                key={colIndex}
                                                className={`py-2 ${cellClass || 'text-gray-900 dark:text-white'} ${isRowLoading ? 'relative' : ''}`}
                                            >
                                                {isRowLoading && colIndex === 0 && (
                                                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
                                                        <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                )}
                                                <div className={`${isRowLoading ? 'ml-6' : ''} transition-all duration-200`}>{content}</div>
                                            </td>
                                        );
                                    })}
                                    <td className="text-right relative overflow-visible">
                                        <div className="flex items-center gap-2 justify-end">
                                            {hasActions && <DropdownActions id={`actions-${rowIndex}`} title={actionTitle?.(row)} actions={actionItems} />}
                                            {hasSubData && (
                                                <button
                                                    type="button"
                                                    onClick={() => subTable?.onToggleExpand?.(currentRowKey)}
                                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                                                >
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* Subtabela expandida */}
                                {isExpanded && hasSubData && subData && (
                                    <tr>
                                        <td colSpan={visibleColumns.length + 1} className="p-2 bg-gray-50 dark:bg-slate-700/50">
                                            {subTable?.renderSubTable(subData, row)}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
