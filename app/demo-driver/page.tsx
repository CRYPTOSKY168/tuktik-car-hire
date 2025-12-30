'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import { FirestoreService } from '@/lib/firebase/firestore';
import { DriverStatus } from '@/lib/types';
import { useDriverLocationUpdates } from '@/lib/hooks/useGeolocation';
import { useRouter } from 'next/navigation';
import {
    GoogleMap,
    useLoadScript,
    Marker,
    DirectionsRenderer,
    OverlayView,
    Libraries,
} from '@react-google-maps/api';

// Libraries
const libraries: Libraries = ['places', 'geometry'];

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

// Bangkok Center Default
const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 };

// Location coordinates mapping
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'สนามบินสุวรรณภูมิ': { lat: 13.6900, lng: 100.7501 },
    'สนามบินดอนเมือง': { lat: 13.9126, lng: 100.6067 },
    'สยามพารากอน': { lat: 13.7466, lng: 100.5347 },
    'เซ็นทรัลเวิลด์': { lat: 13.7465, lng: 100.5392 },
    'พัทยา': { lat: 12.9236, lng: 100.8825 },
    'หัวหิน': { lat: 12.5684, lng: 99.9577 },
    'กรุงเทพ': { lat: 13.7563, lng: 100.5018 },
};

// Light Map Styles (Grab style - clean and minimal)
const lightMapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e4f6' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
    { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
];

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    styles: lightMapStyles,
    gestureHandling: 'greedy',
    heading: 0,
    tilt: 0,
};

// Pickup Marker SVG
const PICKUP_MARKER_SVG = `
<svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pickupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#34d399"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>
  </defs>
  <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 36 24 36s24-18 24-36C48 10.745 37.255 0 24 0z" fill="url(#pickupGrad)"/>
  <circle cx="24" cy="22" r="10" fill="white"/>
  <circle cx="24" cy="22" r="5" fill="#059669"/>
</svg>`;

// Dropoff Marker SVG
const DROPOFF_MARKER_SVG = `
<svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dropoffGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f87171"/>
      <stop offset="100%" style="stop-color:#dc2626"/>
    </linearGradient>
  </defs>
  <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 36 24 36s24-18 24-36C48 10.745 37.255 0 24 0z" fill="url(#dropoffGrad)"/>
  <circle cx="24" cy="22" r="10" fill="white"/>
  <rect x="19" y="17" width="10" height="10" rx="2" fill="#dc2626"/>
</svg>`;

const createMarkerIcon = (svg: string, size: number = 40) => {
    const encoded = encodeURIComponent(svg);
    return {
        url: `data:image/svg+xml,${encoded}`,
        scaledSize: new google.maps.Size(size, size * 1.25),
        anchor: new google.maps.Point(size / 2, size * 1.25),
    };
};

// Calculate bearing between two points
function calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Driver Car Marker with Heading (Light Theme)
function DriverMarker({ position, heading = 0, isOnline = false }: {
    position: { lat: number; lng: number };
    heading?: number;
    isOnline?: boolean;
}) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                {/* Pulse effect when online */}
                {isOnline && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-green-500/40 rounded-full animate-ping"></div>
                    </div>
                )}
                {/* Car body with rotation */}
                <div
                    className="relative transition-transform duration-300"
                    style={{ transform: `rotate(${heading}deg)` }}
                >
                    {/* Car SVG - Light/Grab style */}
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                        {/* Shadow */}
                        <ellipse cx="26" cy="44" rx="12" ry="4" fill="rgba(0,0,0,0.15)" />
                        {/* Car body */}
                        <ellipse cx="26" cy="24" rx="14" ry="20" fill={isOnline ? "#00b14f" : "#9ca3af"} />
                        <ellipse cx="26" cy="24" rx="12" ry="18" fill={isOnline ? "#00d15e" : "#d1d5db"} />
                        {/* Front lights */}
                        <rect x="19" y="7" width="4" height="3" rx="1" fill="#fef3c7" />
                        <rect x="29" y="7" width="4" height="3" rx="1" fill="#fef3c7" />
                        {/* Windshield */}
                        <ellipse cx="26" cy="16" rx="7" ry="4" fill="rgba(255,255,255,0.6)" />
                        {/* Direction indicator */}
                        <path d="M26 2 L30 9 H22 Z" fill="white" />
                    </svg>
                </div>
            </div>
        </OverlayView>
    );
}

export default function DemoDriverPage() {
    const router = useRouter();
    const mapRef = useRef<google.maps.Map | null>(null);

    // Auth & Driver States
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [driverStatus, setDriverStatus] = useState<DriverStatus | string>(DriverStatus.OFFLINE);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    // Map States
    const [driverLocation, setDriverLocation] = useState(BANGKOK_CENTER);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    // New job alert states
    const [newJobAlert, setNewJobAlert] = useState<Booking | null>(null);
    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [countdown, setCountdown] = useState(15);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const previousBookingIds = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);
    const newJobAlertRef = useRef<Booking | null>(null); // Store latest newJobAlert for useEffect

    // Load Google Maps
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    // Get location coordinates from name
    const getLocationCoordinates = useCallback((locationName: string) => {
        for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
            if (locationName.includes(key)) {
                return coords;
            }
        }
        return BANGKOK_CENTER;
    }, []);

    // Helper function to get auth token
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

    // Play notification sound
    const playNotificationSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch {}
    }, []);

    // Check for new bookings
    const checkForNewBookings = useCallback((newBookings: Booking[]) => {
        if (isFirstLoad.current) {
            previousBookingIds.current = new Set(newBookings.map(b => b.id));
            isFirstLoad.current = false;
            return;
        }

        const newAssignedBookings = newBookings.filter(
            b => b.status === 'driver_assigned' && !previousBookingIds.current.has(b.id)
        );

        if (newAssignedBookings.length > 0) {
            const newJob = newAssignedBookings[0];
            setNewJobAlert(newJob);
            newJobAlertRef.current = newJob; // Keep ref in sync
            setShowNewJobModal(true);
            setCountdown(15);
            playNotificationSound();
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
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
                        const driverInfo: DriverData = {
                            id: driverDoc.id,
                            name: driverData.name,
                            phone: driverData.phone,
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            vehicleColor: driverData.vehicleColor,
                            status: driverData.status || DriverStatus.OFFLINE,
                            photo: driverData.photo,
                            rating: driverData.rating,
                            ratingCount: driverData.ratingCount,
                            totalTrips: driverData.totalTrips,
                            totalEarnings: driverData.totalEarnings,
                        };
                        setDriver(driverInfo);
                        setDriverStatus(driverInfo.status);
                        foundDriverId = driverInfo.id;
                    }
                }

                // Fallback: Check by userId
                if (!foundDriverId) {
                    const driversQuery = query(
                        collection(db!, 'drivers'),
                        where('userId', '==', authUser.uid)
                    );
                    const driversSnap = await getDocs(driversQuery);

                    if (!driversSnap.empty) {
                        const driverDoc = driversSnap.docs[0];
                        const driverData = driverDoc.data();
                        const driverInfo: DriverData = {
                            id: driverDoc.id,
                            name: driverData.name,
                            phone: driverData.phone,
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            vehicleColor: driverData.vehicleColor,
                            status: driverData.status || DriverStatus.OFFLINE,
                            photo: driverData.photo,
                            rating: driverData.rating,
                            ratingCount: driverData.ratingCount,
                            totalTrips: driverData.totalTrips,
                            totalEarnings: driverData.totalEarnings,
                        };
                        setDriver(driverInfo);
                        setDriverStatus(driverInfo.status);
                        foundDriverId = driverInfo.id;
                    }
                }

                // Subscribe to bookings and driver document (real-time)
                if (foundDriverId) {
                    // Subscribe to bookings
                    unsubscribeBookings = FirestoreService.subscribeToDriverBookings(foundDriverId, (driverBookings) => {
                        setBookings(driverBookings);
                        checkForNewBookings(driverBookings);
                    });

                    // Subscribe to driver document for real-time rating/stats updates
                    const driverDocRef = doc(db!, 'drivers', foundDriverId);
                    unsubscribeDriver = onSnapshot(driverDocRef, (snapshot) => {
                        if (snapshot.exists()) {
                            const driverData = snapshot.data();
                            setDriver(prev => prev ? {
                                ...prev,
                                status: driverData.status || DriverStatus.OFFLINE,
                                rating: driverData.rating,
                                ratingCount: driverData.ratingCount,
                                totalTrips: driverData.totalTrips,
                                totalEarnings: driverData.totalEarnings,
                            } : null);
                            setDriverStatus(driverData.status || DriverStatus.OFFLINE);
                        }
                    });
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading driver:', err);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeBookings) unsubscribeBookings();
            if (unsubscribeDriver) unsubscribeDriver();
        };
    }, [router, checkForNewBookings]);

    // Store handleRejectJob in ref to avoid stale closure
    const handleRejectJobRef = useRef<((bookingId: string) => Promise<void>) | null>(null);

    // Countdown timer effect
    useEffect(() => {
        if (showNewJobModal && countdown > 0) {
            countdownRef.current = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0 && showNewJobModal) {
            // Auto reject when countdown reaches 0 - use refs to get latest values
            const currentJob = newJobAlertRef.current;
            if (currentJob && handleRejectJobRef.current) {
                handleRejectJobRef.current(currentJob.id);
            }
        }

        return () => {
            if (countdownRef.current) {
                clearTimeout(countdownRef.current);
            }
        };
    }, [showNewJobModal, countdown]);

    // Get current active booking
    const activeBooking = useMemo(() => {
        return bookings.find(b =>
            ['driver_assigned', 'driver_en_route', 'in_progress'].includes(b.status)
        );
    }, [bookings]);

    // Get directions when there's active booking
    useEffect(() => {
        if (!isLoaded || !activeBooking) {
            setDirections(null);
            return;
        }

        const directionsService = new google.maps.DirectionsService();

        let origin: { lat: number; lng: number };
        let destination: { lat: number; lng: number };

        const pickupCoords = activeBooking.pickupCoordinates || getLocationCoordinates(activeBooking.pickupLocation);
        const dropoffCoords = activeBooking.dropoffCoordinates || getLocationCoordinates(activeBooking.dropoffLocation);

        if (activeBooking.status === 'driver_assigned' || activeBooking.status === 'driver_en_route') {
            origin = driverLocation;
            destination = pickupCoords;
        } else {
            origin = pickupCoords;
            destination = dropoffCoords;
        }

        directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
        }).then((result) => {
            setDirections(result);
        }).catch(console.error);
    }, [isLoaded, activeBooking, driverLocation, getLocationCoordinates]);

    // Has active job for GPS tracking
    const hasActiveJob = useMemo(() => {
        return bookings.some(b => ['driver_en_route', 'in_progress'].includes(b.status));
    }, [bookings]);

    // Recently completed booking (within last 5 minutes)
    const [recentlyCompleted, setRecentlyCompleted] = useState<Booking | null>(null);
    const [showCompletedModal, setShowCompletedModal] = useState(false);

    // Rating Modal states
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingReasons, setRatingReasons] = useState<string[]>([]);
    const [ratingComment, setRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    // Low rating reasons for driver rating customer
    const lowRatingReasons = [
        { code: 'no_show', label: 'ไม่มาตามนัด' },
        { code: 'late', label: 'มาสาย' },
        { code: 'rude', label: 'ไม่สุภาพ' },
        { code: 'messy', label: 'ทำรถสกปรก' },
        { code: 'other', label: 'อื่นๆ' },
    ];

    // GPS Location Tracking
    const locationTracking = useDriverLocationUpdates(
        driver?.id || null,
        hasActiveJob,
        getAuthHeaders
    );

    // Update driver location from GPS
    useEffect(() => {
        if (locationTracking.latitude && locationTracking.longitude) {
            setDriverLocation({
                lat: locationTracking.latitude,
                lng: locationTracking.longitude
            });
        }
    }, [locationTracking.latitude, locationTracking.longitude]);

    // Handle status change
    const handleStatusChange = async (newStatus: DriverStatus) => {
        if (!driver) return;

        setStatusLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');

            const response = await fetch('/api/driver/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ driverId: driver.id, status: newStatus })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setDriverStatus(newStatus);
            setDriver({ ...driver, status: newStatus });
        } catch (error: any) {
            alert(`ไม่สามารถเปลี่ยนสถานะได้: ${error.message}`);
        } finally {
            setStatusLoading(false);
        }
    };

    // Handle booking action (accept, start, pickup, complete)
    const handleBookingAction = async (bookingId: string, newStatus: 'driver_en_route' | 'in_progress' | 'completed') => {
        if (!driver) return;

        const currentBooking = bookings.find(b => b.id === bookingId);
        if (currentBooking?.status === newStatus) return;

        setUpdatingStatus(bookingId);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');

            const response = await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'updateStatus',
                    bookingId,
                    driverId: driver.id,
                    data: { status: newStatus }
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Optimistic update
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: newStatus } : b
            ));

            // Close modal if accepting job
            if (showNewJobModal) {
                setShowNewJobModal(false);
                setNewJobAlert(null);
            }

            // Show completed modal when job is done
            if (newStatus === 'completed') {
                const completedBooking = bookings.find(b => b.id === bookingId);
                if (completedBooking) {
                    setRecentlyCompleted({ ...completedBooking, status: 'completed' });
                    setShowCompletedModal(true);
                }
            }
        } catch (error: any) {
            alert(error.message || 'ไม่สามารถอัปเดตสถานะได้');
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Handle reject job
    const handleRejectJob = async (bookingId: string) => {
        if (!driver) {
            // Close modal even if no driver (edge case)
            setShowNewJobModal(false);
            setNewJobAlert(null);
            newJobAlertRef.current = null;
            return;
        }

        setUpdatingStatus(bookingId);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');

            const response = await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'rejectJob',
                    bookingId,
                    driverId: driver.id
                })
            });

            const result = await response.json();
            if (!result.success) {
                // Log error but still close modal (job may have been cancelled/reassigned)
                console.warn('Reject job failed:', result.error);
            }
        } catch (error: any) {
            // Log error but don't show alert for auto-reject (countdown timeout)
            console.error('Reject job error:', error.message);
        } finally {
            // Always close modal regardless of API result
            setShowNewJobModal(false);
            setNewJobAlert(null);
            newJobAlertRef.current = null;
            setUpdatingStatus(null);
        }
    };

    // Keep ref in sync with function
    handleRejectJobRef.current = handleRejectJob;

    // Auto-close modal when booking status changes (e.g., from script or admin)
    useEffect(() => {
        if (showNewJobModal && newJobAlert) {
            // Check if the booking still exists and is still driver_assigned
            const currentBooking = bookings.find(b => b.id === newJobAlert.id);
            if (!currentBooking || currentBooking.status !== 'driver_assigned') {
                // Booking was accepted, rejected, or deleted - close modal
                setShowNewJobModal(false);
                setNewJobAlert(null);
                newJobAlertRef.current = null;
            }
        }
    }, [showNewJobModal, newJobAlert, bookings]);

    // Accept job (from modal)
    const handleAcceptJob = async () => {
        if (!newJobAlert) return;
        await handleBookingAction(newJobAlert.id, 'driver_en_route');
    };

    // Submit rating for customer
    const submitRating = async (skip: boolean = false) => {
        if (!recentlyCompleted) return;

        if (skip) {
            // Skip rating - just close modals
            setShowRatingModal(false);
            setRecentlyCompleted(null);
            resetRatingForm();
            return;
        }

        // Validate low rating requires reasons
        if (ratingStars <= 3 && ratingReasons.length === 0) {
            alert('กรุณาเลือกเหตุผลสำหรับคะแนนต่ำ');
            return;
        }

        setIsSubmittingRating(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');

            const response = await fetch('/api/booking/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bookingId: recentlyCompleted.id,
                    ratingType: 'driverToCustomer',
                    stars: ratingStars,
                    reasons: ratingStars <= 3 ? ratingReasons : undefined,
                    comment: ratingComment || undefined,
                }),
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Success - close modal
            setShowRatingModal(false);
            setRecentlyCompleted(null);
            resetRatingForm();
        } catch (error: any) {
            alert(error.message || 'ไม่สามารถบันทึกคะแนนได้');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    // Reset rating form
    const resetRatingForm = () => {
        setRatingStars(5);
        setRatingReasons([]);
        setRatingComment('');
    };

    // Toggle rating reason
    const toggleRatingReason = (code: string) => {
        setRatingReasons(prev =>
            prev.includes(code)
                ? prev.filter(r => r !== code)
                : [...prev, code]
        );
    };

    // Open external navigation (Google Maps / Apple Maps)
    const openNavigation = useCallback((destination: { lat: number; lng: number }, label: string) => {
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const lat = destination.lat;
        const lng = destination.lng;

        if (isIOS) {
            // Apple Maps
            window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&t=m`, '_blank');
        } else {
            // Google Maps
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
        }
    }, []);

    // Map load handler
    const onMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
    };

    // Fit bounds
    const fitBounds = useCallback(() => {
        if (!mapRef.current || !activeBooking) return;
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(driverLocation);
        const pickupCoords = activeBooking.pickupCoordinates || getLocationCoordinates(activeBooking.pickupLocation);
        bounds.extend(pickupCoords);
        if (activeBooking.status === 'in_progress') {
            const dropoffCoords = activeBooking.dropoffCoordinates || getLocationCoordinates(activeBooking.dropoffLocation);
            bounds.extend(dropoffCoords);
        }
        mapRef.current.fitBounds(bounds, 80);
    }, [activeBooking, driverLocation, getLocationCoordinates]);

    useEffect(() => {
        if (isLoaded && activeBooking) {
            setTimeout(fitBounds, 500);
        }
    }, [isLoaded, activeBooking, fitBounds]);

    // Status config
    const statusConfig: Record<string, { color: string; text: string }> = {
        online: { color: 'bg-green-500', text: 'พร้อมรับงาน' },
        offline: { color: 'bg-gray-400', text: 'ออฟไลน์' },
        busy: { color: 'bg-amber-500', text: 'กำลังทำงาน' },
        driver_assigned: { color: 'bg-blue-500 animate-pulse', text: 'งานใหม่!' },
        driver_en_route: { color: 'bg-purple-500', text: 'กำลังไปรับ' },
        in_progress: { color: 'bg-emerald-500', text: 'กำลังเดินทาง' },
        completed: { color: 'bg-green-600', text: 'เสร็จสิ้น' },
    };

    // Determine display status
    const isOnline = driverStatus === DriverStatus.AVAILABLE || driverStatus === DriverStatus.BUSY || hasActiveJob;
    const displayStatus = hasActiveJob
        ? (activeBooking?.status || 'busy')
        : (isOnline ? 'online' : 'offline');

    // Toggle online
    const handleToggleOnline = async () => {
        if (isOnline) {
            if (!hasActiveJob) {
                await handleStatusChange(DriverStatus.OFFLINE);
            }
        } else {
            await handleStatusChange(DriverStatus.AVAILABLE);
        }
    };

    // Bottom sheet is now auto-height (fit-content)

    // Loading
    if (loading || !isLoaded) {
        return (
            <div className="fixed inset-0 bg-gray-50">
                <div className="max-w-[430px] mx-auto h-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">กำลังโหลด...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">ไม่สามารถโหลดแผนที่ได้</p>
                    <p className="text-red-500 text-sm">{loadError.message}</p>
                </div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="fixed inset-0 bg-gray-50">
                <div className="max-w-[430px] mx-auto h-full flex items-center justify-center">
                    <div className="text-center p-6">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 mb-4">ไม่พบข้อมูลคนขับ</p>
                        <button
                            onClick={() => router.push('/driver/login')}
                            className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold"
                        >
                            เข้าสู่ระบบ
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="fixed inset-0 bg-gray-100">
            <div className="max-w-[430px] mx-auto h-full relative overflow-hidden">

                {/* ===== FULL SCREEN MAP ===== */}
                <div className="absolute inset-0">
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={driverLocation}
                        zoom={16}
                        options={mapOptions}
                        onLoad={onMapLoad}
                    >
                        {/* Driver Location with heading */}
                        <DriverMarker
                            position={driverLocation}
                            heading={locationTracking.heading || 0}
                            isOnline={isOnline}
                        />

                        {/* Pickup Marker */}
                        {activeBooking && (
                            <Marker
                                position={activeBooking.pickupCoordinates || getLocationCoordinates(activeBooking.pickupLocation)}
                                icon={createMarkerIcon(PICKUP_MARKER_SVG)}
                            />
                        )}

                        {/* Dropoff Marker */}
                        {activeBooking && activeBooking.status === 'in_progress' && (
                            <Marker
                                position={activeBooking.dropoffCoordinates || getLocationCoordinates(activeBooking.dropoffLocation)}
                                icon={createMarkerIcon(DROPOFF_MARKER_SVG)}
                            />
                        )}

                        {/* Route */}
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: {
                                        strokeColor: '#00b14f',
                                        strokeWeight: 6,
                                        strokeOpacity: 0.9,
                                    },
                                }}
                            />
                        )}
                    </GoogleMap>
                </div>

                {/* ===== FLOATING HEADER - Grab Style ===== */}
                <div
                    className="absolute top-0 left-0 right-0 z-20"
                    style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
                >
                    <div className="px-4 flex items-center justify-between">
                        {/* Driver Info - Grab Style */}
                        <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2 shadow-md border border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-2 ring-[#00b14f]/30">
                                {driver.photo ? (
                                    <img src={driver.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h1 className="text-gray-900 font-bold text-sm">{driver.name}</h1>
                                <p className="text-gray-500 text-xs">{driver.vehiclePlate}</p>
                            </div>
                        </div>

                        {/* Status Toggle - Grab Style */}
                        <button
                            onClick={handleToggleOnline}
                            disabled={hasActiveJob || statusLoading}
                            className={`relative w-20 h-10 rounded-full transition-all shadow-md border ${
                                hasActiveJob
                                    ? 'bg-[#00b14f]/10 border-[#00b14f]/30'
                                    : isOnline
                                        ? 'bg-[#00b14f] border-[#00b14f]'
                                        : 'bg-gray-200 border-gray-300'
                            }`}
                        >
                            <div className={`absolute top-1 ${isOnline ? 'right-1' : 'left-1'} w-8 h-8 bg-white rounded-full shadow-md transition-all flex items-center justify-center`}>
                                {statusLoading ? (
                                    <div className="w-4 h-4 border-2 border-[#00b14f] border-t-transparent rounded-full animate-spin"></div>
                                ) : isOnline ? (
                                    <svg className="w-4 h-4 text-[#00b14f]" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* GPS Status Bar - Grab Style */}
                    {hasActiveJob && (
                        <div className="px-4 mt-2">
                            <div className={`px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm ${
                                locationTracking.isWatching
                                    ? 'bg-[#00b14f]/5 text-[#00b14f] border border-[#00b14f]/20'
                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                    locationTracking.isWatching ? 'bg-[#00b14f] animate-pulse' : 'bg-amber-500'
                                }`}></div>
                                {locationTracking.isWatching ? 'LIVE • กำลังส่งตำแหน่ง' : 'กำลังเชื่อมต่อ GPS...'}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== FLOATING ACTION BUTTONS ===== */}
                <div className="absolute right-4 bottom-[50%] z-20 flex flex-col gap-2">
                    {/* Recenter button */}
                    <button
                        onClick={() => mapRef.current?.panTo(driverLocation)}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-700 shadow-lg active:scale-95 border border-gray-200"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {/* Fit route button - only show when active booking */}
                    {activeBooking && (
                        <button
                            onClick={fitBounds}
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-700 shadow-lg active:scale-95 border border-gray-200"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* ===== BOTTOM SHEET (Auto Height) ===== */}
                <div
                    className="absolute left-0 right-0 bottom-0 z-30 bg-white rounded-t-[28px] shadow-2xl"
                >
                    {/* Handle bar (decorative) */}
                    <div className="flex justify-center py-3">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>

                    {/* === ONLINE/NO JOB STATE === */}
                    {isOnline && !activeBooking && (
                        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                            {/* Status indicator - Grab Style */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-3 h-3 rounded-full bg-[#00b14f] animate-pulse"></div>
                                <span className="text-[#00b14f] font-bold text-lg">พร้อมรับงาน</span>
                            </div>

                            {/* Stats Grid - Grab Style */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100 min-w-0 overflow-hidden">
                                    <p className="text-gray-500 text-xs mb-1">งานวันนี้</p>
                                    <p className="text-2xl font-bold text-gray-900 truncate">
                                        {bookings.filter(b => b.status === 'completed' && b.pickupDate === new Date().toISOString().split('T')[0]).length}
                                    </p>
                                </div>
                                <div className="bg-[#00b14f]/5 rounded-2xl p-3 text-center border border-[#00b14f]/20 min-w-0 overflow-hidden">
                                    <p className="text-gray-500 text-xs mb-1">รายได้</p>
                                    <p className="text-base font-bold text-[#00b14f] truncate">
                                        ฿{bookings
                                            .filter(b => b.status === 'completed' && b.pickupDate === new Date().toISOString().split('T')[0])
                                            .reduce((sum, b) => sum + (b.totalCost || 0), 0)
                                            .toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-100 min-w-0 overflow-hidden">
                                    <p className="text-gray-500 text-xs mb-1">คะแนน</p>
                                    <p className="text-2xl font-bold text-amber-500 truncate">
                                        {driver?.rating?.toFixed(1) || '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Waiting message */}
                            <div className="text-center py-4">
                                <div className="flex items-center justify-center gap-2 text-gray-400">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span>รอรับงานจากระบบ</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === OFFLINE STATE === */}
                    {!isOnline && !activeBooking && (
                        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-600 mb-2">คุณออฟไลน์อยู่</h2>
                                <p className="text-gray-400">เปิดสถานะออนไลน์เพื่อเริ่มรับงาน</p>
                            </div>
                        </div>
                    )}

                    {/* === EN ROUTE TO PICKUP STATE - Grab Style === */}
                    {activeBooking && activeBooking.status === 'driver_en_route' && (
                        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#00b14f]/10 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-[#00b14f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[#00b14f] font-bold">กำลังไปรับผู้โดยสาร</p>
                                        <p className="text-gray-500 text-sm">{activeBooking.firstName} {activeBooking.lastName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#00b14f] font-bold text-xl">฿{activeBooking.totalCost?.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Location Card */}
                            <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-[#00b14f]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <div className="w-3 h-3 rounded-full bg-[#00b14f]"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-400 text-xs mb-1">จุดรับ</p>
                                        <p className="text-gray-900 font-medium">{activeBooking.pickupLocation}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                                    <a
                                        href={`tel:${activeBooking.phone}`}
                                        className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        โทร
                                    </a>
                                    <button
                                        onClick={() => openNavigation(
                                            activeBooking.pickupCoordinates || getLocationCoordinates(activeBooking.pickupLocation),
                                            activeBooking.pickupLocation
                                        )}
                                        className="flex-1 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        นำทาง
                                    </button>
                                </div>
                            </div>

                            {/* Action Button - Grab Green */}
                            <button
                                onClick={() => handleBookingAction(activeBooking.id, 'in_progress')}
                                disabled={updatingStatus === activeBooking.id}
                                className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                            >
                                {updatingStatus === activeBooking.id ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        ถึงจุดรับแล้ว
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* === IN PROGRESS STATE - Grab Style === */}
                    {activeBooking && activeBooking.status === 'in_progress' && (
                        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#00b14f]/10 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-[#00b14f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[#00b14f] font-bold">กำลังเดินทาง</p>
                                        <p className="text-gray-500 text-sm">{activeBooking.firstName} {activeBooking.lastName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#00b14f] font-bold text-xl">฿{activeBooking.totalCost?.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Route Card - Grab Style connection line */}
                            <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 rounded-full bg-[#00b14f] ring-4 ring-[#00b14f]/20"></div>
                                        <div className="w-0.5 h-10 bg-gray-300"></div>
                                        <div className="w-3 h-3 rounded-sm bg-orange-500 ring-4 ring-orange-500/20"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-400 text-xs mb-0.5">ต้นทาง</p>
                                        <p className="text-gray-400 text-sm line-through">{activeBooking.pickupLocation}</p>
                                        <div className="h-4"></div>
                                        <p className="text-gray-400 text-xs mb-0.5">ปลายทาง</p>
                                        <p className="text-gray-900 font-medium">{activeBooking.dropoffLocation}</p>
                                    </div>
                                </div>

                                {/* Navigate to dropoff button */}
                                <button
                                    onClick={() => openNavigation(
                                        activeBooking.dropoffCoordinates || getLocationCoordinates(activeBooking.dropoffLocation),
                                        activeBooking.dropoffLocation
                                    )}
                                    className="w-full h-12 mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    นำทางไปปลายทาง
                                </button>
                            </div>

                            {/* Action Button - Grab Green */}
                            <button
                                onClick={() => handleBookingAction(activeBooking.id, 'completed')}
                                disabled={updatingStatus === activeBooking.id}
                                className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                            >
                                {updatingStatus === activeBooking.id ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        ถึงปลายทางแล้ว
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* === DRIVER_ASSIGNED STATE (waiting to start) - Grab Style === */}
                    {activeBooking && activeBooking.status === 'driver_assigned' && !showNewJobModal && (
                        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                            {/* New Job Badge - Grab Style */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-[#00b14f] animate-pulse"></div>
                                <span className="text-[#00b14f] font-bold">งานใหม่รอดำเนินการ</span>
                            </div>

                            {/* Job Details Card */}
                            <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                                {/* Customer */}
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-900 font-bold">{activeBooking.firstName} {activeBooking.lastName}</p>
                                        <p className="text-gray-500 text-sm">{activeBooking.pickupDate} • {activeBooking.pickupTime}</p>
                                    </div>
                                    <p className="text-[#00b14f] font-bold text-lg">฿{activeBooking.totalCost?.toLocaleString()}</p>
                                </div>

                                {/* Route - Grab Style connection line */}
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 rounded-full bg-[#00b14f] ring-4 ring-[#00b14f]/20"></div>
                                        <div className="w-0.5 h-8 bg-gray-300"></div>
                                        <div className="w-3 h-3 rounded-sm bg-orange-500 ring-4 ring-orange-500/20"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-900 text-sm">{activeBooking.pickupLocation}</p>
                                        <div className="h-4"></div>
                                        <p className="text-gray-500 text-sm">{activeBooking.dropoffLocation}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button - Grab Green */}
                            <button
                                onClick={() => handleBookingAction(activeBooking.id, 'driver_en_route')}
                                disabled={updatingStatus === activeBooking.id}
                                className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                            >
                                {updatingStatus === activeBooking.id ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        เริ่มงาน - ออกเดินทาง
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* === BOTTOM NAVIGATION - Grab Style === */}
                {!activeBooking && !showNewJobModal && !showCompletedModal && (
                    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200">
                        <div className="flex items-center justify-around py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
                            <button
                                className="flex flex-col items-center gap-1 px-6 py-2 text-[#00b14f]"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                                </svg>
                                <span className="text-xs font-medium">หน้าหลัก</span>
                            </button>
                            <button
                                onClick={() => router.push('/driver/history')}
                                className="flex flex-col items-center gap-1 px-6 py-2 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-medium">ประวัติ</span>
                            </button>
                            <button
                                onClick={() => router.push('/driver/profile')}
                                className="flex flex-col items-center gap-1 px-6 py-2 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-xs font-medium">โปรไฟล์</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* === COMPLETED MODAL - Job Summary === */}
                {showCompletedModal && recentlyCompleted && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-[380px] bg-white rounded-3xl animate-scale-up shadow-2xl overflow-hidden">
                            {/* Success Header */}
                            <div className="bg-gradient-to-br from-[#00b14f] to-[#00a045] p-6 text-center">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h2 className="text-white text-2xl font-bold mb-1">เสร็จสิ้นการเดินทาง!</h2>
                                <p className="text-white/80">ขอบคุณที่ให้บริการ</p>
                            </div>

                            {/* Earnings */}
                            <div className="p-6">
                                <div className="bg-[#00b14f]/5 rounded-2xl p-4 mb-4 border border-[#00b14f]/20 text-center">
                                    <p className="text-gray-500 text-sm mb-1">รายได้จากงานนี้</p>
                                    <p className="text-[#00b14f] font-bold text-4xl">฿{recentlyCompleted.totalCost?.toLocaleString()}</p>
                                </div>

                                {/* Trip Summary */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-[#00b14f]"></div>
                                            <div className="w-0.5 h-8 bg-gray-300"></div>
                                            <div className="w-3 h-3 rounded-sm bg-orange-500"></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-600 text-sm">{recentlyCompleted.pickupLocation}</p>
                                            <div className="h-4"></div>
                                            <p className="text-gray-600 text-sm">{recentlyCompleted.dropoffLocation}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-700 font-medium">{recentlyCompleted.firstName} {recentlyCompleted.lastName}</span>
                                        </div>
                                        <span className="text-gray-400 text-sm">{recentlyCompleted.vehicleName}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <button
                                    onClick={() => {
                                        setShowCompletedModal(false);
                                        setShowRatingModal(true);
                                        resetRatingForm();
                                    }}
                                    className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    ให้คะแนนลูกค้า
                                </button>

                                <button
                                    onClick={() => {
                                        setShowCompletedModal(false);
                                        setRecentlyCompleted(null);
                                    }}
                                    className="w-full h-12 mt-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center justify-center gap-2"
                                >
                                    ข้ามไปก่อน
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === RATING MODAL - Driver rates Customer === */}
                {showRatingModal && recentlyCompleted && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-[380px] bg-white rounded-3xl animate-scale-up shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="bg-gray-50 p-5 text-center border-b border-gray-100">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h2 className="text-gray-900 text-xl font-bold">{recentlyCompleted.firstName} {recentlyCompleted.lastName}</h2>
                                <p className="text-gray-500 text-sm mt-1">ให้คะแนนลูกค้า</p>
                            </div>

                            <div className="p-5">
                                {/* Star Rating */}
                                <div className="flex justify-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => {
                                                setRatingStars(star);
                                                if (star > 3) setRatingReasons([]);
                                            }}
                                            className="p-1 transition-transform active:scale-90"
                                        >
                                            <svg
                                                className={`w-12 h-12 ${star <= ratingStars ? 'text-amber-400' : 'text-gray-300'}`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>

                                {/* Rating Label */}
                                <p className="text-center text-gray-600 mb-4">
                                    {ratingStars === 5 && 'ยอดเยี่ยม!'}
                                    {ratingStars === 4 && 'ดีมาก'}
                                    {ratingStars === 3 && 'พอใช้'}
                                    {ratingStars === 2 && 'ต้องปรับปรุง'}
                                    {ratingStars === 1 && 'แย่มาก'}
                                </p>

                                {/* Low Rating Reasons */}
                                {ratingStars <= 3 && (
                                    <div className="mb-4">
                                        <p className="text-gray-700 font-medium mb-3">เกิดอะไรขึ้น? <span className="text-red-500">*</span></p>
                                        <div className="flex flex-wrap gap-2">
                                            {lowRatingReasons.map((reason) => (
                                                <button
                                                    key={reason.code}
                                                    onClick={() => toggleRatingReason(reason.code)}
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                                        ratingReasons.includes(reason.code)
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {reason.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Comment */}
                                <div className="mb-6">
                                    <label htmlFor="rating-comment" className="text-gray-700 font-medium mb-2 block">
                                        ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
                                    </label>
                                    <textarea
                                        id="rating-comment"
                                        name="rating-comment"
                                        value={ratingComment}
                                        onChange={(e) => setRatingComment(e.target.value)}
                                        placeholder="พิมพ์ความคิดเห็น..."
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00b14f]/50 focus:border-[#00b14f] resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={() => submitRating(false)}
                                    disabled={isSubmittingRating || (ratingStars <= 3 && ratingReasons.length === 0)}
                                    className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingRating ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            ส่งคะแนน
                                        </>
                                    )}
                                </button>

                                {/* Skip Button */}
                                <button
                                    onClick={() => submitRating(true)}
                                    disabled={isSubmittingRating}
                                    className="w-full h-12 mt-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    ข้ามไปก่อน
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === NEW JOB MODAL - Grab Style === */}
                {showNewJobModal && newJobAlert && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
                        <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[28px] animate-slide-up shadow-2xl">
                            {/* Progress Bar - Grab Green */}
                            <div className="h-1.5 bg-gray-200 rounded-t-[28px] overflow-hidden">
                                <div
                                    className="h-full bg-[#00b14f] transition-all duration-1000"
                                    style={{ width: `${(countdown / 15) * 100}%` }}
                                />
                            </div>

                            <div className="p-5 pb-[max(24px,env(safe-area-inset-bottom))]">
                                {/* Header with countdown */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-gray-900 text-xl font-bold">งานใหม่!</h2>
                                        <p className="text-gray-500 text-sm">รับงานก่อนหมดเวลา</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-16 rounded-full bg-[#00b14f]/10 border border-[#00b14f]/30 flex items-center justify-center">
                                            <span className="text-3xl font-bold text-[#00b14f]">{countdown}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Fare - Grab Style */}
                                <div className="bg-[#00b14f]/5 rounded-2xl p-4 mb-4 border border-[#00b14f]/20">
                                    <p className="text-gray-500 text-sm mb-1">ค่าโดยสาร</p>
                                    <p className="text-[#00b14f] font-bold text-4xl">฿{newJobAlert.totalCost?.toLocaleString()}</p>
                                </div>

                                {/* Trip Info Card */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                    {/* Route - Grab Style connection line */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-4 h-4 rounded-full bg-[#00b14f] ring-4 ring-[#00b14f]/20 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                            </div>
                                            <div className="w-0.5 h-10 bg-gray-300"></div>
                                            <div className="w-4 h-4 rounded-sm bg-orange-500 ring-4 ring-orange-500/20 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs mb-1">จุดรับ</p>
                                            <p className="text-gray-900 font-medium">{newJobAlert.pickupLocation}</p>
                                            <div className="h-4"></div>
                                            <p className="text-gray-500 text-xs mb-1">จุดส่ง</p>
                                            <p className="text-gray-600">{newJobAlert.dropoffLocation}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">วันที่</p>
                                            <p className="text-gray-900 font-medium">{newJobAlert.pickupDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">เวลา</p>
                                            <p className="text-gray-900 font-medium">{newJobAlert.pickupTime}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Accept Button - Grab Green */}
                                <button
                                    onClick={handleAcceptJob}
                                    disabled={updatingStatus === newJobAlert.id}
                                    className="w-full h-16 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-[#00b14f]/25 mb-3 disabled:opacity-50"
                                >
                                    {updatingStatus === newJobAlert.id ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            รับงาน
                                        </>
                                    )}
                                </button>

                                {/* Decline Button */}
                                <button
                                    onClick={() => handleRejectJob(newJobAlert.id)}
                                    disabled={updatingStatus === newJobAlert.id}
                                    className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    ปฏิเสธ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                @keyframes scale-up {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-up {
                    animation: scale-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
