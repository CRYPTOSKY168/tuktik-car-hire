'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    GoogleMap,
    useLoadScript,
    Marker,
    DirectionsRenderer,
    OverlayView,
    Libraries,
    Autocomplete,
    Polyline,
    TrafficLayer,
} from '@react-google-maps/api';

// ต้องประกาศ libraries นอก component เพื่อป้องกัน re-render
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
    distance: number;      // km
    duration: number;      // minutes
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

// ข้อมูลจำลอง
const MOCK_DRIVER: DriverInfo = {
    name: 'สมชาย รถดี',
    phone: '081-234-5678',
    photo: '',
    rating: 4.8,
    vehicleModel: 'Toyota Camry',
    vehicleColor: 'สีดำ',
    vehiclePlate: 'กท 1234',
};

const LOCATIONS = {
    siamParagon: { lat: 13.7466, lng: 100.5347, name: 'สยามพารากอน' },
    centralWorld: { lat: 13.7465, lng: 100.5392, name: 'เซ็นทรัลเวิลด์' },
    suvarnabhumi: { lat: 13.6900, lng: 100.7501, name: 'สนามบินสุวรรณภูมิ' },
    donMueang: { lat: 13.9126, lng: 100.6067, name: 'สนามบินดอนเมือง' },
    asoke: { lat: 13.7378, lng: 100.5608, name: 'อโศก BTS' },
    victory: { lat: 13.7649, lng: 100.5380, name: 'อนุสาวรีย์ชัยฯ' },
};

// Map styles
const mapStyles: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

// Custom SVG Markers (โมเดิร์น สวยๆ)
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

// Helper function to create SVG data URL
const createMarkerIcon = (svg: string, size: number = 48) => {
    const encoded = encodeURIComponent(svg);
    return {
        url: `data:image/svg+xml,${encoded}`,
        scaledSize: new google.maps.Size(size, size * 1.25),
        anchor: new google.maps.Point(size / 2, size * 1.25),
    };
};

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    rotateControl: false, // ปิด default เพราะเราทำ custom
    styles: mapStyles,
    gestureHandling: 'greedy',
    heading: 0, // เริ่มต้นทิศเหนือ
};

// คำนวณ bearing
function calculateBearing(from: Coordinates, to: Coordinates): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Car Marker Component - Yellow Taxi 🚕
function CarMarker({ position, bearing }: { position: Coordinates; bearing: number }) {
    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div
                style={{
                    transform: `translate(-50%, -50%) rotate(${bearing}deg)`,
                    transition: 'transform 0.5s ease-out',
                }}
            >
                {/* Yellow Taxi Icon */}
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50 scale-150"></div>
                    {/* Taxi container */}
                    <div className="relative w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-xl flex items-center justify-center border-4 border-white">
                        {/* Taxi SVG */}
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            {/* Taxi body */}
                            <rect x="3" y="10" width="18" height="8" rx="2" fill="#1a1a1a"/>
                            {/* Taxi roof */}
                            <path d="M6 10L8 6H16L18 10" fill="#1a1a1a"/>
                            {/* Windows */}
                            <path d="M7 10L8.5 7H11V10H7Z" fill="#87CEEB"/>
                            <path d="M13 10V7H15.5L17 10H13Z" fill="#87CEEB"/>
                            {/* Taxi sign on roof */}
                            <rect x="10" y="4" width="4" height="2" rx="0.5" fill="#FFD700"/>
                            <text x="12" y="5.5" textAnchor="middle" fontSize="1.5" fill="#1a1a1a" fontWeight="bold">TAXI</text>
                            {/* Wheels */}
                            <circle cx="7" cy="18" r="2" fill="#333"/>
                            <circle cx="17" cy="18" r="2" fill="#333"/>
                            {/* Wheel centers */}
                            <circle cx="7" cy="18" r="0.8" fill="#666"/>
                            <circle cx="17" cy="18" r="0.8" fill="#666"/>
                            {/* Headlights */}
                            <circle cx="4.5" cy="13" r="1" fill="#FFFF00"/>
                            <circle cx="19.5" cy="13" r="1" fill="#FFFF00"/>
                        </svg>
                    </div>
                    {/* Direction arrow */}
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

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        searching: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🔍 กำลังหาคนขับ...' },
        driver_assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: '✅ พบคนขับแล้ว' },
        driver_en_route: { bg: 'bg-purple-100', text: 'text-purple-800', label: '🚗 คนขับกำลังมารับ' },
        arrived: { bg: 'bg-green-100', text: 'text-green-800', label: '📍 คนขับถึงจุดรับแล้ว' },
        in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '🛣️ กำลังเดินทาง' },
        completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '🎉 ถึงที่หมายแล้ว!' },
    };

    const config = statusConfig[status] || statusConfig.searching;

    return (
        <div className={`px-4 py-2 rounded-full ${config.bg} ${config.text} text-sm font-medium`}>
            {config.label}
        </div>
    );
}

export default function TestMapsPage() {
    // Refs
    const mapRef = useRef<google.maps.Map | null>(null);
    const animationRef = useRef<number | null>(null);
    const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const dropoffAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // Mode
    const [mode, setMode] = useState<'customer' | 'driver'>('customer');

    // Locations
    const [pickup, setPickup] = useState<Coordinates & { name: string }>(
        { ...LOCATIONS.siamParagon, name: LOCATIONS.siamParagon.name }
    );
    const [dropoff, setDropoff] = useState<Coordinates & { name: string }>(
        { ...LOCATIONS.suvarnabhumi, name: LOCATIONS.suvarnabhumi.name }
    );
    const [pickupInput, setPickupInput] = useState(LOCATIONS.siamParagon.name);
    const [dropoffInput, setDropoffInput] = useState(LOCATIONS.suvarnabhumi.name);
    const [gettingPickupGPS, setGettingPickupGPS] = useState(false);

    // Dragging state
    const [isDragging, setIsDragging] = useState<'pickup' | 'dropoff' | null>(null);
    const [dragAddress, setDragAddress] = useState<string>('');
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Throttle for map pan (smooth follow)
    const lastPanTimeRef = useRef<number>(0);
    const isUserInteractingRef = useRef<boolean>(false);

    // Trip state
    const [status, setStatus] = useState<string>('searching');
    const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
    const [driverBearing, setDriverBearing] = useState(0);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [routePath, setRoutePath] = useState<PathPoint[]>([]);
    const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);

    // Animation state
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [eta, setEta] = useState<number | null>(null);
    const [followCar, setFollowCar] = useState(true); // เปิดเป็น default เมื่อรถวิ่ง

    // Map heading for compass
    const [mapHeading, setMapHeading] = useState(0);

    // Remaining route (เส้นทางที่เหลือ หลังรถผ่านไป)
    const [remainingPath, setRemainingPath] = useState<Coordinates[]>([]);

    // Traffic layer
    const [showTraffic, setShowTraffic] = useState(true);

    // User location
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    // Error state
    const [directionsError, setDirectionsError] = useState<string | null>(null);

    // Load Google Maps
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    // Get directions
    const getDirections = useCallback(async () => {
        if (!pickup || !dropoff || !isLoaded) return;

        const directionsService = new google.maps.DirectionsService();
        setDirectionsError(null); // Clear previous error

        try {
            const result = await directionsService.route({
                origin: pickup,
                destination: dropoff,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS,
                },
            });

            setDirections(result);

            const route = result.routes[0];
            if (route && route.overview_path) {
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
                const durationSeconds = (leg as any)?.duration_in_traffic?.value || leg?.duration?.value;
                const distanceKm = totalDistance / 1000;
                const durationMin = Math.round(durationSeconds / 60);

                // คำนวณราคา (฿15/km + ฿50 base)
                const price = Math.round(distanceKm * 15 + 50);

                setTripInfo({
                    distance: Math.round(distanceKm * 10) / 10,
                    duration: durationMin,
                    pickup: pickup.name,
                    dropoff: dropoff.name,
                    price,
                });
                setEta(durationMin);
            }
        } catch (error: any) {
            console.error('Error getting directions:', error);
            // Set user-friendly error message
            if (error?.code === 'ZERO_RESULTS') {
                setDirectionsError('ไม่พบเส้นทางระหว่างจุดรับและจุดส่ง');
            } else if (error?.code === 'OVER_QUERY_LIMIT') {
                setDirectionsError('เกินโควต้าการใช้งาน กรุณาลองใหม่ภายหลัง');
            } else if (error?.code === 'REQUEST_DENIED') {
                setDirectionsError('API Key ไม่ถูกต้องหรือไม่มีสิทธิ์');
            } else {
                setDirectionsError('ไม่สามารถโหลดเส้นทางได้ กรุณาลองใหม่');
            }
        }
    }, [pickup, dropoff, isLoaded]);

    // Get directions on mount and location change
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
        isUserInteractingRef.current = false;
        lastPanTimeRef.current = 0;

        // ซูมไปที่จุดเริ่มต้นและซูมเข้าใกล้
        if (mapRef.current) {
            mapRef.current.setZoom(16);
            mapRef.current.setCenter(routePath[0]);
        }

        const totalDistance = routePath[routePath.length - 1].distance;
        const speedMps = (40 * 1000) / 3600; // 40 km/h in city
        const startTime = Date.now();

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

                const bearing = calculateBearing(lastPoint, nextPoint);
                setDriverBearing(bearing);

                const remainingDistance = totalDistance - distanceTraveled;
                const remainingEta = Math.round((remainingDistance / 1000 / 40) * 60);
                setEta(remainingEta);

                // Update remaining path (เส้นทางหายตามรถวิ่ง)
                const currentIndex = completedPoints.length;

                // สร้าง remaining path จากจุดปัจจุบันไปจุดหมาย
                const remaining = [
                    currentPosition,
                    ...routePath.slice(currentIndex).map(p => ({ lat: p.lat, lng: p.lng }))
                ];
                setRemainingPath(remaining);

                // Update status based on progress
                if (progressPercent >= 95) {
                    setStatus('completed');
                } else if (progressPercent >= 15) {
                    setStatus('in_progress');
                } else if (progressPercent >= 10) {
                    setStatus('arrived');
                }

                // *** Smooth pan - throttle ทุก 300ms และไม่ pan ถ้า user กำลังเลื่อนแผนที่ ***
                const now = Date.now();
                if (mapRef.current && !isUserInteractingRef.current && (now - lastPanTimeRef.current > 300)) {
                    lastPanTimeRef.current = now;
                    mapRef.current.panTo(currentPosition);
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
            animationRef.current = null;
        }
        setIsSimulating(false);
    };

    // Reset
    const resetTrip = () => {
        stopTrip();
        setStatus('searching');
        setDriverLocation(null);
        setProgress(0);
        setRemainingPath([]);
        if (tripInfo) setEta(tripInfo.duration);
    };

    // Reset compass to north
    const resetToNorth = () => {
        if (mapRef.current) {
            mapRef.current.setHeading(0);
            setMapHeading(0);
        }
    };

    // Map load handler
    const onMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;

        // Track heading changes for compass
        map.addListener('heading_changed', () => {
            const heading = map.getHeading() || 0;
            setMapHeading(heading);
        });
    };

    // เมื่อ user เลื่อนแผนที่ → หยุด auto-follow ชั่วคราว
    const onMapDragStart = () => {
        isUserInteractingRef.current = true;
        if (isSimulating) {
            setFollowCar(false);
        }
    };

    // เมื่อ user หยุดเลื่อน → เปิด auto-follow กลับมาหลัง 3 วินาที
    const onMapDragEnd = () => {
        if (isSimulating) {
            setTimeout(() => {
                isUserInteractingRef.current = false;
                setFollowCar(true);
            }, 3000); // กลับมา follow หลัง 3 วินาที
        } else {
            isUserInteractingRef.current = false;
        }
    };

    // Fit bounds to show all markers
    const fitBounds = () => {
        if (!mapRef.current || !pickup || !dropoff) return;
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickup);
        bounds.extend(dropoff);
        if (driverLocation) bounds.extend(driverLocation);
        mapRef.current.fitBounds(bounds, 80);
    };

    // ซูมไปที่รถ
    const zoomToCar = () => {
        if (!mapRef.current || !driverLocation) return;
        mapRef.current.panTo(driverLocation);
        mapRef.current.setZoom(17); // ซูมใกล้ๆ
    };

    // ขอตำแหน่ง GPS ของ user
    const getMyLocation = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ไม่รองรับ GPS');
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLocation(loc);
                setGettingLocation(false);

                // ซูมไปที่ตำแหน่ง user
                if (mapRef.current) {
                    mapRef.current.panTo(loc);
                    mapRef.current.setZoom(16);
                }
            },
            (error) => {
                setGettingLocation(false);
                alert('ไม่สามารถขอตำแหน่งได้: ' + error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    // ซูมไปที่ตำแหน่ง user (ถ้ามีแล้ว)
    const zoomToMyLocation = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.panTo(userLocation);
            mapRef.current.setZoom(16);
        } else {
            getMyLocation();
        }
    };

    // Autocomplete handlers
    const onPickupAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        pickupAutocompleteRef.current = autocomplete;
    };

    const onDropoffAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        dropoffAutocompleteRef.current = autocomplete;
    };

    const onPickupPlaceChanged = () => {
        const place = pickupAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
            const newPickup = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.name || place.formatted_address || 'จุดรับ',
            };
            setPickup(newPickup);
            setPickupInput(newPickup.name);
            resetTrip();

            // ซูมไปที่จุดรับใหม่
            if (mapRef.current) {
                mapRef.current.panTo(newPickup);
                mapRef.current.setZoom(15);
            }
        }
    };

    const onDropoffPlaceChanged = () => {
        const place = dropoffAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
            const newDropoff = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.name || place.formatted_address || 'จุดส่ง',
            };
            setDropoff(newDropoff);
            setDropoffInput(newDropoff.name);
            resetTrip();
        }
    };

    // ใช้ GPS เป็นจุดรับ
    const useGPSAsPickup = () => {
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ไม่รองรับ GPS');
            return;
        }

        setGettingPickupGPS(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                setUserLocation(loc);

                // Reverse geocoding
                const geocoder = new google.maps.Geocoder();
                try {
                    const response = await geocoder.geocode({ location: loc });
                    const address = response.results[0]?.formatted_address || 'ตำแหน่งปัจจุบัน';
                    setPickup({ ...loc, name: address });
                    setPickupInput(address);
                } catch {
                    setPickup({ ...loc, name: 'ตำแหน่งปัจจุบัน' });
                    setPickupInput('ตำแหน่งปัจจุบัน');
                }

                setGettingPickupGPS(false);
                resetTrip();

                // ซูมไปที่ตำแหน่ง
                if (mapRef.current) {
                    mapRef.current.panTo(loc);
                    mapRef.current.setZoom(17);
                }
            },
            (error) => {
                setGettingPickupGPS(false);
                alert('ไม่สามารถขอตำแหน่งได้: ' + error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    // Initialize geocoder
    useEffect(() => {
        if (isLoaded && !geocoderRef.current) {
            geocoderRef.current = new google.maps.Geocoder();
        }
    }, [isLoaded]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel animation
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            // Clear debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, []);

    // Real-time geocoding ขณะลาก (debounced)
    const geocodePosition = useCallback((position: Coordinates) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setDragAddress('กำลังโหลด...');

        debounceTimerRef.current = setTimeout(async () => {
            if (!geocoderRef.current) return;

            try {
                const response = await geocoderRef.current.geocode({ location: position });
                const address = response.results[0]?.formatted_address || 'ไม่พบที่อยู่';
                setDragAddress(address);
            } catch {
                setDragAddress('ไม่สามารถโหลดที่อยู่ได้');
            }
        }, 200); // debounce 200ms
    }, []);

    // === Pickup Marker Events ===
    const onPickupDragStart = () => {
        setIsDragging('pickup');
        setDragAddress(pickup.name);
    };

    const onPickupDrag = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            geocodePosition(pos);
        }
    };

    const onPickupDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setPickup({ ...newLoc, name: dragAddress });
            setPickupInput(dragAddress);
            resetTrip();
        }
        setIsDragging(null);
    };

    // === Dropoff Marker Events ===
    const onDropoffDragStart = () => {
        setIsDragging('dropoff');
        setDragAddress(dropoff.name);
    };

    const onDropoffDrag = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            geocodePosition(pos);
        }
    };

    const onDropoffDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setDropoff({ ...newLoc, name: dragAddress });
            setDropoffInput(dragAddress);
            resetTrip();
        }
        setIsDragging(null);
    };

    // Check API Key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Loading state
    if (!apiKey) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 max-w-md text-center">
                    <p className="text-yellow-600 font-bold text-lg mb-2">ไม่พบ API Key</p>
                    <p className="text-yellow-500 text-sm">
                        กรุณาเพิ่ม NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ใน .env.local
                    </p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">กำลังโหลด Google Maps...</p>
                    <p className="text-gray-400 text-xs">API Key: {apiKey.slice(0, 10)}...</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">ไม่สามารถโหลด Google Maps ได้</p>
                    <p className="text-red-500 text-sm mb-4">{loadError.message}</p>
                    <p className="text-gray-500 text-xs">
                        กรุณาเช็คว่า Maps JavaScript API ถูก enable ใน Google Cloud Console
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🚗</span>
                    </div>
                    <span className="font-bold text-gray-800">TukTik</span>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => { setMode('customer'); resetTrip(); }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                            mode === 'customer' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'
                        }`}
                    >
                        👤 ลูกค้า
                    </button>
                    <button
                        onClick={() => { setMode('driver'); resetTrip(); }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                            mode === 'driver' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'
                        }`}
                    >
                        🚗 คนขับ
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div className="relative flex-1" style={{ minHeight: '50vh' }}>
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                    center={pickup}
                    zoom={13}
                    options={mapOptions}
                    onLoad={onMapLoad}
                    onDragStart={onMapDragStart}
                    onDragEnd={onMapDragEnd}
                >
                    {/* Traffic Layer - แสดงสถานการณ์จราจร */}
                    {showTraffic && <TrafficLayer />}

                    {/* Route - แสดง DirectionsRenderer เมื่อยังไม่วิ่ง */}
                    {directions && !isSimulating && (
                        <DirectionsRenderer
                            directions={directions}
                            options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: '#6366f1',
                                    strokeWeight: 5,
                                    strokeOpacity: 0.8,
                                },
                            }}
                        />
                    )}

                    {/* Remaining Route - เส้นทางที่เหลือ (หายตามรถวิ่ง) */}
                    {isSimulating && remainingPath.length > 1 && (
                        <Polyline
                            path={remainingPath}
                            options={{
                                strokeColor: '#6366f1',
                                strokeWeight: 5,
                                strokeOpacity: 0.8,
                            }}
                        />
                    )}

                    {/* Pickup Marker - ซ่อนเมื่อลูกค้าขึ้นรถแล้ว (in_progress) */}
                    {status !== 'in_progress' && status !== 'completed' && (
                        <Marker
                            position={pickup}
                            draggable={status === 'searching'}
                            onDragStart={onPickupDragStart}
                            onDrag={onPickupDrag}
                            onDragEnd={onPickupDragEnd}
                            icon={createMarkerIcon(PICKUP_MARKER_SVG, 44)}
                            title={status === 'searching' ? 'ลากเพื่อปรับตำแหน่งจุดรับ' : 'จุดรับ'}
                        />
                    )}

                    {/* Dropoff Marker - แสดงตลอด */}
                    <Marker
                        position={dropoff}
                        draggable={status === 'searching'}
                        onDragStart={onDropoffDragStart}
                        onDrag={onDropoffDrag}
                        onDragEnd={onDropoffDragEnd}
                        icon={createMarkerIcon(DROPOFF_MARKER_SVG, 44)}
                        title={status === 'searching' ? 'ลากเพื่อปรับตำแหน่งจุดส่ง' : 'จุดส่ง'}
                    />

                    {/* Driver Car */}
                    {driverLocation && (
                        <CarMarker position={driverLocation} bearing={driverBearing} />
                    )}

                    {/* User Location Marker */}
                    {userLocation && (
                        <Marker
                            position={userLocation}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#3b82f6',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            }}
                            title="ตำแหน่งของคุณ"
                        />
                    )}
                </GoogleMap>

                {/* ETA Overlay */}
                {eta !== null && isSimulating && (
                    <div className="absolute top-4 left-4 bg-white rounded-2xl shadow-lg p-4">
                        <p className="text-xs text-gray-500">ถึงใน</p>
                        <p className="text-2xl font-bold text-indigo-600">{eta} นาที</p>
                    </div>
                )}

                {/* Real-time Address Overlay ขณะลากหมุด */}
                {isDragging && (
                    <div className="absolute top-4 left-4 right-4 z-20">
                        <div className={`rounded-2xl shadow-lg p-4 ${
                            isDragging === 'pickup' ? 'bg-green-500' : 'bg-red-500'
                        } text-white`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{isDragging === 'pickup' ? '📍' : '🏁'}</span>
                                <span className="font-bold">
                                    {isDragging === 'pickup' ? 'จุดรับ' : 'จุดส่ง'}
                                </span>
                            </div>
                            <p className="text-sm opacity-95 leading-relaxed">
                                {dragAddress}
                            </p>
                        </div>
                    </div>
                )}

                {/* Map Control Buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {/* Compass - กลับทิศเหนือ */}
                    <button
                        onClick={resetToNorth}
                        className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                        title="กลับทิศเหนือ"
                    >
                        <div
                            style={{ transform: `rotate(${-mapHeading}deg)` }}
                            className="transition-transform duration-300"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                {/* North pointer (red) */}
                                <path d="M12 2L15 10H9L12 2Z" fill="#dc2626"/>
                                {/* South pointer (gray) */}
                                <path d="M12 22L9 14H15L12 22Z" fill="#9ca3af"/>
                                {/* Center circle */}
                                <circle cx="12" cy="12" r="2" fill="#374151"/>
                            </svg>
                        </div>
                    </button>

                    {/* Traffic Toggle */}
                    <button
                        onClick={() => setShowTraffic(!showTraffic)}
                        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all ${
                            showTraffic ? 'bg-green-500 text-white' : 'bg-white text-gray-600'
                        }`}
                        title={showTraffic ? 'ซ่อนสถานการณ์จราจร' : 'แสดงสถานการณ์จราจร'}
                    >
                        <span className="text-lg">🚦</span>
                    </button>

                    {/* ดูทั้งเส้นทาง */}
                    <button
                        onClick={fitBounds}
                        className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
                        title="ดูทั้งเส้นทาง"
                    >
                        <span className="text-lg">🗺️</span>
                    </button>

                    {/* ซูมไปที่รถ + Follow */}
                    {driverLocation && (
                        <button
                            onClick={() => {
                                zoomToCar();
                                setFollowCar(true);
                            }}
                            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all ${
                                followCar ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-indigo-600'
                            }`}
                            title={followCar ? 'กำลังติดตามรถ' : 'ซูมไปที่รถ'}
                        >
                            <span className="text-lg">🚗</span>
                        </button>
                    )}

                    {/* ตำแหน่งของฉัน */}
                    <button
                        onClick={zoomToMyLocation}
                        disabled={gettingLocation}
                        className={`w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform ${gettingLocation ? 'opacity-50' : ''}`}
                        title="ตำแหน่งของฉัน"
                    >
                        {gettingLocation ? (
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span className="text-lg">📍</span>
                        )}
                    </button>
                </div>

                {/* Progress Bar */}
                {isSimulating && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Sheet */}
            <div className="bg-white rounded-t-3xl shadow-lg -mt-6 relative z-10 p-4 space-y-4 pb-8">
                {/* Status Badge */}
                <div className="flex justify-center">
                    <StatusBadge status={status} />
                </div>

                {/* Directions Error */}
                {directionsError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                        <span className="text-red-500">⚠️</span>
                        <p className="text-red-600 text-sm flex-1">{directionsError}</p>
                        <button
                            onClick={getDirections}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            ลองใหม่
                        </button>
                    </div>
                )}

                {/* Trip Info */}
                {tripInfo && (
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <div className="w-0.5 h-8 bg-gray-300"></div>
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500">จุดรับ</p>
                                    <p className="font-medium text-gray-800">{tripInfo.pickup}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">จุดส่ง</p>
                                    <p className="font-medium text-gray-800">{tripInfo.dropoff}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-indigo-600">฿{tripInfo.price}</p>
                                <p className="text-xs text-gray-500">{tripInfo.distance} km • {tripInfo.duration} นาที</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Driver Info (Customer Mode) */}
                {mode === 'customer' && status !== 'searching' && (
                    <div className="bg-indigo-50 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-indigo-200 rounded-full flex items-center justify-center text-2xl">
                                👨‍✈️
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">{MOCK_DRIVER.name}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>⭐ {MOCK_DRIVER.rating}</span>
                                    <span>•</span>
                                    <span>{MOCK_DRIVER.vehicleModel}</span>
                                </div>
                                <p className="text-sm text-indigo-600 font-medium">{MOCK_DRIVER.vehiclePlate}</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">
                                    📞
                                </button>
                                <button className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                                    💬
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Info (Driver Mode) */}
                {mode === 'driver' && status !== 'searching' && (
                    <div className="bg-amber-50 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-amber-200 rounded-full flex items-center justify-center text-2xl">
                                👩
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">คุณสมหญิง ใจดี</p>
                                <p className="text-sm text-gray-600">📞 089-xxx-xxxx</p>
                                <p className="text-sm text-amber-600">รอรับที่: {tripInfo?.pickup}</p>
                            </div>
                            <button className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">
                                📞
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                    {status === 'searching' && (
                        <button
                            onClick={() => { setStatus('driver_assigned'); setTimeout(startTrip, 1500); }}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-colors"
                        >
                            {mode === 'customer' ? '🔍 จำลองหาคนขับ' : '✅ รับงานนี้'}
                        </button>
                    )}

                    {isSimulating && (
                        <button
                            onClick={stopTrip}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-lg hover:bg-red-600 transition-colors"
                        >
                            ⏹️ หยุดจำลอง
                        </button>
                    )}

                    {(status === 'completed' || (!isSimulating && status !== 'searching')) && (
                        <button
                            onClick={resetTrip}
                            className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-colors"
                        >
                            🔄 เริ่มใหม่
                        </button>
                    )}
                </div>

                {/* Location Input */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                    <p className="text-sm font-medium text-gray-700">กำหนดเส้นทาง</p>

                    {/* จุดรับ */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            จุดรับ
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Autocomplete
                                    onLoad={onPickupAutocompleteLoad}
                                    onPlaceChanged={onPickupPlaceChanged}
                                    options={{
                                        componentRestrictions: { country: 'th' },
                                        fields: ['geometry', 'name', 'formatted_address'],
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={pickupInput}
                                        onChange={(e) => setPickupInput(e.target.value)}
                                        placeholder="ค้นหาจุดรับ..."
                                        className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </Autocomplete>
                            </div>
                            <button
                                onClick={useGPSAsPickup}
                                disabled={gettingPickupGPS}
                                className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
                                title="ใช้ตำแหน่งปัจจุบัน"
                            >
                                {gettingPickupGPS ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="text-lg">📍</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* จุดส่ง */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            จุดส่ง
                        </label>
                        <Autocomplete
                            onLoad={onDropoffAutocompleteLoad}
                            onPlaceChanged={onDropoffPlaceChanged}
                            options={{
                                componentRestrictions: { country: 'th' },
                                fields: ['geometry', 'name', 'formatted_address'],
                            }}
                        >
                            <input
                                type="text"
                                value={dropoffInput}
                                onChange={(e) => setDropoffInput(e.target.value)}
                                placeholder="ค้นหาจุดส่ง..."
                                className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                        </Autocomplete>
                    </div>

                    {/* Quick Locations */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <p className="text-xs text-gray-400 w-full">สถานที่ยอดนิยม:</p>
                        {Object.entries(LOCATIONS).slice(0, 4).map(([key, loc]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setDropoff({ ...loc, name: loc.name });
                                    setDropoffInput(loc.name);
                                    resetTrip();
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                            >
                                {loc.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Follow Toggle */}
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-600">แผนที่ตามรถ</span>
                    <button
                        onClick={() => setFollowCar(!followCar)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                            followCar ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            followCar ? 'translate-x-6' : 'translate-x-0.5'
                        }`}></div>
                    </button>
                </div>
            </div>
        </div>
    );
}
