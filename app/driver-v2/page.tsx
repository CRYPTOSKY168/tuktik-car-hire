'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { DriverStatus } from '@/lib/types';
import { useDriverLocationUpdates } from '@/lib/hooks/useGeolocation';
import { useRouter } from 'next/navigation';
import {
    GoogleMap,
    useLoadScript,
    DirectionsRenderer,
    OverlayView,
    Libraries,
} from '@react-google-maps/api';

// Types
interface DriverData {
    id: string;
    name: string;
    phone: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    status: DriverStatus | string;
    photo?: string;
    rating?: number;
    ratingCount?: number;
    totalTrips?: number;
    totalEarnings?: number;
}

interface Booking {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
    pickupTime: string;
    vehicleName: string;
    totalCost: number;
    status: string;
    createdAt: any;
    pickupCoordinates?: { lat: number; lng: number };
    dropoffCoordinates?: { lat: number; lng: number };
}

// Constants
const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 };
const libraries: Libraries = ['places', 'geometry'];

// Light Map Styles
const lightMapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e4f6' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
];

// Location coordinates mapping
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'สนามบินสุวรรณภูมิ': { lat: 13.6900, lng: 100.7501 },
    'สนามบินดอนเมือง': { lat: 13.9126, lng: 100.6067 },
    'สยามพารากอน': { lat: 13.7466, lng: 100.5347 },
    'เซ็นทรัลเวิลด์': { lat: 13.7465, lng: 100.5392 },
};

export default function DriverV2Page() {
    const router = useRouter();
    const mapRef = useRef<google.maps.Map | null>(null);

    // Auth & Driver States
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [driverStatus, setDriverStatus] = useState<DriverStatus | string>(DriverStatus.OFFLINE);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);

    // Map States
    const [driverLocation, setDriverLocation] = useState(BANGKOK_CENTER);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
    const [followMode, setFollowMode] = useState(true);
    const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
    const lastRouteCalcRef = useRef<number>(0);
    const routeDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Job Modal States
    const [showJobModal, setShowJobModal] = useState(false);
    const [newJob, setNewJob] = useState<Booking | null>(null);
    const [countdown, setCountdown] = useState(15);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const previousBookingIds = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);

    // Rating States
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
    const [rating, setRating] = useState(0);
    const [ratingReasons, setRatingReasons] = useState<string[]>([]);
    const [ratingComment, setRatingComment] = useState('');

    // Audio States
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const soundRepeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for callbacks (prevent stale closure)
    const handleRejectJobRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // Stats
    const [todayStats, setTodayStats] = useState({ trips: 0, earnings: 0, weeklyEarnings: 0 });

    // === No-Show States ===
    const [driverArrivedAt, setDriverArrivedAt] = useState<Date | null>(null);
    const [noShowWaitTime, setNoShowWaitTime] = useState(300000); // Default 5 minutes (from config)
    const [noShowCountdown, setNoShowCountdown] = useState<number | null>(null);
    const [showArrivedConfirmModal, setShowArrivedConfirmModal] = useState(false);
    const [showNoShowConfirmModal, setShowNoShowConfirmModal] = useState(false);
    const [showNoShowResultModal, setShowNoShowResultModal] = useState(false);
    const [noShowResult, setNoShowResult] = useState<{
        noShowFee: number;
        driverEarnings: number;
    } | null>(null);
    const [isReportingNoShow, setIsReportingNoShow] = useState(false);
    const [isMarkingArrived, setIsMarkingArrived] = useState(false);
    const noShowTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Load Google Maps
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    // Get auth token
    const getAuthToken = async (): Promise<string | null> => {
        const currentUser = auth?.currentUser;
        if (!currentUser) return null;
        try {
            return await currentUser.getIdToken(true);
        } catch {
            return null;
        }
    };

    // Get auth headers
    const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
        const token = await getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }, []);

    // GPS Location Updates
    const { latitude, longitude, heading } = useDriverLocationUpdates(
        driver?.id || null,
        driverStatus === DriverStatus.AVAILABLE || ['driver_en_route', 'in_progress'].includes(bookings[0]?.status || ''),
        getAuthHeaders
    );

    // Update driver location from GPS
    useEffect(() => {
        if (latitude && longitude) {
            setDriverLocation({ lat: latitude, lng: longitude });
        }
    }, [latitude, longitude]);

    // Play notification sound once
    const playSoundOnce = useCallback(() => {
        if (!audioUnlocked || !audioContextRef.current) return;
        try {
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();
            const playChime = (time: number, f1: number, f2: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(f1, time);
                osc.frequency.setValueAtTime(f2, time + 0.15);
                gain.gain.setValueAtTime(0.7, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
                osc.start(time);
                osc.stop(time + 0.4);
            };
            const now = ctx.currentTime;
            playChime(now, 1046.50, 783.99);
            playChime(now + 0.5, 1046.50, 783.99);
            playChime(now + 1.0, 1318.51, 987.77);
            // Vibrate on mobile
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } catch (err) {
            console.log('Audio error:', err);
        }
    }, [audioUnlocked]);

    // Stop sound repeat
    const stopSoundRepeat = useCallback(() => {
        if (soundRepeatIntervalRef.current) {
            clearInterval(soundRepeatIntervalRef.current);
            soundRepeatIntervalRef.current = null;
        }
    }, []);

    // Start sound repeat (every 3 seconds)
    const startSoundRepeat = useCallback(() => {
        stopSoundRepeat();
        playSoundOnce();
        soundRepeatIntervalRef.current = setInterval(() => {
            playSoundOnce();
        }, 3000);
    }, [playSoundOnce, stopSoundRepeat]);

    // Play notification sound (starts repeat)
    const playNotificationSound = useCallback(() => {
        startSoundRepeat();
    }, [startSoundRepeat]);

    // Unlock audio
    const unlockAudio = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
            setTimeout(() => {
                const beep = ctx.createOscillator();
                const beepGain = ctx.createGain();
                beep.connect(beepGain);
                beepGain.connect(ctx.destination);
                beep.frequency.setValueAtTime(880, ctx.currentTime);
                beepGain.gain.setValueAtTime(0.5, ctx.currentTime);
                beepGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                beep.start(ctx.currentTime);
                beep.stop(ctx.currentTime + 0.2);
            }, 100);
            setAudioUnlocked(true);
        } catch (err) {
            console.error('Failed to unlock audio:', err);
            setAudioUnlocked(true);
        }
    }, []);

    // Check for new bookings
    const checkForNewBookings = useCallback((newBookings: Booking[]) => {
        if (isFirstLoad.current) {
            previousBookingIds.current = new Set(newBookings.map(b => b.id));
            isFirstLoad.current = false;
            return;
        }
        const newAssigned = newBookings.filter(
            b => b.status === 'driver_assigned' && !previousBookingIds.current.has(b.id)
        );
        if (newAssigned.length > 0) {
            const job = newAssigned[0];
            setNewJob(job);
            setShowJobModal(true);
            setCountdown(15);
            playNotificationSound(); // This now starts sound repeat with vibration
        }
        previousBookingIds.current = new Set(newBookings.map(b => b.id));
    }, [playNotificationSound]);

    // Auth Effect
    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        let unsubscribeBookings: (() => void) | null = null;
        let unsubscribeDriver: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
            if (!authUser) {
                setLoading(false);
                router.push('/driver/login');
                return;
            }

            setUser(authUser);

            try {
                const userDoc = await getDoc(doc(db!, 'users', authUser.uid));
                const userData = userDoc.data();
                let foundDriverId: string | null = null;

                if (userData?.driverId) {
                    const driverDoc = await getDoc(doc(db!, 'drivers', userData.driverId));
                    if (driverDoc.exists()) {
                        const driverData = driverDoc.data();
                        foundDriverId = userData.driverId;
                        setDriver({
                            id: userData.driverId,
                            name: driverData.name || authUser.displayName || 'Driver',
                            phone: driverData.phone || '',
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            vehicleColor: driverData.vehicleColor,
                            status: driverData.status || DriverStatus.OFFLINE,
                            photo: driverData.photo || authUser.photoURL || undefined,
                            rating: driverData.rating,
                            ratingCount: driverData.ratingCount,
                            totalTrips: driverData.totalTrips,
                            totalEarnings: driverData.totalEarnings,
                        });
                        setDriverStatus(driverData.status || DriverStatus.OFFLINE);

                        // Subscribe to driver updates
                        unsubscribeDriver = onSnapshot(doc(db!, 'drivers', userData.driverId), (snap) => {
                            if (snap.exists()) {
                                const d = snap.data();
                                setDriver(prev => prev ? {
                                    ...prev,
                                    status: d.status,
                                    rating: d.rating,
                                    ratingCount: d.ratingCount,
                                    totalTrips: d.totalTrips,
                                    totalEarnings: d.totalEarnings,
                                } : prev);
                                setDriverStatus(d.status || DriverStatus.OFFLINE);
                            }
                        });
                    }
                }

                // Subscribe to bookings
                if (foundDriverId && db) {
                    const q = query(
                        collection(db, 'bookings'),
                        where('driver.driverId', '==', foundDriverId)
                    );
                    unsubscribeBookings = onSnapshot(q, (snapshot) => {
                        const bookingList = snapshot.docs.map(d => ({
                            id: d.id,
                            ...d.data()
                        } as Booking));
                        setBookings(bookingList);
                        checkForNewBookings(bookingList);

                        // Calculate today stats
                        const today = new Date().toDateString();
                        const todayBookings = bookingList.filter(b =>
                            b.status === 'completed' &&
                            b.createdAt?.toDate?.()?.toDateString() === today
                        );
                        setTodayStats({
                            trips: todayBookings.length,
                            earnings: todayBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0),
                            weeklyEarnings: bookingList.filter(b => b.status === 'completed')
                                .reduce((sum, b) => sum + (b.totalCost || 0), 0),
                        });
                    });
                }

                setLoading(false);
            } catch (error) {
                console.error('Error loading driver data:', error);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeBookings?.();
            unsubscribeDriver?.();
        };
    }, [router, checkForNewBookings]);

    // Countdown Effect - Auto-reject when countdown reaches 0
    useEffect(() => {
        if (showJobModal && countdown > 0) {
            countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
        } else if (showJobModal && countdown === 0) {
            // Use ref to avoid stale closure
            handleRejectJobRef.current?.();
        }
    }, [showJobModal, countdown]);

    // Cleanup sound repeat on unmount or modal close
    useEffect(() => {
        if (!showJobModal) {
            stopSoundRepeat();
        }
        return () => stopSoundRepeat();
    }, [showJobModal, stopSoundRepeat]);

    // Toggle Online/Offline
    const toggleStatus = async () => {
        if (!driver?.id) return;
        setStatusLoading(true);
        try {
            const newStatus = driverStatus === DriverStatus.AVAILABLE ? DriverStatus.OFFLINE : DriverStatus.AVAILABLE;
            const response = await fetch('/api/driver/status', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ driverId: driver.id, status: newStatus }),
            });
            if (response.ok) {
                setDriverStatus(newStatus);
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        } finally {
            setStatusLoading(false);
        }
    };

    // Accept Job
    const handleAcceptJob = async () => {
        if (!newJob || !driver?.id) return;
        stopSoundRepeat(); // Stop sound when accepting
        setShowJobModal(false);
        try {
            await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    action: 'updateStatus',
                    bookingId: newJob.id,
                    driverId: driver.id,
                    data: { status: 'driver_en_route' },
                }),
            });
        } catch (error) {
            console.error('Error accepting job:', error);
        }
    };

    // Reject Job
    const handleRejectJob = async () => {
        if (!newJob || !driver?.id) return;
        stopSoundRepeat(); // Stop sound when rejecting
        setShowJobModal(false);
        setNewJob(null);
        try {
            await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    action: 'rejectJob',
                    bookingId: newJob.id,
                    driverId: driver.id,
                }),
            });
        } catch (error) {
            console.error('Error rejecting job:', error);
        }
    };

    // Update ref for auto-reject (prevent stale closure)
    useEffect(() => {
        handleRejectJobRef.current = handleRejectJob;
    });

    // Update Booking Status
    const updateBookingStatus = async (bookingId: string, newStatus: string) => {
        if (!driver?.id) return;
        try {
            const response = await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    action: 'updateStatus',
                    bookingId,
                    driverId: driver.id,
                    data: { status: newStatus },
                }),
            });
            if (response.ok && newStatus === 'completed') {
                const booking = bookings.find(b => b.id === bookingId);
                if (booking) {
                    setCompletedBooking(booking);
                    setShowRatingModal(true);
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Submit Rating
    const submitRating = async () => {
        if (!completedBooking || rating === 0) return;
        try {
            await fetch('/api/booking/rate', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    bookingId: completedBooking.id,
                    ratingType: 'driverToCustomer',
                    stars: rating,
                    reasons: ratingReasons,
                    comment: ratingComment,
                }),
            });
        } catch (error) {
            console.error('Error submitting rating:', error);
        } finally {
            setShowRatingModal(false);
            setCompletedBooking(null);
            setRating(0);
            setRatingReasons([]);
            setRatingComment('');
        }
    };

    // === No-Show Functions ===

    // Mark arrived at pickup location
    const markArrivedAtPickup = async () => {
        const activeB = bookings.find(b => b.status === 'driver_en_route');
        if (!activeB) return;

        setIsMarkingArrived(true);
        try {
            const response = await fetch('/api/booking/noshow/arrived', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ bookingId: activeB.id }),
            });
            const result = await response.json();

            if (result.success) {
                // Set arrived time and wait time
                setDriverArrivedAt(new Date());
                setNoShowWaitTime(result.data.waitTimeMs || 300000);
                setNoShowCountdown(Math.ceil((result.data.waitTimeMs || 300000) / 1000));
                setShowArrivedConfirmModal(false);
            } else {
                alert(result.error || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error marking arrived:', error);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsMarkingArrived(false);
        }
    };

    // Report customer no-show
    const reportNoShow = async () => {
        const activeB = bookings.find(b => b.status === 'driver_en_route');
        if (!activeB) return;

        setIsReportingNoShow(true);
        try {
            const response = await fetch('/api/booking/noshow', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    bookingId: activeB.id,
                    note: 'ลูกค้าไม่มารับบริการ',
                }),
            });
            const result = await response.json();

            if (result.success) {
                setShowNoShowConfirmModal(false);
                setNoShowResult({
                    noShowFee: result.data.noShowFee || 0,
                    driverEarnings: result.data.driverEarnings || 0,
                });
                setShowNoShowResultModal(true);
                // Reset no-show states
                setDriverArrivedAt(null);
                setNoShowCountdown(null);
                if (noShowTimerRef.current) {
                    clearInterval(noShowTimerRef.current);
                    noShowTimerRef.current = null;
                }
            } else {
                alert(result.error || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error reporting no-show:', error);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsReportingNoShow(false);
        }
    };

    // No-Show countdown timer
    useEffect(() => {
        if (noShowCountdown === null || noShowCountdown <= 0) return;

        noShowTimerRef.current = setInterval(() => {
            setNoShowCountdown(prev => {
                if (prev === null || prev <= 1) {
                    if (noShowTimerRef.current) clearInterval(noShowTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (noShowTimerRef.current) clearInterval(noShowTimerRef.current);
        };
    }, [noShowCountdown]);

    // Format countdown display
    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Open external navigation (Google Maps / Apple Maps)
    const openNavigation = useCallback((destination: { lat: number; lng: number } | string) => {
        let destStr: string;
        if (typeof destination === 'string') {
            destStr = encodeURIComponent(destination);
        } else {
            destStr = `${destination.lat},${destination.lng}`;
        }

        // Check if iOS (Apple Maps) or Android/Other (Google Maps)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isIOS) {
            // Apple Maps
            window.open(`maps://maps.apple.com/?daddr=${destStr}&dirflg=d`, '_blank');
        } else {
            // Google Maps
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`, '_blank');
        }
    }, []);

    // Get active booking
    const activeBooking = bookings.find(b =>
        ['driver_assigned', 'driver_en_route', 'in_progress'].includes(b.status)
    );

    // Get location coordinates
    const getCoords = (name: string) => {
        for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
            if (name?.includes(key)) return coords;
        }
        return BANGKOK_CENTER;
    };

    // Calculate destination based on booking status
    useEffect(() => {
        if (!activeBooking) {
            setDestinationCoords(null);
            setDirections(null);
            setRouteInfo(null);
            return;
        }

        const newDest = activeBooking.status === 'driver_en_route'
            ? (activeBooking.pickupCoordinates || getCoords(activeBooking.pickupLocation))
            : (activeBooking.dropoffCoordinates || getCoords(activeBooking.dropoffLocation));

        // Only update if destination changed (status change)
        if (!destinationCoords ||
            destinationCoords.lat !== newDest.lat ||
            destinationCoords.lng !== newDest.lng) {
            setDestinationCoords(newDest);
        }
    }, [activeBooking?.status, activeBooking?.pickupCoordinates, activeBooking?.dropoffCoordinates]);

    // Calculate directions with debounce (only when destination changes or every 30 seconds)
    useEffect(() => {
        if (!isLoaded || !destinationCoords || !driverLocation) {
            return;
        }

        const now = Date.now();
        const timeSinceLastCalc = now - lastRouteCalcRef.current;

        // Calculate immediately if destination just changed, or debounce to every 30 seconds
        const shouldCalcNow = timeSinceLastCalc > 30000;

        const calculateRoute = () => {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route({
                origin: driverLocation,
                destination: destinationCoords,
                travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === 'OK' && result) {
                    setDirections(result);
                    const leg = result.routes[0]?.legs[0];
                    if (leg) {
                        setRouteInfo({
                            duration: leg.duration?.text || '',
                            distance: leg.distance?.text || '',
                        });
                    }
                    lastRouteCalcRef.current = Date.now();
                }
            });
        };

        if (shouldCalcNow) {
            calculateRoute();
        } else {
            // Debounce: wait until 30 seconds have passed
            if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
            routeDebounceRef.current = setTimeout(calculateRoute, 30000 - timeSinceLastCalc);
        }

        return () => {
            if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
        };
    }, [isLoaded, destinationCoords]);

    // Recalculate route immediately when destination changes
    useEffect(() => {
        if (!isLoaded || !destinationCoords || !driverLocation) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
            origin: driverLocation,
            destination: destinationCoords,
            travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
            if (status === 'OK' && result) {
                setDirections(result);
                const leg = result.routes[0]?.legs[0];
                if (leg) {
                    setRouteInfo({
                        duration: leg.duration?.text || '',
                        distance: leg.distance?.text || '',
                    });
                }
                lastRouteCalcRef.current = Date.now();
            }
        });
    }, [isLoaded, destinationCoords]);

    // Follow mode - pan map to driver location
    useEffect(() => {
        if (followMode && mapRef.current && driverLocation) {
            mapRef.current.panTo(driverLocation);
        }
    }, [followMode, driverLocation]);

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#00b250] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const isOnline = driverStatus === DriverStatus.AVAILABLE;
    const isNavigating = activeBooking && ['driver_en_route', 'in_progress'].includes(activeBooking.status);

    return (
        <div className="h-full bg-[#f5f8f7] dark:bg-[#0f2318] flex flex-col overflow-hidden">
            {/* Audio Unlock Modal */}
            {!audioUnlocked && driver && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-[#00b250]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-[#00b250] text-4xl">volume_up</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">เปิดเสียงแจ้งเตือน</h3>
                        <p className="text-gray-500 text-sm mb-6">กดปุ่มด้านล่างเพื่อเปิดเสียงแจ้งเตือนเมื่อมีงานใหม่</p>
                        <button
                            onClick={unlockAudio}
                            className="w-full h-14 bg-[#00b250] text-white rounded-2xl font-bold text-lg"
                        >
                            เปิดเสียง
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 bg-white dark:bg-[#1a2e22] shadow-sm z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div
                            className="bg-center bg-no-repeat bg-cover rounded-full w-12 h-12 border-2 border-gray-100"
                            style={{ backgroundImage: `url("${driver?.photo || '/icons/icon-192x192.png'}")` }}
                        />
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-[#00b250]' : 'bg-gray-400'}`} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">{driver?.name || 'Driver'}</h2>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[#FFB300] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <p className="text-sm font-medium text-gray-600">{driver?.rating?.toFixed(1) || '5.0'}</p>
                        </div>
                    </div>
                </div>
                {/* Online Toggle */}
                <button
                    onClick={toggleStatus}
                    disabled={statusLoading || !!activeBooking}
                    className={`relative h-9 w-16 rounded-full transition-colors ${isOnline ? 'bg-[#00b250]/20' : 'bg-gray-200'}`}
                >
                    <div className={`absolute top-1 h-7 w-7 rounded-full transition-all flex items-center justify-center shadow-sm ${isOnline ? 'left-8 bg-[#00b250]' : 'left-1 bg-white'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${isOnline ? 'text-white' : 'text-gray-400'}`}>power_settings_new</span>
                    </div>
                </button>
            </header>

            {/* Stats Cards */}
            {!isNavigating && (
                <div className="w-full bg-[#f5f8f7] dark:bg-[#0f2318] py-4 z-20 shrink-0">
                    <div className="flex overflow-x-auto px-5 gap-3 no-scrollbar pb-1">
                        {/* Today's Trips */}
                        <div className="flex min-w-[140px] flex-col gap-3 rounded-2xl bg-white dark:bg-[#1a2e22] p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="bg-[#00b250]/10 p-2 rounded-full text-[#00b250]">
                                    <span className="material-symbols-outlined text-[20px]">directions_car</span>
                                </div>
                                <span className="text-xs font-medium text-gray-400">Today</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats.trips}</p>
                                <p className="text-xs text-gray-500">Trips completed</p>
                            </div>
                        </div>
                        {/* Today's Earnings */}
                        <div className="flex min-w-[140px] flex-col gap-3 rounded-2xl bg-white dark:bg-[#1a2e22] p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="bg-[#FFB300]/10 p-2 rounded-full text-[#FFB300]">
                                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                                </div>
                                <span className="text-xs font-medium text-gray-400">Today</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">฿{todayStats.earnings.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Total earnings</p>
                            </div>
                        </div>
                        {/* Weekly */}
                        <div className="flex min-w-[140px] flex-col gap-3 rounded-2xl bg-white dark:bg-[#1a2e22] p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="bg-blue-500/10 p-2 rounded-full text-blue-500">
                                    <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                                </div>
                                <span className="text-xs font-medium text-gray-400">Total</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">฿{(driver?.totalEarnings || 0).toLocaleString()}</p>
                                <p className="text-xs text-gray-500">All time</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Header (when active) */}
            {isNavigating && routeInfo && (
                <div className="px-4 py-3 z-20">
                    {/* LIVE GPS Badge + External Navigation Button */}
                    <div className="flex justify-between items-center mb-2">
                        <button
                            onClick={() => {
                                const dest = activeBooking?.status === 'driver_en_route'
                                    ? (activeBooking.pickupCoordinates || activeBooking.pickupLocation)
                                    : (activeBooking?.dropoffCoordinates || activeBooking?.dropoffLocation);
                                if (dest) openNavigation(dest);
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                            <span className="text-sm font-bold">เปิดแผนที่</span>
                        </button>
                        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-white/50">
                            <div className="w-2.5 h-2.5 bg-[#00b250] rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-gray-700">LIVE GPS</span>
                        </div>
                    </div>
                    {/* Navigation Card */}
                    <div className="bg-green-700 text-white rounded-2xl p-1 flex items-stretch min-h-[90px] overflow-hidden">
                        <div className="bg-green-800 w-20 flex flex-col items-center justify-center rounded-xl shrink-0">
                            <span className="material-symbols-outlined text-4xl mb-1">navigation</span>
                            <span className="text-xs font-medium text-green-200">{routeInfo.distance}</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center px-4 py-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium bg-green-600 px-2 py-0.5 rounded text-green-100">
                                    {activeBooking?.status === 'driver_en_route' ? 'ไปรับผู้โดยสาร' : 'กำลังเดินทาง'}
                                </span>
                            </div>
                            <h2 className="text-lg font-bold leading-tight mb-1">
                                {activeBooking?.status === 'driver_en_route' ? activeBooking.pickupLocation : activeBooking?.dropoffLocation}
                            </h2>
                            <p className="text-sm text-green-100 opacity-90">{routeInfo.duration}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Area */}
            <div className="relative flex-1 w-full bg-gray-100 overflow-hidden min-h-[300px]">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={followMode ? driverLocation : undefined}
                        zoom={isNavigating ? 16 : 15}
                        options={{
                            disableDefaultUI: true,
                            zoomControl: false,
                            styles: lightMapStyles,
                            gestureHandling: 'greedy',
                            tilt: isNavigating ? 45 : 0,
                        }}
                        onLoad={(map) => { mapRef.current = map; }}
                        onDragStart={() => setFollowMode(false)}
                    >
                        {/* Route Line - Color based on status */}
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: {
                                        strokeColor: activeBooking?.status === 'driver_en_route' ? '#3b82f6' : '#00b250',
                                        strokeWeight: 5,
                                        strokeOpacity: 0.7,
                                    }
                                }}
                            />
                        )}

                        {/* Destination Marker - Grab Style Pin */}
                        {destinationCoords && activeBooking && (
                            <OverlayView position={destinationCoords} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                <div className="relative" style={{ transform: 'translate(-50%, -100%)' }}>
                                    {/* Smooth pulse rings */}
                                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
                                        <div className={`w-12 h-12 rounded-full destination-pulse-1 ${
                                            activeBooking.status === 'driver_en_route' ? 'bg-[#00b250]' : 'bg-red-500'
                                        }`} style={{ transform: 'translate(-50%, 50%)' }} />
                                        <div className={`w-12 h-12 rounded-full destination-pulse-2 ${
                                            activeBooking.status === 'driver_en_route' ? 'bg-[#00b250]' : 'bg-red-500'
                                        }`} style={{ transform: 'translate(-50%, 50%)', position: 'absolute', left: '50%', bottom: 0 }} />
                                    </div>
                                    {/* Pin SVG - Teardrop shape */}
                                    <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}>
                                        {/* Pin body - teardrop */}
                                        <path
                                            d="M22 0C10 0 0 10 0 22C0 34 22 56 22 56C22 56 44 34 44 22C44 10 34 0 22 0Z"
                                            fill={activeBooking.status === 'driver_en_route' ? '#00b250' : '#ef4444'}
                                        />
                                        {/* Inner white circle */}
                                        <circle cx="22" cy="20" r="12" fill="white" />
                                        {/* Icon */}
                                        {activeBooking.status === 'driver_en_route' ? (
                                            // Person icon for pickup
                                            <g fill={activeBooking.status === 'driver_en_route' ? '#00b250' : '#ef4444'}>
                                                <circle cx="22" cy="16" r="4" />
                                                <path d="M15 26C15 22.134 18.134 20 22 20C25.866 20 29 22.134 29 26" strokeWidth="0" />
                                            </g>
                                        ) : (
                                            // Flag icon for dropoff
                                            <path d="M17 12V28M17 12L27 17L17 22" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                        )}
                                    </svg>
                                </div>
                            </OverlayView>
                        )}

                        {/* Driver Marker (Car) */}
                        <OverlayView position={driverLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                            <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                                {/* Smooth pulse animation - show when navigating */}
                                {isNavigating && (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-[#00b250] car-pulse-1" />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-[#00b250] car-pulse-2" />
                                        </div>
                                    </>
                                )}
                                {/* GPS accuracy circle - show when online but not navigating */}
                                {isOnline && !isNavigating && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-[#00b250]/15 border border-[#00b250]/30" />
                                    </div>
                                )}
                                {/* Car marker - Black Sedan Top View */}
                                <div
                                    className="relative z-10"
                                    style={{ transform: `rotate(${heading || 0}deg)` }}
                                >
                                    <svg width="32" height="56" viewBox="0 0 32 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
                                        {/* Car body */}
                                        <rect x="4" y="8" width="24" height="44" rx="6" fill="#1a1a1a" />
                                        {/* Hood */}
                                        <path d="M6 14 Q6 8 16 6 Q26 8 26 14 L26 18 L6 18 Z" fill="#2a2a2a" />
                                        {/* Trunk */}
                                        <path d="M6 46 L6 42 L26 42 L26 46 Q26 50 16 52 Q6 50 6 46Z" fill="#2a2a2a" />
                                        {/* Windshield */}
                                        <path d="M8 18 L8 24 L24 24 L24 18 Q24 16 16 14 Q8 16 8 18Z" fill="#87CEEB" opacity="0.8" />
                                        {/* Rear window */}
                                        <rect x="8" y="36" width="16" height="6" rx="2" fill="#87CEEB" opacity="0.7" />
                                        {/* Roof */}
                                        <rect x="8" y="24" width="16" height="12" rx="2" fill="#0a0a0a" />
                                        {/* Roof shine */}
                                        <rect x="10" y="26" width="12" height="3" rx="1" fill="#3a3a3a" />
                                        {/* Headlights */}
                                        <circle cx="9" cy="10" r="2" fill="#FFE082" />
                                        <circle cx="23" cy="10" r="2" fill="#FFE082" />
                                        {/* Taillights */}
                                        <rect x="7" y="48" width="4" height="2" rx="1" fill="#FF5252" />
                                        <rect x="21" y="48" width="4" height="2" rx="1" fill="#FF5252" />
                                        {/* Side mirrors */}
                                        <ellipse cx="2" cy="20" rx="2" ry="3" fill="#1a1a1a" />
                                        <ellipse cx="30" cy="20" rx="2" ry="3" fill="#1a1a1a" />
                                    </svg>
                                </div>
                            </div>
                        </OverlayView>
                    </GoogleMap>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[#00b250] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Map Controls */}
                <div className="absolute right-4 bottom-6 flex flex-col gap-3">
                    {/* Follow Mode Toggle */}
                    <button
                        onClick={() => setFollowMode(!followMode)}
                        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
                            followMode
                                ? 'bg-[#00b250] text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <span className="material-symbols-outlined">{followMode ? 'gps_fixed' : 'gps_not_fixed'}</span>
                    </button>
                    {/* Center on Route */}
                    {directions && (
                        <button
                            onClick={() => {
                                if (mapRef.current && directions) {
                                    const bounds = new google.maps.LatLngBounds();
                                    directions.routes[0]?.legs[0]?.steps.forEach(step => {
                                        bounds.extend(step.start_location);
                                        bounds.extend(step.end_location);
                                    });
                                    mapRef.current.fitBounds(bounds, { top: 100, bottom: 200, left: 50, right: 50 });
                                    setFollowMode(false);
                                }
                            }}
                            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined">route</span>
                        </button>
                    )}
                    {/* My Location */}
                    <button
                        onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.panTo(driverLocation);
                                mapRef.current.setZoom(17);
                                setFollowMode(true);
                            }
                        }}
                        className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">my_location</span>
                    </button>
                </div>

                {/* Follow Mode Indicator */}
                {followMode && isNavigating && (
                    <div className="absolute top-4 left-4 bg-[#00b250] text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                        <span className="material-symbols-outlined text-[16px]">gps_fixed</span>
                        ติดตามรถ
                    </div>
                )}
            </div>

            {/* Bottom Action Sheet */}
            <div className="bg-white dark:bg-[#1a2e22] rounded-t-[2rem] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30 shrink-0 -mt-6 relative">
                <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="h-1 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <div className="px-6 py-4 flex flex-col gap-4">
                    {/* Active Booking Info */}
                    {activeBooking ? (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#00b250]" />
                                <span className="text-sm font-semibold text-[#00b250] uppercase tracking-wide">
                                    {activeBooking.status === 'driver_assigned' ? 'งานใหม่' :
                                     activeBooking.status === 'driver_en_route' ? 'กำลังไปรับ' : 'กำลังเดินทาง'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Customer Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl font-bold text-gray-500 shrink-0 border-2 border-white shadow-md">
                                    {activeBooking.firstName?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-gray-900 truncate">{activeBooking.firstName} {activeBooking.lastName}</h3>
                                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                        {activeBooking.status === 'in_progress'
                                            ? activeBooking.dropoffLocation
                                            : activeBooking.pickupLocation}
                                    </p>
                                </div>
                                {/* Navigation Button */}
                                <button
                                    onClick={() => {
                                        const dest = activeBooking.status === 'driver_en_route'
                                            ? (activeBooking.pickupCoordinates || activeBooking.pickupLocation)
                                            : (activeBooking.dropoffCoordinates || activeBooking.dropoffLocation);
                                        if (dest) openNavigation(dest);
                                    }}
                                    className="w-11 h-11 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>near_me</span>
                                </button>
                                {/* Call Button */}
                                <a href={`tel:${activeBooking.phone}`} className="w-11 h-11 rounded-full bg-green-50 text-[#00b250] flex items-center justify-center">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
                                </a>
                            </div>
                            {/* No-Show Timer (when arrived at pickup) */}
                            {activeBooking.status === 'driver_en_route' && driverArrivedAt && noShowCountdown !== null && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-yellow-600">timer</span>
                                            <div>
                                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">รอลูกค้า</p>
                                                <p className="text-xs text-yellow-600">ถึงจุดรับแล้ว</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-yellow-600">{formatCountdown(noShowCountdown)}</p>
                                            <p className="text-xs text-yellow-600">{noShowCountdown === 0 ? 'หมดเวลารอ' : 'เหลือ'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Arrived at Pickup Button (only when driver_en_route and not yet arrived) */}
                            {activeBooking.status === 'driver_en_route' && !driverArrivedAt && (
                                <button
                                    onClick={() => setShowArrivedConfirmModal(true)}
                                    className="w-full h-12 mb-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-bold shadow-lg shadow-yellow-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">pin_drop</span>
                                    <span>แจ้งว่าถึงจุดรับแล้ว</span>
                                </button>
                            )}

                            {/* Customer No-Show Button (only when arrived and timer done) */}
                            {activeBooking.status === 'driver_en_route' && driverArrivedAt && noShowCountdown === 0 && (
                                <button
                                    onClick={() => setShowNoShowConfirmModal(true)}
                                    className="w-full h-12 mb-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-lg shadow-red-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">person_off</span>
                                    <span>ลูกค้าไม่มา (No-Show)</span>
                                </button>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={() => {
                                    const nextStatus = activeBooking.status === 'driver_assigned' ? 'driver_en_route' :
                                                      activeBooking.status === 'driver_en_route' ? 'in_progress' : 'completed';
                                    updateBookingStatus(activeBooking.id, nextStatus);
                                }}
                                className="w-full h-14 bg-[#00b250] hover:bg-green-600 text-white rounded-full font-bold text-lg shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">arrow_forward</span>
                                <span>
                                    {activeBooking.status === 'driver_assigned' ? 'รับงาน' :
                                     activeBooking.status === 'driver_en_route' ? 'เริ่มเดินทาง' : 'ถึงปลายทาง'}
                                </span>
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#00b250]' : 'bg-gray-400'}`} />
                                <p className="text-gray-500 font-medium text-sm">
                                    {isOnline ? 'กำลังหางานให้คุณ...' : 'คุณออฟไลน์อยู่'}
                                </p>
                            </div>
                            <button
                                onClick={toggleStatus}
                                disabled={statusLoading}
                                className={`relative w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center ${
                                    isOnline
                                        ? 'bg-red-500 text-white shadow-red-500/30 hover:bg-red-600'
                                        : 'bg-[#00b250] text-white shadow-green-500/30 hover:bg-green-600'
                                }`}
                            >
                                {statusLoading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    isOnline ? 'GO OFFLINE' : 'GO ONLINE'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* New Job Modal */}
            {showJobModal && newJob && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#12231a] rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] pb-safe">
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="px-5 pt-2 pb-8 flex flex-col gap-5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-[#FFB300] text-[28px] animate-bounce">notifications_active</span>
                                        <h2 className="text-[26px] font-bold">งานใหม่!</h2>
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">{newJob.vehicleName} · Cash</p>
                                </div>
                                {/* Countdown */}
                                <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                                        <path className="text-[#00b250] transition-all duration-1000" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${(countdown / 15) * 100}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className="text-lg font-bold text-[#00b250] leading-none">{countdown}</span>
                                        <span className="text-[10px] font-medium text-gray-400 leading-none mt-0.5">sec</span>
                                    </div>
                                </div>
                            </div>
                            {/* Job Details */}
                            <div className="bg-[#f5f8f7] dark:bg-[#1a2e24] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                <div className="flex flex-col relative pb-4">
                                    <div className="absolute left-[15px] top-[30px] bottom-[10px] w-[2px] border-l-2 border-dashed border-gray-300 dark:border-gray-600 z-0" />
                                    {/* Pickup */}
                                    <div className="flex items-start gap-3 relative z-10 mb-5">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[#00b250] border-2 border-white shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">my_location</span>
                                        </div>
                                        <div className="flex flex-col pt-0.5">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase">Pick Up</span>
                                            <span className="font-semibold text-[15px] mt-0.5">{newJob.pickupLocation}</span>
                                        </div>
                                    </div>
                                    {/* Dropoff */}
                                    <div className="flex items-start gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 border-2 border-white shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                                        </div>
                                        <div className="flex flex-col pt-0.5">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase">Drop Off</span>
                                            <span className="font-semibold text-[15px] mt-0.5">{newJob.dropoffLocation}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-gray-200 my-1" />
                                <div className="flex items-center justify-between pt-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                                            {newJob.firstName?.[0] || '👤'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{newJob.firstName} {newJob.lastName}</p>
                                            <p className="text-gray-500 text-xs">Customer</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-[#00b250] text-xl font-bold">฿{newJob.totalCost}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <button onClick={handleRejectJob} className="flex items-center justify-center gap-2 h-14 rounded-full border border-gray-300 bg-transparent active:bg-red-50 transition-colors">
                                    <span className="material-symbols-outlined text-gray-500">close</span>
                                    <span className="text-gray-600 font-bold">ปฏิเสธ</span>
                                </button>
                                <button onClick={handleAcceptJob} className="relative flex items-center justify-center gap-2 h-14 rounded-full bg-[#00b250] text-white shadow-lg shadow-green-500/30 overflow-hidden">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span className="font-bold">รับงาน</span>
                                    <span className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && completedBooking && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center">
                    <div className="w-full max-w-md bg-white dark:bg-[#182e22] rounded-t-3xl p-6 pb-8">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white mx-auto mb-3">
                                <span className="material-symbols-outlined text-[#00b250] text-[48px]">check_circle</span>
                            </div>
                            <h1 className="text-2xl font-bold">เสร็จสิ้น!</h1>
                            <p className="text-gray-500 text-sm mt-1">ขอบคุณสำหรับการขับขี่ที่ยอดเยี่ยม</p>
                        </div>
                        {/* Earnings */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                            <div>
                                <span className="text-gray-500 text-sm">รายได้สุทธิ</span>
                                <p className="text-[#00b250] text-3xl font-bold">฿{completedBooking.totalCost.toFixed(2)}</p>
                            </div>
                        </div>
                        {/* Rating */}
                        <div className="bg-[#f5f8f7] rounded-2xl p-5 flex flex-col items-center gap-4 mb-4">
                            <p className="font-semibold">ให้คะแนนผู้โดยสาร</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setRating(star)} className="focus:outline-none active:scale-90 transition-transform">
                                        <span className={`material-symbols-outlined text-4xl ${rating >= star ? 'text-[#FFB300]' : 'text-gray-300'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && rating <= 3 && (
                                <div className="w-full pt-2">
                                    <p className="text-xs text-gray-500 mb-3 text-center">เกิดปัญหาอะไรขึ้น?</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {['ไม่มาตามนัด', 'ทำรถสกปรก', 'หยาบคาย', 'อื่นๆ'].map((reason) => (
                                            <button
                                                key={reason}
                                                onClick={() => setRatingReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason])}
                                                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${ratingReasons.includes(reason) ? 'border-[#FFB300] bg-[#FFB300]/10 text-[#FFB300]' : 'border-gray-200 bg-white text-gray-600'}`}
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <textarea
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:ring-1 focus:ring-[#00b250] focus:border-[#00b250] resize-none h-20 mt-2"
                                placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                            />
                        </div>
                        {/* Buttons */}
                        <button onClick={submitRating} className="w-full bg-[#00b250] text-white font-bold text-lg py-4 rounded-full shadow-lg shadow-green-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <span>ส่งคะแนน</span>
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                        <button onClick={() => { setShowRatingModal(false); setCompletedBooking(null); }} className="w-full py-3 text-gray-500 font-medium mt-2">
                            ข้าม
                        </button>
                    </div>
                </div>
            )}

            {/* Arrived at Pickup Confirm Modal */}
            {showArrivedConfirmModal && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setShowArrivedConfirmModal(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#12231a] rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] pb-safe">
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="px-5 pt-2 pb-8 flex flex-col gap-5">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-yellow-600 text-3xl">pin_drop</span>
                                </div>
                                <h2 className="text-xl font-bold mb-2">ยืนยันถึงจุดรับ?</h2>
                                <p className="text-gray-500 text-sm">
                                    กดยืนยันเพื่อเริ่มจับเวลารอลูกค้า<br />
                                    ระบบจะจับเวลา 5 นาที หากลูกค้าไม่มา
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowArrivedConfirmModal(false)}
                                    className="flex-1 h-14 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={markArrivedAtPickup}
                                    disabled={isMarkingArrived}
                                    className="flex-1 h-14 rounded-full bg-yellow-500 text-white font-bold text-lg shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
                                >
                                    {isMarkingArrived ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">check</span>
                                            <span>ยืนยัน</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No-Show Confirm Modal */}
            {showNoShowConfirmModal && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setShowNoShowConfirmModal(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#12231a] rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] pb-safe">
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="px-5 pt-2 pb-8 flex flex-col gap-5">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-red-600 text-3xl">person_off</span>
                                </div>
                                <h2 className="text-xl font-bold mb-2">ยืนยัน No-Show?</h2>
                                <p className="text-gray-500 text-sm">
                                    คุณแน่ใจหรือไม่ว่าลูกค้าไม่มารับบริการ?<br />
                                    การดำเนินการนี้ไม่สามารถยกเลิกได้
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">ค่าธรรมเนียม No-Show</span>
                                    <span className="text-lg font-bold text-[#00b250]">฿50</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">คุณจะได้รับค่าธรรมเนียมนี้ 100%</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNoShowConfirmModal(false)}
                                    className="flex-1 h-14 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={reportNoShow}
                                    disabled={isReportingNoShow}
                                    className="flex-1 h-14 rounded-full bg-red-500 text-white font-bold text-lg shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                                >
                                    {isReportingNoShow ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">check</span>
                                            <span>ยืนยัน</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No-Show Result Modal */}
            {showNoShowResultModal && noShowResult && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#12231a] rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] pb-safe">
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="px-5 pt-2 pb-8 flex flex-col gap-5">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                                </div>
                                <h2 className="text-xl font-bold mb-2">บันทึก No-Show สำเร็จ</h2>
                                <p className="text-gray-500 text-sm">
                                    ลูกค้าไม่มารับบริการ - การจองถูกยกเลิก
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">ค่าธรรมเนียม No-Show</span>
                                    <span className="text-lg font-bold text-[#00b250]">฿{noShowResult.noShowFee}</span>
                                </div>
                                <div className="border-t border-green-200 pt-3 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-800">รายได้ของคุณ</span>
                                    <span className="text-xl font-bold text-[#00b250]">฿{noShowResult.driverEarnings}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowNoShowResultModal(false);
                                    setNoShowResult(null);
                                }}
                                className="w-full h-14 rounded-full bg-[#00b250] text-white font-bold text-lg shadow-lg shadow-green-500/30"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scrollbar hide style + Map animations */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                /* Smooth pulse animation for car marker */
                @keyframes carPulse {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }
                .car-pulse-1 {
                    animation: carPulse 2s ease-out infinite;
                }
                .car-pulse-2 {
                    animation: carPulse 2s ease-out infinite 1s;
                }

                /* Smooth pulse animation for destination marker */
                @keyframes destinationPulse {
                    0% { transform: translate(-50%, 50%) scale(0.5); opacity: 0.6; }
                    100% { transform: translate(-50%, 50%) scale(2.5); opacity: 0; }
                }
                .destination-pulse-1 {
                    animation: destinationPulse 2s ease-out infinite;
                }
                .destination-pulse-2 {
                    animation: destinationPulse 2s ease-out infinite 1s;
                }
            `}</style>
        </div>
    );
}
