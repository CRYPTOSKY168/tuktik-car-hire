import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Geolocation Hook
 * For tracking user's GPS position in real-time
 * Primarily used by drivers to send their location to the server
 */

export interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
    timestamp: number | null;
    error: string | null;
    isLoading: boolean;
}

interface UseGeolocationOptions {
    enableHighAccuracy?: boolean;
    maximumAge?: number;
    timeout?: number;
    watchPosition?: boolean;
    updateInterval?: number; // Interval for sending updates to server (ms)
    onUpdate?: (position: GeolocationState) => void;
}

const defaultOptions: UseGeolocationOptions = {
    enableHighAccuracy: true,
    maximumAge: 10000, // 10 seconds
    timeout: 15000, // 15 seconds
    watchPosition: false,
    updateInterval: 5000, // 5 seconds
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
    // Memoize options to prevent infinite loops
    const opts = useMemo(() => ({
        ...defaultOptions,
        ...options,
    }), [
        options.enableHighAccuracy,
        options.maximumAge,
        options.timeout,
        options.watchPosition,
        options.updateInterval,
        // Note: onUpdate is stored in a ref below to avoid dependency issues
    ]);

    const [state, setState] = useState<GeolocationState>({
        latitude: null,
        longitude: null,
        accuracy: null,
        heading: null,
        speed: null,
        timestamp: null,
        error: null,
        isLoading: false,
    });

    const [isWatching, setIsWatching] = useState(false); // Track watching state for re-renders
    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Store onUpdate in a ref to avoid re-creating callbacks
    const onUpdateRef = useRef(options.onUpdate);
    onUpdateRef.current = options.onUpdate;

    // Success callback - use refs to avoid dependency issues
    const onSuccess = useCallback((position: GeolocationPosition) => {
        const newState: GeolocationState = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
            error: null,
            isLoading: false,
        };

        setState(newState);

        // Call onUpdate callback with throttling (use ref to avoid re-renders)
        const now = Date.now();
        const updateInterval = opts.updateInterval || 5000;
        if (onUpdateRef.current && now - lastUpdateRef.current >= updateInterval) {
            lastUpdateRef.current = now;
            onUpdateRef.current(newState);
        }
    }, [opts.updateInterval]);

    // Error callback
    const onError = useCallback((error: GeolocationPositionError) => {
        let errorMessage: string;

        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Permission denied - Please enable location access';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Position unavailable - Location information unavailable';
                break;
            case error.TIMEOUT:
                errorMessage = 'Timeout - Request timed out';
                break;
            default:
                errorMessage = 'Unknown error occurred';
        }

        setState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
        }));
    }, []);

    // Get current position once
    const getCurrentPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: 'Geolocation is not supported by this browser',
                isLoading: false,
            }));
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            onSuccess,
            onError,
            {
                enableHighAccuracy: opts.enableHighAccuracy,
                maximumAge: opts.maximumAge,
                timeout: opts.timeout,
            }
        );
    }, [onSuccess, onError, opts.enableHighAccuracy, opts.maximumAge, opts.timeout]);

    // Start watching position
    const startWatching = useCallback(() => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: 'Geolocation is not supported by this browser',
                isLoading: false,
            }));
            return;
        }

        // Clear any existing watch
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        watchIdRef.current = navigator.geolocation.watchPosition(
            onSuccess,
            onError,
            {
                enableHighAccuracy: opts.enableHighAccuracy,
                maximumAge: opts.maximumAge,
                timeout: opts.timeout,
            }
        );
        setIsWatching(true); // Update state for re-render
    }, [onSuccess, onError, opts.enableHighAccuracy, opts.maximumAge, opts.timeout]);

    // Stop watching position
    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsWatching(false); // Update state for re-render
    }, []);

    // Store callbacks in refs to avoid dependency issues in useEffect
    const startWatchingRef = useRef(startWatching);
    const stopWatchingRef = useRef(stopWatching);
    startWatchingRef.current = startWatching;
    stopWatchingRef.current = stopWatching;

    // Auto start if watchPosition is true - only depend on watchPosition boolean
    useEffect(() => {
        if (opts.watchPosition) {
            startWatchingRef.current();
        }

        return () => {
            stopWatchingRef.current();
        };
    }, [opts.watchPosition]);

    return {
        ...state,
        getCurrentPosition,
        startWatching,
        stopWatching,
        isWatching, // Use state instead of ref for re-renders
    };
}

/**
 * Hook for sending driver location to server
 */
export function useDriverLocationUpdates(
    driverId: string | null,
    isOnline: boolean,
    getAuthHeaders: () => Promise<HeadersInit>
) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const sendLocationUpdate = useCallback(async (position: GeolocationState) => {
        if (!driverId || !isOnline || !position.latitude || !position.longitude) {
            return;
        }

        setIsUpdating(true);
        setLastError(null);

        try {
            const response = await fetch('/api/driver/location', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    driverId,
                    lat: position.latitude,
                    lng: position.longitude,
                    heading: position.heading,
                    speed: position.speed,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update location');
            }
        } catch (error: any) {
            console.error('Error updating driver location:', error);
            setLastError(error.message);
        } finally {
            setIsUpdating(false);
        }
    }, [driverId, isOnline, getAuthHeaders]);

    // Use the geolocation hook with auto-updates
    const geolocation = useGeolocation({
        watchPosition: isOnline && !!driverId,
        enableHighAccuracy: true,
        updateInterval: 5000, // Send updates every 5 seconds
        onUpdate: sendLocationUpdate,
    });

    return {
        ...geolocation,
        isUpdating,
        lastError,
    };
}

export default useGeolocation;
