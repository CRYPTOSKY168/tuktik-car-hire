'use client';

import { useState, useEffect, useCallback } from 'react';
import { Unsubscribe } from 'firebase/firestore';

interface UseDataFetchingOptions<T> {
    fetchFn?: () => Promise<T[]>;
    subscribeFn?: (callback: (data: T[]) => void) => Unsubscribe;
    initialData?: T[];
    enabled?: boolean;
}

interface UseDataFetchingResult<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useDataFetching<T>({
    fetchFn,
    subscribeFn,
    initialData = [],
    enabled = true,
}: UseDataFetchingOptions<T>): UseDataFetchingResult<T> {
    const [data, setData] = useState<T[]>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
        if (!fetchFn) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        // Use subscription if provided
        if (subscribeFn) {
            setLoading(true);
            const unsubscribe = subscribeFn((newData) => {
                setData(newData);
                setLoading(false);
                setError(null);
            });

            return () => unsubscribe();
        }

        // Otherwise use fetch
        if (fetchFn) {
            refetch();
        } else {
            setLoading(false);
        }
    }, [enabled, subscribeFn, fetchFn, refetch]);

    return { data, loading, error, refetch };
}

// Simplified hook for one-time fetching
export function useFetch<T>(
    fetchFn: () => Promise<T>,
    deps: React.DependencyList = []
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, loading, error, refetch };
}

export default useDataFetching;
