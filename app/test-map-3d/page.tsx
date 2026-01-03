'use client';

import { useState, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';

const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 };

const libraries: ('places' | 'geometry')[] = ['places', 'geometry'];

export default function TestMap3DPage() {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [tilt, setTilt] = useState(0);
    const [heading, setHeading] = useState(0);
    const [useMapId, setUseMapId] = useState(true);
    const [mapKey, setMapKey] = useState(0); // Force re-render map

    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const mapOptions: google.maps.MapOptions = {
        disableDefaultUI: true,
        zoomControl: true,
        ...(useMapId && mapId ? { mapId } : {}),
        tilt: 0,
        heading: 0,
    };

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        console.log('Map loaded, mapId:', mapId, 'useMapId:', useMapId);
    }, [mapId, useMapId]);

    const applyTiltHeading = () => {
        if (mapRef.current) {
            try {
                mapRef.current.setTilt(tilt);
                mapRef.current.setHeading(heading);
                console.log('Applied tilt:', tilt, 'heading:', heading);
            } catch (err) {
                console.error('Error applying tilt/heading:', err);
                alert('Error: ' + (err as Error).message);
            }
        } else {
            alert('Map not ready yet');
        }
    };

    const toggleMapId = () => {
        setUseMapId(!useMapId);
        setMapKey(prev => prev + 1); // Force re-render
    };

    if (loadError) {
        return <div className="p-4 text-red-500">Error loading maps: {loadError.message}</div>;
    }

    if (!isLoaded) {
        return <div className="p-4">Loading maps...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow p-4">
                <h1 className="text-xl font-bold">Test Map 3D</h1>
                <p className="text-sm text-gray-500">
                    Map ID: {mapId || 'Not set'} | Using: {useMapId ? 'Yes' : 'No'}
                </p>
            </div>

            {/* Controls */}
            <div className="p-4 bg-white m-4 rounded-lg shadow space-y-4">
                <div className="flex gap-4 items-center">
                    <button
                        onClick={toggleMapId}
                        className={`px-4 py-2 rounded font-medium ${
                            useMapId ? 'bg-green-500 text-white' : 'bg-gray-300'
                        }`}
                    >
                        Map ID: {useMapId ? 'ON' : 'OFF'}
                    </button>
                    <span className="text-sm text-gray-500">
                        (Toggle and check if map loads)
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Tilt (0-67.5°)
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="67.5"
                            step="5"
                            value={tilt}
                            onChange={(e) => setTilt(Number(e.target.value))}
                            className="w-full"
                        />
                        <span className="text-sm">{tilt}°</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Heading (0-360°)
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            step="15"
                            value={heading}
                            onChange={(e) => setHeading(Number(e.target.value))}
                            className="w-full"
                        />
                        <span className="text-sm">{heading}°</span>
                    </div>
                </div>

                <button
                    onClick={applyTiltHeading}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold"
                >
                    Apply Tilt & Heading
                </button>

                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <p><strong>Note:</strong> setTilt() and setHeading() only work with Vector Maps.</p>
                    <p>If Map ID is OFF or invalid, these controls won&apos;t work.</p>
                </div>
            </div>

            {/* Map */}
            <div className="mx-4 h-[400px] rounded-lg overflow-hidden shadow">
                <GoogleMap
                    key={mapKey}
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={BANGKOK_CENTER}
                    zoom={16}
                    options={mapOptions}
                    onLoad={onMapLoad}
                >
                    <Marker position={BANGKOK_CENTER} />
                </GoogleMap>
            </div>

            {/* Debug Info */}
            <div className="m-4 p-4 bg-gray-800 text-white rounded-lg text-xs font-mono">
                <p>ENV Map ID: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'undefined'}</p>
                <p>Using Map ID: {useMapId ? 'true' : 'false'}</p>
                <p>Current Tilt: {tilt}</p>
                <p>Current Heading: {heading}</p>
                <p>Map Ref: {mapRef.current ? 'Ready' : 'Not ready'}</p>
            </div>
        </div>
    );
}
