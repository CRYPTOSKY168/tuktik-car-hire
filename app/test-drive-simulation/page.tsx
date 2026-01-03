'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useLoadScript, Polyline } from '@react-google-maps/api';

// Bangkok route simulation - from Democracy Monument area to Victory Monument
const SIMULATION_ROUTE = [
    { lat: 13.7563, lng: 100.5018 }, // Start - Democracy Monument
    { lat: 13.7580, lng: 100.5035 },
    { lat: 13.7605, lng: 100.5052 },
    { lat: 13.7635, lng: 100.5068 },
    { lat: 13.7665, lng: 100.5082 },
    { lat: 13.7695, lng: 100.5095 },
    { lat: 13.7720, lng: 100.5110 },
    { lat: 13.7745, lng: 100.5130 },
    { lat: 13.7768, lng: 100.5155 },
    { lat: 13.7785, lng: 100.5185 },
    { lat: 13.7800, lng: 100.5220 },
    { lat: 13.7815, lng: 100.5260 },
    { lat: 13.7825, lng: 100.5300 },
    { lat: 13.7830, lng: 100.5340 },
    { lat: 13.7640, lng: 100.5380 }, // Turn
    { lat: 13.7650, lng: 100.5420 },
    { lat: 13.7660, lng: 100.5450 },
    { lat: 13.7670, lng: 100.5480 },
    { lat: 13.7680, lng: 100.5510 },
    { lat: 13.7695, lng: 100.5535 }, // End - Victory Monument area
];

const libraries: ('places' | 'geometry' | 'marker')[] = ['places', 'geometry', 'marker'];

// Calculate bearing between two points
function calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
}

// Interpolate between two points
function interpolate(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    fraction: number
): { lat: number; lng: number } {
    return {
        lat: from.lat + (to.lat - from.lat) * fraction,
        lng: from.lng + (to.lng - from.lng) * fraction,
    };
}

// Smooth angle interpolation (handles 360->0 wraparound)
function interpolateAngle(from: number, to: number, fraction: number): number {
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (from + diff * fraction + 360) % 360;
}

export default function TestDriveSimulationPage() {
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const animationRef = useRef<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(1); // 1 = normal, 2 = fast, 0.5 = slow
    const [tilt, setTilt] = useState(45);
    const [currentHeading, setCurrentHeading] = useState(0);
    const [currentPosition, setCurrentPosition] = useState(SIMULATION_ROUTE[0]);
    const [showRoute, setShowRoute] = useState(true);

    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const mapOptions: google.maps.MapOptions = {
        disableDefaultUI: true,
        zoomControl: true,
        mapId: mapId || undefined,
        tilt: tilt,
        heading: currentHeading,
        gestureHandling: 'greedy',
    };

    // Create car marker
    const createCarMarker = useCallback((map: google.maps.Map, position: { lat: number; lng: number }) => {
        if (markerRef.current) {
            markerRef.current.map = null;
        }

        // Create car icon element
        const carElement = document.createElement('div');
        carElement.innerHTML = `
            <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
                border: 3px solid white;
            ">
                <span style="font-size: 20px;">🚗</span>
            </div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            content: carElement,
            title: 'Driver Car',
        });

        markerRef.current = marker;
        return marker;
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        createCarMarker(map, SIMULATION_ROUTE[0]);

        // Set initial view
        map.setCenter(SIMULATION_ROUTE[0]);
        map.setZoom(17);
        map.setTilt(tilt);
    }, [createCarMarker, tilt]);

    // Animation loop
    useEffect(() => {
        if (!isPlaying || !mapRef.current) return;

        let lastTime = performance.now();
        let currentIdx = currentIndex;
        let currentProg = progress;
        let currentHead = currentHeading;

        const animate = (time: number) => {
            const deltaTime = time - lastTime;
            lastTime = time;

            // Move progress (adjust speed based on deltaTime)
            const moveSpeed = 0.0008 * speed * (deltaTime / 16.67); // normalized to 60fps
            currentProg += moveSpeed;

            if (currentProg >= 1) {
                currentProg = 0;
                currentIdx++;

                if (currentIdx >= SIMULATION_ROUTE.length - 1) {
                    // Loop back to start
                    currentIdx = 0;
                    currentProg = 0;
                }
            }

            // Calculate current position
            const from = SIMULATION_ROUTE[currentIdx];
            const to = SIMULATION_ROUTE[currentIdx + 1] || SIMULATION_ROUTE[0];
            const newPosition = interpolate(from, to, currentProg);

            // Calculate target heading
            const targetHeading = calculateBearing(from, to);

            // Smooth heading interpolation
            currentHead = interpolateAngle(currentHead, targetHeading, 0.08);

            // Update state
            setCurrentIndex(currentIdx);
            setProgress(currentProg);
            setCurrentPosition(newPosition);
            setCurrentHeading(currentHead);

            // Update map
            if (mapRef.current) {
                mapRef.current.panTo(newPosition);
                mapRef.current.setHeading(currentHead);
                mapRef.current.setTilt(tilt);
            }

            // Update marker
            if (markerRef.current) {
                markerRef.current.position = newPosition;
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, speed, tilt]);

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentIndex(0);
        setProgress(0);
        setCurrentHeading(0);
        setCurrentPosition(SIMULATION_ROUTE[0]);

        if (mapRef.current) {
            mapRef.current.setCenter(SIMULATION_ROUTE[0]);
            mapRef.current.setHeading(0);
            mapRef.current.setTilt(tilt);
        }

        if (markerRef.current) {
            markerRef.current.position = SIMULATION_ROUTE[0];
        }
    };

    if (loadError) {
        return <div className="p-4 text-red-500">Error loading maps: {loadError.message}</div>;
    }

    if (!isLoaded) {
        return <div className="p-4 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p>Loading simulation...</p>
            </div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Map Container - Full screen */}
            <div className="fixed inset-0">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={currentPosition}
                    zoom={17}
                    options={mapOptions}
                    onLoad={onMapLoad}
                >
                    {showRoute && (
                        <Polyline
                            path={SIMULATION_ROUTE}
                            options={{
                                strokeColor: '#667eea',
                                strokeOpacity: 0.8,
                                strokeWeight: 6,
                            }}
                        />
                    )}
                </GoogleMap>
            </div>

            {/* Controls Overlay */}
            <div className="fixed top-4 left-4 right-4 z-10">
                <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 max-w-md mx-auto">
                    <h1 className="text-lg font-bold text-center mb-2">🚗 Drive Simulation</h1>
                    <p className="text-xs text-gray-400 text-center mb-4">
                        Camera follows car with smooth heading rotation
                    </p>

                    {/* Play Controls */}
                    <div className="flex justify-center gap-3 mb-4">
                        {!isPlaying ? (
                            <button
                                onClick={handlePlay}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold flex items-center gap-2 transition-all"
                            >
                                <span>▶️</span> Play
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-xl font-bold flex items-center gap-2 transition-all"
                            >
                                <span>⏸️</span> Pause
                            </button>
                        )}
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl font-bold flex items-center gap-2 transition-all"
                        >
                            <span>🔄</span> Reset
                        </button>
                    </div>

                    {/* Speed Control */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1">Speed: {speed}x</label>
                        <div className="flex gap-2">
                            {[0.5, 1, 2, 3].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                        speed === s
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tilt Control */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1">
                            Tilt: {tilt}°
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="67.5"
                            step="5"
                            value={tilt}
                            onChange={(e) => {
                                const newTilt = Number(e.target.value);
                                setTilt(newTilt);
                                if (mapRef.current) {
                                    mapRef.current.setTilt(newTilt);
                                }
                            }}
                            className="w-full"
                        />
                    </div>

                    {/* Show Route Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Show Route</span>
                        <button
                            onClick={() => setShowRoute(!showRoute)}
                            className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                                showRoute ? 'bg-purple-600' : 'bg-gray-700'
                            }`}
                        >
                            {showRoute ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Info Panel */}
            <div className="fixed bottom-4 left-4 right-4 z-10">
                <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 max-w-md mx-auto">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-purple-400">
                                {Math.round(currentHeading)}°
                            </div>
                            <div className="text-xs text-gray-400">Heading</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">
                                {currentIndex + 1}/{SIMULATION_ROUTE.length}
                            </div>
                            <div className="text-xs text-gray-400">Waypoint</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">
                                {tilt}°
                            </div>
                            <div className="text-xs text-gray-400">Tilt</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                                style={{
                                    width: `${((currentIndex + progress) / (SIMULATION_ROUTE.length - 1)) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
