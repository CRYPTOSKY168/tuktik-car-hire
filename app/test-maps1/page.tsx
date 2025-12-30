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
import { doc, onSnapshot } from 'firebase/firestore';

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

    // Rating state for completed trips
    const [rating, setRating] = useState<number>(0);
    const [ratingComment, setRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

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

        const checkActiveBooking = async () => {
            setIsLoadingActiveBooking(true);
            try {
                const bookings = await BookingService.getUserBookings(user.uid);

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
                        if (driverDoc) {
                            setAssignedDriver(driverDoc);
                        }
                    }

                    // Set pickup/dropoff from booking
                    setPickup(prev => ({
                        ...prev,
                        name: active.pickupLocation,
                    }));
                    setDropoff(prev => ({
                        ...prev,
                        name: active.dropoffLocation,
                    }));

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
            } finally {
                setIsLoadingActiveBooking(false);
            }
        };

        checkActiveBooking();
    }, [mode, user]);

    // === Real-time subscription for booking status changes ===
    useEffect(() => {
        if (mode !== 'live' || !bookingId || !db) return;

        console.log('📡 Subscribing to booking updates:', bookingId);

        const unsubscribe = onSnapshot(
            doc(db, 'bookings', bookingId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const bookingData = { id: docSnap.id, ...docSnap.data() } as Booking;
                    console.log('📦 Booking update received:', bookingData.status);

                    setActiveBooking(bookingData);

                    // Map booking status to page status
                    const statusMap: Record<string, typeof status> = {
                        'pending': 'searching',
                        'confirmed': 'searching',
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
            }
        );

        return () => {
            console.log('🔌 Unsubscribing from booking updates');
            unsubscribe();
        };
    }, [mode, bookingId, assignedDriver]);

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

    // === NEW: Find and assign driver ===
    const findAndAssignDriver = async (bookingIdToAssign: string): Promise<boolean> => {
        // Filter out drivers whose userId matches current user (can't be assigned to own booking)
        const eligibleDrivers = availableDrivers.filter(driver => driver.userId !== user?.uid);

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

            // Assign driver to booking
            await BookingService.assignDriver(bookingIdToAssign, {
                driverId: driver.id,
                name: driver.name,
                phone: driver.phone,
                vehiclePlate: driver.vehiclePlate,
                vehicleModel: driver.vehicleModel,
                vehicleColor: driver.vehicleColor,
            });

            // Update driver status to busy
            await DriverService.updateDriverStatus(driver.id, 'busy' as any);

            setAssignedDriver(driver);
            return true;
        } catch (error) {
            console.error('Error assigning driver:', error);
            alert(language === 'th' ? 'ไม่สามารถมอบหมายคนขับได้' : 'Failed to assign driver');
            return false;
        }
    };

    // === NEW: Start live trip ===
    const startLiveTrip = async () => {
        setStatus('searching');

        // Create booking
        const newBookingId = await createLiveBooking();
        if (!newBookingId) {
            setStatus('selecting');
            return;
        }

        // Find and assign driver
        const assigned = await findAndAssignDriver(newBookingId);
        if (!assigned) {
            setStatus('selecting');
            return;
        }

        // Move to driver assigned status
        setStatus('driver_assigned');

        // Start tracking (the useDriverTracking hook will automatically track)
        setTimeout(() => {
            setStatus('driver_en_route');
            setFollowCar(true);
        }, 2000);
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
        <div className="min-h-screen min-h-[100dvh] bg-gray-100">
            <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">

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

                {/* Map Area */}
                <div className="relative flex-1" style={{ minHeight: '45vh' }}>
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

                        {/* Driver Car */}
                        {driverLocation && (
                            <CarMarker position={driverLocation} bearing={driverBearing} />
                        )}
                    </GoogleMap>

                    {/* ETA Badge */}
                    {eta !== null && isSimulating && followCar && (
                        <div className="absolute top-4 left-4 bg-white rounded-2xl shadow-lg p-3">
                            <p className="text-xs text-gray-500">{language === 'th' ? 'ถึงใน' : 'ETA'}</p>
                            <p className="text-xl font-bold text-blue-600">
                                {eta >= 60
                                    ? `${Math.floor(eta / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${eta % 60} ${language === 'th' ? 'น.' : 'min'}`
                                    : `${eta} ${language === 'th' ? 'นาที' : 'min'}`
                                }
                            </p>
                        </div>
                    )}

                    {/* Follow Stopped Banner */}
                    {isSimulating && !followCar && (
                        <div className="absolute top-4 left-4 right-16 z-20">
                            <button
                                onClick={() => { zoomToCar(); setFollowCar(true); }}
                                className="w-full bg-blue-600 text-white rounded-2xl shadow-lg p-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                            >
                                <span className="text-lg">🚗</span>
                                <span className="font-medium text-sm">
                                    {language === 'th' ? 'กดเพื่อกลับไปติดตามรถ' : 'Tap to follow car'}
                                </span>
                                {eta !== null && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                        {eta >= 60
                                            ? `${Math.floor(eta / 60)}${language === 'th' ? 'ชม.' : 'h'} ${eta % 60}${language === 'th' ? 'น.' : 'm'}`
                                            : `${eta} ${language === 'th' ? 'นาที' : 'min'}`
                                        }
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Map Controls */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        {/* Compass */}
                        <button
                            onClick={resetToNorth}
                            className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                        >
                            <div style={{ transform: `rotate(${-mapHeading}deg)` }} className="transition-transform duration-300">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L15 10H9L12 2Z" fill="#dc2626"/>
                                    <path d="M12 22L9 14H15L12 22Z" fill="#9ca3af"/>
                                    <circle cx="12" cy="12" r="2" fill="#374151"/>
                                </svg>
                            </div>
                        </button>

                        {/* Satellite Toggle */}
                        <button
                            onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
                            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all ${
                                mapType === 'satellite' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
                            }`}
                        >
                            <span className="text-lg">🛰️</span>
                        </button>

                        {/* Traffic Toggle */}
                        <button
                            onClick={() => setShowTraffic(!showTraffic)}
                            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all ${
                                showTraffic ? 'bg-green-500 text-white' : 'bg-white text-gray-600'
                            }`}
                        >
                            <span className="text-lg">🚦</span>
                        </button>

                        {/* Fit Bounds */}
                        <button
                            onClick={fitBounds}
                            className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                        >
                            <span className="text-lg">🗺️</span>
                        </button>

                        {/* Follow Car */}
                        {driverLocation && (
                            <button
                                onClick={() => { zoomToCar(); setFollowCar(true); }}
                                className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all ${
                                    followCar
                                        ? 'bg-blue-600 ring-2 ring-blue-300'
                                        : 'bg-white border-2 border-blue-600 animate-pulse'
                                }`}
                            >
                                <span className="text-lg">🚗</span>
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {isSimulating && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Sheet */}
                <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] -mt-6 relative z-10">
                    {/* Handle */}
                    <div className="flex justify-center py-3">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center mb-4">
                        <div className={`px-4 py-2 rounded-full text-white text-sm font-medium ${statusConfig[status]?.color}`}>
                            {statusConfig[status]?.text}
                        </div>
                    </div>

                    <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] space-y-4">

                        {/* Route Info Card - hide when completed */}
                        {status !== 'completed' && (
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <div className="flex">
                                {/* Connection Line */}
                                <div className="flex flex-col items-center mr-4">
                                    <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100" />
                                    <div className="w-0.5 h-10 bg-gray-300 my-1" />
                                    <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100" />
                                </div>

                                {/* Location Info */}
                                <div className="flex-1 space-y-2">
                                    <button
                                        onClick={() => { setLocationPickerType('pickup'); setSearchQuery(''); setShowLocationPicker(true); }}
                                        disabled={status !== 'selecting'}
                                        className="w-full text-left p-2 -m-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:hover:bg-transparent disabled:cursor-default group"
                                    >
                                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                                            {language === 'th' ? 'จุดรับ' : 'Pickup'}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[15px] font-semibold text-gray-900 line-clamp-2 leading-tight" title={pickup.name}>
                                                {pickup.name}
                                            </p>
                                            {status === 'selecting' && (
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>

                                    <div className="h-px bg-gray-200 mx-2" />

                                    <button
                                        onClick={() => { setLocationPickerType('dropoff'); setSearchQuery(''); setShowLocationPicker(true); }}
                                        disabled={status !== 'selecting'}
                                        className="w-full text-left p-2 -m-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:hover:bg-transparent disabled:cursor-default group"
                                    >
                                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                                            {language === 'th' ? 'จุดส่ง' : 'Dropoff'}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[15px] font-semibold text-gray-900 line-clamp-2 leading-tight" title={dropoff.name}>
                                                {dropoff.name}
                                            </p>
                                            {status === 'selecting' && (
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Price/Distance */}
                                {tripInfo && (
                                    <div className="text-right ml-4 flex-shrink-0">
                                        <p className="text-xl font-bold text-blue-600">฿{tripInfo.price.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">
                                            {tripInfo.distance} km • {tripInfo.duration >= 60
                                                ? `${Math.floor(tripInfo.duration / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${tripInfo.duration % 60} ${language === 'th' ? 'น.' : 'min'}`
                                                : `${tripInfo.duration} ${language === 'th' ? 'นาที' : 'min'}`
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* Driver Info - only show when driver has ACCEPTED the job (en_route or in_progress) */}
                        {(status === 'driver_en_route' || status === 'in_progress') && (
                            <div className="bg-blue-50 rounded-2xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                                        {assignedDriver?.photo ? (
                                            <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            '👨‍✈️'
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800">
                                            {mode === 'live' && assignedDriver ? assignedDriver.name : MOCK_DRIVER.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>⭐ {mode === 'live' && assignedDriver ? assignedDriver.rating?.toFixed(1) || '5.0' : MOCK_DRIVER.rating}</span>
                                            <span>•</span>
                                            <span>{mode === 'live' && assignedDriver ? assignedDriver.vehicleModel : MOCK_DRIVER.vehicleModel}</span>
                                        </div>
                                        <p className="text-sm text-blue-600 font-medium">
                                            {mode === 'live' && assignedDriver ? assignedDriver.vehiclePlate : MOCK_DRIVER.vehiclePlate}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={`tel:${mode === 'live' && assignedDriver ? assignedDriver.phone : MOCK_DRIVER.phone}`}
                                            className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                                        >
                                            📞
                                        </a>
                                        <button className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
                                            💬
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Waiting for driver to accept (driver_assigned status) */}
                        {status === 'driver_assigned' && (
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-2xl">
                                            🚗
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center animate-pulse">
                                            <span className="text-xs">⏳</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-amber-800">
                                            {language === 'th' ? 'รอคนขับยืนยัน...' : 'Waiting for driver...'}
                                        </p>
                                        <p className="text-sm text-amber-600">
                                            {language === 'th' ? 'คนขับกำลังตรวจสอบรายละเอียดงาน' : 'Driver is reviewing the trip details'}
                                        </p>
                                    </div>
                                    <div className="animate-spin">
                                        <div className="w-8 h-8 border-3 border-amber-300 border-t-amber-600 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vehicle Selection for Live Mode - Hide if active booking exists */}
                        {mode === 'live' && status === 'selecting' && selectedVehicle && !isLoadingActiveBooking && !activeBooking && (
                            <button
                                onClick={() => setShowVehiclePicker(true)}
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 mb-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                                        🚗
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">{selectedVehicle.name}</p>
                                        <p className="text-sm text-gray-500">{selectedVehicle.seats} {language === 'th' ? 'ที่นั่ง' : 'seats'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600">฿{selectedVehicle.price.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">{language === 'th' ? 'เปลี่ยนรถ' : 'Change'}</p>
                                </div>
                            </button>
                        )}

                        {/* Loading Active Booking for Live Mode */}
                        {mode === 'live' && isLoadingActiveBooking && (
                            <div className="flex flex-col items-center py-6">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-600 text-sm">
                                    {language === 'th' ? 'กำลังตรวจสอบการจองของคุณ...' : 'Checking your bookings...'}
                                </p>
                            </div>
                        )}

                        {/* Active Booking Exists - Show Info Instead of Booking Button */}
                        {mode === 'live' && !isLoadingActiveBooking && activeBooking && status !== 'completed' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">📋</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-amber-800">
                                            {language === 'th' ? 'คุณมีการจองที่กำลังดำเนินการ' : 'You have an active booking'}
                                        </p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            {activeBooking.pickupLocation} → {activeBooking.dropoffLocation}
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1">
                                            {language === 'th' ? 'สถานะ: ' : 'Status: '}
                                            {activeBooking.status === 'pending' && (language === 'th' ? 'รอยืนยัน' : 'Pending')}
                                            {activeBooking.status === 'confirmed' && (language === 'th' ? 'ยืนยันแล้ว' : 'Confirmed')}
                                            {activeBooking.status === 'driver_assigned' && (language === 'th' ? 'พบคนขับแล้ว' : 'Driver Assigned')}
                                            {activeBooking.status === 'driver_en_route' && (language === 'th' ? 'คนขับกำลังมา' : 'Driver En Route')}
                                            {activeBooking.status === 'in_progress' && (language === 'th' ? 'กำลังเดินทาง' : 'In Progress')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Available Drivers Count for Live Mode */}
                        {mode === 'live' && status === 'selecting' && !isLoadingActiveBooking && !activeBooking && (
                            <p className="text-center text-sm text-gray-500 mb-3">
                                {availableDrivers.length > 0
                                    ? `🟢 ${availableDrivers.length} ${language === 'th' ? 'คนขับพร้อมให้บริการ' : 'drivers available'}`
                                    : `🔴 ${language === 'th' ? 'ไม่มีคนขับว่าง' : 'No drivers available'}`
                                }
                            </p>
                        )}

                        {/* Action Buttons - Only show if no active booking in Live Mode */}
                        {status === 'selecting' && !(mode === 'live' && (isLoadingActiveBooking || activeBooking)) && (
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
                                disabled={mode === 'live' && (!user || availableDrivers.length === 0 || isCreatingBooking)}
                                className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isCreatingBooking ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>🔍</span>
                                        {mode === 'live'
                                            ? (language === 'th' ? 'จองรถตอนนี้' : 'Book Now')
                                            : (language === 'th' ? 'ค้นหาคนขับ' : 'Find Driver')
                                        }
                                    </>
                                )}
                            </button>
                        )}

                        {status === 'searching' && !activeBooking && (
                            <div className="flex flex-col items-center py-4">
                                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-600">{language === 'th' ? 'กำลังค้นหาคนขับใกล้คุณ...' : 'Finding nearby drivers...'}</p>
                            </div>
                        )}

                        {/* Waiting for admin to assign driver */}
                        {status === 'searching' && activeBooking && (
                            <div className="flex flex-col items-center py-4">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-600 text-center">
                                    {language === 'th' ? 'รอเจ้าหน้าที่มอบหมายคนขับ...' : 'Waiting for driver assignment...'}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {language === 'th' ? 'โปรดรอสักครู่' : 'Please wait a moment'}
                                </p>
                            </div>
                        )}

                        {isSimulating && mode === 'demo' && (
                            <button
                                onClick={stopTrip}
                                className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <span>⏹️</span>
                                {language === 'th' ? 'หยุดจำลอง' : 'Stop Simulation'}
                            </button>
                        )}

                        {status === 'completed' && (
                            <div className="space-y-4">
                                {/* Trip Summary Card */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xl">📋</span>
                                        <h3 className="font-bold text-gray-800">
                                            {language === 'th' ? 'สรุปการเดินทาง' : 'Trip Summary'}
                                        </h3>
                                    </div>

                                    {/* Route */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <div className="w-0.5 h-8 bg-gray-300"></div>
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <p className="text-xs text-gray-400">{language === 'th' ? 'จุดรับ' : 'Pickup'}</p>
                                                <p className="text-sm font-medium text-gray-800">{activeBooking?.pickupLocation || tripInfo?.pickup || pickup.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">{language === 'th' ? 'จุดส่ง' : 'Dropoff'}</p>
                                                <p className="text-sm font-medium text-gray-800">{activeBooking?.dropoffLocation || tripInfo?.dropoff || dropoff.name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-sm border-t border-green-100 pt-3">
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-500">
                                                📏 {tripInfo?.distance || '30.8'} km
                                            </span>
                                            <span className="text-gray-500">
                                                ⏱️ {tripInfo?.duration ? (tripInfo.duration >= 60
                                                    ? `${Math.floor(tripInfo.duration / 60)} ${language === 'th' ? 'ชม.' : 'hr'} ${tripInfo.duration % 60} ${language === 'th' ? 'น.' : 'min'}`
                                                    : `${tripInfo.duration} ${language === 'th' ? 'นาที' : 'min'}`)
                                                    : '45 นาที'}
                                            </span>
                                        </div>
                                        <span className="font-bold text-green-600 text-lg">
                                            ฿{(activeBooking?.totalCost || tripInfo?.price || 1200).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Rating Card */}
                                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100">
                                    <div className="text-center mb-4">
                                        <h3 className="font-bold text-gray-800 mb-1">
                                            {language === 'th' ? '⭐ ให้คะแนนคนขับ' : '⭐ Rate Your Driver'}
                                        </h3>

                                        {/* Driver Info */}
                                        <div className="flex items-center justify-center gap-3 my-3">
                                            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                                                {assignedDriver?.photo ? (
                                                    <img src={assignedDriver.photo} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    '👨‍✈️'
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-800">
                                                    {assignedDriver?.name || activeBooking?.driver?.name || 'คนขับ'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {assignedDriver?.vehicleModel || activeBooking?.driver?.vehicleModel || 'Toyota'} • {assignedDriver?.vehiclePlate || activeBooking?.driver?.vehiclePlate || '1234'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="flex justify-center gap-2 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRating(star)}
                                                className={`text-3xl transition-all active:scale-110 ${
                                                    star <= rating ? 'text-amber-400' : 'text-gray-300'
                                                }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>

                                    {/* Rating Text */}
                                    {rating > 0 && (
                                        <p className="text-center text-sm text-amber-600 mb-3">
                                            {rating === 5 && (language === 'th' ? 'ยอดเยี่ยมมาก! 🎉' : 'Excellent! 🎉')}
                                            {rating === 4 && (language === 'th' ? 'ดีมาก! 👍' : 'Great! 👍')}
                                            {rating === 3 && (language === 'th' ? 'พอใช้ได้' : 'Good')}
                                            {rating === 2 && (language === 'th' ? 'ควรปรับปรุง' : 'Could be better')}
                                            {rating === 1 && (language === 'th' ? 'ไม่พอใจ' : 'Poor')}
                                        </p>
                                    )}

                                    {/* Comment Input */}
                                    <textarea
                                        id="rating-comment"
                                        name="ratingComment"
                                        value={ratingComment}
                                        onChange={(e) => setRatingComment(e.target.value)}
                                        placeholder={language === 'th' ? 'แสดงความคิดเห็น (ไม่บังคับ)' : 'Leave a comment (optional)'}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none text-sm"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <button
                                    onClick={async () => {
                                        setIsSubmittingRating(true);
                                        // TODO: Save rating to database
                                        // await BookingService.addRating(bookingId, rating, ratingComment);
                                        console.log('Rating submitted:', { rating, comment: ratingComment });

                                        // Simulate API call
                                        await new Promise(resolve => setTimeout(resolve, 500));

                                        setIsSubmittingRating(false);
                                        // Reset states
                                        setRating(0);
                                        setRatingComment('');
                                        resetTrip();
                                    }}
                                    disabled={isSubmittingRating}
                                    className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:bg-green-300"
                                >
                                    {isSubmittingRating ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>✅</span>
                                            {language === 'th' ? 'เสร็จสิ้น' : 'Complete'}
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setRating(0);
                                        setRatingComment('');
                                        resetTrip();
                                    }}
                                    className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <span>🚗</span>
                                    {language === 'th' ? 'จองรถอีกครั้ง' : 'Book Another Trip'}
                                </button>
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
                                    className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                            {filteredLocations.length > 0 ? (
                                <div className="p-4 space-y-2">
                                    {filteredLocations.map((loc) => {
                                        const locName = language === 'th' ? loc.name?.th : loc.name?.en;

                                        return (
                                            <button
                                                key={loc.id}
                                                onClick={() => handleLocationSelect(loc)}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border-2 border-transparent hover:bg-gray-100 transition-all active:scale-[0.98]"
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    loc.type === 'airport' ? 'bg-blue-100 text-blue-600' :
                                                    loc.type === 'hotel' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {loc.type === 'airport' ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                    ) : loc.type === 'hotel' ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        </svg>
                                                    )}
                                                </div>

                                                <div className="flex-1 text-left">
                                                    <p className="font-semibold text-gray-900">{locName}</p>
                                                    <p className="text-sm text-gray-500 capitalize">{loc.type}</p>
                                                </div>
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
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                        selectedVehicle?.id === vehicle.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-3xl">
                                        {vehicle.type === 'sedan' ? '🚗' :
                                         vehicle.type === 'suv' ? '🚙' :
                                         vehicle.type === 'van' ? '🚐' : '🚘'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-900">{vehicle.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {vehicle.seats} {language === 'th' ? 'ที่นั่ง' : 'seats'} • {vehicle.type}
                                        </p>
                                        {vehicle.features && vehicle.features.length > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {vehicle.features.slice(0, 2).join(' • ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-600 text-lg">฿{vehicle.price.toLocaleString()}</p>
                                    </div>
                                </button>
                            ))}
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
