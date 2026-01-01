'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    GoogleMap,
    useLoadScript,
    Marker,
    DirectionsRenderer,
    OverlayView,
    Libraries,
    Polyline,
    TrafficLayer,
} from '@react-google-maps/api';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BookingService, DriverService, VehicleService, LocationService } from '@/lib/firebase/services';
import { useDriverTracking } from '@/lib/hooks';
import { Vehicle, Driver, Booking, BookingStatus } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';

// Libraries - must be outside component to prevent re-renders
const libraries: Libraries = ['places', 'geometry'];

// Types
interface Coordinates {
    lat: number;
    lng: number;
}

interface PathPoint extends Coordinates {
    distance: number;
}

interface TripInfo {
    distance: number;
    duration: number;
    pickup: string;
    dropoff: string;
    price: number;
}

interface DriverInfo {
    name: string;
    phone: string;
    photo: string;
    rating: number;
    vehicleModel: string;
    vehicleColor: string;
    vehiclePlate: string;
}

// Mock Data
const MOCK_DRIVER: DriverInfo = {
    name: 'สมชาย รถดี',
    phone: '081-234-5678',
    photo: '',
    rating: 4.8,
    vehicleModel: 'Toyota Camry',
    vehicleColor: 'สีดำ',
    vehiclePlate: 'กท 1234',
};

const DEFAULT_LOCATIONS = {
    siamParagon: { lat: 13.7466, lng: 100.5347, name: 'สยามพารากอน' },
    suvarnabhumi: { lat: 13.6900, lng: 100.7501, name: 'สนามบินสุวรรณภูมิ' },
};

// Map styles - minimal POI
const mapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

// Custom SVG Markers
const PICKUP_MARKER_SVG = `
<svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pickupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#34d399"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 36 24 36s24-18 24-36C48 10.745 37.255 0 24 0z" fill="url(#pickupGrad)" filter="url(#shadow)"/>
  <circle cx="24" cy="22" r="10" fill="white"/>
  <circle cx="24" cy="22" r="5" fill="#059669"/>
</svg>`;

const DROPOFF_MARKER_SVG = `
<svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dropoffGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f87171"/>
      <stop offset="100%" style="stop-color:#dc2626"/>
    </linearGradient>
    <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 36 24 36s24-18 24-36C48 10.745 37.255 0 24 0z" fill="url(#dropoffGrad)" filter="url(#shadow2)"/>
  <circle cx="24" cy="22" r="10" fill="white"/>
  <rect x="19" y="17" width="10" height="10" rx="2" fill="#dc2626"/>
</svg>`;

// Create marker icon from SVG
const createMarkerIcon = (svg: string, size: number = 44) => {
    const encoded = encodeURIComponent(svg);
    return {
        url: `data:image/svg+xml,${encoded}`,
        scaledSize: new google.maps.Size(size, size * 1.25),
        anchor: new google.maps.Point(size / 2, size * 1.25),
    };
};

// Calculate bearing between two points
function calculateBearing(from: Coordinates, to: Coordinates): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Car Marker Component
function CarMarker({ position, bearing }: { position: Coordinates; bearing: number }) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div
                style={{
                    transform: `translate(-50%, -50%) rotate(${bearing}deg)`,
                    transition: 'transform 0.5s ease-out',
                }}
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50 scale-150"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-xl flex items-center justify-center border-4 border-white">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="10" width="18" height="8" rx="2" fill="#1a1a1a"/>
                            <path d="M6 10L8 6H16L18 10" fill="#1a1a1a"/>
                            <path d="M7 10L8.5 7H11V10H7Z" fill="#87CEEB"/>
                            <path d="M13 10V7H15.5L17 10H13Z" fill="#87CEEB"/>
                            <rect x="10" y="4" width="4" height="2" rx="0.5" fill="#FFD700"/>
                            <circle cx="7" cy="18" r="2" fill="#333"/>
                            <circle cx="17" cy="18" r="2" fill="#333"/>
                            <circle cx="4.5" cy="13" r="1" fill="#FFFF00"/>
                            <circle cx="19.5" cy="13" r="1" fill="#FFFF00"/>
                        </svg>
                    </div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M8 0L12 8H4L8 0Z" fill="#f59e0b"/>
                            <path d="M8 2L10 6H6L8 2Z" fill="#fbbf24"/>
                        </svg>
                    </div>
                </div>
            </div>
        </OverlayView>
    );
}

// Searching Ripple Animation Component
function SearchingRipple({ position }: { position: Coordinates }) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                {/* Ripple waves */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-32 h-32 rounded-full bg-[#00b14f]/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute w-24 h-24 rounded-full bg-[#00b14f]/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                    <div className="absolute w-16 h-16 rounded-full bg-[#00b14f]/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }}></div>
                </div>
                {/* Center dot */}
                <div className="relative w-6 h-6 bg-[#00b14f] rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
            </div>
        </OverlayView>
    );
}

// Map options
const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    rotateControl: false,
    styles: mapStyles,
    gestureHandling: 'greedy',
};

export default function TestMaps1Page() {
    const router = useRouter();
    const { language } = useLanguage();
    const { locations } = useBooking();
    const { user } = useAuth();

    // Refs
    const mapRef = useRef<google.maps.Map | null>(null);
    const animationRef = useRef<number | null>(null);
    const lastPanTimeRef = useRef<number>(0);

    // Mode: demo or live
    const [mode, setMode] = useState<'demo' | 'live'>('demo');

    // Trip status
    const [status, setStatus] = useState<'selecting' | 'searching' | 'driver_assigned' | 'driver_en_route' | 'in_progress' | 'completed'>('selecting');

    // Locations
    const [pickup, setPickup] = useState<Coordinates & { name: string; id?: string }>({
        ...DEFAULT_LOCATIONS.siamParagon,
        name: DEFAULT_LOCATIONS.siamParagon.name,
    });
    const [dropoff, setDropoff] = useState<Coordinates & { name: string; id?: string }>({
        ...DEFAULT_LOCATIONS.suvarnabhumi,
        name: DEFAULT_LOCATIONS.suvarnabhumi.name,
    });

    // Map state
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [routePath, setRoutePath] = useState<PathPoint[]>([]);
    const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
    const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
    const [showTraffic, setShowTraffic] = useState(true);
    const [mapHeading, setMapHeading] = useState(0);

    // Driver tracking (demo)
    const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
    const [driverBearing, setDriverBearing] = useState(0);
    const [remainingPath, setRemainingPath] = useState<Coordinates[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [eta, setEta] = useState<number | null>(null);
    const [followCar, setFollowCar] = useState(false);

    // Location picker
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [locationPickerType, setLocationPickerType] = useState<'pickup' | 'dropoff'>('pickup');
    const [searchQuery, setSearchQuery] = useState('');

    // === NEW: Live Mode State ===
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [routePrice, setRoutePrice] = useState<number | null>(null);
    const [isCreatingBooking, setIsCreatingBooking] = useState(false);
    const [showVehiclePicker, setShowVehiclePicker] = useState(false);
    const [isLoadingActiveBooking, setIsLoadingActiveBooking] = useState(false);
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
    const [isCancellingBooking, setIsCancellingBooking] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // === NEW: Auto Re-match State ===
    const [isRematching, setIsRematching] = useState(false);
    const [rematchAttempt, setRematchAttempt] = useState(0);
    const [rejectedDrivers, setRejectedDrivers] = useState<string[]>([]);
    const [rematchMessage, setRematchMessage] = useState<string | null>(null);
    const lastBookingStatusRef = useRef<string | null>(null);
    const rematchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchStartTimeRef = useRef<number | null>(null);

    // Re-match configuration
    const REMATCH_CONFIG = {
        MAX_ATTEMPTS: 3,
        DRIVER_RESPONSE_TIMEOUT: 20000, // 20 seconds
        TOTAL_SEARCH_TIMEOUT: 180000,   // 3 minutes
        DELAY_BETWEEN_MATCHES: 3000,    // 3 seconds
    };

    // === NEW: Live Mode Map Features ===
    const [driverToPickupRoute, setDriverToPickupRoute] = useState<google.maps.DirectionsResult | null>(null);
    const [liveEta, setLiveEta] = useState<{ toPickup: number | null; toDropoff: number | null }>({ toPickup: null, toDropoff: null });

    // Rating state for completed trips
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingReasons, setRatingReasons] = useState<string[]>([]);
    const [ratingComment, setRatingComment] = useState('');
    const [selectedTip, setSelectedTip] = useState<number>(0);
    const [customTip, setCustomTip] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    // Tip options
    const tipOptions = [0, 20, 50, 100];

    // Low rating reasons (customer to driver)
    const lowRatingReasons = [
        { code: 'late', label: language === 'th' ? 'มาสาย' : 'Late arrival' },
        { code: 'dirty_car', label: language === 'th' ? 'รถไม่สะอาด' : 'Dirty car' },
        { code: 'bad_driving', label: language === 'th' ? 'ขับรถไม่ดี' : 'Bad driving' },
        { code: 'rude', label: language === 'th' ? 'ไม่สุภาพ' : 'Rude behavior' },
        { code: 'wrong_route', label: language === 'th' ? 'ไปผิดทาง' : 'Wrong route' },
        { code: 'other', label: language === 'th' ? 'อื่นๆ' : 'Other' },
    ];

    // Toggle rating reason
    const toggleRatingReason = (code: string) => {
        setRatingReasons(prev =>
            prev.includes(code) ? prev.filter(r => r !== code) : [...prev, code]
        );
    };

    // Reset rating form
    const resetRatingForm = () => {
        setRatingStars(5);
        setRatingReasons([]);
        setRatingComment('');
        setSelectedTip(0);
        setCustomTip('');
        setShowRatingModal(false);
    };

    // Get auth token for API calls
    const getAuthToken = async (): Promise<string | null> => {
        if (!user) return null;
        const { getIdToken } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase/config');
        if (!auth || !auth.currentUser) return null;
        return getIdToken(auth.currentUser);
    };

    // Submit rating to API
    const submitRating = async () => {
        if (!bookingId && !activeBooking?.id) {
            alert(language === 'th' ? 'ไม่พบข้อมูลการจอง' : 'Booking not found');
            return;
        }

        // Validate low rating requires reasons
        if (ratingStars <= 3 && ratingReasons.length === 0) {
            alert(language === 'th' ? 'กรุณาเลือกเหตุผลสำหรับคะแนนต่ำ' : 'Please select reasons for low rating');
            return;
        }

        setIsSubmittingRating(true);
        try {
            const token = await getAuthToken();
            if (!token) {
                alert(language === 'th' ? 'กรุณาเข้าสู่ระบบใหม่' : 'Please login again');
                return;
            }

            const tipAmount = customTip ? parseInt(customTip) || 0 : selectedTip;

            const response = await fetch('/api/booking/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bookingId: bookingId || activeBooking?.id,
                    ratingType: 'customerToDriver',
                    stars: ratingStars,
                    reasons: ratingStars <= 3 ? ratingReasons : undefined,
                    comment: ratingComment.trim() || undefined,
                    tip: tipAmount > 0 ? tipAmount : undefined,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit rating');
            }

            // Success - close modal and reset
            resetRatingForm();
            resetTrip();
        } catch (error: any) {
            console.error('Error submitting rating:', error);
            alert(error.message || (language === 'th' ? 'ไม่สามารถส่งคะแนนได้' : 'Failed to submit rating'));
        } finally {
            setIsSubmittingRating(false);
        }
    };

    // Real-time driver tracking for live mode
    const { location: liveDriverLocation } = useDriverTracking(
        mode === 'live' && assignedDriver?.id ? assignedDriver.id : null,
        { autoStart: true }
    );

    // Load Google Maps
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    // === NEW: Check for existing active booking when entering Live Mode ===
    useEffect(() => {
        if (mode !== 'live' || !user) return;

        let timeoutId: NodeJS.Timeout | null = null;
        let isMounted = true;

        const checkActiveBooking = async () => {
            setIsLoadingActiveBooking(true);

            // Set a timeout to prevent indefinite loading (10 seconds)
            timeoutId = setTimeout(() => {
                if (isMounted) {
                    setIsLoadingActiveBooking(false);
                    setConnectionError(
                        language === 'th'
                            ? 'การโหลดข้อมูลช้าเกินไป กรุณาลองใหม่'
                            : 'Loading timed out. Please try again.'
                    );
                }
            }, 10000);

            try {
                const bookings = await BookingService.getUserBookings(user.uid);

                // Clear timeout since we got response
                if (timeoutId) clearTimeout(timeoutId);

                if (!isMounted) return;

                // Find active booking (not completed or cancelled)
                const activeStatuses = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress'];
                const active = bookings.find(b => activeStatuses.includes(b.status));

                if (active) {
                    setActiveBooking(active);
                    setBookingId(active.id);

                    // Map booking status to page status
                    const statusMap: Record<string, typeof status> = {
                        'pending': 'searching',
                        'confirmed': 'searching',
                        'driver_assigned': 'driver_assigned',
                        'driver_en_route': 'driver_en_route',
                        'in_progress': 'in_progress',
                    };
                    setStatus(statusMap[active.status] || 'selecting');

                    // Set driver info if assigned
                    if (active.driver) {
                        // Fetch full driver info
                        const driverDoc = await DriverService.getDriverById(active.driver.driverId);
                        if (driverDoc && isMounted) {
                            setAssignedDriver(driverDoc);
                        }
                    }

                    // Set pickup/dropoff from booking (with coordinates if available)
                    if (active.pickupCoordinates) {
                        setPickup({
                            lat: active.pickupCoordinates.lat,
                            lng: active.pickupCoordinates.lng,
                            name: active.pickupLocation,
                            id: active.pickupLocationId,
                        });
                    } else {
                        setPickup(prev => ({
                            ...prev,
                            name: active.pickupLocation,
                        }));
                    }

                    if (active.dropoffCoordinates) {
                        setDropoff({
                            lat: active.dropoffCoordinates.lat,
                            lng: active.dropoffCoordinates.lng,
                            name: active.dropoffLocation,
                            id: active.dropoffLocationId,
                        });
                    } else {
                        setDropoff(prev => ({
                            ...prev,
                            name: active.dropoffLocation,
                        }));
                    }

                    // Set trip info
                    setTripInfo({
                        distance: 0,
                        duration: 0,
                        pickup: active.pickupLocation,
                        dropoff: active.dropoffLocation,
                        price: active.totalCost,
                    });
                }
            } catch (error) {
                console.error('Error checking active booking:', error);
                if (isMounted) {
                    setConnectionError(
                        language === 'th'
                            ? 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่'
                            : 'Failed to load data. Please try again.'
                    );
                }
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
                if (isMounted) {
                    setIsLoadingActiveBooking(false);
                }
            }
        };

        checkActiveBooking();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [mode, user, language]);

    // === Real-time subscription for booking status changes ===
    useEffect(() => {
        if (mode !== 'live' || !bookingId || !db) return;

        console.log('📡 Subscribing to booking updates:', bookingId);

        const unsubscribe = onSnapshot(
            doc(db, 'bookings', bookingId),
            async (docSnap) => {
                if (docSnap.exists()) {
                    const bookingData = { id: docSnap.id, ...docSnap.data() } as Booking;
                    console.log('📦 Booking update received:', bookingData.status);

                    const previousStatus = lastBookingStatusRef.current;
                    lastBookingStatusRef.current = bookingData.status;

                    setActiveBooking(bookingData);

                    // ===== AUTO RE-MATCH DETECTION =====
                    // Detect when driver rejects: driver_assigned → confirmed
                    if (previousStatus === 'driver_assigned' && bookingData.status === 'confirmed') {
                        console.log('🔄 Driver rejected! Starting auto re-match...');

                        // Sync rejected drivers from database
                        if (bookingData.rejectedDrivers && bookingData.rejectedDrivers.length > 0) {
                            setRejectedDrivers(bookingData.rejectedDrivers);
                        }

                        // Check if we should try re-matching
                        const attempts = (bookingData.matchAttempts || 0) + 1;
                        setRematchAttempt(attempts);

                        const searchStarted = searchStartTimeRef.current || Date.now();
                        const elapsedTime = Date.now() - searchStarted;

                        if (attempts < REMATCH_CONFIG.MAX_ATTEMPTS && elapsedTime < REMATCH_CONFIG.TOTAL_SEARCH_TIMEOUT) {
                            // Show re-match message
                            setRematchMessage(
                                language === 'th'
                                    ? `คนขับปฏิเสธงาน กำลังหาคนขับใหม่... (${attempts}/${REMATCH_CONFIG.MAX_ATTEMPTS})`
                                    : `Driver declined. Finding another driver... (${attempts}/${REMATCH_CONFIG.MAX_ATTEMPTS})`
                            );
                            setIsRematching(true);
                            setAssignedDriver(null);

                            // Delay before re-matching
                            rematchTimeoutRef.current = setTimeout(async () => {
                                await triggerRematch(bookingId, attempts);
                            }, REMATCH_CONFIG.DELAY_BETWEEN_MATCHES);
                        } else {
                            // Max attempts reached or timeout
                            console.log('❌ Max re-match attempts reached or timeout');
                            setRematchMessage(
                                language === 'th'
                                    ? 'ไม่พบคนขับที่ว่าง กรุณาลองใหม่อีกครั้ง'
                                    : 'No drivers available. Please try again.'
                            );
                            setIsRematching(false);

                            // Auto-cancel after showing message
                            setTimeout(() => {
                                setRematchMessage(null);
                                handleSearchTimeout();
                            }, 3000);
                        }

                        return; // Don't update status yet, we're re-matching
                    }

                    // Clear re-match state when driver accepts
                    if (bookingData.status === 'driver_en_route' && isRematching) {
                        setIsRematching(false);
                        setRematchMessage(null);
                    }

                    // Map booking status to page status
                    const statusMap: Record<string, typeof status> = {
                        'pending': 'searching',
                        'confirmed': isRematching ? 'searching' : 'searching',
                        'driver_assigned': 'driver_assigned',
                        'driver_en_route': 'driver_en_route',
                        'in_progress': 'in_progress',
                        'completed': 'completed',
                    };

                    const newStatus = statusMap[bookingData.status];
                    if (newStatus) {
                        setStatus(newStatus);
                    }

                    // Update driver info if assigned and not yet set
                    if (bookingData.driver && !assignedDriver) {
                        DriverService.getDriverById(bookingData.driver.driverId).then(driverDoc => {
                            if (driverDoc) {
                                setAssignedDriver(driverDoc);
                            }
                        });
                    }

                    // Update trip info from booking
                    setTripInfo(prev => prev ? {
                        ...prev,
                        pickup: bookingData.pickupLocation,
                        dropoff: bookingData.dropoffLocation,
                        price: bookingData.totalCost,
                    } : null);
                }
            },
            (error) => {
                console.error('Error listening to booking:', error);
                setConnectionError(language === 'th' ? 'ขาดการเชื่อมต่อ กรุณารีเฟรชหน้า' : 'Connection lost. Please refresh.');
            }
        );

        // Clear connection error when subscription is active
        setConnectionError(null);

        return () => {
            console.log('🔌 Unsubscribing from booking updates');
            unsubscribe();
            if (rematchTimeoutRef.current) {
                clearTimeout(rematchTimeoutRef.current);
            }
        };
    }, [mode, bookingId, assignedDriver, isRematching, language]);

    // === NEW: Fetch vehicles and drivers for live mode ===
    useEffect(() => {
        if (mode !== 'live') return;

        // Fetch vehicles
        VehicleService.getVehicles().then(v => {
            setVehicles(v);
            if (v.length > 0 && !selectedVehicle) {
                setSelectedVehicle(v[0]); // Auto-select first vehicle
            }
        });

        // Subscribe to available drivers
        const unsubscribe = DriverService.subscribeToDrivers((drivers) => {
            const available = drivers.filter(d => d.status === 'available');
            setAvailableDrivers(available);
        });

        return () => unsubscribe();
    }, [mode]);

    // === NEW: Fetch route price from database ===
    useEffect(() => {
        if (mode !== 'live') return;
        if (!pickup.id || !dropoff.id) return;

        LocationService.getRoutePrice(pickup.id, dropoff.id).then(price => {
            if (price) {
                setRoutePrice(price);
            }
        });
    }, [mode, pickup.id, dropoff.id]);

    // === NEW: Update driver location from live tracking ===
    useEffect(() => {
        if (mode === 'live' && liveDriverLocation) {
            setDriverLocation({
                lat: liveDriverLocation.lat,
                lng: liveDriverLocation.lng,
            });
            if (liveDriverLocation.heading) {
                setDriverBearing(liveDriverLocation.heading);
            }
        }
    }, [mode, liveDriverLocation]);

    // === NEW: Calculate Driver-to-Pickup Route & Live ETA ===
    useEffect(() => {
        if (mode !== 'live' || !isLoaded || !driverLocation) return;

        const calculateDriverRoute = async () => {
            const directionsService = new google.maps.DirectionsService();

            // Calculate route from driver to pickup (when driver_en_route)
            if (status === 'driver_assigned' || status === 'driver_en_route') {
                try {
                    const result = await directionsService.route({
                        origin: driverLocation,
                        destination: pickup,
                        travelMode: google.maps.TravelMode.DRIVING,
                        // Add traffic consideration for more accurate ETA
                        drivingOptions: {
                            departureTime: new Date(),
                            trafficModel: google.maps.TrafficModel.BEST_GUESS,
                        },
                    });
                    setDriverToPickupRoute(result);

                    // Extract ETA to pickup (prefer duration_in_traffic if available)
                    const leg = result.routes[0]?.legs[0];
                    const durationSeconds = (leg as any)?.duration_in_traffic?.value || leg?.duration?.value;
                    if (durationSeconds) {
                        setLiveEta(prev => ({ ...prev, toPickup: Math.ceil(durationSeconds / 60) }));
                    }
                } catch (error) {
                    console.error('Error calculating driver route:', error);
                }
            }

            // Calculate ETA to dropoff (when in_progress)
            if (status === 'in_progress') {
                try {
                    const result = await directionsService.route({
                        origin: driverLocation,
                        destination: dropoff,
                        travelMode: google.maps.TravelMode.DRIVING,
                        // Add traffic consideration for more accurate ETA
                        drivingOptions: {
                            departureTime: new Date(),
                            trafficModel: google.maps.TrafficModel.BEST_GUESS,
                        },
                    });

                    // Extract ETA to dropoff (prefer duration_in_traffic if available)
                    const leg = result.routes[0]?.legs[0];
                    const durationSeconds = (leg as any)?.duration_in_traffic?.value || leg?.duration?.value;
                    if (durationSeconds) {
                        setLiveEta(prev => ({ ...prev, toDropoff: Math.ceil(durationSeconds / 60) }));
                    }
                } catch (error) {
                    console.error('Error calculating ETA:', error);
                }
            }
        };

        calculateDriverRoute();
    }, [mode, isLoaded, driverLocation, status, pickup, dropoff]);

    // Clear driver route when status changes
    useEffect(() => {
        if (status === 'in_progress' || status === 'completed' || status === 'selecting') {
            setDriverToPickupRoute(null);
        }
        if (status === 'selecting' || status === 'completed') {
            setLiveEta({ toPickup: null, toDropoff: null });
        }
    }, [status]);

    // Get directions
    const getDirections = useCallback(async () => {
        if (!pickup || !dropoff || !isLoaded) return;

        const directionsService = new google.maps.DirectionsService();

        try {
            const result = await directionsService.route({
                origin: pickup,
                destination: dropoff,
                travelMode: google.maps.TravelMode.DRIVING,
            });

            setDirections(result);

            const route = result.routes[0];
            if (route?.overview_path) {
                let totalDistance = 0;
                const pathPoints: PathPoint[] = route.overview_path.map((point, index, arr) => {
                    if (index > 0) {
                        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
                            arr[index - 1],
                            point
                        );
                    }
                    return {
                        lat: point.lat(),
                        lng: point.lng(),
                        distance: totalDistance,
                    };
                });
                setRoutePath(pathPoints);

                const leg = route.legs[0];
                const durationSeconds = leg?.duration?.value || 0;
                const distanceKm = totalDistance / 1000;
                const durationMin = Math.round(durationSeconds / 60);

                // Use route price from DB if available (live mode), otherwise calculate
                let price: number;
                if (mode === 'live' && routePrice) {
                    price = routePrice;
                } else if (mode === 'live' && selectedVehicle) {
                    price = selectedVehicle.price;
                } else {
                    price = Math.round(distanceKm * 15 + 50);
                }

                setTripInfo({
                    distance: Math.round(distanceKm * 10) / 10,
                    duration: durationMin,
                    pickup: pickup.name,
                    dropoff: dropoff.name,
                    price,
                });
                setEta(durationMin);
            }
        } catch (error) {
            console.error('Error getting directions:', error);
        }
    }, [pickup, dropoff, isLoaded, mode, routePrice, selectedVehicle]);

    useEffect(() => {
        if (isLoaded) {
            getDirections();
        }
    }, [pickup, dropoff, isLoaded, getDirections]);

    // Start trip simulation
    const startTrip = useCallback(() => {
        if (routePath.length < 2) return;

        setStatus('driver_en_route');
        setIsSimulating(true);
        setProgress(0);
        setDriverLocation(routePath[0]);
        setRemainingPath(routePath.map(p => ({ lat: p.lat, lng: p.lng })));
        setFollowCar(true);

        if (mapRef.current) {
            mapRef.current.setZoom(16);
            mapRef.current.setCenter(routePath[0]);
        }

        const totalDistance = routePath[routePath.length - 1].distance;
        // Use faster speed for demo (200 km/h simulation speed for smooth animation)
        const speedMps = (200 * 1000) / 3600;
        const startTime = Date.now();
        // Store original duration from Google Directions for ETA calculation
        const originalDuration = tripInfo?.duration || 60;

        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const distanceTraveled = elapsed * speedMps;
            const progressPercent = Math.min((distanceTraveled / totalDistance) * 100, 100);

            setProgress(progressPercent);

            const completedPoints = routePath.filter((p) => p.distance <= distanceTraveled);
            const nextPoint = routePath.find((p) => p.distance > distanceTraveled);

            if (nextPoint && completedPoints.length > 0) {
                const lastPoint = completedPoints[completedPoints.length - 1];
                const segmentDistance = nextPoint.distance - lastPoint.distance;
                const segmentProgress = (distanceTraveled - lastPoint.distance) / segmentDistance;

                const currentLat = lastPoint.lat + (nextPoint.lat - lastPoint.lat) * segmentProgress;
                const currentLng = lastPoint.lng + (nextPoint.lng - lastPoint.lng) * segmentProgress;
                const currentPosition = { lat: currentLat, lng: currentLng };

                setDriverLocation(currentPosition);
                setDriverBearing(calculateBearing(lastPoint, nextPoint));

                // Calculate remaining ETA based on original Google Directions duration
                const remainingEta = Math.round(originalDuration * (1 - progressPercent / 100));
                setEta(remainingEta);

                const currentIndex = completedPoints.length;
                setRemainingPath([
                    currentPosition,
                    ...routePath.slice(currentIndex).map(p => ({ lat: p.lat, lng: p.lng }))
                ]);

                if (progressPercent >= 95) {
                    setStatus('completed');
                } else if (progressPercent >= 15) {
                    setStatus('in_progress');
                }
            }

            if (progressPercent < 100) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setDriverLocation(routePath[routePath.length - 1]);
                setRemainingPath([]);
                setIsSimulating(false);
                setStatus('completed');
                setEta(0);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, [routePath]);

    // Stop simulation
    const stopTrip = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setIsSimulating(false);
    };

    // Reset trip
    const resetTrip = () => {
        stopTrip();
        setStatus('selecting');
        setDriverLocation(null);
        setProgress(0);
        setRemainingPath([]);
        setAssignedDriver(null);
        setBookingId(null);
        setActiveBooking(null);  // Clear active booking
        if (tripInfo) setEta(tripInfo.duration);
    };

    // === NEW: Create live booking ===
    const createLiveBooking = async (): Promise<string | null> => {
        if (!user || !tripInfo || !selectedVehicle) {
            alert(language === 'th' ? 'กรุณาเข้าสู่ระบบก่อนจองรถ' : 'Please login to book');
            return null;
        }

        try {
            setIsCreatingBooking(true);

            const bookingData = {
                // Personal info
                firstName: user.displayName?.split(' ')[0] || 'Guest',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                email: user.email || '',
                phone: user.phoneNumber || '',
                // Trip details
                pickupLocation: pickup.name,
                dropoffLocation: dropoff.name,
                // Save coordinates for map restoration
                pickupCoordinates: { lat: pickup.lat, lng: pickup.lng },
                dropoffCoordinates: { lat: dropoff.lat, lng: dropoff.lng },
                pickupLocationId: pickup.id || '',
                dropoffLocationId: dropoff.id || '',
                pickupDate: new Date().toISOString().split('T')[0],
                pickupTime: new Date().toTimeString().slice(0, 5),
                tripType: 'oneWay' as const,
                // Vehicle (conform to BookingContext.Vehicle interface)
                vehicle: {
                    id: selectedVehicle.id,
                    name: selectedVehicle.name,
                    type: typeof selectedVehicle.type === 'string' ? selectedVehicle.type : 'sedan',
                    price: selectedVehicle.price,
                    image: selectedVehicle.image,
                    passengers: selectedVehicle.passengers ?? selectedVehicle.seats,
                    luggage: selectedVehicle.luggage ?? 2,
                    transmission: selectedVehicle.transmission ?? 'automatic',
                    features: selectedVehicle.features,
                },
                // Extras
                addInsurance: false,
                addLuggage: false,
                // Additional booking details
                flightNumber: '',
                passengerCount: 1,
                luggageCount: 1,
                specialRequests: '',
                // Payment
                paymentMethod: 'cash' as const,
            };

            const newBookingId = await BookingService.addBooking(
                bookingData,
                tripInfo.price,
                user.uid
            );

            setBookingId(newBookingId);
            return newBookingId;
        } catch (error) {
            console.error('Error creating booking:', error);
            alert(language === 'th' ? 'ไม่สามารถสร้างการจองได้' : 'Failed to create booking');
            return null;
        } finally {
            setIsCreatingBooking(false);
        }
    };

    // === NEW: Cancel live booking ===
    const handleCancelClick = () => {
        if (!activeBooking?.id) return;

        // Only allow cancellation for pending, confirmed, and driver_assigned status
        // (driver_assigned = driver hasn't accepted yet, still cancellable)
        const cancellableStatuses = ['pending', 'confirmed', 'driver_assigned'];
        if (!cancellableStatuses.includes(activeBooking.status)) {
            // Show error in modal style
            return;
        }

        setShowCancelModal(true);
    };

    // Helper: Retry function with exponential backoff
    const retryWithBackoff = async <T,>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> => {
        let lastError: Error | null = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                if (i < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, i);
                    console.log(`⏳ Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    };

    const confirmCancelBooking = async () => {
        if (!activeBooking?.id) return;

        setIsCancellingBooking(true);
        try {
            // 1. Update booking status to cancelled
            await BookingService.updateBookingStatus(
                activeBooking.id,
                'cancelled',
                language === 'th' ? 'ผู้ใช้ยกเลิกการจอง' : 'User cancelled the booking'
            );

            // 2. If driver was assigned, set driver status back to available (with retry)
            if (activeBooking.driver?.driverId) {
                try {
                    await retryWithBackoff(
                        () => DriverService.updateDriverStatus(activeBooking.driver!.driverId, 'available' as any),
                        3,
                        1000
                    );
                    console.log('✅ Driver status updated to available');
                } catch (driverError) {
                    console.error('❌ Failed to update driver status after retries:', driverError);
                    // Show warning to user but continue
                    setConnectionError(
                        language === 'th'
                            ? 'ไม่สามารถอัปเดตสถานะคนขับ กรุณาแจ้งแอดมิน'
                            : 'Failed to update driver status. Please contact admin.'
                    );
                }
            }

            // 3. Reset state
            setActiveBooking(null);
            setBookingId(null);
            setAssignedDriver(null);
            setStatus('selecting');
            setShowCancelModal(false);
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert(language === 'th' ? 'ไม่สามารถยกเลิกการจองได้' : 'Failed to cancel booking');
        } finally {
            setIsCancellingBooking(false);
        }
    };

    // === NEW: Handle search timeout (no drivers found after max attempts) ===
    const handleSearchTimeout = async () => {
        if (!bookingId) return;

        try {
            // Cancel the booking
            await BookingService.updateBookingStatus(
                bookingId,
                'cancelled',
                language === 'th' ? 'ไม่พบคนขับหลังจากพยายามหลายครั้ง' : 'No drivers found after multiple attempts'
            );

            // Reset state
            setActiveBooking(null);
            setBookingId(null);
            setAssignedDriver(null);
            setRejectedDrivers([]);
            setRematchAttempt(0);
            setIsRematching(false);
            searchStartTimeRef.current = null;
            setStatus('selecting');

            // Show alert
            alert(
                language === 'th'
                    ? 'ขออภัย ไม่พบคนขับที่ว่างในขณะนี้ กรุณาลองใหม่อีกครั้ง'
                    : 'Sorry, no available drivers at this time. Please try again.'
            );
        } catch (error) {
            console.error('Error handling search timeout:', error);
        }
    };

    // === NEW: Trigger re-match with new driver ===
    const triggerRematch = async (currentBookingId: string, attempt: number) => {
        console.log(`🔄 Triggering re-match attempt ${attempt}...`);

        // Filter available drivers (exclude rejected ones and self)
        const eligibleDrivers = availableDrivers.filter(driver =>
            driver.userId !== user?.uid &&
            !rejectedDrivers.includes(driver.id)
        );

        if (eligibleDrivers.length === 0) {
            console.log('❌ No more eligible drivers available');
            setRematchMessage(
                language === 'th'
                    ? 'ไม่พบคนขับที่ว่าง'
                    : 'No available drivers'
            );
            setIsRematching(false);

            setTimeout(() => {
                setRematchMessage(null);
                handleSearchTimeout();
            }, 2000);
            return;
        }

        try {
            // Pick a random eligible driver
            const randomIndex = Math.floor(Math.random() * eligibleDrivers.length);
            const driver = eligibleDrivers[randomIndex];

            const token = await user?.getIdToken();
            if (!token) {
                throw new Error('No auth token');
            }

            // Update match attempts in booking (using direct Firestore update)
            if (db) {
                const bookingRef = doc(db, 'bookings', currentBookingId);
                await updateDoc(bookingRef, {
                    matchAttempts: attempt,
                    lastMatchAttemptAt: Timestamp.now(),
                });
            }

            // Assign new driver
            const response = await fetch('/api/booking/assign-driver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bookingId: currentBookingId,
                    driverId: driver.id,
                    driverName: driver.name,
                    driverPhone: driver.phone,
                    vehiclePlate: driver.vehiclePlate,
                    vehicleModel: driver.vehicleModel,
                    vehicleColor: driver.vehicleColor,
                }),
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Re-match successful with driver: ${driver.name}`);
                setAssignedDriver(driver);
                setRematchMessage(
                    language === 'th'
                        ? `พบคนขับใหม่: ${driver.name}`
                        : `Found new driver: ${driver.name}`
                );

                // Clear message after 2 seconds
                setTimeout(() => {
                    setRematchMessage(null);
                    setIsRematching(false);
                }, 2000);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Re-match error:', error);
            setRematchMessage(
                language === 'th'
                    ? 'ไม่สามารถหาคนขับใหม่ได้'
                    : 'Failed to find new driver'
            );

            setTimeout(() => {
                setRematchMessage(null);
                handleSearchTimeout();
            }, 2000);
        }
    };

    // === NEW: Find and assign driver ===
    const findAndAssignDriver = async (bookingIdToAssign: string, excludeDrivers: string[] = []): Promise<boolean> => {
        // Filter out drivers whose userId matches current user AND rejected drivers
        const eligibleDrivers = availableDrivers.filter(driver =>
            driver.userId !== user?.uid &&
            !excludeDrivers.includes(driver.id)
        );

        if (eligibleDrivers.length === 0) {
            const message = language === 'th'
                ? 'ไม่พบคนขับที่ว่าง (หมายเหตุ: คนขับไม่สามารถรับงานของตัวเองได้)'
                : 'No available drivers (Note: Drivers cannot accept their own bookings)';
            alert(message);
            return false;
        }

        try {
            // Pick a random eligible driver (excluding self)
            const randomIndex = Math.floor(Math.random() * eligibleDrivers.length);
            const driver = eligibleDrivers[randomIndex];

            // Get auth token for API call
            const token = await user?.getIdToken();
            if (!token) {
                alert(language === 'th' ? 'กรุณาเข้าสู่ระบบใหม่' : 'Please login again');
                return false;
            }

            // Use API to assign driver (bypasses Firestore rules)
            const response = await fetch('/api/booking/assign-driver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bookingId: bookingIdToAssign,
                    driverId: driver.id,
                    driverName: driver.name,
                    driverPhone: driver.phone,
                    vehiclePlate: driver.vehiclePlate,
                    vehicleModel: driver.vehicleModel,
                    vehicleColor: driver.vehicleColor,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to assign driver');
            }

            setAssignedDriver(driver);
            return true;
        } catch (error: any) {
            console.error('Error assigning driver:', error);
            alert(error.message || (language === 'th' ? 'ไม่สามารถมอบหมายคนขับได้' : 'Failed to assign driver'));
            return false;
        }
    };

    // === NEW: Start live trip ===
    const startLiveTrip = async () => {
        setStatus('searching');

        // Initialize search start time for auto re-match timeout
        searchStartTimeRef.current = Date.now();
        setRematchAttempt(0);
        setRejectedDrivers([]);
        setIsRematching(false);
        setRematchMessage(null);

        // Create booking
        const newBookingId = await createLiveBooking();
        if (!newBookingId) {
            setStatus('selecting');
            return;
        }

        // Find and assign driver
        const assigned = await findAndAssignDriver(newBookingId);
        if (!assigned) {
            // Cancel the booking that was just created since no driver available
            try {
                await BookingService.updateBookingStatus(
                    newBookingId,
                    'cancelled',
                    language === 'th' ? 'ไม่พบคนขับที่ว่าง' : 'No available drivers found'
                );
                console.log('🗑️ Booking cancelled due to no available drivers');
            } catch (cancelError) {
                console.error('Failed to cancel booking:', cancelError);
            }
            setBookingId(null);
            setStatus('selecting');
            return;
        }

        // Move to driver assigned status
        // Note: Status will automatically update via Firestore subscription when:
        // - Admin confirms booking (pending → confirmed)
        // - Admin assigns driver (confirmed → driver_assigned)
        // - Driver starts trip (driver_assigned → driver_en_route)
        // - Driver picks up (driver_en_route → in_progress)
        // - Driver completes (in_progress → completed)
        setStatus('driver_assigned');
        setFollowCar(true);
    };

    // Map handlers
    const onMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
        map.addListener('heading_changed', () => {
            setMapHeading(map.getHeading() || 0);
        });
    };

    const onMapDragStart = () => {
        if (isSimulating) setFollowCar(false);
    };

    const fitBounds = () => {
        if (!mapRef.current || !pickup || !dropoff) return;
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickup);
        bounds.extend(dropoff);
        if (driverLocation) bounds.extend(driverLocation);
        mapRef.current.fitBounds(bounds, 80);
    };

    const zoomToCar = () => {
        if (!mapRef.current || !driverLocation) return;
        mapRef.current.panTo(driverLocation);
        mapRef.current.setZoom(17);
    };

    const resetToNorth = () => {
        if (mapRef.current) {
            mapRef.current.setHeading(0);
            setMapHeading(0);
        }
    };

    // Follow car effect
    useEffect(() => {
        if (!followCar || !driverLocation || !mapRef.current || !isSimulating) return;
        const now = Date.now();
        if (now - lastPanTimeRef.current < 500) return;
        lastPanTimeRef.current = now;
        mapRef.current.panTo(driverLocation);
    }, [followCar, driverLocation, isSimulating]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Handle location selection
    const handleLocationSelect = (location: any) => {
        const locationName = language === 'th' ? location.name?.th : location.name?.en;
        const coords = location.coordinates || { lat: 13.7563, lng: 100.5018 };

        if (locationPickerType === 'pickup') {
            setPickup({ ...coords, name: locationName || location.name?.en, id: location.id });
        } else {
            setDropoff({ ...coords, name: locationName || location.name?.en, id: location.id });
        }
        setShowLocationPicker(false);
        resetTrip();
    };

    // Filter locations
    const filteredLocations = locations.filter(loc => {
        const searchLower = searchQuery.toLowerCase();
        const nameTh = loc.name?.th?.toLowerCase() || '';
        const nameEn = loc.name?.en?.toLowerCase() || '';
        return nameTh.includes(searchLower) || nameEn.includes(searchLower);
    });

    // Status config
    const statusConfig: Record<string, { color: string; text: string }> = {
        selecting: { color: 'bg-gray-500', text: language === 'th' ? 'เลือกเส้นทาง' : 'Select Route' },
        searching: { color: 'bg-amber-500', text: language === 'th' ? 'กำลังหาคนขับ...' : 'Finding Driver...' },
        driver_assigned: { color: 'bg-blue-500', text: language === 'th' ? 'พบคนขับแล้ว!' : 'Driver Found!' },
        driver_en_route: { color: 'bg-purple-500', text: language === 'th' ? 'คนขับกำลังมารับ' : 'Driver En Route' },
        in_progress: { color: 'bg-emerald-500', text: language === 'th' ? 'กำลังเดินทาง' : 'In Progress' },
        completed: { color: 'bg-green-600', text: language === 'th' ? 'ถึงปลายทางแล้ว!' : 'Arrived!' },
    };

    // API Key check
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Loading states
    if (!apiKey) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 max-w-md text-center">
                    <p className="text-yellow-600 font-bold text-lg mb-2">
                        {language === 'th' ? 'ไม่พบ API Key' : 'API Key Not Found'}
                    </p>
                    <p className="text-yellow-500 text-sm">
                        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                    </p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-gray-100">
                <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">{language === 'th' ? 'กำลังโหลดแผนที่...' : 'Loading Map...'}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">
                        {language === 'th' ? 'ไม่สามารถโหลดแผนที่ได้' : 'Failed to Load Map'}
                    </p>
                    <p className="text-red-500 text-sm">{loadError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen h-[100dvh] bg-gray-100 overflow-hidden">
            <div className="max-w-[430px] mx-auto bg-white h-full flex flex-col relative shadow-2xl overflow-hidden">

                {/* Header */}
                <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
                    <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-lg font-semibold text-gray-900">
                                {language === 'th' ? 'ติดตามการเดินทาง' : 'Track Trip'}
                            </h1>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => { setMode('demo'); resetTrip(); }}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    mode === 'demo' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                                }`}
                            >
                                Demo
                            </button>
                            <button
                                onClick={() => { setMode('live'); resetTrip(); }}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    mode === 'live' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                                }`}
                            >
                                Live
                            </button>
                        </div>
                    </div>
                </header>

                {/* Connection Error Banner */}
                {connectionError && (
                    <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm font-medium">{connectionError}</span>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                            {language === 'th' ? 'รีเฟรช' : 'Refresh'}
                        </button>
                    </div>
                )}

                {/* Map Area */}
                <div className="relative flex-1 min-h-0" style={{ minHeight: '35vh' }}>
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                        center={pickup}
                        zoom={13}
                        options={{ ...mapOptions, mapTypeId: mapType }}
                        onLoad={onMapLoad}
                        onDragStart={onMapDragStart}
                    >
                        {/* Traffic Layer */}
                        {showTraffic && <TrafficLayer />}

                        {/* Route */}
                        {directions && !isSimulating && (
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

                        {/* Remaining Route */}
                        {isSimulating && remainingPath.length > 1 && (
                            <Polyline
                                path={remainingPath}
                                options={{
                                    strokeColor: '#3b82f6',
                                    strokeWeight: 5,
                                    strokeOpacity: 0.8,
                                }}
                            />
                        )}

                        {/* Pickup Marker */}
                        {status !== 'in_progress' && status !== 'completed' && (
                            <Marker
                                position={pickup}
                                icon={createMarkerIcon(PICKUP_MARKER_SVG, 44)}
                                title={pickup.name}
                            />
                        )}

                        {/* Dropoff Marker */}
                        <Marker
                            position={dropoff}
                            icon={createMarkerIcon(DROPOFF_MARKER_SVG, 44)}
                            title={dropoff.name}
                        />

                        {/* === NEW: Searching Ripple Animation === */}
                        {status === 'searching' && (
                            <SearchingRipple position={pickup} />
                        )}

                        {/* === NEW: Driver-to-Pickup Route (dashed line) === */}
                        {driverToPickupRoute && (status === 'driver_assigned' || status === 'driver_en_route') && (
                            <DirectionsRenderer
                                directions={driverToPickupRoute}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: {
                                        strokeColor: '#00b14f',
                                        strokeWeight: 4,
                                        strokeOpacity: 0,
                                        icons: [{
                                            icon: {
                                                path: 'M 0,-1 0,1',
                                                strokeOpacity: 1,
                                                strokeColor: '#00b14f',
                                                scale: 4,
                                            },
                                            offset: '0',
                                            repeat: '20px',
                                        }],
                                    },
                                }}
                            />
                        )}

                        {/* Driver Car */}
                        {driverLocation && (
                            <CarMarker position={driverLocation} bearing={driverBearing} />
                        )}
                    </GoogleMap>

                    {/* ETA Badge - Demo Mode (Responsive) */}
                    {eta !== null && isSimulating && followCar && (
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white rounded-xl sm:rounded-2xl shadow-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-500">{language === 'th' ? 'ถึงใน' : 'ETA'}</p>
                            <p className="text-base sm:text-xl font-bold text-blue-600">
                                {eta >= 60
                                    ? `${Math.floor(eta / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${eta % 60} ${language === 'th' ? 'น.' : 'min'}`
                                    : `${eta} ${language === 'th' ? 'นาที' : 'min'}`
                                }
                            </p>
                        </div>
                    )}

                    {/* === NEW: Live ETA Badge (Responsive) === */}
                    {mode === 'live' && (status === 'driver_en_route' || status === 'in_progress') && (
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white rounded-xl sm:rounded-2xl shadow-lg p-2 sm:p-3 border-l-4 border-[#00b14f]">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00b14f] rounded-full animate-pulse"></div>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                    {status === 'driver_en_route'
                                        ? (language === 'th' ? 'คนขับถึงจุดรับใน' : 'Driver arrives in')
                                        : (language === 'th' ? 'ถึงปลายทางใน' : 'Arriving in')
                                    }
                                </p>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold text-[#00b14f]">
                                {status === 'driver_en_route' && liveEta.toPickup !== null ? (
                                    liveEta.toPickup >= 60
                                        ? `${Math.floor(liveEta.toPickup / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${liveEta.toPickup % 60} ${language === 'th' ? 'น.' : 'min'}`
                                        : `${liveEta.toPickup} ${language === 'th' ? 'นาที' : 'min'}`
                                ) : status === 'in_progress' && liveEta.toDropoff !== null ? (
                                    liveEta.toDropoff >= 60
                                        ? `${Math.floor(liveEta.toDropoff / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${liveEta.toDropoff % 60} ${language === 'th' ? 'น.' : 'min'}`
                                        : `${liveEta.toDropoff} ${language === 'th' ? 'นาที' : 'min'}`
                                ) : (
                                    <span className="text-gray-400 text-xs sm:text-sm">{language === 'th' ? 'กำลังคำนวณ...' : 'Calculating...'}</span>
                                )}
                            </p>
                            {assignedDriver && (
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate max-w-[120px] sm:max-w-[150px]">
                                    🚗 {assignedDriver.name}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Follow Stopped Banner (Responsive) */}
                    {isSimulating && !followCar && (
                        <div className="absolute top-2 left-2 right-12 sm:top-4 sm:left-4 sm:right-16 z-20">
                            <button
                                onClick={() => { zoomToCar(); setFollowCar(true); }}
                                className="w-full bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg p-2 sm:p-3 flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.98] transition-transform"
                            >
                                <span className="text-base sm:text-lg">🚗</span>
                                <span className="font-medium text-xs sm:text-sm">
                                    {language === 'th' ? 'กดเพื่อติดตามรถ' : 'Tap to follow'}
                                </span>
                                {eta !== null && (
                                    <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                                        {eta >= 60
                                            ? `${Math.floor(eta / 60)}${language === 'th' ? 'ชม.' : 'h'} ${eta % 60}${language === 'th' ? 'น.' : 'm'}`
                                            : `${eta} ${language === 'th' ? 'นาที' : 'min'}`
                                        }
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* === Map Controls - Minimal Modern Style === */}
                    {/* Top Right: Compass only */}
                    <div className="absolute top-3 right-3">
                        <button
                            onClick={resetToNorth}
                            className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center hover:bg-white active:scale-95 transition-all"
                            title={language === 'th' ? 'หันไปทิศเหนือ' : 'Reset to North'}
                        >
                            <div style={{ transform: `rotate(${-mapHeading}deg)` }} className="transition-transform duration-300">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 3L15 11H9L12 3Z" fill="#ef4444"/>
                                    <path d="M12 21L9 13H15L12 21Z" fill="#94a3b8"/>
                                </svg>
                            </div>
                        </button>
                    </div>

                    {/* Bottom Right: Control Group - Pill Style */}
                    <div className="absolute bottom-20 right-3 flex flex-col items-end gap-2">
                        {/* Follow Car Button - Only when driver is active */}
                        {driverLocation && (
                            <button
                                onClick={() => { zoomToCar(); setFollowCar(true); }}
                                className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-all ${
                                    followCar
                                        ? 'bg-[#00b14f] shadow-[#00b14f]/30'
                                        : 'bg-white/95 backdrop-blur-sm animate-pulse'
                                }`}
                                title={language === 'th' ? 'ติดตามรถ' : 'Follow Car'}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={followCar ? 'white' : '#00b14f'}>
                                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                </svg>
                            </button>
                        )}

                        {/* Main Control Pill */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm p-1 flex flex-col gap-0.5">
                            {/* My Location (GPS) */}
                            <button
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(
                                            (position) => {
                                                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                                                mapRef.current?.panTo(pos);
                                                mapRef.current?.setZoom(15);
                                            },
                                            () => alert(language === 'th' ? 'ไม่สามารถดึงตำแหน่งได้' : 'Could not get location')
                                        );
                                    }
                                }}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                                title={language === 'th' ? 'ตำแหน่งของฉัน' : 'My Location'}
                            >
                                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                                    <circle cx="12" cy="12" r="8" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                                    <path d="M12 2v3m0 14v3m-10-10h3m14 0h3" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>

                            {/* Divider */}
                            <div className="w-5 h-px bg-gray-200 mx-auto"/>

                            {/* Fit Route */}
                            <button
                                onClick={fitBounds}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                                title={language === 'th' ? 'แสดงเส้นทางทั้งหมด' : 'Fit Route'}
                            >
                                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                </svg>
                            </button>
                        </div>

                        {/* Secondary Control Pill */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm p-1 flex flex-col gap-0.5">
                            {/* Satellite Toggle */}
                            <button
                                onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all ${
                                    mapType === 'satellite' ? 'bg-blue-500' : 'hover:bg-gray-100'
                                }`}
                                title={language === 'th' ? 'มุมมองดาวเทียม' : 'Satellite View'}
                            >
                                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill={mapType === 'satellite' ? 'white' : '#64748b'}>
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                                </svg>
                            </button>

                            {/* Divider */}
                            <div className="w-5 h-px bg-gray-200 mx-auto"/>

                            {/* Traffic Toggle */}
                            <button
                                onClick={() => setShowTraffic(!showTraffic)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all ${
                                    showTraffic ? 'bg-amber-400' : 'hover:bg-gray-100'
                                }`}
                                title={language === 'th' ? 'การจราจร' : 'Traffic'}
                            >
                                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill={showTraffic ? 'white' : '#64748b'}>
                                    <path d="M9 2c-.55 0-1 .45-1 1v1H6c0 1.66 1.34 3 3 3v2H6c0 1.66 1.34 3 3 3v2H6c0 1.66 1.34 3 3 3v1c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1c1.66 0 3-1.34 3-3h-3v-2c1.66 0 3-1.34 3-3h-3V7c1.66 0 3-1.34 3-3h-2V3c0-.55-.45-1-1-1H9zm2 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* === SOS Button (Bottom Left) - Responsive === */}
                    {(status === 'driver_en_route' || status === 'in_progress') && (
                        <button
                            onClick={() => {
                                if (confirm(language === 'th' ? 'ต้องการโทรฉุกเฉิน 191?' : 'Call emergency 191?')) {
                                    window.location.href = 'tel:191';
                                }
                            }}
                            className="absolute bottom-16 left-2 sm:bottom-20 sm:left-3 h-9 sm:h-10 px-3 sm:px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span className="font-bold text-xs sm:text-sm">SOS</span>
                        </button>
                    )}

                    {/* === Trip Progress Bar (Bottom) - Live Mode (Responsive) === */}
                    {mode === 'live' && status === 'in_progress' && liveEta.toDropoff !== null && tripInfo && (
                        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-white rounded-xl sm:rounded-2xl shadow-lg p-2 sm:p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00b14f] rounded-full animate-pulse"></div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                                        {language === 'th' ? 'กำลังเดินทาง' : 'In Progress'}
                                    </span>
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-[#00b14f]">
                                    {liveEta.toDropoff >= 60
                                        ? `${Math.floor(liveEta.toDropoff / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${liveEta.toDropoff % 60} ${language === 'th' ? 'น.' : 'min'}`
                                        : `${liveEta.toDropoff} ${language === 'th' ? 'นาที' : 'min'}`
                                    }
                                </span>
                            </div>
                            <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#00b14f] to-[#00d861] rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.max(5, Math.min(95, 100 - (liveEta.toDropoff / (tripInfo.duration || 60)) * 100))}%`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] sm:text-xs text-gray-500">
                                <span>{pickup.name.substring(0, 12)}...</span>
                                <span>{dropoff.name.substring(0, 12)}...</span>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar - Demo Mode */}
                    {isSimulating && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Sheet - Grab Style (Light) */}
                <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] -mt-6 relative z-10 flex-shrink-0 max-h-[55vh] flex flex-col overflow-hidden">
                    {/* Handle */}
                    <div className="flex justify-center py-3">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>

                    {/* Status Badge - Grab Style */}
                    <div className="flex justify-center mb-3">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                            status === 'selecting' ? 'bg-gray-100 text-gray-600' :
                            status === 'searching' ? 'bg-[#00b14f]/10 text-[#00b14f]' :
                            status === 'driver_assigned' ? 'bg-blue-50 text-blue-600' :
                            status === 'driver_en_route' ? 'bg-[#00b14f]/10 text-[#00b14f]' :
                            status === 'in_progress' ? 'bg-[#00b14f] text-white' :
                            status === 'completed' ? 'bg-[#00b14f] text-white' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {statusConfig[status]?.text}
                        </div>
                    </div>

                    <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] space-y-3 overflow-y-auto flex-1">

                        {/* Route Info Card - Grab Style */}
                        {status !== 'completed' && (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex">
                                {/* Connection Line - Grab Style */}
                                <div className="flex flex-col items-center mr-4">
                                    <div className="w-3 h-3 rounded-full bg-[#00b14f] ring-4 ring-[#00b14f]/20" />
                                    <div className="w-0.5 h-10 bg-gray-300 my-1" />
                                    <div className="w-3 h-3 rounded-sm bg-orange-500 ring-4 ring-orange-500/20" />
                                </div>

                                {/* Location Info */}
                                <div className="flex-1 space-y-2">
                                    <button
                                        onClick={() => { setLocationPickerType('pickup'); setSearchQuery(''); setShowLocationPicker(true); }}
                                        disabled={status !== 'selecting'}
                                        className="w-full text-left p-2 -m-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:hover:bg-transparent disabled:cursor-default group"
                                    >
                                        <p className="text-[11px] text-[#00b14f] font-semibold uppercase tracking-wider">
                                            {language === 'th' ? 'จุดรับ' : 'Pickup'}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[15px] font-semibold text-gray-900 truncate" title={pickup.name}>
                                                {pickup.name}
                                            </p>
                                            {status === 'selecting' && (
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-[#00b14f] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>

                                    <div className="h-px bg-gray-200" />

                                    <button
                                        onClick={() => { setLocationPickerType('dropoff'); setSearchQuery(''); setShowLocationPicker(true); }}
                                        disabled={status !== 'selecting'}
                                        className="w-full text-left p-2 -m-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:hover:bg-transparent disabled:cursor-default group"
                                    >
                                        <p className="text-[11px] text-orange-500 font-semibold uppercase tracking-wider">
                                            {language === 'th' ? 'จุดส่ง' : 'Dropoff'}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[15px] font-semibold text-gray-900 truncate" title={dropoff.name}>
                                                {dropoff.name}
                                            </p>
                                            {status === 'selecting' && (
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Price/Distance - Grab Style */}
                                {tripInfo && (
                                    <div className="text-right ml-4 flex-shrink-0">
                                        <p className="text-2xl font-bold text-[#00b14f]">฿{tripInfo.price.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {tripInfo.distance} km • {tripInfo.duration >= 60
                                                ? `${Math.floor(tripInfo.duration / 60)}${language === 'th' ? 'ชม.' : 'h'}${tripInfo.duration % 60}${language === 'th' ? 'น.' : 'm'}`
                                                : `${tripInfo.duration}${language === 'th' ? 'น.' : 'm'}`
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* Driver Info Card - Grab Style */}
                        {(status === 'driver_en_route' || status === 'in_progress') && (
                            <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl overflow-hidden flex-shrink-0 ring-2 ring-[#00b14f]/20">
                                        {assignedDriver?.photo ? (
                                            <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            '👨‍✈️'
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-lg truncate">
                                            {mode === 'live' && assignedDriver ? assignedDriver.name : MOCK_DRIVER.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="text-amber-500">⭐ {mode === 'live' && assignedDriver ? assignedDriver.rating?.toFixed(1) || '5.0' : MOCK_DRIVER.rating}</span>
                                            <span>•</span>
                                            <span className="truncate">{mode === 'live' && assignedDriver ? assignedDriver.vehicleModel : MOCK_DRIVER.vehicleModel}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 font-semibold">{mode === 'live' && assignedDriver ? assignedDriver.vehiclePlate : MOCK_DRIVER.vehiclePlate}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <a
                                            href={`tel:${mode === 'live' && assignedDriver ? assignedDriver.phone : MOCK_DRIVER.phone}`}
                                            className="w-11 h-11 bg-[#00b14f] text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </a>
                                        <button className="w-11 h-11 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform hover:bg-gray-200">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Waiting for driver - Grab Style */}
                        {status === 'driver_assigned' && (
                            <div className="bg-[#00b14f]/5 rounded-2xl p-4 border border-[#00b14f]/20">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 bg-[#00b14f]/10 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#00b14f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#00b14f] rounded-full flex items-center justify-center animate-pulse">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900">
                                            {language === 'th' ? 'กำลังจับคู่คนขับ...' : 'Matching driver...'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {language === 'th' ? 'คนขับกำลังตอบรับงาน' : 'Driver is accepting the trip'}
                                        </p>
                                    </div>
                                    <div className="animate-spin flex-shrink-0">
                                        <div className="w-6 h-6 border-2 border-[#00b14f]/30 border-t-[#00b14f] rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vehicle Selection - Grab Style */}
                        {mode === 'live' && status === 'selecting' && selectedVehicle && !isLoadingActiveBooking && !activeBooking && (
                            <button
                                onClick={() => setShowVehiclePicker(true)}
                                className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors shadow-sm active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#00b14f]/10 rounded-xl flex items-center justify-center text-2xl">
                                        {selectedVehicle.type === 'sedan' ? '🚗' :
                                         selectedVehicle.type === 'suv' ? '🚙' :
                                         selectedVehicle.type === 'van' ? '🚐' : '🚘'}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">{selectedVehicle.name}</p>
                                        <p className="text-sm text-gray-500">{selectedVehicle.seats} {language === 'th' ? 'ที่นั่ง' : 'seats'}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <div>
                                        <p className="font-bold text-[#00b14f]">฿{selectedVehicle.price.toLocaleString()}</p>
                                        <p className="text-xs text-gray-400">{language === 'th' ? 'เปลี่ยนรถ' : 'Change'}</p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        )}

                        {/* Loading - Grab Style */}
                        {mode === 'live' && isLoadingActiveBooking && (
                            <div className="flex items-center justify-center gap-3 py-4">
                                <div className="w-6 h-6 border-2 border-[#00b14f]/30 border-t-[#00b14f] rounded-full animate-spin"></div>
                                <p className="text-gray-500 text-sm">
                                    {language === 'th' ? 'กำลังตรวจสอบการจองของคุณ...' : 'Checking your bookings...'}
                                </p>
                            </div>
                        )}


                        {/* Main CTA Button - Grab Style */}
                        {status === 'selecting' && !(mode === 'live' && (isLoadingActiveBooking || activeBooking)) && (
                            <>
                                {/* Show Login button if not logged in (Live mode only) */}
                                {mode === 'live' && !user ? (
                                    <button
                                        onClick={() => router.push('/login?redirect=/test-maps1')}
                                        className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        {language === 'th' ? 'เข้าสู่ระบบเพื่อจอง' : 'Login to Book'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (mode === 'live') {
                                                startLiveTrip();
                                            } else {
                                                setStatus('searching');
                                                setTimeout(() => {
                                                    setStatus('driver_assigned');
                                                    setTimeout(startTrip, 1500);
                                                }, 2000);
                                            }
                                        }}
                                        disabled={mode === 'live' && (availableDrivers.length === 0 || isCreatingBooking)}
                                        className="w-full h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingBooking ? (
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                {mode === 'live'
                                                    ? (language === 'th' ? 'จองรถตอนนี้' : 'Book Now')
                                                    : (language === 'th' ? 'ค้นหาคนขับ' : 'Find Driver')
                                                }
                                            </>
                                        )}
                                    </button>
                                )}
                                {/* Show message if no drivers available */}
                                {mode === 'live' && user && availableDrivers.length === 0 && (
                                    <p className="text-xs text-orange-500 text-center mt-2">
                                        {language === 'th' ? '⏳ กำลังค้นหาคนขับที่ว่าง...' : '⏳ Looking for available drivers...'}
                                    </p>
                                )}
                            </>
                        )}

                        {/* Cancel Booking Button - Same position as Book Now */}
                        {mode === 'live' && activeBooking && ['pending', 'confirmed', 'driver_assigned'].includes(activeBooking.status) && (
                            <button
                                onClick={handleCancelClick}
                                disabled={isCancellingBooking}
                                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCancellingBooking ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        {language === 'th' ? 'ยกเลิกการจอง' : 'Cancel Booking'}
                                    </>
                                )}
                            </button>
                        )}

                        {/* Searching - Grab Style */}
                        {status === 'searching' && !activeBooking && (
                            <div className="flex flex-col items-center py-4">
                                <div className="w-10 h-10 border-3 border-[#00b14f]/30 border-t-[#00b14f] rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-700 font-medium">{language === 'th' ? 'กำลังค้นหาคนขับใกล้คุณ...' : 'Finding nearby drivers...'}</p>
                            </div>
                        )}

                        {/* Waiting for admin - Grab Style */}
                        {status === 'searching' && activeBooking && !isRematching && (
                            <div className="flex flex-col items-center py-4">
                                <div className="w-10 h-10 border-3 border-[#00b14f]/30 border-t-[#00b14f] rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-700 font-medium text-center">
                                    {language === 'th' ? 'กำลังจัดหาคนขับให้คุณ...' : 'Assigning driver...'}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {language === 'th' ? 'โปรดรอสักครู่' : 'Please wait a moment'}
                                </p>
                            </div>
                        )}

                        {/* Re-matching in progress - Shows when driver rejects */}
                        {isRematching && (
                            <div className="flex flex-col items-center py-4">
                                <div className="relative mb-3">
                                    <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-500 rounded-full animate-spin"></div>
                                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                        {rematchAttempt}
                                    </span>
                                </div>
                                <p className="text-gray-700 font-medium text-center">
                                    {rematchMessage || (language === 'th' ? 'กำลังค้นหาคนขับใหม่...' : 'Finding another driver...')}
                                </p>
                                <p className="text-amber-500 text-sm mt-1">
                                    {language === 'th'
                                        ? `พยายามครั้งที่ ${rematchAttempt}/${REMATCH_CONFIG.MAX_ATTEMPTS}`
                                        : `Attempt ${rematchAttempt}/${REMATCH_CONFIG.MAX_ATTEMPTS}`}
                                </p>
                            </div>
                        )}

                        {/* Stop Simulation - Grab Style */}
                        {isSimulating && mode === 'demo' && (
                            <button
                                onClick={stopTrip}
                                className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {language === 'th' ? 'หยุดจำลอง' : 'Stop Simulation'}
                            </button>
                        )}

                        {/* Completed State - Grab Style */}
                        {status === 'completed' && (
                            <div className="flex flex-col">
                                {/* Trip Summary Card - Grab Style */}
                                <div className="bg-[#00b14f]/5 rounded-2xl p-4 mb-3 border border-[#00b14f]/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#00b14f]"></div>
                                                <div className="w-0.5 h-6 bg-gray-300 my-1"></div>
                                                <div className="w-2.5 h-2.5 rounded-sm bg-orange-500"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 truncate">{activeBooking?.pickupLocation || tripInfo?.pickup || pickup.name}</p>
                                                <p className="text-sm text-gray-900 truncate mt-3">{activeBooking?.dropoffLocation || tripInfo?.dropoff || dropoff.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-2xl font-bold text-[#00b14f]">
                                                ฿{(activeBooking?.totalCost || tripInfo?.price || 1200).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-500">{language === 'th' ? 'ชำระเรียบร้อย' : 'Paid'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Celebration Text */}
                                <div className="text-center mb-4">
                                    <p className="text-2xl mb-1">🎉</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {language === 'th' ? 'ถึงปลายทางแล้ว!' : 'Trip Completed!'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {language === 'th' ? 'ขอบคุณที่ใช้บริการ TukTik' : 'Thank you for using TukTik'}
                                    </p>
                                </div>

                                {/* Driver Quick Preview */}
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl overflow-hidden ring-2 ring-[#00b14f]/20">
                                        {assignedDriver?.photo ? (
                                            <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            '👨‍✈️'
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">
                                            {assignedDriver?.name || activeBooking?.driver?.name || 'คนขับ'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {assignedDriver?.vehiclePlate || activeBooking?.driver?.vehiclePlate || ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons - Grab Style */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            resetRatingForm();
                                            resetTrip();
                                        }}
                                        className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        {language === 'th' ? 'ข้าม' : 'Skip'}
                                    </button>
                                    <button
                                        onClick={() => setShowRatingModal(true)}
                                        className="flex-[2] h-12 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        <span>⭐</span>
                                        {language === 'th' ? 'ให้คะแนนคนขับ' : 'Rate Driver'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Location Picker Bottom Sheet */}
            {showLocationPicker && (
                <div className="fixed inset-0 z-[100]">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowLocationPicker(false)}
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        <div className="px-4 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {locationPickerType === 'pickup'
                                        ? (language === 'th' ? 'เลือกจุดรับ' : 'Select Pickup')
                                        : (language === 'th' ? 'เลือกจุดส่ง' : 'Select Dropoff')
                                    }
                                </h2>
                                <button
                                    onClick={() => setShowLocationPicker(false)}
                                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    id="location-search"
                                    name="locationSearch"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={language === 'th' ? 'ค้นหาสถานที่...' : 'Search locations...'}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00b14f] focus:bg-white transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Quick Location Chips */}
                            {!searchQuery && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        {language === 'th' ? 'สถานที่ยอดนิยม' : 'Popular'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredLocations.filter(loc => loc.isPopular || loc.type === 'airport').slice(0, 4).map((loc) => {
                                            const locName = language === 'th' ? loc.name?.th : loc.name?.en;
                                            return (
                                                <button
                                                    key={`quick-${loc.id}`}
                                                    onClick={() => handleLocationSelect(loc)}
                                                    className="px-4 py-2 bg-[#00b14f]/10 hover:bg-[#00b14f]/20 text-[#00b14f] rounded-full text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5"
                                                >
                                                    {loc.type === 'airport' ? '✈️' : '📍'}
                                                    <span>{locName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                            {filteredLocations.length > 0 ? (
                                <div className="p-4 space-y-2">
                                    {/* Section Header */}
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                        {searchQuery
                                            ? (language === 'th' ? 'ผลการค้นหา' : 'Search Results')
                                            : (language === 'th' ? 'สถานที่ทั้งหมด' : 'All Locations')
                                        }
                                    </p>
                                    {filteredLocations.map((loc) => {
                                        const locName = language === 'th' ? loc.name?.th : loc.name?.en;
                                        const typeLabel = loc.type === 'airport'
                                            ? (language === 'th' ? 'สนามบิน' : 'Airport')
                                            : loc.type === 'hotel'
                                            ? (language === 'th' ? 'โรงแรม' : 'Hotel')
                                            : loc.type === 'city'
                                            ? (language === 'th' ? 'เมือง' : 'City')
                                            : (language === 'th' ? 'สถานที่' : 'Location');

                                        return (
                                            <button
                                                key={loc.id}
                                                onClick={() => handleLocationSelect(loc)}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#00b14f]/30 hover:bg-[#00b14f]/5 transition-all active:scale-[0.98] shadow-sm"
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    loc.type === 'airport' ? 'bg-blue-500/10 text-blue-600' :
                                                    loc.type === 'hotel' ? 'bg-amber-500/10 text-amber-600' :
                                                    loc.type === 'city' ? 'bg-purple-500/10 text-purple-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {loc.type === 'airport' ? (
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                    ) : loc.type === 'hotel' ? (
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                    ) : loc.type === 'city' ? (
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    )}
                                                </div>

                                                <div className="flex-1 text-left">
                                                    <p className="font-semibold text-gray-900">{locName}</p>
                                                    <p className="text-sm text-gray-500">{typeLabel}</p>
                                                </div>

                                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500">
                                        {language === 'th' ? 'ไม่พบสถานที่' : 'No locations found'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Picker Bottom Sheet */}
            {showVehiclePicker && (
                <div className="fixed inset-0 z-[100]">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowVehiclePicker(false)}
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up">
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        <div className="px-4 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {language === 'th' ? 'เลือกรถ' : 'Select Vehicle'}
                                </h2>
                                <button
                                    onClick={() => setShowVehiclePicker(false)}
                                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {vehicles.map((vehicle) => (
                                <button
                                    key={vehicle.id}
                                    onClick={() => {
                                        setSelectedVehicle(vehicle);
                                        setShowVehiclePicker(false);
                                    }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                        selectedVehicle?.id === vehicle.id
                                            ? 'border-[#00b14f] bg-[#00b14f]/5 shadow-md'
                                            : 'border-gray-100 bg-white hover:border-[#00b14f]/30 hover:bg-[#00b14f]/5 shadow-sm'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
                                        selectedVehicle?.id === vehicle.id ? 'bg-[#00b14f]/10' : 'bg-gray-100'
                                    }`}>
                                        {vehicle.type === 'sedan' ? '🚗' :
                                         vehicle.type === 'suv' ? '🚙' :
                                         vehicle.type === 'van' ? '🚐' : '🚘'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-900">{vehicle.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {vehicle.seats} {language === 'th' ? 'ที่นั่ง' : 'seats'} • {
                                                vehicle.type === 'sedan' ? (language === 'th' ? 'รถเก๋ง' : 'Sedan') :
                                                vehicle.type === 'suv' ? 'SUV' :
                                                vehicle.type === 'van' ? (language === 'th' ? 'รถตู้' : 'Van') :
                                                vehicle.type
                                            }
                                        </p>
                                        {vehicle.features && vehicle.features.length > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {vehicle.features.slice(0, 2).join(' • ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <p className={`font-bold text-lg ${selectedVehicle?.id === vehicle.id ? 'text-[#00b14f]' : 'text-gray-900'}`}>
                                            ฿{vehicle.price.toLocaleString()}
                                        </p>
                                        {selectedVehicle?.id === vehicle.id && (
                                            <div className="w-6 h-6 bg-[#00b14f] rounded-full flex items-center justify-center mt-1">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Booking Confirmation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => !isCancellingBooking && setShowCancelModal(false)}
                    />

                    <div className="relative bg-white rounded-3xl mx-4 w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up">
                        {/* Icon */}
                        <div className="pt-8 pb-4 flex justify-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6 text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {language === 'th' ? 'ยกเลิกการจอง?' : 'Cancel Booking?'}
                            </h3>
                            <p className="text-gray-500 text-sm">
                                {language === 'th'
                                    ? 'คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้ การดำเนินการนี้ไม่สามารถย้อนกลับได้'
                                    : 'Are you sure you want to cancel this booking? This action cannot be undone.'}
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                disabled={isCancellingBooking}
                                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {language === 'th' ? 'ไม่ใช่' : 'No'}
                            </button>
                            <button
                                onClick={confirmCancelBooking}
                                disabled={isCancellingBooking}
                                className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCancellingBooking ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    language === 'th' ? 'ยกเลิกเลย' : 'Yes, Cancel'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal Bottom Sheet */}
            {showRatingModal && (
                <div className="fixed inset-0 z-[100]">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => !isSubmittingRating && setShowRatingModal(false)}
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up">
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {language === 'th' ? 'ให้คะแนนคนขับ' : 'Rate Your Driver'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {language === 'th' ? 'ความคิดเห็นของคุณช่วยพัฒนาบริการ' : 'Your feedback helps us improve'}
                                </p>
                            </div>

                            {/* Driver Info */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl overflow-hidden ring-2 ring-[#00b14f]/20">
                                    {assignedDriver?.photo ? (
                                        <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        '👨‍✈️'
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 text-lg">
                                        {assignedDriver?.name || activeBooking?.driver?.name || 'คนขับ'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {assignedDriver?.vehicleModel || activeBooking?.driver?.vehicleModel || ''} • {assignedDriver?.vehiclePlate || activeBooking?.driver?.vehiclePlate || ''}
                                    </p>
                                </div>
                            </div>

                            {/* Star Rating */}
                            <div className="mb-6">
                                <p className="text-center text-gray-600 text-sm mb-3">
                                    {language === 'th' ? 'แตะเพื่อให้คะแนน' : 'Tap to rate'}
                                </p>
                                <div className="flex justify-center gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => {
                                                setRatingStars(star);
                                                if (star > 3) setRatingReasons([]);
                                            }}
                                            className={`text-4xl transition-all active:scale-125 ${
                                                star <= ratingStars ? 'text-amber-400' : 'text-gray-300'
                                            }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-sm mt-2 font-medium text-gray-700">
                                    {ratingStars === 5 && (language === 'th' ? 'ยอดเยี่ยม!' : 'Excellent!')}
                                    {ratingStars === 4 && (language === 'th' ? 'ดีมาก' : 'Very Good')}
                                    {ratingStars === 3 && (language === 'th' ? 'ปานกลาง' : 'Average')}
                                    {ratingStars === 2 && (language === 'th' ? 'ไม่ค่อยดี' : 'Below Average')}
                                    {ratingStars === 1 && (language === 'th' ? 'ต้องปรับปรุง' : 'Poor')}
                                </p>
                            </div>

                            {/* Low Rating Reasons - Show only when stars <= 3 */}
                            {ratingStars <= 3 && (
                                <div className="mb-6">
                                    <p className="text-sm font-semibold text-gray-700 mb-3">
                                        {language === 'th' ? 'เกิดปัญหาอะไรบ้าง? (เลือกได้หลายข้อ)' : 'What went wrong? (Select all that apply)'}
                                        <span className="text-red-500 ml-1">*</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {lowRatingReasons.map((reason) => (
                                            <button
                                                key={reason.code}
                                                onClick={() => toggleRatingReason(reason.code)}
                                                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-[0.98] ${
                                                    ratingReasons.includes(reason.code)
                                                        ? 'border-red-500 bg-red-50 text-red-700'
                                                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                {reason.label}
                                            </button>
                                        ))}
                                    </div>
                                    {ratingStars <= 3 && ratingReasons.length === 0 && (
                                        <p className="text-xs text-red-500 mt-2">
                                            {language === 'th' ? '* กรุณาเลือกอย่างน้อย 1 ข้อ' : '* Please select at least 1 reason'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Tip Section */}
                            <div className="mb-6">
                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                    {language === 'th' ? '💰 ให้ทิปคนขับ (ไม่บังคับ)' : '💰 Tip your driver (optional)'}
                                </p>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {tipOptions.map((tip) => (
                                        <button
                                            key={tip}
                                            onClick={() => {
                                                setSelectedTip(tip);
                                                setCustomTip('');
                                            }}
                                            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98] ${
                                                selectedTip === tip && !customTip
                                                    ? 'border-[#00b14f] bg-[#00b14f]/10 text-[#00b14f]'
                                                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            {tip === 0 ? (language === 'th' ? 'ไม่ให้' : 'No tip') : `฿${tip}`}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Tip Input */}
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">฿</span>
                                    <input
                                        type="number"
                                        id="custom-tip"
                                        name="customTip"
                                        value={customTip}
                                        onChange={(e) => {
                                            setCustomTip(e.target.value);
                                            setSelectedTip(0);
                                        }}
                                        placeholder={language === 'th' ? 'จำนวนอื่น...' : 'Other amount...'}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 text-gray-900 placeholder-gray-400 focus:outline-none transition-all ${
                                            customTip ? 'border-[#00b14f] bg-[#00b14f]/5' : 'border-gray-200 bg-gray-50 focus:border-[#00b14f]'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Comment */}
                            <div className="mb-6">
                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                    {language === 'th' ? '💬 ความคิดเห็นเพิ่มเติม (ไม่บังคับ)' : '💬 Additional comments (optional)'}
                                </p>
                                <textarea
                                    id="rating-comment-modal"
                                    name="ratingComment"
                                    value={ratingComment}
                                    onChange={(e) => setRatingComment(e.target.value)}
                                    placeholder={language === 'th' ? 'เขียนความคิดเห็น...' : 'Write your comment...'}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00b14f] transition-all resize-none"
                                />
                            </div>

                            {/* Summary */}
                            {(customTip || selectedTip > 0) && (
                                <div className="bg-[#00b14f]/5 rounded-2xl p-4 mb-6 border border-[#00b14f]/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">
                                            {language === 'th' ? 'ทิปสำหรับคนขับ' : 'Tip for driver'}
                                        </span>
                                        <span className="font-bold text-[#00b14f] text-lg">
                                            ฿{(customTip ? parseInt(customTip) || 0 : selectedTip).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => !isSubmittingRating && setShowRatingModal(false)}
                                    disabled={isSubmittingRating}
                                    className="flex-1 h-14 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                                </button>
                                <button
                                    onClick={submitRating}
                                    disabled={isSubmittingRating || (ratingStars <= 3 && ratingReasons.length === 0)}
                                    className="flex-[2] h-14 bg-[#00b14f] hover:bg-[#00a045] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingRating ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>⭐</span>
                                            {language === 'th' ? 'ส่งคะแนน' : 'Submit Rating'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Animation Styles */}
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
