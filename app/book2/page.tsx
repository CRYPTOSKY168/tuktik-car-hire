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

    // Rating state
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [selectedTip, setSelectedTip] = useState(0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

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
    }, [bookingId, availableDrivers, user]);

    // Update driver location from tracking
    useEffect(() => {
        if (liveDriverLocation) {
            setDriverLocation({ lat: liveDriverLocation.lat, lng: liveDriverLocation.lng });
            if (liveDriverLocation.heading) setDriverBearing(liveDriverLocation.heading);
        }
    }, [liveDriverLocation]);

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
        const eligibleDrivers = availableDrivers.filter(d =>
            d.userId !== user?.uid && !excludeDrivers.includes(d.id)
        );

        if (eligibleDrivers.length === 0) return false;

        try {
            const driver = eligibleDrivers[Math.floor(Math.random() * eligibleDrivers.length)];
            const token = await getAuthToken();
            if (!token) return false;

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
            if (result.success) {
                setAssignedDriver(driver);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error assigning driver:', error);
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
            await fetch('/api/booking/rate', {
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
            'selecting': 'เลือกจุดหมาย',
            'searching': 'กำลังหาคนขับ...',
            'driver_assigned': 'พบคนขับแล้ว',
            'driver_en_route': 'คนขับกำลังมา',
            'in_progress': 'กำลังเดินทาง',
            'completed': 'ถึงปลายทางแล้ว',
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
                    <p className="mt-4 text-lg font-bold">ไม่สามารถโหลดแผนที่ได้</p>
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

            {/* Search Card */}
            <div className="relative z-20 px-4 pt-16">
                <div className="bg-white dark:bg-[#182b21] rounded-2xl shadow-lg p-4 border border-[#dae7e0] dark:border-[#2a4a38]">
                    {/* Pickup */}
                    <div className="flex items-center gap-3 h-12">
                        <div className="w-6 flex justify-center">
                            <div className="w-3 h-3 rounded-full bg-[#00b250]" />
                        </div>
                        {isLoaded && status === 'selecting' ? (
                            <Autocomplete
                                onLoad={(autocomplete) => { pickupAutocompleteRef.current = autocomplete; }}
                                onPlaceChanged={onPickupPlaceSelect}
                                options={{ componentRestrictions: { country: 'th' } }}
                                className="flex-1"
                            >
                                <input
                                    type="text"
                                    placeholder="จุดรับ - พิมพ์ค้นหา"
                                    value={pickup.name}
                                    onChange={(e) => setPickup({ ...pickup, name: e.target.value })}
                                    className="w-full bg-transparent text-[#101814] dark:text-white placeholder-[#5e8d73] outline-none text-base"
                                />
                            </Autocomplete>
                        ) : (
                            <input
                                type="text"
                                placeholder="จุดรับ"
                                value={pickup.name}
                                className="flex-1 bg-transparent text-[#101814] dark:text-white placeholder-[#5e8d73] outline-none text-base"
                                disabled
                            />
                        )}
                        {/* GPS Button */}
                        {status === 'selecting' && (
                            <button
                                onClick={getCurrentLocation}
                                disabled={isGettingLocation}
                                className="w-10 h-10 rounded-full bg-[#00b250]/10 hover:bg-[#00b250]/20 flex items-center justify-center transition-colors"
                                title="ใช้ตำแหน่งปัจจุบัน"
                            >
                                {isGettingLocation ? (
                                    <div className="w-5 h-5 border-2 border-[#00b250] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[#00b250]">my_location</span>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="h-px bg-[#dae7e0] dark:bg-[#2a4a38] ml-9" />

                    {/* Dropoff */}
                    <div className="flex items-center gap-3 h-12">
                        <div className="w-6 flex justify-center">
                            <div className="w-3 h-3 rounded-sm bg-red-500" />
                        </div>
                        {isLoaded && status === 'selecting' ? (
                            <Autocomplete
                                onLoad={(autocomplete) => { dropoffAutocompleteRef.current = autocomplete; }}
                                onPlaceChanged={onDropoffPlaceSelect}
                                options={{ componentRestrictions: { country: 'th' } }}
                                className="flex-1"
                            >
                                <input
                                    type="text"
                                    placeholder="จุดส่ง - พิมพ์ค้นหา"
                                    value={dropoff.name}
                                    onChange={(e) => setDropoff({ ...dropoff, name: e.target.value })}
                                    className="w-full bg-transparent text-[#101814] dark:text-white placeholder-[#5e8d73] outline-none text-base"
                                />
                            </Autocomplete>
                        ) : (
                            <input
                                type="text"
                                placeholder="จุดส่ง"
                                value={dropoff.name}
                                className="flex-1 bg-transparent text-[#101814] dark:text-white placeholder-[#5e8d73] outline-none text-base"
                                disabled
                            />
                        )}
                    </div>
                </div>

                {/* Popular locations */}
                {status === 'selecting' && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        {POPULAR_LOCATIONS.map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => setDropoff({ lat: loc.lat, lng: loc.lng, name: loc.name, id: loc.id })}
                                className="flex-shrink-0 px-4 py-2 bg-white dark:bg-[#182b21] rounded-full border border-[#dae7e0] dark:border-[#2a4a38] text-sm font-medium text-[#101814] dark:text-white hover:border-[#00b250] transition-colors"
                            >
                                {loc.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Sheet */}
            <div className="absolute bottom-0 left-0 right-0 z-30">
                <div className="bg-white dark:bg-[#162e21] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#dae7e0] dark:border-[#2a4a38]">
                    <div className="p-4 pb-8">
                        {/* Status indicator */}
                        {status !== 'selecting' && (
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${
                                    status === 'completed' ? 'bg-green-500' : 'bg-[#00b250]'
                                }`} />
                                <span className="text-sm font-semibold text-[#101814] dark:text-white">
                                    {isRematching ? rematchMessage : getStatusLabel(status)}
                                </span>
                            </div>
                        )}

                        {/* Driver info */}
                        {assignedDriver && status !== 'selecting' && status !== 'searching' && (
                            <div className="bg-[#f5f8f7] dark:bg-[#0f2318] rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-[#00b250]/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#00b250] text-3xl">person</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-[#101814] dark:text-white">{assignedDriver.name}</p>
                                        <p className="text-sm text-[#5e8d73]">{assignedDriver.vehicleModel} • {assignedDriver.vehiclePlate}</p>
                                    </div>
                                    <a
                                        href={`tel:${assignedDriver.phone}`}
                                        className="w-12 h-12 rounded-full bg-[#00b250] flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-white">call</span>
                                    </a>
                                </div>
                                {liveEta.toPickup && status === 'driver_en_route' && (
                                    <div className="mt-3 text-center">
                                        <span className="text-sm text-[#5e8d73]">ถึงใน </span>
                                        <span className="font-bold text-[#00b250]">{liveEta.toPickup} นาที</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Vehicle selection */}
                        {status === 'selecting' && selectedVehicle && (
                            <button
                                onClick={() => setShowVehiclePicker(true)}
                                className="w-full flex items-center gap-4 p-3 bg-[#f5f8f7] dark:bg-[#0f2318] rounded-xl mb-4"
                            >
                                <div className="w-12 h-12 rounded-lg bg-white dark:bg-[#182b21] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#00b250] text-2xl">directions_car</span>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-[#101814] dark:text-white">{selectedVehicle.name}</p>
                                    <p className="text-sm text-[#5e8d73]">{selectedVehicle.seats} ที่นั่ง</p>
                                </div>
                                <span className="text-lg font-bold text-[#00b250]">฿{selectedVehicle.price.toLocaleString()}</span>
                                <span className="material-symbols-outlined text-[#5e8d73]">chevron_right</span>
                            </button>
                        )}

                        {/* Action buttons */}
                        {status === 'selecting' && (
                            <button
                                onClick={handleBookNowClick}
                                disabled={!pickup.name || !dropoff.name || !selectedVehicle}
                                className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold text-lg shadow-lg shadow-[#00b250]/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                <span>จองเลย</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        )}

                        {/* Cancel button for active booking */}
                        {activeBooking && ['pending', 'confirmed', 'driver_assigned'].includes(activeBooking.status) && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="w-full h-12 rounded-xl border-2 border-red-500 text-red-500 font-semibold mt-3"
                            >
                                ยกเลิกการจอง
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Vehicle Picker Modal */}
            {showVehiclePicker && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
                    <div className="w-full bg-white dark:bg-[#162e21] rounded-t-3xl max-h-[70vh] overflow-hidden">
                        <div className="sticky top-0 bg-white dark:bg-[#162e21] p-4 border-b border-[#dae7e0] dark:border-[#2a4a38]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[#101814] dark:text-white">เลือกประเภทรถ</h3>
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
                                        <p className="text-sm text-[#5e8d73]">{vehicle.seats} ที่นั่ง</p>
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
                                <h3 className="text-lg font-bold text-[#101814] dark:text-white">ชำระเงิน</h3>
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
                                        <span className="text-[#5e8d73]">ราคา</span>
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
                                        <span className="flex-1 text-left font-medium text-[#101814] dark:text-white">เงินสด</span>
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
                                        <span className="flex-1 text-left font-medium text-[#101814] dark:text-white">บัตรเครดิต/เดบิต</span>
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
                                                <span>กำลังดำเนินการ...</span>
                                            </>
                                        ) : (
                                            <span>ดำเนินการต่อ</span>
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
                            <h3 className="text-lg font-bold text-[#101814] dark:text-white mb-2">ยกเลิกการจอง?</h3>
                            <p className="text-sm text-[#5e8d73] mb-6">คุณต้องการยกเลิกการจองนี้หรือไม่?</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                disabled={isCancellingBooking}
                                className="flex-1 h-12 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold"
                            >
                                ไม่ใช่
                            </button>
                            <button
                                onClick={confirmCancelBooking}
                                disabled={isCancellingBooking}
                                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
                            >
                                {isCancellingBooking ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <span>ยกเลิก</span>
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
                            <h3 className="text-lg font-bold text-[#101814] dark:text-white mb-2">ไม่มีคนขับว่างในขณะนี้</h3>
                            <p className="text-sm text-[#5e8d73]">การจองของคุณยังอยู่ในระบบ</p>
                        </div>
                        <div className="bg-[#00b250]/5 rounded-xl p-4 mb-6">
                            <p className="text-sm font-semibold text-[#00b250] mb-2">สิ่งที่จะเกิดขึ้น:</p>
                            <ul className="text-sm text-[#5e8d73] space-y-1">
                                <li>• ระบบจะหาคนขับให้อัตโนมัติ</li>
                                <li>• แอดมินจะช่วยหาคนขับให้</li>
                                <li>• คุณจะได้รับแจ้งเตือนทันที</li>
                            </ul>
                        </div>
                        <button
                            onClick={() => setShowNoDriverModal(false)}
                            className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold"
                        >
                            เข้าใจแล้ว
                        </button>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
                    <div className="w-full bg-white dark:bg-[#162e21] rounded-t-3xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-[#162e21] p-4 border-b border-[#dae7e0] dark:border-[#2a4a38]">
                            <h3 className="text-lg font-bold text-center text-[#101814] dark:text-white">ให้คะแนนการเดินทาง</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Stars */}
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => setRatingStars(star)}>
                                        <span
                                            className={`material-symbols-outlined text-4xl ${
                                                star <= ratingStars ? 'text-yellow-400' : 'text-gray-300'
                                            }`}
                                            style={{ fontVariationSettings: star <= ratingStars ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Comment */}
                            <textarea
                                placeholder="ความคิดเห็น (ไม่บังคับ)"
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                className="w-full h-24 p-3 border border-[#dae7e0] dark:border-[#2a4a38] rounded-xl bg-transparent text-[#101814] dark:text-white resize-none"
                            />

                            {/* Tip */}
                            <div>
                                <p className="text-sm font-semibold text-[#5e8d73] mb-2">ทิป</p>
                                <div className="flex gap-2">
                                    {[0, 20, 50, 100].map(tip => (
                                        <button
                                            key={tip}
                                            onClick={() => setSelectedTip(tip)}
                                            className={`flex-1 py-2 rounded-xl border-2 font-semibold ${
                                                selectedTip === tip
                                                    ? 'border-[#00b250] bg-[#00b250]/5 text-[#00b250]'
                                                    : 'border-[#dae7e0] dark:border-[#2a4a38] text-[#5e8d73]'
                                            }`}
                                        >
                                            {tip === 0 ? 'ไม่ทิป' : `฿${tip}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={submitRating}
                                disabled={isSubmittingRating}
                                className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold flex items-center justify-center gap-2"
                            >
                                {isSubmittingRating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>กำลังส่ง...</span>
                                    </>
                                ) : (
                                    <span>ส่งคะแนน</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
