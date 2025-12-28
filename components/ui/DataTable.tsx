'use client';

import { useState, useMemo, ReactNode } from 'react';

export interface DataTableColumn<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => ReactNode;
    sortable?: boolean;
    width?: string;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    searchable?: boolean;
    searchKeys?: (keyof T)[];
    searchPlaceholder?: string;
    onRowClick?: (item: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    emptyIcon?: string;
    keyExtractor?: (item: T) => string;
    className?: string;
    headerActions?: ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    searchable = false,
    searchKeys = [],
    searchPlaceholder = 'Search...',
    onRowClick,
    loading = false,
    emptyMessage = 'No data found',
    emptyIcon = 'inbox',
    keyExtractor,
    className = '',
    headerActions,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!searchQuery || searchKeys.length === 0) return data;

        const query = searchQuery.toLowerCase();
        return data.filter((item) =>
            searchKeys.some((key) => {
                const value = item[key];
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(query);
                }
                if (typeof value === 'number') {
                    return value.toString().includes(query);
                }
                return false;
            })
        );
    }, [data, searchQuery, searchKeys]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortKey as keyof T];
            const bValue = b[sortKey as keyof T];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDirection]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const getKey = (item: T, index: number): string => {
        if (keyExtractor) return keyExtractor(item);
        if ('id' in item && typeof item.id === 'string') return item.id;
        return index.toString();
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-8 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${className}`}>
            {/* Header with search and actions */}
            {(searchable || headerActions) && (
                <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between">
                    {searchable && (
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}
                    {headerActions && <div className="flex gap-2">{headerActions}</div>}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`px-4 py-3 text-left text-sm font-semibold text-gray-600 ${column.width || ''} ${column.className || ''}`}
                                    style={column.width ? { width: column.width } : undefined}
                                >
                                    {column.sortable ? (
                                        <button
                                            onClick={() => handleSort(String(column.key))}
                                            className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                                        >
                                            {column.header}
                                            <span className="material-symbols-outlined text-sm">
                                                {sortKey === column.key
                                                    ? sortDirection === 'asc'
                                                        ? 'arrow_upward'
                                                        : 'arrow_downward'
                                                    : 'unfold_more'}
                                            </span>
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center">
                                    <span className="material-symbols-outlined text-4xl text-gray-300">
                                        {emptyIcon}
                                    </span>
                                    <p className="mt-2 text-gray-500">{emptyMessage}</p>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item, index) => (
                                <tr
                                    key={getKey(item, index)}
                                    onClick={() => onRowClick?.(item)}
                                    className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={String(column.key)}
                                            className={`px-4 py-3 text-sm text-gray-700 ${column.className || ''}`}
                                        >
                                            {column.render
                                                ? column.render(item)
                                                : String(item[column.key as keyof T] ?? '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer with count */}
            {sortedData.length > 0 && (
                <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-500">
                    Showing {sortedData.length} of {data.length} items
                </div>
            )}
        </div>
    );
}

export default DataTable;
