'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
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

// Map styles
const mapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    styles: mapStyles,
    gestureHandling: 'greedy',
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

// Driver Car Marker
function DriverMarker({ position }: { position: { lat: number; lng: number } }) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 scale-150"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full shadow-xl flex items-center justify-center border-4 border-white">
                    <span className="text-xl">🚗</span>
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
                        };
                        setDriver(driverInfo);
                        setDriverStatus(driverInfo.status);
                        foundDriverId = driverInfo.id;
                    }
                }

                // Subscribe to bookings
                if (foundDriverId) {
                    unsubscribeBookings = FirestoreService.subscribeToDriverBookings(foundDriverId, (driverBookings) => {
                        setBookings(driverBookings);
                        checkForNewBookings(driverBookings);
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
        } catch (error: any) {
            alert(error.message || 'ไม่สามารถอัปเดตสถานะได้');
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Handle reject job
    const handleRejectJob = async (bookingId: string) => {
        if (!driver) return;

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
            if (!result.success) throw new Error(result.error);

            setShowNewJobModal(false);
            setNewJobAlert(null);
            newJobAlertRef.current = null;
        } catch (error: any) {
            alert(error.message || 'ไม่สามารถปฏิเสธงานได้');
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Keep ref in sync with function
    handleRejectJobRef.current = handleRejectJob;

    // Accept job (from modal)
    const handleAcceptJob = async () => {
        if (!newJobAlert) return;
        await handleBookingAction(newJobAlert.id, 'driver_en_route');
    };

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

    // Loading
    if (loading || !isLoaded) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-gray-100">
                <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">กำลังโหลด...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">ไม่สามารถโหลดแผนที่ได้</p>
                    <p className="text-red-500 text-sm">{loadError.message}</p>
                </div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-gray-100">
                <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex items-center justify-center">
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🚗</span>
                        </div>
                        <p className="text-gray-500 mb-4">ไม่พบข้อมูลคนขับ</p>
                        <button
                            onClick={() => router.push('/driver/login')}
                            className="px-6 py-2 bg-blue-500 text-white rounded-xl font-medium"
                        >
                            เข้าสู่ระบบ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-gray-100">
            <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">

                {/* Header */}
                <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
                    <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                                {driver.photo ? (
                                    <img src={driver.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl">🚗</span>
                                )}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">{driver.name}</h1>
                                <p className="text-xs text-gray-500">{driver.vehiclePlate} • {driver.vehicleModel}</p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`px-3 py-1.5 rounded-full text-white text-xs font-medium ${statusConfig[displayStatus]?.color || 'bg-gray-400'}`}>
                            {statusConfig[displayStatus]?.text || 'ไม่ทราบ'}
                        </div>
                    </div>

                    {/* GPS Status */}
                    {hasActiveJob && (
                        <div className={`px-4 py-1.5 text-xs flex items-center gap-2 ${
                            locationTracking.isWatching ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${locationTracking.isWatching ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                            {locationTracking.isWatching ? '📍 กำลังส่งตำแหน่ง GPS' : '⏳ กำลังเชื่อมต่อ GPS...'}
                        </div>
                    )}
                </header>

                {/* Map Area */}
                <div className="relative flex-1" style={{ minHeight: '40vh' }}>
                    <div className="absolute inset-0">
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={driverLocation}
                            zoom={14}
                            options={mapOptions}
                            onLoad={onMapLoad}
                        >
                        {/* Driver Location */}
                        <DriverMarker position={driverLocation} />

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
                                        strokeColor: '#3b82f6',
                                        strokeWeight: 5,
                                        strokeOpacity: 0.8,
                                    },
                                }}
                            />
                        )}
                        </GoogleMap>
                    </div>

                    {/* Online/Offline Toggle */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                        <div className="bg-white/95 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            <span className="text-gray-800 text-sm font-medium">
                                {isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                            </span>
                        </div>

                        <button
                            onClick={handleToggleOnline}
                            disabled={hasActiveJob || statusLoading}
                            className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all ${
                                hasActiveJob
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : isOnline
                                        ? 'bg-white text-red-500 border border-red-200'
                                        : 'bg-white text-green-500 border border-green-200'
                            }`}
                        >
                            {statusLoading ? '...' : (isOnline ? 'ปิดรับงาน' : 'เปิดรับงาน')}
                        </button>
                    </div>
                </div>

                {/* Bottom Sheet */}
                <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] -mt-6 relative z-10">
                    {/* Handle */}
                    <div className="flex justify-center py-3">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>

                    {/* === ONLINE/NO JOB STATE === */}
                    {isOnline && !activeBooking && (
                        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-100">
                                    <span className="text-3xl">🚗</span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">พร้อมรับงาน</h2>
                                <p className="text-gray-500 text-sm">รอรับงานใหม่จากระบบ...</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-gray-400 text-xs">งานวันนี้</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {bookings.filter(b => b.status === 'completed' && b.pickupDate === new Date().toISOString().split('T')[0]).length}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-gray-400 text-xs">รายได้วันนี้</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        ฿{bookings
                                            .filter(b => b.status === 'completed' && b.pickupDate === new Date().toISOString().split('T')[0])
                                            .reduce((sum, b) => sum + (b.totalCost || 0), 0)
                                            .toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === OFFLINE STATE === */}
                    {!isOnline && !activeBooking && (
                        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-3xl opacity-50">🚗</span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-400 mb-1">ออฟไลน์</h2>
                                <p className="text-gray-400 text-sm">กดปุ่ม "เปิดรับงาน" เพื่อเริ่มรับงาน</p>
                            </div>
                        </div>
                    )}

                    {/* === EN ROUTE TO PICKUP STATE === */}
                    {activeBooking && activeBooking.status === 'driver_en_route' && (
                        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-100">
                                    <span className="text-2xl">🚗</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-blue-600 font-bold">กำลังไปรับผู้โดยสาร</p>
                                    <p className="text-gray-500 text-sm">{activeBooking.firstName} {activeBooking.lastName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-600 font-bold">฿{activeBooking.totalCost?.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                <p className="text-gray-400 text-xs mb-1">📍 จุดรับ</p>
                                <p className="text-gray-900 font-medium">{activeBooking.pickupLocation}</p>
                                <p className="text-gray-500 text-sm mt-2">📞 {activeBooking.phone}</p>
                            </div>

                            <button
                                onClick={() => handleBookingAction(activeBooking.id, 'in_progress')}
                                disabled={updatingStatus === activeBooking.id}
                                className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                            >
                                {updatingStatus === activeBooking.id ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>📍</span>
                                        ถึงจุดรับแล้ว - รับผู้โดยสาร
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* === IN PROGRESS STATE === */}
                    {activeBooking && activeBooking.status === 'in_progress' && (
                        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100">
                                    <span className="text-2xl">🛣️</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-emerald-600 font-bold">กำลังเดินทาง</p>
                                    <p className="text-gray-500 text-sm">{activeBooking.firstName} {activeBooking.lastName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-600 font-bold text-lg">฿{activeBooking.totalCost?.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <div className="w-0.5 h-6 bg-gray-300"></div>
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-400 text-sm line-through">{activeBooking.pickupLocation}</p>
                                        <div className="h-3"></div>
                                        <p className="text-gray-900 font-medium">{activeBooking.dropoffLocation}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleBookingAction(activeBooking.id, 'completed')}
                                disabled={updatingStatus === activeBooking.id}
                                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                            >
                                {updatingStatus === activeBooking.id ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>🎯</span>
                                        ถึงปลายทางแล้ว
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* === DRIVER_ASSIGNED STATE (waiting to start) === */}
                    {activeBooking && activeBooking.status === 'driver_assigned' && !showNewJobModal && (
                        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
                                <p className="text-blue-600 font-bold mb-2">📋 งานที่ได้รับมอบหมาย</p>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-gray-500">ลูกค้า:</span> {activeBooking.firstName} {activeBooking.lastName}</p>
                                    <p><span className="text-gray-500">จุดรับ:</span> {activeBooking.pickupLocation}</p>
                                    <p><span className="text-gray-500">จุดส่ง:</span> {activeBooking.dropoffLocation}</p>
                                    <p><span className="text-gray-500">วันที่:</span> {activeBooking.pickupDate} เวลา {activeBooking.pickupTime}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleBookingAction(activeBooking.id, 'driver_en_route')}
                                disabled={updatingStatus === activeBooking.id}
                                className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                            >
                                {updatingStatus === activeBooking.id ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>🚗</span>
                                        เริ่มออกเดินทางไปรับ
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* === NEW JOB MODAL (Uber/Grab Style) === */}
                {showNewJobModal && newJobAlert && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
                        <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl animate-slide-up">
                            {/* Progress Bar */}
                            <div className="h-1.5 bg-gray-100">
                                <div
                                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000 rounded-full"
                                    style={{ width: `${(countdown / 15) * 100}%` }}
                                />
                            </div>

                            <div className="p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                                {/* Countdown */}
                                <div className="text-center mb-4">
                                    <span className="text-5xl font-bold text-gray-900">{countdown}</span>
                                    <span className="text-gray-500 text-lg ml-2">วินาที</span>
                                </div>

                                {/* Trip Info Card */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                                    {/* Route */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                                            <div className="w-0.5 h-8 bg-gray-300"></div>
                                            <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100"></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-900 font-semibold">{newJobAlert.pickupLocation}</p>
                                            <div className="h-6"></div>
                                            <p className="text-gray-500">{newJobAlert.dropoffLocation}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3 border-t border-gray-200 pt-4">
                                        <div className="text-center">
                                            <p className="text-gray-400 text-xs mb-1">วันที่</p>
                                            <p className="text-gray-900 font-bold text-sm">{newJobAlert.pickupDate}</p>
                                        </div>
                                        <div className="text-center border-x border-gray-200">
                                            <p className="text-gray-400 text-xs mb-1">เวลา</p>
                                            <p className="text-gray-900 font-bold">{newJobAlert.pickupTime}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-gray-400 text-xs mb-1">ค่าโดยสาร</p>
                                            <p className="text-green-600 font-bold text-lg">฿{newJobAlert.totalCost?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Accept Button */}
                                <button
                                    onClick={handleAcceptJob}
                                    disabled={updatingStatus === newJobAlert.id}
                                    className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg mb-3 disabled:opacity-50"
                                >
                                    {updatingStatus === newJobAlert.id ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="text-2xl">✓</span>
                                            รับงาน
                                        </>
                                    )}
                                </button>

                                {/* Decline Button */}
                                <button
                                    onClick={() => handleRejectJob(newJobAlert.id)}
                                    disabled={updatingStatus === newJobAlert.id}
                                    className="w-full py-2 text-gray-400 text-sm hover:text-red-500 transition-colors disabled:opacity-50"
                                >
                                    ปฏิเสธงาน
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
            `}</style>
        </div>
    );
}
