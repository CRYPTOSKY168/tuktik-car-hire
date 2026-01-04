'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    GoogleMap,
    useLoadScript,
    Marker,
    DirectionsRenderer,
    OverlayView,
    Libraries,
    Polyline,
    Autocomplete,
} from '@react-google-maps/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { BookingService, DriverService, VehicleService, LocationService } from '@/lib/firebase/services';
import { useDriverTracking } from '@/lib/hooks';
import { Vehicle, Driver, Booking, BookingStatus } from '@/lib/types';
import { Vehicle as BookingVehicle } from '@/lib/contexts/BookingContext';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Libraries for Google Maps
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

// TukTik Design System Colors
const COLORS = {
    primary: '#00b250',
    secondary: '#FFB300',
    background: '#f5f8f7',
    backgroundDark: '#0f2318',
    border: '#dae7e0',
    borderDark: '#2a4a38',
    text: '#101814',
    textMuted: '#5e8d73',
};

// Default locations
const DEFAULT_LOCATIONS = {
    bangkok: { lat: 13.7563, lng: 100.5018, name: 'กรุงเทพมหานคร' },
    suvarnabhumi: { lat: 13.6900, lng: 100.7501, name: 'สนามบินสุวรรณภูมิ' },
};

// Popular locations for quick selection
const POPULAR_LOCATIONS = [
    { id: 'bkk', name: 'สุวรรณภูมิ', lat: 13.6900, lng: 100.7501 },
    { id: 'dmk', name: 'ดอนเมือง', lat: 13.9126, lng: 100.6068 },
    { id: 'central', name: 'เซ็นทรัลเวิลด์', lat: 13.7466, lng: 100.5391 },
    { id: 'siam', name: 'สยามพารากอน', lat: 13.7466, lng: 100.5347 },
];

// Map styles - minimal POI
const mapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

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
    minZoom: 10,
    maxZoom: 19,
};

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

// Create marker icon
const createMarkerIcon = (svg: string, size: number = 44) => {
    const encoded = encodeURIComponent(svg);
    return {
        url: `data:image/svg+xml,${encoded}`,
        scaledSize: new google.maps.Size(size, size * 1.25),
        anchor: new google.maps.Point(size / 2, size * 1.25),
    };
};

// Calculate bearing between points
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
                    <div className="absolute inset-0 bg-[#00b250] rounded-full blur-md opacity-50 scale-150"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-[#00b250] to-[#008c40] rounded-full shadow-xl flex items-center justify-center border-4 border-white">
                        <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            directions_car
                        </span>
                    </div>
                </div>
            </div>
        </OverlayView>
    );
}

// Searching Ripple Animation
function SearchingRipple({ position }: { position: Coordinates }) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-32 h-32 rounded-full bg-[#00b250]/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute w-24 h-24 rounded-full bg-[#00b250]/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                    <div className="absolute w-16 h-16 rounded-full bg-[#00b250]/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }}></div>
                </div>
                <div className="relative w-6 h-6 bg-[#00b250] rounded-full border-4 border-white shadow-lg"></div>
            </div>
        </OverlayView>
    );
}

// Stripe Payment Form Component
function StripePaymentForm({
    clientSecret,
    onSuccess,
    onCancel,
    isProcessing,
    setIsProcessing,
}: {
    clientSecret: string;
    onSuccess: () => void;
    onCancel: () => void;
    isProcessing: boolean;
    setIsProcessing: (v: boolean) => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setError(null);

        const { error: submitError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/book2`,
            },
            redirect: 'if_required',
        });

        if (submitError) {
            setError(submitError.message || 'การชำระเงินล้มเหลว');
            setIsProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="flex-1 h-12 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold disabled:opacity-50"
                >
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 h-12 rounded-xl bg-[#00b250] text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>กำลังชำระ...</span>
                        </>
                    ) : (
                        <span>ชำระเงิน</span>
                    )}
                </button>
            </div>
        </form>
    );
}

// Re-match configuration
const REMATCH_CONFIG = {
    MAX_ATTEMPTS: 3,
    DRIVER_RESPONSE_TIMEOUT: 20000,
    TOTAL_SEARCH_TIMEOUT: 180000,
    DELAY_BETWEEN_MATCHES: 3000,
};

export default function Book2Page() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();

    // Refs
    const mapRef = useRef<google.maps.Map | null>(null);
    const lastPanTimeRef = useRef<number>(0);

    // Trip status
    const [status, setStatus] = useState<'selecting' | 'searching' | 'driver_assigned' | 'driver_en_route' | 'in_progress' | 'completed'>('selecting');

    // Locations
    const [pickup, setPickup] = useState<Coordinates & { name: string; id?: string }>({
        ...DEFAULT_LOCATIONS.bangkok,
        name: '',
    });
    const [dropoff, setDropoff] = useState<Coordinates & { name: string; id?: string }>({
        ...DEFAULT_LOCATIONS.suvarnabhumi,
        name: '',
    });

    // Map state
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [routePath, setRoutePath] = useState<PathPoint[]>([]);
    const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
    const [followCar, setFollowCar] = useState(false);

    // Driver tracking
    const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
    const [driverBearing, setDriverBearing] = useState(0);
    const [liveEta, setLiveEta] = useState<{ toPickup: number | null; toDropoff: number | null }>({ toPickup: null, toDropoff: null });

    // Vehicles and drivers
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
    const [showVehiclePicker, setShowVehiclePicker] = useState(false);

    // Booking state
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
    const [isCreatingBooking, setIsCreatingBooking] = useState(false);
    const [isLoadingActiveBooking, setIsLoadingActiveBooking] = useState(true);
    const [isCancellingBooking, setIsCancellingBooking] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Re-match state
    const [isRematching, setIsRematching] = useState(false);
    const [rematchAttempt, setRematchAttempt] = useState(0);
    const [rejectedDrivers, setRejectedDrivers] = useState<string[]>([]);
    const [rematchMessage, setRematchMessage] = useState<string | null>(null);
    const lastBookingStatusRef = useRef<string | null>(null);
    const rematchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const driverResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchStartTimeRef = useRef<number | null>(null);

    // Autocomplete refs
    const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const dropoffAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // GPS state
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Payment state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('cash');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

    // Modals
    const [showNoDriverModal, setShowNoDriverModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    // Rating state
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [selectedTip, setSelectedTip] = useState(0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    // Bottom sheet minimized state
    const [isBottomSheetMinimized, setIsBottomSheetMinimized] = useState(false);

    // Real-time driver tracking hook
    const { location: liveDriverLocation } = useDriverTracking(
        assignedDriver?.id || null,
        { autoStart: true }
    );

    // Load Google Maps
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    // Get auth token
    const getAuthToken = async (): Promise<string | null> => {
        if (!user) return null;
        const { getIdToken } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase/config');
        if (!auth || !auth.currentUser) return null;
        return getIdToken(auth.currentUser);
    };

    // Load vehicles and subscribe to drivers
    useEffect(() => {
        VehicleService.getVehicles().then(v => {
            const activeVehicles = v.filter(x => x.isActive);
            setVehicles(activeVehicles);
            if (activeVehicles.length > 0 && !selectedVehicle) {
                setSelectedVehicle(activeVehicles[0]);
            }
        });

        const unsubscribe = DriverService.subscribeToDrivers((drivers) => {
            const available = drivers.filter(d => d.status === 'available');
            setAvailableDrivers(available);
        });

        return () => unsubscribe();
    }, []);

    // Check for existing active booking
    useEffect(() => {
        if (!user) {
            setIsLoadingActiveBooking(false);
            return;
        }

        const checkActiveBooking = async () => {
            try {
                const bookings = await BookingService.getUserBookings(user.uid);
                const activeStatuses = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress'];
                const active = bookings.find(b => activeStatuses.includes(b.status));

                if (active) {
                    setActiveBooking(active);
                    setBookingId(active.id);
                    lastBookingStatusRef.current = active.status;

                    // Map status
                    const statusMap: Record<string, typeof status> = {
                        'pending': 'searching',
                        'confirmed': 'searching',
                        'driver_assigned': 'driver_assigned',
                        'driver_en_route': 'driver_en_route',
                        'in_progress': 'in_progress',
                    };
                    setStatus(statusMap[active.status] || 'selecting');

                    // Set driver if assigned
                    if (active.driver) {
                        const driverDoc = await DriverService.getDriverById(active.driver.driverId);
                        if (driverDoc) setAssignedDriver(driverDoc);
                    }

                    // Restore coordinates
                    if (active.pickupCoordinates) {
                        setPickup({
                            lat: active.pickupCoordinates.lat,
                            lng: active.pickupCoordinates.lng,
                            name: active.pickupLocation,
                            id: active.pickupLocationId,
                        });
                    }
                    if (active.dropoffCoordinates) {
                        setDropoff({
                            lat: active.dropoffCoordinates.lat,
                            lng: active.dropoffCoordinates.lng,
                            name: active.dropoffLocation,
                            id: active.dropoffLocationId,
                        });
                    }

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
            } finally {
                setIsLoadingActiveBooking(false);
            }
        };

        checkActiveBooking();
    }, [user]);

    // Real-time booking subscription
    useEffect(() => {
        if (!bookingId || !db) return;

        const unsubscribe = onSnapshot(
            doc(db, 'bookings', bookingId),
            async (docSnap) => {
                if (!docSnap.exists()) return;

                const bookingData = { id: docSnap.id, ...docSnap.data() } as Booking;
                const previousStatus = lastBookingStatusRef.current;
                lastBookingStatusRef.current = bookingData.status;
                setActiveBooking(bookingData);

                // Auto re-match detection
                if (previousStatus === 'driver_assigned' && bookingData.status === 'confirmed') {
                    const currentRejectedDrivers = bookingData.rejectedDrivers || [];
                    setRejectedDrivers(currentRejectedDrivers);

                    const attempts = (bookingData.matchAttempts || 0) + 1;
                    setRematchAttempt(attempts);

                    const eligibleDriversCount = availableDrivers.filter(d =>
                        d.userId !== user?.uid && !currentRejectedDrivers.includes(d.id)
                    ).length;

                    if (eligibleDriversCount > 0 && attempts < REMATCH_CONFIG.MAX_ATTEMPTS) {
                        setRematchMessage(`กำลังหาคนขับใหม่... (${attempts}/${REMATCH_CONFIG.MAX_ATTEMPTS})`);
                        setIsRematching(true);
                        setAssignedDriver(null);

                        rematchTimeoutRef.current = setTimeout(async () => {
                            await triggerRematch(bookingData.id, attempts, currentRejectedDrivers);
                        }, REMATCH_CONFIG.DELAY_BETWEEN_MATCHES);
                    } else {
                        setIsRematching(false);
                        setShowNoDriverModal(true);
                    }
                    return;
                }

                // Clear re-match state when driver accepts
                if (bookingData.status === 'driver_en_route' && isRematching) {
                    setIsRematching(false);
                    setRematchMessage(null);
                }

                // Driver response timeout
                if (driverResponseTimeoutRef.current) {
                    clearTimeout(driverResponseTimeoutRef.current);
                    driverResponseTimeoutRef.current = null;
                }

                if (bookingData.status === 'driver_assigned' && bookingData.driver?.driverId) {
                    driverResponseTimeoutRef.current = setTimeout(async () => {
                        if (db) {
                            const bookingRef = doc(db, 'bookings', bookingData.id);
                            const currentRejected = bookingData.rejectedDrivers || [];
                            if (!currentRejected.includes(bookingData.driver!.driverId)) {
                                currentRejected.push(bookingData.driver!.driverId);
                            }

                            await updateDoc(bookingRef, {
                                status: 'confirmed',
                                driver: null,
                                rejectedDrivers: currentRejected,
                                statusHistory: arrayUnion({
                                    status: 'confirmed',
                                    timestamp: Timestamp.now(),
                                    note: 'คนขับไม่ตอบรับในเวลาที่กำหนด',
                                    updatedBy: 'system',
                                }),
                                updatedAt: Timestamp.now(),
                            });

                            const driverRef = doc(db, 'drivers', bookingData.driver!.driverId);
                            await updateDoc(driverRef, { status: 'available', updatedAt: Timestamp.now() }).catch(() => {});
                        }
                    }, REMATCH_CONFIG.DRIVER_RESPONSE_TIMEOUT);
                }

                if (bookingData.status === 'driver_en_route' && driverResponseTimeoutRef.current) {
                    clearTimeout(driverResponseTimeoutRef.current);
                    driverResponseTimeoutRef.current = null;
                }

                // Update status
                const statusMap: Record<string, typeof status> = {
                    'pending': 'searching',
                    'confirmed': 'searching',
                    'driver_assigned': 'driver_assigned',
                    'driver_en_route': 'driver_en_route',
                    'in_progress': 'in_progress',
                    'completed': 'completed',
                };
                if (statusMap[bookingData.status]) {
                    setStatus(statusMap[bookingData.status]);
                }

                // Show rating modal on completion
                if (bookingData.status === 'completed' && !bookingData.ratings?.customerToDriver) {
                    setShowRatingModal(true);
                }

                // Update driver info
                if (bookingData.driver && !assignedDriver) {
                    DriverService.getDriverById(bookingData.driver.driverId).then(d => {
                        if (d) setAssignedDriver(d);
                    });
                }

                // Update trip info
                setTripInfo(prev => prev ? {
                    ...prev,
                    pickup: bookingData.pickupLocation,
                    dropoff: bookingData.dropoffLocation,
                    price: bookingData.totalCost,
                } : null);
            }
        );

        return () => unsubscribe();
    }, [bookingId, availableDrivers, user, isRematching]);

    // Cleanup timeouts on unmount (Bug 3.6 fix)
    useEffect(() => {
        return () => {
            if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
            if (driverResponseTimeoutRef.current) clearTimeout(driverResponseTimeoutRef.current);
        };
    }, []);

    // Update driver location from tracking
    useEffect(() => {
        if (liveDriverLocation) {
            setDriverLocation({ lat: liveDriverLocation.lat, lng: liveDriverLocation.lng });
            if (liveDriverLocation.heading) setDriverBearing(liveDriverLocation.heading);
        }
    }, [liveDriverLocation]);

    // Set initial driver location from assigned driver's currentLocation
    useEffect(() => {
        if (assignedDriver && !driverLocation) {
            // Check if driver has currentLocation in Firestore
            const currentLoc = (assignedDriver as any).currentLocation;
            if (currentLoc?.lat && currentLoc?.lng) {
                setDriverLocation({ lat: currentLoc.lat, lng: currentLoc.lng });
                if (currentLoc.heading) setDriverBearing(currentLoc.heading);
            }
        }
    }, [assignedDriver, driverLocation]);

    // Calculate ETA based on driver location using Directions API
    useEffect(() => {
        if (!isLoaded) return;

        const calculateEta = async () => {
            try {
                const directionsService = new google.maps.DirectionsService();

                // Calculate ETA to pickup (when driver is en route)
                if (status === 'driver_en_route' && pickup.lat && pickup.lng) {
                    // Use driver location if available, otherwise use a nearby point for estimation
                    const origin = driverLocation || { lat: pickup.lat + 0.01, lng: pickup.lng + 0.01 };

                    console.log('[ETA] Calculating to pickup:', { origin, destination: pickup });

                    const result = await directionsService.route({
                        origin,
                        destination: { lat: pickup.lat, lng: pickup.lng },
                        travelMode: google.maps.TravelMode.DRIVING,
                    });

                    if (result.routes[0]?.legs[0]?.duration) {
                        const durationSeconds = result.routes[0].legs[0].duration.value;
                        const etaMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
                        console.log('[ETA] To pickup:', etaMinutes, 'minutes');
                        setLiveEta(prev => ({ ...prev, toPickup: etaMinutes }));
                    }
                }

                // Calculate ETA to dropoff (when trip is in progress)
                if (status === 'in_progress' && dropoff.lat && dropoff.lng) {
                    // Use driver location if available, otherwise use pickup as origin
                    const origin = driverLocation || { lat: pickup.lat, lng: pickup.lng };

                    console.log('[ETA] Calculating to dropoff:', { origin, destination: dropoff });

                    const result = await directionsService.route({
                        origin,
                        destination: { lat: dropoff.lat, lng: dropoff.lng },
                        travelMode: google.maps.TravelMode.DRIVING,
                    });

                    if (result.routes[0]?.legs[0]?.duration) {
                        const durationSeconds = result.routes[0].legs[0].duration.value;
                        const etaMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
                        console.log('[ETA] To dropoff:', etaMinutes, 'minutes');
                        setLiveEta(prev => ({ ...prev, toDropoff: etaMinutes }));
                    }
                }
            } catch (error) {
                console.error('[ETA] Error calculating:', error);
            }
        };

        // Calculate ETA when status changes or driver moves
        if (status === 'driver_en_route' || status === 'in_progress') {
            calculateEta();
        }
    }, [driverLocation, status, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, isLoaded]);

    // Reverse geocode coordinates to address
    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
        if (!isLoaded) return '';
        const geocoder = new google.maps.Geocoder();
        try {
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results[0]) {
                return response.results[0].formatted_address;
            }
        } catch (error) {
            console.error('Geocode error:', error);
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }, [isLoaded]);

    // Get current GPS location
    const getCurrentLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ไม่รองรับ GPS');
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const address = await reverseGeocode(latitude, longitude);
                setPickup({
                    lat: latitude,
                    lng: longitude,
                    name: address || 'ตำแหน่งปัจจุบัน',
                });
                mapRef.current?.panTo({ lat: latitude, lng: longitude });
                setIsGettingLocation(false);
            },
            (error) => {
                console.error('GPS error:', error);
                alert('ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาตการเข้าถึง GPS');
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [reverseGeocode]);

    // Handle autocomplete place selection
    const onPickupPlaceSelect = useCallback(() => {
        const place = pickupAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
            setPickup({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.formatted_address || place.name || '',
            });
        }
    }, []);

    const onDropoffPlaceSelect = useCallback(() => {
        const place = dropoffAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
            setDropoff({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.formatted_address || place.name || '',
            });
        }
    }, []);

    // Handle marker drag end
    const onPickupMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            const address = await reverseGeocode(lat, lng);
            setPickup({ lat, lng, name: address });
        }
    }, [reverseGeocode]);

    const onDropoffMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            const address = await reverseGeocode(lat, lng);
            setDropoff({ lat, lng, name: address });
        }
    }, [reverseGeocode]);

    // Get directions
    const getDirections = useCallback(async () => {
        if (!pickup.name || !dropoff.name || !isLoaded) return;

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
                        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(arr[index - 1], point);
                    }
                    return { lat: point.lat(), lng: point.lng(), distance: totalDistance };
                });
                setRoutePath(pathPoints);

                const leg = route.legs[0];
                const durationMin = Math.round((leg?.duration?.value || 0) / 60);
                const distanceKm = Math.round((totalDistance / 1000) * 10) / 10;
                const price = selectedVehicle?.price || Math.round(distanceKm * 15 + 50);

                setTripInfo({
                    distance: distanceKm,
                    duration: durationMin,
                    pickup: pickup.name,
                    dropoff: dropoff.name,
                    price,
                });
            }
        } catch (error) {
            console.error('Error getting directions:', error);
        }
    }, [pickup, dropoff, isLoaded, selectedVehicle]);

    useEffect(() => {
        if (isLoaded && pickup.name && dropoff.name) {
            getDirections();
        }
    }, [pickup, dropoff, isLoaded, getDirections]);

    // Create booking
    const createLiveBooking = async (): Promise<string | null> => {
        if (!user || !tripInfo || !selectedVehicle) return null;

        try {
            setIsCreatingBooking(true);

            const vehicleData: BookingVehicle = {
                id: selectedVehicle.id,
                name: selectedVehicle.name,
                type: selectedVehicle.type,
                price: selectedVehicle.price,
                image: selectedVehicle.image || '',
                passengers: selectedVehicle.seats || 4,
                luggage: 2,
                transmission: 'automatic',
                features: selectedVehicle.features || [],
            };

            const bookingData = {
                firstName: user.displayName?.split(' ')[0] || 'ลูกค้า',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                email: user.email || '',
                phone: user.phoneNumber || '',
                pickupLocation: pickup.name,
                dropoffLocation: dropoff.name,
                pickupCoordinates: { lat: pickup.lat, lng: pickup.lng },
                dropoffCoordinates: { lat: dropoff.lat, lng: dropoff.lng },
                pickupLocationId: pickup.id || '',
                dropoffLocationId: dropoff.id || '',
                pickupDate: new Date().toISOString().split('T')[0],
                pickupTime: new Date().toTimeString().slice(0, 5),
                tripType: 'oneWay' as const,
                vehicle: vehicleData,
                addInsurance: false,
                addLuggage: false,
                flightNumber: '',
                passengerCount: 1,
                luggageCount: 1,
                specialRequests: '',
                paymentMethod: paymentMethod as 'card' | 'cash',
            };

            const newBookingId = await BookingService.addBooking(bookingData, tripInfo.price, user.uid);
            setBookingId(newBookingId);
            return newBookingId;
        } catch (error) {
            console.error('Error creating booking:', error);
            return null;
        } finally {
            setIsCreatingBooking(false);
        }
    };

    // Find and assign driver
    const findAndAssignDriver = async (bookingIdToAssign: string, excludeDrivers: string[] = []): Promise<boolean> => {
        // Bug fix: Check if availableDrivers is loaded
        if (!availableDrivers || availableDrivers.length === 0) {
            console.warn('[findAndAssignDriver] No drivers available yet');
            return false;
        }

        const eligibleDrivers = availableDrivers.filter(d =>
            d.userId !== user?.uid && !excludeDrivers.includes(d.id)
        );

        if (eligibleDrivers.length === 0) return false;

        try {
            const driver = eligibleDrivers[Math.floor(Math.random() * eligibleDrivers.length)];
            const token = await getAuthToken();
            if (!token) {
                console.error('[findAndAssignDriver] No auth token');
                return false;
            }

            const response = await fetch('/api/booking/assign-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

            // Bug fix: Check HTTP response status and show detailed error
            if (!response.ok) {
                console.error('[findAndAssignDriver] API error:', response.status, result.error);
                return false;
            }
            if (result.success) {
                setAssignedDriver(driver);
                return true;
            }
            console.warn('[findAndAssignDriver] API returned:', result.error);
            return false;
        } catch (error) {
            console.error('[findAndAssignDriver] Error:', error);
            return false;
        }
    };

    // Trigger re-match
    const triggerRematch = async (currentBookingId: string, attempt: number, rejectedDriversParam: string[]) => {
        const eligibleDrivers = availableDrivers.filter(d =>
            d.userId !== user?.uid && !rejectedDriversParam.includes(d.id)
        );

        if (eligibleDrivers.length === 0) {
            setIsRematching(false);
            setShowNoDriverModal(true);
            return;
        }

        try {
            const driver = eligibleDrivers[Math.floor(Math.random() * eligibleDrivers.length)];
            const token = await getAuthToken();
            if (!token) return;

            if (db) {
                await updateDoc(doc(db, 'bookings', currentBookingId), {
                    matchAttempts: attempt,
                    lastMatchAttemptAt: Timestamp.now(),
                });
            }

            const response = await fetch('/api/booking/assign-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
                setAssignedDriver(driver);
                setRematchMessage(`พบคนขับใหม่: ${driver.name}`);
                setTimeout(() => {
                    setRematchMessage(null);
                    setIsRematching(false);
                }, 2000);
            }
        } catch (error) {
            console.error('Re-match error:', error);
            setIsRematching(false);
            setShowNoDriverModal(true);
        }
    };

    // Start booking
    const startLiveTrip = async () => {
        setStatus('searching');
        searchStartTimeRef.current = Date.now();
        setRematchAttempt(0);
        setRejectedDrivers([]);

        const newBookingId = await createLiveBooking();
        if (!newBookingId) {
            setStatus('selecting');
            return;
        }

        const assigned = await findAndAssignDriver(newBookingId);
        if (!assigned) {
            setShowNoDriverModal(true);
        } else {
            setStatus('driver_assigned');
            setFollowCar(true);
        }
    };

    // Payment handlers
    const handleBookNowClick = () => {
        if (!user) {
            router.push('/login?redirect=/book2');
            return;
        }
        if (!pickup.name || !dropoff.name || !selectedVehicle) {
            alert('กรุณาเลือกจุดรับและจุดส่ง');
            return;
        }
        setPaymentMethod('cash');
        setClientSecret(null);
        setPaymentError(null);
        setShowPaymentModal(true);
    };

    const handlePaymentProceed = async () => {
        if (paymentMethod === 'cash') {
            setShowPaymentModal(false);
            startLiveTrip();
        } else {
            setIsProcessingPayment(true);
            try {
                const newBookingId = await createLiveBooking();
                if (!newBookingId) {
                    setIsProcessingPayment(false);
                    return;
                }
                setPendingBookingId(newBookingId);

                const token = await getAuthToken();
                const response = await fetch('/api/payment/create-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ bookingId: newBookingId }),
                });
                const result = await response.json();

                if (result.success) {
                    setClientSecret(result.clientSecret);
                } else {
                    setPaymentError(result.error);
                    await BookingService.updateBookingStatus(newBookingId, 'cancelled', 'Payment setup failed');
                    setPendingBookingId(null);
                }
            } catch (error: any) {
                setPaymentError(error.message);
            } finally {
                setIsProcessingPayment(false);
            }
        }
    };

    const handlePaymentSuccess = async () => {
        if (!pendingBookingId) return;

        setShowPaymentModal(false);
        setBookingId(pendingBookingId);
        setStatus('searching');
        searchStartTimeRef.current = Date.now();

        // ⚠️ FIX: Update booking status to 'pending' BEFORE assigning driver
        // Booking was created with 'awaiting_payment' status, need to change to 'pending' first
        await BookingService.updateBookingStatus(pendingBookingId, 'pending', 'Payment completed');

        const assigned = await findAndAssignDriver(pendingBookingId);
        if (!assigned) {
            setShowNoDriverModal(true);
        } else {
            setStatus('driver_assigned');
            setFollowCar(true);
        }
        setPendingBookingId(null);
    };

    const handlePaymentCancel = async () => {
        if (pendingBookingId) {
            await BookingService.updateBookingStatus(pendingBookingId, 'cancelled', 'Payment cancelled');
            setPendingBookingId(null);
        }
        setClientSecret(null);
        setShowPaymentModal(false);
    };

    // Cancel booking
    const confirmCancelBooking = async () => {
        if (!activeBooking?.id) return;

        // Bug 5.3 fix: Validate booking status before cancelling
        const cancellableStatuses = ['pending', 'confirmed', 'driver_assigned'];
        if (!cancellableStatuses.includes(activeBooking.status)) {
            alert('ไม่สามารถยกเลิกได้ในขั้นตอนนี้ (คนขับกำลังเดินทางหรือกำลังเดินทางอยู่)');
            setShowCancelModal(false);
            return;
        }

        setIsCancellingBooking(true);
        try {
            await BookingService.updateBookingStatus(activeBooking.id, 'cancelled', 'ผู้ใช้ยกเลิกการจอง');

            if (activeBooking.driver?.driverId) {
                await DriverService.updateDriverStatus(activeBooking.driver.driverId, 'available' as any).catch(() => {});
            }

            resetTrip();
            setShowCancelModal(false);
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('เกิดข้อผิดพลาดในการยกเลิก กรุณาลองใหม่');
        } finally {
            setIsCancellingBooking(false);
        }
    };

    // Reset trip
    const resetTrip = () => {
        setStatus('selecting');
        setDriverLocation(null);
        setAssignedDriver(null);
        setBookingId(null);
        setActiveBooking(null);
        setIsRematching(false);
        setRematchAttempt(0);
        setRejectedDrivers([]);
        setRematchMessage(null);
        if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
        if (driverResponseTimeoutRef.current) clearTimeout(driverResponseTimeoutRef.current);
    };

    // Submit rating
    const submitRating = async () => {
        if (!bookingId) return;

        setIsSubmittingRating(true);
        try {
            const token = await getAuthToken();
            // Bug 7.3 fix: Validate token before making API call
            if (!token) {
                console.error('[submitRating] No auth token available');
                alert('กรุณาเข้าสู่ระบบใหม่');
                return;
            }

            const response = await fetch('/api/booking/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    bookingId,
                    ratingType: 'customerToDriver',
                    stars: ratingStars,
                    comment: ratingComment || undefined,
                    tip: selectedTip > 0 ? selectedTip : undefined,
                }),
            });

            if (!response.ok) {
                console.error('[submitRating] API error:', response.status);
            }

            setShowRatingModal(false);
            resetTrip();
        } catch (error) {
            console.error('Error submitting rating:', error);
        } finally {
            setIsSubmittingRating(false);
        }
    };

    // Get status label
    const getStatusLabel = (s: string) => {
        const labels: Record<string, string> = {
            'selecting': t.book2.status.selecting,
            'searching': t.book2.status.searching,
            'driver_assigned': t.book2.status.driverAssigned,
            'driver_en_route': t.book2.status.driverEnRoute,
            'in_progress': t.book2.status.inProgress,
            'completed': t.book2.status.completed,
        };
        return labels[s] || s;
    };

    // Loading states
    if (authLoading || isLoadingActiveBooking) {
        return (
            <div className="h-screen w-full bg-[#f5f8f7] dark:bg-[#0f2318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b250]"></div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="h-screen w-full bg-[#f5f8f7] flex items-center justify-center p-4">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-red-500">error</span>
                    <p className="mt-4 text-lg font-bold">{t.book2.cannotLoadMap}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#f5f8f7] dark:bg-[#0f2318] flex flex-col relative overflow-hidden">
            {/* Map */}
            <div className="absolute inset-0 z-0">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={pickup}
                        zoom={13}
                        options={mapOptions}
                        onLoad={(map) => { mapRef.current = map; }}
                    >
                        {/* Directions */}
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: {
                                        strokeColor: '#00b250',
                                        strokeWeight: 5,
                                        strokeOpacity: 0.8,
                                    },
                                }}
                            />
                        )}

                        {/* Markers - Draggable when selecting */}
                        {pickup.name && (
                            <Marker
                                position={pickup}
                                icon={createMarkerIcon(PICKUP_MARKER_SVG)}
                                draggable={status === 'selecting'}
                                onDragEnd={onPickupMarkerDragEnd}
                            />
                        )}
                        {dropoff.name && (
                            <Marker
                                position={dropoff}
                                icon={createMarkerIcon(DROPOFF_MARKER_SVG)}
                                draggable={status === 'selecting'}
                                onDragEnd={onDropoffMarkerDragEnd}
                            />
                        )}

                        {/* Searching animation */}
                        {status === 'searching' && pickup.name && (
                            <SearchingRipple position={pickup} />
                        )}

                        {/* Driver car */}
                        {driverLocation && status !== 'selecting' && status !== 'searching' && (
                            <CarMarker position={driverLocation} bearing={driverBearing} />
                        )}
                    </GoogleMap>
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b250]"></div>
                    </div>
                )}
            </div>

            {/* Top gradient overlay */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/80 to-transparent z-10 pointer-events-none" />

            {/* Header Navigation */}
            <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-2 flex items-center justify-between">
                <Link
                    href="/book2/history"
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#182b21]/90 shadow-md flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-[#5e8d73]">history</span>
                </Link>
                <Link
                    href="/book2/profile"
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#182b21]/90 shadow-md flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-[#5e8d73]">person</span>
                </Link>
            </div>

            {/* Search Card - Stitch Design (Hidden when minimized) */}
            {!isBottomSheetMinimized && (
            <div className="relative z-20 px-4 pt-16 transition-all duration-300">
                <div className="bg-white dark:bg-[#182b21] rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] p-3 border border-[#dae7e0] dark:border-[#2a4a38]">
                    {/* Pickup Input Row */}
                    <div className="flex items-center gap-3 relative">
                        <div className="flex flex-col items-center justify-center w-8">
                            <div className="w-3 h-3 rounded-full bg-[#00b250] ring-4 ring-[#00b250]/20"></div>
                            {/* Dotted Line Connector */}
                            <div className="w-0.5 h-6 border-l-2 border-dashed border-[#dae7e0] dark:border-[#2a4a38] my-1"></div>
                        </div>
                        <div className="flex-1 flex items-center bg-[#f5f8f7] dark:bg-[#0f2318] rounded-xl px-4 h-14">
                            {isLoaded && status === 'selecting' ? (
                                <Autocomplete
                                    onLoad={(autocomplete) => { pickupAutocompleteRef.current = autocomplete; }}
                                    onPlaceChanged={onPickupPlaceSelect}
                                    options={{ componentRestrictions: { country: 'th' } }}
                                    className="flex-1"
                                >
                                    <input
                                        type="text"
                                        placeholder={t.book2.pickupPlaceholder}
                                        value={pickup.name}
                                        onChange={(e) => setPickup({ ...pickup, name: e.target.value })}
                                        className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px] font-medium placeholder:text-[#5e8d73]/70 placeholder:font-normal text-[#101814] dark:text-white"
                                    />
                                </Autocomplete>
                            ) : (
                                <input
                                    type="text"
                                    placeholder={t.book2.pickupPlaceholder}
                                    value={pickup.name}
                                    className="w-full bg-transparent border-none outline-none text-[15px] font-medium text-[#101814] dark:text-white"
                                    disabled
                                />
                            )}
                        </div>
                        {/* GPS Button */}
                        {status === 'selecting' && (
                            <button
                                onClick={getCurrentLocation}
                                disabled={isGettingLocation}
                                className="w-12 h-12 rounded-xl bg-[#00b250]/10 hover:bg-[#00b250]/20 flex items-center justify-center transition-colors active:scale-95"
                                title="ใช้ตำแหน่งปัจจุบัน"
                            >
                                {isGettingLocation ? (
                                    <div className="w-5 h-5 border-2 border-[#00b250] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[#00b250] text-[22px]">my_location</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Dropoff Input Row */}
                    <div className="flex items-center gap-3 relative">
                        <div className="flex flex-col items-center justify-center w-8">
                            <div className="w-3 h-3 rounded-sm bg-[#FFB300] ring-4 ring-[#FFB300]/20"></div>
                        </div>
                        <div className="flex-1 flex items-center bg-[#f5f8f7] dark:bg-[#0f2318] rounded-xl px-4 h-14">
                            {isLoaded && status === 'selecting' ? (
                                <Autocomplete
                                    onLoad={(autocomplete) => { dropoffAutocompleteRef.current = autocomplete; }}
                                    onPlaceChanged={onDropoffPlaceSelect}
                                    options={{ componentRestrictions: { country: 'th' } }}
                                    className="flex-1"
                                >
                                    <input
                                        type="text"
                                        placeholder={t.book2.dropoffPlaceholder}
                                        value={dropoff.name}
                                        onChange={(e) => setDropoff({ ...dropoff, name: e.target.value })}
                                        className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px] font-medium placeholder:text-[#5e8d73]/70 placeholder:font-normal text-[#101814] dark:text-white"
                                    />
                                </Autocomplete>
                            ) : (
                                <input
                                    type="text"
                                    placeholder={t.book2.dropoffPlaceholder}
                                    value={dropoff.name}
                                    className="w-full bg-transparent border-none outline-none text-[15px] font-medium text-[#101814] dark:text-white"
                                    disabled
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Popular Locations Chips - Stitch Design */}
                {status === 'selecting' && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                        {POPULAR_LOCATIONS.map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => setDropoff({ lat: loc.lat, lng: loc.lng, name: loc.name, id: loc.id })}
                                className="flex items-center justify-center h-9 px-4 rounded-full bg-white dark:bg-[#182b21] shadow-sm border border-[#dae7e0] dark:border-[#2a4a38] whitespace-nowrap active:scale-95 transition-transform hover:border-[#00b250]"
                            >
                                <span className="text-sm font-medium text-[#101814] dark:text-white">{loc.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            )}

            {/* Floating GPS Button - Above Bottom Sheet (Hidden when minimized) */}
            {status === 'selecting' && !isBottomSheetMinimized && (
                <div className="absolute z-20 right-4 bottom-[42%] flex flex-col gap-3">
                    <button
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="size-12 rounded-full bg-white dark:bg-[#182b21] shadow-lg flex items-center justify-center text-[#101814] dark:text-white active:bg-gray-50 dark:active:bg-[#2a4a38] transition-colors"
                    >
                        {isGettingLocation ? (
                            <div className="w-5 h-5 border-2 border-[#00b250] border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined text-[#00b250]">my_location</span>
                        )}
                    </button>
                </div>
            )}

            {/* Bottom Sheet - Stitch Design */}
            <div className="absolute bottom-0 left-0 right-0 z-30">
                <div className={`bg-white dark:bg-[#182b21] rounded-t-[32px] shadow-[0_-5px_20px_rgba(0,0,0,0.1)] pt-2 transition-all duration-300 ease-out ${isBottomSheetMinimized ? 'pb-4' : 'pb-8'}`}>
                    {/* Drag Handle - Clickable */}
                    <button
                        onClick={() => setIsBottomSheetMinimized(!isBottomSheetMinimized)}
                        className="w-full flex items-center justify-center py-2 focus:outline-none active:opacity-70 transition-opacity"
                        aria-label={isBottomSheetMinimized ? 'ขยายรายละเอียด' : 'ย่อรายละเอียด'}
                    >
                        <span className={`material-symbols-outlined text-gray-400 text-[22px] transition-transform duration-300 ${isBottomSheetMinimized ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>

                    {/* === MINIMIZED VIEW === */}
                    {isBottomSheetMinimized && status === 'selecting' && selectedVehicle && (
                        <div className="px-5 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#00b250]/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#00b250]">directions_car</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#101814] dark:text-white">{selectedVehicle.name}</p>
                                        <p className="text-xs text-[#5e8d73]">{selectedVehicle.seats} {t.book2.seats}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-[#00b250]">฿{tripInfo?.price?.toLocaleString() || selectedVehicle.price?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === MINIMIZED VIEW - SELECTING (No vehicle selected) === */}
                    {isBottomSheetMinimized && status === 'selecting' && !selectedVehicle && (
                        <div className="px-5 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#5e8d73]">directions_car</span>
                                </div>
                                <p className="text-sm font-medium text-[#5e8d73]">{t.book2.tapToSelect}</p>
                            </div>
                        </div>
                    )}

                    {/* === MINIMIZED VIEW - SEARCHING === */}
                    {isBottomSheetMinimized && status === 'searching' && (
                        <div className="px-5 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-8 h-8 flex items-center justify-center">
                                        <div className="absolute inset-0 border-[3px] border-[#00b250]/20 rounded-full"></div>
                                        <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" fill="none" r="42" stroke="#00b250" strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" strokeWidth="12" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-bold text-[#101814] dark:text-white">{t.book2.status.searching}</p>
                                </div>
                                <p className="text-lg font-bold text-[#00b250]">฿{tripInfo?.price?.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* === MINIMIZED VIEW - DRIVER ASSIGNED / EN ROUTE === */}
                    {isBottomSheetMinimized && assignedDriver && (status === 'driver_assigned' || status === 'driver_en_route' || status === 'in_progress') && (
                        <div className="px-5 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {assignedDriver.photo ? (
                                        <img src={assignedDriver.photo} alt={assignedDriver.name} className="size-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="size-10 rounded-full bg-[#00b250]/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#00b250]">person</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-[#101814] dark:text-white">{assignedDriver.name}</p>
                                        <p className="text-xs text-[#5e8d73]">
                                            {status === 'driver_en_route' ? `${liveEta.toPickup || 3} ${t.book2.minutes}` : status === 'in_progress' ? t.book2.onTrip : t.book2.waitingJob}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`tel:${assignedDriver.phone}`}
                                    className="size-10 rounded-full bg-[#00b250] flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-white text-[20px]">call</span>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* === MINIMIZED VIEW - COMPLETED === */}
                    {isBottomSheetMinimized && status === 'completed' && (
                        <div className="px-5 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-[#00b250] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[20px]">check</span>
                                    </div>
                                    <p className="text-sm font-bold text-[#101814] dark:text-white">{t.book2.arrivedDestination}</p>
                                </div>
                                <p className="text-lg font-bold text-[#00b250]">฿{tripInfo?.price?.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* === SEARCHING STATE (design_3) === */}
                    {status === 'searching' && !isBottomSheetMinimized && (
                        <div className="px-6 py-4">
                            {/* Searching Status Section */}
                            <div className="flex flex-col items-center text-center">
                                {/* Loading Spinner */}
                                <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                                    <div className="absolute inset-0 border-[5px] border-[#00b250]/20 rounded-full"></div>
                                    <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" fill="none" r="42" stroke="#00b250" strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" strokeWidth="10" />
                                    </svg>
                                    <span className="material-symbols-outlined text-[#00b250] text-2xl">local_taxi</span>
                                </div>
                                <h2 className="text-[#101814] dark:text-white text-2xl font-bold leading-tight mb-2">
                                    {isRematching ? t.book2.searchingNewDriver : t.book2.searchingDriver}
                                </h2>
                                <p className="text-[#5e8d73] text-sm font-medium flex items-center gap-2">
                                    <span>{t.book2.attemptOf} {rematchAttempt + 1}/{REMATCH_CONFIG.MAX_ATTEMPTS}</span>
                                    <span className="w-1 h-1 rounded-full bg-[#5e8d73]"></span>
                                    <span>{t.book2.waitMax}</span>
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full bg-[#dae7e0]/60 dark:bg-gray-700 my-4"></div>

                            {/* Trip Details Timeline */}
                            <div className="relative flex flex-col gap-6 pl-2">
                                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 border-l-2 border-dashed border-gray-300 dark:border-gray-600"></div>
                                {/* Pickup */}
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-6 flex flex-col items-center shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#00b250] ring-4 ring-[#00b250]/20"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[#5e8d73] font-medium mb-0.5">{t.book2.pickupLabel}</p>
                                        <p className="text-[#101814] dark:text-white font-semibold truncate text-base">{tripInfo?.pickup || pickup.name}</p>
                                    </div>
                                </div>
                                {/* Dropoff */}
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-6 flex flex-col items-center shrink-0">
                                        <span className="material-symbols-outlined text-[#FFB300] text-[22px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[#5e8d73] font-medium mb-0.5">{t.book2.dropoffLabel}</p>
                                        <p className="text-[#101814] dark:text-white font-semibold truncate text-base">{tripInfo?.dropoff || dropoff.name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle & Price Card */}
                            {selectedVehicle && tripInfo && (
                                <div className="mt-4 p-4 bg-[#f5f8f7] dark:bg-black/20 rounded-xl border border-[#dae7e0] dark:border-gray-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-[#101814] dark:text-white">directions_car</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[#101814] dark:text-white font-bold text-sm">{selectedVehicle.name}</span>
                                            <div className="flex items-center gap-1 text-xs text-[#5e8d73]">
                                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                                <span>{paymentMethod === 'cash' ? t.book2.cash : t.book2.creditCard}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[#00b250] font-bold text-lg">฿{tripInfo.price.toLocaleString()}</span>
                                </div>
                            )}

                            {/* Cancel Button */}
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="w-full flex items-center justify-center h-12 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-transparent text-red-500 font-bold text-base hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm mt-6"
                            >
                                <span className="material-symbols-outlined mr-2 text-[20px]">close</span>
                                {t.book2.cancelBooking}
                            </button>
                        </div>
                    )}

                    {/* === DRIVER ASSIGNED / EN ROUTE (design_5) === */}
                    {assignedDriver && (status === 'driver_assigned' || status === 'driver_en_route' || status === 'in_progress') && !isBottomSheetMinimized && (
                        <div className="px-6 pt-2 flex flex-col gap-4">
                            {/* ETA Card */}
                            {status === 'driver_en_route' && (
                                <div className="bg-[#f5f8f7] dark:bg-black/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#00b250]/10 rounded-full blur-xl"></div>
                                    <div className="flex-1 flex flex-col">
                                        <h2 className="text-3xl font-bold text-[#101814] dark:text-white tracking-tight">
                                            {liveEta.toPickup || 3} {t.book2.minutes}
                                        </h2>
                                        <p className="text-sm font-medium text-[#5e8d73]">{t.book2.driverComingToPickup}</p>
                                    </div>
                                    <div className="size-10 bg-green-50 dark:bg-[#00b250]/20 rounded-full flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[#00b250]" style={{ fontVariationSettings: "'FILL' 1" }}>access_time_filled</span>
                                    </div>
                                </div>
                            )}

                            {/* In Progress Status */}
                            {status === 'in_progress' && (
                                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl"></div>
                                    <div className="flex-1 flex flex-col">
                                        <h2 className="text-3xl font-bold text-[#101814] dark:text-white tracking-tight">
                                            {liveEta.toDropoff || tripInfo?.duration || '-'} {t.book2.minutes}
                                        </h2>
                                        <p className="text-sm font-medium text-[#5e8d73]">{t.book2.arrivalEstimate}</p>
                                    </div>
                                    <div className="size-10 bg-cyan-100 dark:bg-cyan-800/30 rounded-full flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-cyan-600" style={{ fontVariationSettings: "'FILL' 1" }}>local_taxi</span>
                                    </div>
                                </div>
                            )}

                            {/* Driver Assigned Status */}
                            {status === 'driver_assigned' && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 flex items-center gap-4">
                                    <div className="size-10 bg-purple-100 dark:bg-purple-800/30 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-purple-600" style={{ fontVariationSettings: "'FILL' 1" }}>person_pin</span>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-bold text-[#101814] dark:text-white">{t.book2.driverFound}</h2>
                                        <p className="text-sm text-[#5e8d73]">{t.book2.waitingDriverAccept}</p>
                                    </div>
                                </div>
                            )}

                            {/* Driver Header */}
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    {assignedDriver.photo ? (
                                        <img
                                            src={assignedDriver.photo}
                                            alt={assignedDriver.name}
                                            className="size-14 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100"
                                        />
                                    ) : (
                                        <div className="size-14 rounded-full bg-[#00b250]/10 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-100">
                                            <span className="material-symbols-outlined text-[#00b250] text-3xl">person</span>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                        <span className="material-symbols-outlined text-[#00b250] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                    </div>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-[#101814] dark:text-white">{assignedDriver.name}</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[#FFB300] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                        <span className="text-sm font-semibold text-[#101814] dark:text-white">{assignedDriver.rating?.toFixed(1) || '4.9'}</span>
                                        <span className="text-xs text-[#5e8d73]">({assignedDriver.totalTrips || 0} {t.book2.trips})</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-[#00b250] bg-[#00b250]/10 px-2 py-0.5 rounded-full">TukTik Car</span>
                            </div>

                            {/* Vehicle Details */}
                            <div className="flex items-center justify-between bg-[#f5f8f7] dark:bg-black/20 p-3 rounded-xl border border-[#dae7e0]/50">
                                <div className="flex flex-col">
                                    <span className="text-xs text-[#5e8d73] font-medium mb-0.5">{assignedDriver.vehicleModel}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="size-3 rounded-full bg-white border border-gray-300 shadow-sm" title={t.book2.vehicleColor}></span>
                                        <span className="text-xs text-[#101814] dark:text-white">{assignedDriver.vehicleColor || t.book2.white}</span>
                                    </div>
                                </div>
                                <div className="border-2 border-gray-200 bg-white px-3 py-1 rounded-lg flex flex-col items-center justify-center min-w-[80px]">
                                    <span className="text-[10px] leading-none text-gray-500 mb-0.5">{t.book2.licensePlate}</span>
                                    <span className="text-lg font-bold leading-none text-gray-800 tracking-wide">{assignedDriver.vehiclePlate}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href={`tel:${assignedDriver.phone}`}
                                    className="flex items-center justify-center gap-2 bg-[#00b250] hover:bg-[#008f40] active:scale-[0.98] transition-all text-white py-3.5 rounded-xl font-bold shadow-lg shadow-[#00b250]/30"
                                >
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
                                    <span>{t.book2.call}</span>
                                </a>
                                <button
                                    onClick={() => setShowContactModal(true)}
                                    className="flex items-center justify-center gap-2 bg-white hover:bg-green-50 active:scale-[0.98] transition-all text-[#00b250] border border-[#00b250] py-3.5 rounded-xl font-bold"
                                >
                                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                                    <span>{t.book2.chat}</span>
                                </button>
                            </div>

                            {/* Footer Links */}
                            <div className="flex items-center justify-between pt-1 pb-4">
                                <button className="flex items-center gap-2 text-[#5e8d73] hover:text-[#00b250] transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">ios_share</span>
                                    <span className="text-sm font-medium">{t.book2.shareTrip}</span>
                                </button>
                                {['driver_assigned'].includes(status) && (
                                    <button
                                        onClick={() => setShowCancelModal(true)}
                                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors opacity-80 hover:opacity-100"
                                    >
                                        <span className="text-sm font-medium">{t.book2.cancel}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* === SELECTING STATE (design_0) === */}
                    {status === 'selecting' && !isBottomSheetMinimized && (
                        <div className="flex flex-col px-5 pb-4 gap-4">
                            {/* Heading */}
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-[#101814] dark:text-white">{t.book2.selectVehicle}</h2>
                                <button
                                    onClick={() => setShowVehiclePicker(true)}
                                    className="text-[#00b250] text-sm font-semibold"
                                >
                                    {t.book2.viewAll}
                                </button>
                            </div>

                            {/* Vehicle Selection List (Horizontal) */}
                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
                                {vehicles.slice(0, 4).map(vehicle => (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => setSelectedVehicle(vehicle)}
                                        className={`flex-none w-[140px] flex flex-col gap-2 p-3 rounded-xl cursor-pointer relative transition-all ${
                                            selectedVehicle?.id === vehicle.id
                                                ? 'border-2 border-[#00b250] bg-[#00b250]/5'
                                                : 'border border-[#dae7e0] dark:border-[#2a4a38] bg-white dark:bg-[#182b21] opacity-80 hover:opacity-100'
                                        }`}
                                    >
                                        {selectedVehicle?.id === vehicle.id && (
                                            <div className="absolute top-2 right-2 size-5 rounded-full bg-[#00b250] flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-[16px]">check</span>
                                            </div>
                                        )}
                                        <div className="h-16 w-full flex items-center justify-center mb-1">
                                            <span className="material-symbols-outlined text-[#00b250] text-[56px]">directions_car</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#101814] dark:text-white leading-tight">{vehicle.name}</p>
                                            <p className="text-xs text-[#5e8d73]">{vehicle.seats} {t.book2.seats}</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-1">
                                            <p className="text-base font-bold text-[#101814] dark:text-white">฿{vehicle.price}</p>
                                            <p className="text-[10px] text-[#5e8d73] font-medium bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">3 min</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Primary Action Button */}
                            <button
                                onClick={handleBookNowClick}
                                disabled={!pickup.name || !dropoff.name || !selectedVehicle}
                                className="w-full bg-[#00b250] text-white font-bold text-lg h-12 rounded-xl shadow-lg shadow-[#00b250]/30 mt-2 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                            >
                                <span>{t.book2.book} {selectedVehicle?.name || t.book2.vehicle}</span>
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </button>
                        </div>
                    )}

                    {/* === COMPLETED STATE === */}
                    {status === 'completed' && !isBottomSheetMinimized && (
                        <div className="px-6 py-4 text-center">
                            <div className="w-20 h-20 rounded-full bg-[#00b250] flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-white text-4xl">check</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#101814] dark:text-white mb-2">{t.book2.arrivedDestination}</h2>
                            <p className="text-[#5e8d73] mb-6">{t.book2.thankYou}</p>
                            {tripInfo && (
                                <p className="text-3xl font-bold text-[#00b250] mb-6">฿{tripInfo.price.toLocaleString()}</p>
                            )}
                            <button
                                onClick={() => setShowRatingModal(true)}
                                className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold text-lg"
                            >
                                {t.book2.rateDriver}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Vehicle Picker Modal */}
            {showVehiclePicker && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
                    <div className="w-full bg-white dark:bg-[#162e21] rounded-t-3xl max-h-[70vh] overflow-hidden">
                        <div className="sticky top-0 bg-white dark:bg-[#162e21] p-4 border-b border-[#dae7e0] dark:border-[#2a4a38]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[#101814] dark:text-white">{t.book2.selectVehicleType}</h3>
                                <button onClick={() => setShowVehiclePicker(false)}>
                                    <span className="material-symbols-outlined text-[#5e8d73]">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(70vh-80px)]">
                            {vehicles.map(vehicle => (
                                <button
                                    key={vehicle.id}
                                    onClick={() => {
                                        setSelectedVehicle(vehicle);
                                        setShowVehiclePicker(false);
                                    }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                                        selectedVehicle?.id === vehicle.id
                                            ? 'border-[#00b250] bg-[#00b250]/5'
                                            : 'border-[#dae7e0] dark:border-[#2a4a38]'
                                    }`}
                                >
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-[#5e8d73]">directions_car</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-[#101814] dark:text-white">{vehicle.name}</p>
                                        <p className="text-sm text-[#5e8d73]">{vehicle.seats} {t.book2.seats}</p>
                                    </div>
                                    <span className="text-lg font-bold text-[#00b250]">฿{vehicle.price.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center">
                    <div className="w-full sm:max-w-md bg-white dark:bg-[#162e21] rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden">
                        <div className="sticky top-0 bg-white dark:bg-[#162e21] p-4 border-b border-[#dae7e0] dark:border-[#2a4a38]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[#101814] dark:text-white">{t.book2.payment}</h3>
                                <button onClick={handlePaymentCancel}>
                                    <span className="material-symbols-outlined text-[#5e8d73]">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Trip summary */}
                            {tripInfo && (
                                <div className="bg-[#f5f8f7] dark:bg-[#0f2318] rounded-xl p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#5e8d73]">{t.book2.price}</span>
                                        <span className="text-2xl font-bold text-[#00b250]">฿{tripInfo.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Payment methods */}
                            {!clientSecret && (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 ${
                                            paymentMethod === 'cash'
                                                ? 'border-[#00b250] bg-[#00b250]/5'
                                                : 'border-[#dae7e0] dark:border-[#2a4a38]'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-2xl text-[#00b250]">payments</span>
                                        <span className="flex-1 text-left font-medium text-[#101814] dark:text-white">{t.book2.cash}</span>
                                        {paymentMethod === 'cash' && (
                                            <span className="material-symbols-outlined text-[#00b250]">check_circle</span>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 ${
                                            paymentMethod === 'card'
                                                ? 'border-[#00b250] bg-[#00b250]/5'
                                                : 'border-[#dae7e0] dark:border-[#2a4a38]'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-2xl text-blue-500">credit_card</span>
                                        <span className="flex-1 text-left font-medium text-[#101814] dark:text-white">{t.book2.creditDebit}</span>
                                        {paymentMethod === 'card' && (
                                            <span className="material-symbols-outlined text-[#00b250]">check_circle</span>
                                        )}
                                    </button>

                                    {paymentError && (
                                        <p className="text-red-500 text-sm">{paymentError}</p>
                                    )}

                                    <button
                                        onClick={handlePaymentProceed}
                                        disabled={isProcessingPayment}
                                        className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessingPayment ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                <span>{t.book2.processing}</span>
                                            </>
                                        ) : (
                                            <span>{t.book2.proceed}</span>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Stripe form */}
                            {clientSecret && (
                                <Elements stripe={stripePromise} options={{ clientSecret }}>
                                    <StripePaymentForm
                                        clientSecret={clientSecret}
                                        onSuccess={handlePaymentSuccess}
                                        onCancel={handlePaymentCancel}
                                        isProcessing={isProcessingPayment}
                                        setIsProcessing={setIsProcessingPayment}
                                    />
                                </Elements>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#162e21] rounded-2xl p-6 max-w-sm w-full">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                            </div>
                            <h3 className="text-lg font-bold text-[#101814] dark:text-white mb-2">{t.book2.cancelBookingQuestion}</h3>
                            <p className="text-sm text-[#5e8d73] mb-6">{t.book2.cancelBookingConfirm}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                disabled={isCancellingBooking}
                                className="flex-1 h-12 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold"
                            >
                                {t.book2.no}
                            </button>
                            <button
                                onClick={confirmCancelBooking}
                                disabled={isCancellingBooking}
                                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
                            >
                                {isCancellingBooking ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <span>{t.book2.cancel}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* No Driver Modal */}
            {showNoDriverModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
                    <div className="w-full bg-white dark:bg-[#162e21] rounded-t-3xl p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-yellow-500 text-3xl">warning</span>
                            </div>
                            <h3 className="text-lg font-bold text-[#101814] dark:text-white mb-2">{t.book2.noDriverAvailable}</h3>
                            <p className="text-sm text-[#5e8d73]">{t.book2.bookingStillActive}</p>
                        </div>
                        <div className="bg-[#00b250]/5 rounded-xl p-4 mb-6">
                            <p className="text-sm font-semibold text-[#00b250] mb-2">{t.book2.whatHappensNext}</p>
                            <ul className="text-sm text-[#5e8d73] space-y-1">
                                <li>• {t.book2.systemWillFind}</li>
                                <li>• {t.book2.adminWillHelp}</li>
                                <li>• {t.book2.youWillBeNotified}</li>
                            </ul>
                        </div>
                        <button
                            onClick={() => setShowNoDriverModal(false)}
                            className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold"
                        >
                            {t.book2.understood}
                        </button>
                    </div>
                </div>
            )}

            {/* Contact Modal */}
            {showContactModal && assignedDriver && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowContactModal(false)}>
                    <div className="w-full bg-white dark:bg-[#162e21] rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-[#101814] dark:text-white">{t.book2.contactDriver}</h3>
                            <button
                                onClick={() => setShowContactModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-[#5e8d73]">close</span>
                            </button>
                        </div>

                        {/* Driver Info */}
                        <div className="flex items-center gap-3 mb-6 p-3 bg-[#f5f8f7] dark:bg-black/20 rounded-xl">
                            {assignedDriver.photo ? (
                                <img src={assignedDriver.photo} alt={assignedDriver.name} className="size-12 rounded-full object-cover" />
                            ) : (
                                <div className="size-12 rounded-full bg-[#00b250]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#00b250] text-2xl">person</span>
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-[#101814] dark:text-white">{assignedDriver.name}</p>
                                <p className="text-sm text-[#5e8d73]">{assignedDriver.vehicleModel} • {assignedDriver.vehiclePlate}</p>
                            </div>
                        </div>

                        {/* Contact Options */}
                        <div className="space-y-3">
                            <a
                                href={`tel:${assignedDriver.phone}`}
                                className="flex items-center gap-4 p-4 bg-[#00b250] hover:bg-[#008f40] text-white rounded-xl transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
                                </div>
                                <div>
                                    <p className="font-bold">{t.book2.callDriver}</p>
                                    <p className="text-sm text-white/80">{assignedDriver.phone}</p>
                                </div>
                            </a>

                            <a
                                href="https://line.me/ti/p/@tuktik"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-[#06C755] hover:bg-[#05a648] text-white rounded-xl transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold">LINE @TukTik</p>
                                    <p className="text-sm text-white/80">{t.book2.contactSupport}</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal - Stitch Design (design_7) */}
            {showRatingModal && (
                <div className="fixed inset-0 z-50 bg-[#f5f8f7] dark:bg-[#0f2318] overflow-y-auto">
                    {/* Confetti Decoration */}
                    <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0 opacity-40">
                        <div className="absolute top-10 left-[10%] w-3 h-3 bg-[#00b250] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="absolute top-20 right-[20%] w-2 h-2 bg-[#FFB300] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        <div className="absolute top-40 left-[80%] w-4 h-4 bg-[#00b250]/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                    </div>

                    {/* Main Content */}
                    <main className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto p-4 pb-32">
                        {/* Success Header */}
                        <div className="flex flex-col items-center justify-center pt-8 pb-6 text-center space-y-4">
                            <div className="bg-[#00b250]/10 rounded-full p-4 ring-8 ring-[#00b250]/5">
                                <span className="material-symbols-outlined text-[#00b250] text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold text-[#101814] dark:text-white">{t.book2.arrivedDestination}</h1>
                                <p className="text-[#5e8d73] text-sm">{t.book2.hopeYouEnjoyed}</p>
                            </div>
                            {tripInfo && (
                                <div className="text-[40px] font-bold text-[#00b250] tracking-tight">฿{tripInfo.price.toLocaleString()}</div>
                            )}
                        </div>

                        {/* Trip Summary Card */}
                        <div className="bg-white dark:bg-[#162e22] rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-[#dae7e0] dark:border-[#2a4a38] p-5 mb-4">
                            {/* Route Visualization */}
                            <div className="relative flex flex-col gap-6 pl-2">
                                {/* Line Connector */}
                                <div className="absolute left-[11px] top-3 bottom-8 w-0.5 border-l-2 border-[#00b250]/30 border-dashed"></div>
                                {/* Pickup */}
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-6 h-6 rounded-full border-4 border-[#00b250] bg-white dark:bg-[#162e22] shrink-0 mt-0.5"></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-[#5e8d73] uppercase tracking-wider">{t.book2.pickup}</span>
                                        <span className="text-sm font-medium text-[#101814] dark:text-white">{tripInfo?.pickup || pickup.name}</span>
                                    </div>
                                </div>
                                {/* Dropoff */}
                                <div className="flex items-start gap-4 relative z-10">
                                    <span className="material-symbols-outlined text-[#00b250] shrink-0 text-2xl -ml-[1px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-[#5e8d73] uppercase tracking-wider">{t.book2.dropoff}</span>
                                        <span className="text-sm font-medium text-[#101814] dark:text-white">{tripInfo?.dropoff || dropoff.name}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-[#dae7e0] dark:bg-[#2a4a38] my-4"></div>
                            {/* Trip Stats */}
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[#5e8d73]">{t.book2.distance}</span>
                                        <span className="font-medium text-[#101814] dark:text-white">{tripInfo?.distance || '-'} km</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-[#5e8d73]">{t.book2.time}</span>
                                        <span className="font-medium text-[#101814] dark:text-white">{tripInfo?.duration || '-'} {t.book2.minutes}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-[#f5f8f7] dark:bg-[#0f2318]/50 px-3 py-1.5 rounded-lg border border-[#dae7e0] dark:border-[#2a4a38]">
                                    <span className="material-symbols-outlined text-[#101814] dark:text-white text-base">payments</span>
                                    <span className="font-medium text-xs text-[#101814] dark:text-white">{paymentMethod === 'cash' ? t.book2.cash : t.book2.card}</span>
                                </div>
                            </div>
                        </div>

                        {/* Driver Card */}
                        {assignedDriver && (
                            <div className="bg-white dark:bg-[#162e22] rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-[#dae7e0] dark:border-[#2a4a38] p-4 flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-[#00b250]/10 flex items-center justify-center border border-[#dae7e0]">
                                            <span className="material-symbols-outlined text-[#00b250] text-2xl">person</span>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm">
                                            <span className="material-symbols-outlined text-[#FFB300] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-[#101814] dark:text-white text-base">{assignedDriver.name}</h3>
                                        <p className="text-xs text-[#5e8d73]">{assignedDriver.vehicleModel} • {assignedDriver.vehiclePlate}</p>
                                    </div>
                                </div>
                                <a href={`tel:${assignedDriver.phone}`} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f8f7] dark:bg-[#0f2318] text-[#5e8d73] hover:text-[#00b250] transition-colors">
                                    <span className="material-symbols-outlined text-xl">chat</span>
                                </a>
                            </div>
                        )}

                        {/* Rating Section */}
                        <div className="flex flex-col items-center space-y-4 mb-8">
                            <h2 className="font-bold text-lg text-[#101814] dark:text-white">{t.book2.rateDriver}</h2>
                            {/* Stars */}
                            <div className="flex gap-3">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setRatingStars(star)}
                                        className="group focus:outline-none"
                                    >
                                        <span
                                            className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${
                                                star <= ratingStars ? 'text-[#FFB300]' : 'text-gray-300'
                                            }`}
                                            style={{ fontVariationSettings: star <= ratingStars ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {/* Feedback Chips */}
                            <div className="flex flex-wrap justify-center gap-2 w-full pt-2">
                                {[t.book2.goodDriving, t.book2.cleanCar, t.book2.politeService, t.book2.fastArrival].map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => setRatingComment(prev => prev ? `${prev}, ${chip}` : chip)}
                                        className="px-4 py-2 rounded-full border border-[#dae7e0] dark:border-[#2a4a38] bg-white dark:bg-[#162e22] text-sm text-[#101814] dark:text-gray-300 hover:bg-[#00b250]/5 hover:border-[#00b250] hover:text-[#00b250] transition-all"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tipping Section */}
                        <div className="bg-white dark:bg-[#162e22] rounded-xl p-5 mb-6 border border-[#dae7e0] dark:border-[#2a4a38]">
                            <h3 className="font-bold text-base mb-4 text-[#101814] dark:text-white">{t.book2.tipDriver}</h3>
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {[0, 20, 50, 100].map(tip => (
                                    <button
                                        key={tip}
                                        onClick={() => setSelectedTip(tip)}
                                        className={`py-2 rounded-lg border font-medium text-sm transition-colors ${
                                            selectedTip === tip
                                                ? 'border-[#00b250] bg-[#00b250]/10 text-[#00b250] font-bold'
                                                : 'border-[#dae7e0] dark:border-[#2a4a38] bg-[#f5f8f7] dark:bg-[#0f2318] text-[#101814] dark:text-gray-300 hover:border-[#00b250] hover:text-[#00b250]'
                                        }`}
                                    >
                                        {tip === 0 ? t.book2.noTip : `฿${tip}`}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                className="w-full bg-[#f5f8f7] dark:bg-[#0f2318] border border-[#dae7e0] dark:border-[#2a4a38] rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#00b250] focus:border-[#00b250] outline-none resize-none text-[#101814] dark:text-white placeholder-[#5e8d73]"
                                placeholder={t.book2.feedbackPlaceholder}
                                rows={2}
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                            />
                        </div>
                    </main>

                    {/* Fixed Bottom Actions */}
                    <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-[#162e22] border-t border-[#dae7e0] dark:border-[#2a4a38] p-4 z-20 pb-8">
                        <div className="max-w-md mx-auto flex flex-col gap-3">
                            <button
                                onClick={submitRating}
                                disabled={isSubmittingRating}
                                className="w-full bg-[#00b250] hover:bg-[#009140] text-white font-bold py-3.5 rounded-full shadow-lg shadow-[#00b250]/20 transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2"
                            >
                                {isSubmittingRating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>{t.book2.submitting}</span>
                                    </>
                                ) : (
                                    <span>{t.book2.submitRating}</span>
                                )}
                            </button>
                            <button
                                onClick={() => { setShowRatingModal(false); resetTrip(); }}
                                className="w-full text-[#5e8d73] hover:text-[#101814] dark:text-gray-400 dark:hover:text-white font-medium py-2 text-sm transition-colors"
                            >
                                {t.book2.skip}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
