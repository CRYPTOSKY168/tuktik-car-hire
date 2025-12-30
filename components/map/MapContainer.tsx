'use client';

import { useCallback, useState } from 'react';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';

// Types
export interface Coordinates {
    lat: number;
    lng: number;
}

export interface MapMarker {
    position: Coordinates;
    type: 'pickup' | 'dropoff' | 'driver';
    label?: string;
}

interface MapContainerProps {
    center?: Coordinates;
    zoom?: number;
    markers?: MapMarker[];
    showRoute?: boolean;
    pickupLocation?: Coordinates;
    dropoffLocation?: Coordinates;
    driverLocation?: Coordinates;
    onMapClick?: (coords: Coordinates) => void;
    className?: string;
    height?: string;
}

// Default center: Bangkok
const DEFAULT_CENTER: Coordinates = { lat: 13.7563, lng: 100.5018 };
const DEFAULT_ZOOM = 14;

// Map styles - clean minimal look
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
    }
];

// Marker icons
const getMarkerIcon = (type: 'pickup' | 'dropoff' | 'driver'): google.maps.Symbol | google.maps.Icon | undefined => {
    const icons = {
        pickup: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
        },
        dropoff: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
        },
        driver: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            scale: 1.5,
            fillColor: '#6366f1',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1,
            anchor: new google.maps.Point(12, 22),
        }
    };
    return icons[type] as google.maps.Symbol;
};

// Map options
const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    styles: mapStyles,
};

export default function MapContainer({
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    markers = [],
    showRoute = false,
    pickupLocation,
    dropoffLocation,
    driverLocation,
    onMapClick,
    className = '',
    height = '400px',
}: MapContainerProps) {
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    // Load Google Maps script
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places'],
    });

    // Calculate route when pickup and dropoff are provided
    const calculateRoute = useCallback(async () => {
        if (!pickupLocation || !dropoffLocation || !isLoaded) return;

        const directionsService = new google.maps.DirectionsService();

        try {
            const result = await directionsService.route({
                origin: pickupLocation,
                destination: dropoffLocation,
                travelMode: google.maps.TravelMode.DRIVING,
            });
            setDirections(result);
        } catch (error) {
            console.error('Error calculating route:', error);
        }
    }, [pickupLocation, dropoffLocation, isLoaded]);

    // Handle map load
    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);

        // Fit bounds if multiple points
        if (markers.length > 1 || (pickupLocation && dropoffLocation)) {
            const bounds = new google.maps.LatLngBounds();

            markers.forEach(marker => {
                bounds.extend(marker.position);
            });

            if (pickupLocation) bounds.extend(pickupLocation);
            if (dropoffLocation) bounds.extend(dropoffLocation);
            if (driverLocation) bounds.extend(driverLocation);

            mapInstance.fitBounds(bounds, 50);
        }

        // Calculate route if needed
        if (showRoute && pickupLocation && dropoffLocation) {
            calculateRoute();
        }
    }, [markers, pickupLocation, dropoffLocation, driverLocation, showRoute, calculateRoute]);

    // Handle map click
    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (onMapClick && e.latLng) {
            onMapClick({
                lat: e.latLng.lat(),
                lng: e.latLng.lng(),
            });
        }
    };

    // Loading state
    if (!isLoaded) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-100 rounded-xl ${className}`}
                style={{ height }}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm">กำลังโหลดแผนที่...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div
                className={`flex items-center justify-center bg-red-50 rounded-xl ${className}`}
                style={{ height }}
            >
                <div className="flex flex-col items-center gap-2 text-red-600">
                    <span className="material-symbols-outlined text-3xl">error</span>
                    <p className="text-sm">ไม่สามารถโหลดแผนที่ได้</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerClassName={`rounded-xl overflow-hidden ${className}`}
            mapContainerStyle={{ height, width: '100%' }}
            center={center}
            zoom={zoom}
            options={mapOptions}
            onLoad={onLoad}
            onClick={handleMapClick}
        >
            {/* Custom Markers */}
            {markers.map((marker, index) => (
                <Marker
                    key={`marker-${index}`}
                    position={marker.position}
                    icon={getMarkerIcon(marker.type)}
                    label={marker.label ? {
                        text: marker.label,
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                    } : undefined}
                />
            ))}

            {/* Pickup Marker */}
            {pickupLocation && (
                <Marker
                    position={pickupLocation}
                    icon={getMarkerIcon('pickup')}
                    title="จุดรับ"
                />
            )}

            {/* Dropoff Marker */}
            {dropoffLocation && (
                <Marker
                    position={dropoffLocation}
                    icon={getMarkerIcon('dropoff')}
                    title="จุดส่ง"
                />
            )}

            {/* Driver Marker */}
            {driverLocation && (
                <Marker
                    position={driverLocation}
                    icon={getMarkerIcon('driver')}
                    title="คนขับ"
                />
            )}

            {/* Route Display */}
            {directions && (
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
        </GoogleMap>
    );
}
