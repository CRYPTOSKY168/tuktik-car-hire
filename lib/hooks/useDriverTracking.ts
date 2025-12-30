import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DriverLocation } from '@/lib/types';

/**
 * Driver Tracking Hook
 * For customers to track driver location in real-time
 * Uses Firestore onSnapshot for real-time updates
 */

export interface DriverTrackingState {
    location: DriverLocation | null;
    isLoading: boolean;
    error: string | null;
    lastUpdate: Date | null;
}

export interface UseDriverTrackingOptions {
    /** Interval for polling via API (fallback, ms) */
    pollInterval?: number;
    /** Use Firestore real-time updates */
    useRealtime?: boolean;
    /** Auto-start tracking */
    autoStart?: boolean;
}

const defaultOptions: UseDriverTrackingOptions = {
    pollInterval: 10000, // 10 seconds
    useRealtime: true,
    autoStart: true,
};

/**
 * Hook to track driver location in real-time
 * Primarily uses Firestore onSnapshot for live updates
 * Falls back to polling API if Firestore is not available
 */
export function useDriverTracking(
    driverId: string | null,
    options: UseDriverTrackingOptions = {}
) {
    const opts = { ...defaultOptions, ...options };

    const [state, setState] = useState<DriverTrackingState>({
        location: null,
        isLoading: false,
        error: null,
        lastUpdate: null,
    });

    const unsubscribeRef = useRef<Unsubscribe | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isTrackingRef = useRef<boolean>(false);

    // Start real-time tracking via Firestore
    const startRealtimeTracking = useCallback(() => {
        if (!driverId || !db) return;

        // Clear any existing subscription
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));
        isTrackingRef.current = true;

        const driverRef = doc(db, 'drivers', driverId);

        unsubscribeRef.current = onSnapshot(
            driverRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const currentLocation = data.currentLocation;

                    if (currentLocation) {
                        // Convert Firestore Timestamp to Date if needed
                        let timestamp = currentLocation.timestamp;
                        if (timestamp?.toDate) {
                            timestamp = timestamp.toDate();
                        }

                        setState({
                            location: {
                                lat: currentLocation.lat,
                                lng: currentLocation.lng,
                                heading: currentLocation.heading,
                                speed: currentLocation.speed,
                                timestamp,
                            },
                            isLoading: false,
                            error: null,
                            lastUpdate: new Date(),
                        });
                    } else {
                        setState(prev => ({
                            ...prev,
                            isLoading: false,
                            error: 'Driver location not available',
                        }));
                    }
                } else {
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: 'Driver not found',
                    }));
                }
            },
            (error) => {
                console.error('Error tracking driver:', error);
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Failed to track driver location',
                }));
            }
        );
    }, [driverId]);

    // Fetch location via API (fallback)
    const fetchLocationViaAPI = useCallback(async () => {
        if (!driverId) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(`/api/driver/location?driverId=${driverId}`);
            const result = await response.json();

            if (result.success && result.data?.currentLocation) {
                const loc = result.data.currentLocation;
                setState({
                    location: {
                        lat: loc.lat,
                        lng: loc.lng,
                        heading: loc.heading,
                        speed: loc.speed,
                        timestamp: loc.timestamp?.toDate ? loc.timestamp.toDate() : new Date(loc.timestamp?._seconds * 1000),
                    },
                    isLoading: false,
                    error: null,
                    lastUpdate: new Date(),
                });
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: result.error || 'Location not available',
                }));
            }
        } catch (error: any) {
            console.error('Error fetching driver location:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Failed to fetch location',
            }));
        }
    }, [driverId]);

    // Start polling (fallback)
    const startPolling = useCallback(() => {
        if (!driverId) return;

        // Clear any existing interval
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        isTrackingRef.current = true;

        // Fetch immediately
        fetchLocationViaAPI();

        // Set up polling interval
        pollIntervalRef.current = setInterval(() => {
            if (isTrackingRef.current) {
                fetchLocationViaAPI();
            }
        }, opts.pollInterval);
    }, [driverId, fetchLocationViaAPI, opts.pollInterval]);

    // Start tracking (auto-select method)
    const startTracking = useCallback(() => {
        if (opts.useRealtime && db) {
            startRealtimeTracking();
        } else {
            startPolling();
        }
    }, [opts.useRealtime, startRealtimeTracking, startPolling]);

    // Stop tracking
    const stopTracking = useCallback(() => {
        isTrackingRef.current = false;

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    // Auto-start if enabled
    useEffect(() => {
        if (opts.autoStart && driverId) {
            startTracking();
        }

        return () => {
            stopTracking();
        };
    }, [driverId, opts.autoStart, startTracking, stopTracking]);

    // Refresh location manually
    const refreshLocation = useCallback(() => {
        if (opts.useRealtime) {
            // For realtime, just ensure subscription is active
            if (!unsubscribeRef.current && driverId) {
                startRealtimeTracking();
            }
        } else {
            fetchLocationViaAPI();
        }
    }, [opts.useRealtime, driverId, startRealtimeTracking, fetchLocationViaAPI]);

    return {
        ...state,
        startTracking,
        stopTracking,
        refreshLocation,
        isTracking: isTrackingRef.current,
    };
}

/**
 * Hook to track driver for a specific booking
 * Gets driverId from booking and tracks their location
 */
export function useBookingDriverTracking(bookingId: string | null) {
    const [driverId, setDriverId] = useState<string | null>(null);
    const [bookingStatus, setBookingStatus] = useState<string | null>(null);
    const unsubscribeRef = useRef<Unsubscribe | null>(null);

    // Subscribe to booking to get driver info
    useEffect(() => {
        if (!bookingId || !db) return;

        const bookingRef = doc(db, 'bookings', bookingId);

        unsubscribeRef.current = onSnapshot(
            bookingRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    setDriverId(data.driver?.driverId || null);
                    setBookingStatus(data.status || null);
                }
            },
            (error) => {
                console.error('Error watching booking:', error);
            }
        );

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [bookingId]);

    // Only track when driver is assigned and trip is active
    const shouldTrack = bookingStatus && ['driver_assigned', 'driver_en_route', 'in_progress'].includes(bookingStatus);

    // Use driver tracking hook
    const tracking = useDriverTracking(
        shouldTrack ? driverId : null,
        { autoStart: true }
    );

    return {
        ...tracking,
        driverId,
        bookingStatus,
        shouldTrack,
    };
}

export default useDriverTracking;
