'use client';

import { useState, useMemo, useCallback } from 'react';

interface UseTableFiltersOptions<T> {
    data: T[];
    searchKeys?: (keyof T)[];
    initialFilters?: Record<string, string>;
}

interface UseTableFiltersResult<T> {
    filteredData: T[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filters: Record<string, string>;
    setFilter: (key: string, value: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
}

export function useTableFilters<T extends Record<string, unknown>>({
    data,
    searchKeys = [],
    initialFilters = {},
}: UseTableFiltersOptions<T>): UseTableFiltersResult<T> {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

    const setFilter = useCallback((key: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setFilters({});
    }, []);

    const hasActiveFilters = useMemo(() => {
        return searchQuery.length > 0 || Object.values(filters).some((v) => v !== '' && v !== 'all');
    }, [searchQuery, filters]);

    const filteredData = useMemo(() => {
        let result = [...data];

        // Apply search filter
        if (searchQuery && searchKeys.length > 0) {
            const query = searchQuery.toLowerCase();
            result = result.filter((item) =>
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
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
            if (!value || value === 'all') return;

            result = result.filter((item) => {
                const itemValue = item[key as keyof T];
                if (typeof itemValue === 'string') {
                    return itemValue === value;
                }
                return String(itemValue) === value;
            });
        });

        return result;
    }, [data, searchQuery, searchKeys, filters]);

    return {
        filteredData,
        searchQuery,
        setSearchQuery,
        filters,
        setFilter,
        clearFilters,
        hasActiveFilters,
    };
}

// Hook for date range filtering
interface UseDateFilterOptions {
    data: Array<{ [key: string]: unknown }>;
    dateKey: string;
}

export function useDateFilter<T extends Record<string, unknown>>({
    data,
    dateKey,
}: UseDateFilterOptions) {
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month'>('all');

    const filteredData = useMemo(() => {
        if (dateFilter === 'all') return data as T[];

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const monthEnd = new Date(today);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        return (data as T[]).filter((item) => {
            const dateValue = item[dateKey];
            if (!dateValue) return false;

            let itemDate: Date;
            if (typeof dateValue === 'string') {
                itemDate = new Date(dateValue);
            } else if (dateValue instanceof Date) {
                itemDate = dateValue;
            } else if (typeof dateValue === 'object' && 'toDate' in dateValue) {
                itemDate = (dateValue as { toDate: () => Date }).toDate();
            } else {
                return false;
            }

            switch (dateFilter) {
                case 'today':
                    return itemDate >= today && itemDate < tomorrow;
                case 'tomorrow':
                    const dayAfterTomorrow = new Date(tomorrow);
                    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
                    return itemDate >= tomorrow && itemDate < dayAfterTomorrow;
                case 'week':
                    return itemDate >= today && itemDate < weekEnd;
                case 'month':
                    return itemDate >= today && itemDate < monthEnd;
                default:
                    return true;
            }
        });
    }, [data, dateFilter, dateKey]);

    return {
        filteredData,
        dateFilter,
        setDateFilter,
    };
}

export default useTableFilters;
