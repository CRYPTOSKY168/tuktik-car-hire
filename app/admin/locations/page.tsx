'use client';

import { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { locations as staticLocations } from '@/lib/data/locations';

export default function AdminLocationsPage() {
    const { t } = useLanguage();
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLoc, setEditingLoc] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const [formData, setFormData] = useState({
        id: '',
        nameEn: '',
        nameTh: '',
        type: 'city',
        lat: '',
        lng: ''
    });

    const fetchData = async () => {
        setLoading(true);
        const data = await FirestoreService.getLocations();
        data.sort((a, b) => {
            const nameA = typeof a.name === 'object' ? a.name?.en : a.name;
            const nameB = typeof b.name === 'object' ? b.name?.en : b.name;
            return nameA?.localeCompare(nameB) || 0;
        });
        setLocations(data.filter(l => l.isActive !== false));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSeed = async () => {
        if (!confirm("This will add default locations to your database. Continue?")) return;
        setLoading(true);
        const seedData = staticLocations.map(l => ({
            name: l.name,
            type: l.type,
            coordinates: l.coordinates || { lat: 0, lng: 0 }
        }));
        await FirestoreService.seedLocations(seedData);
        await fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this location?")) return;
        await FirestoreService.deleteLocation(id);
        await fetchData();
    };

    const openModal = (loc?: any) => {
        if (loc) {
            setEditingLoc(loc);
            setFormData({
                id: loc.id,
                nameEn: loc.name?.en || '',
                nameTh: loc.name?.th || '',
                type: loc.type || 'city',
                lat: loc.coordinates?.lat?.toString() || '',
                lng: loc.coordinates?.lng?.toString() || ''
            });
        } else {
            setEditingLoc(null);
            setFormData({
                id: '',
                nameEn: '',
                nameTh: '',
                type: 'city',
                lat: '',
                lng: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            name: {
                en: formData.nameEn,
                th: formData.nameTh
            },
            type: formData.type,
            coordinates: {
                lat: parseFloat(formData.lat),
                lng: parseFloat(formData.lng)
            },
            isActive: true
        };

        try {
            if (editingLoc) {
                await FirestoreService.updateLocation(editingLoc.id, payload);
            } else {
                await FirestoreService.addLocation(payload);
            }
            setShowModal(false);
            await fetchData();
        } catch (error) {
            alert("Failed to save location");
        }
        setLoading(false);
    };

    // Filter locations
    const filteredLocations = locations.filter(loc => {
        const matchesType = filterType === 'all' || loc.type === filterType;
        const matchesSearch = loc.name?.en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.name?.th?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    // Stats
    const stats = {
        total: locations.length,
        airport: locations.filter(l => l.type === 'airport').length,
        city: locations.filter(l => l.type === 'city').length,
        province: locations.filter(l => l.type === 'province').length,
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'airport': return { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'flight', gradient: 'from-purple-500 to-indigo-600' };
            case 'city': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'location_city', gradient: 'from-blue-500 to-blue-600' };
            case 'province': return { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'map', gradient: 'from-orange-500 to-amber-600' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'place', gradient: 'from-gray-500 to-gray-600' };
        }
    };

    if (loading && !showModal && locations.length === 0) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-blue-600 font-semibold">Loading Locations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Locations</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage service areas and pickup/dropoff points</p>
                </div>
                <div className="flex gap-2">
                    {locations.length === 0 && (
                        <button
                            onClick={handleSeed}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">database</span>
                            Seed Data
                        </button>
                    )}
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
                    >
                        <span className="material-symbols-outlined text-lg">add_location</span>
                        Add Location
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">pin_drop</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Total</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">flight</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Airports</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">{stats.airport}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">location_city</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Cities</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">{stats.city}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">map</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Provinces</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">{stats.province}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    {/* Type Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
                        {['all', 'airport', 'city', 'province'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-all ${filterType === type
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {type === 'all' ? 'All Types' : type}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <label htmlFor="location-search" className="sr-only">ค้นหาสถานที่</label>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input
                            id="location-search"
                            name="locationSearch"
                            type="text"
                            placeholder="Search locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            {filteredLocations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                        <span className="material-symbols-outlined text-4xl">location_off</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">No locations found</h3>
                    <p className="text-gray-500 mt-1">Add a location to get started or adjust your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLocations.map((loc) => {
                        const typeConfig = getTypeConfig(loc.type);
                        return (
                            <div key={loc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className={`h-2 bg-gradient-to-r ${typeConfig.gradient}`}></div>

                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center shadow-lg`}>
                                                <span className="material-symbols-outlined text-white text-xl">{typeConfig.icon}</span>
                                            </div>
                                            <div>
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${typeConfig.bg} ${typeConfig.text}`}>
                                                    {loc.type}
                                                </span>
                                                <h3 className="font-bold text-gray-800 text-lg">{loc.name?.en}</h3>
                                                <p className="text-sm text-gray-500">{loc.name?.th}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coordinates */}
                                    <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-50 px-3 py-2 rounded-lg mb-4">
                                        <span className="material-symbols-outlined text-sm">my_location</span>
                                        {loc.coordinates?.lat?.toFixed(4)}, {loc.coordinates?.lng?.toFixed(4)}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => openModal(loc)}
                                            className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(loc.id)}
                                            className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">
                                {editingLoc ? 'Edit Location' : 'New Location'}
                            </h2>
                            <p className="text-blue-100 text-sm">
                                {editingLoc ? 'Update the location details below' : 'Fill in the details for the new location'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="location-name-en" className="block text-xs font-bold text-gray-500 uppercase mb-2">Name (English)</label>
                                    <input
                                        id="location-name-en"
                                        name="nameEn"
                                        required
                                        type="text"
                                        value={formData.nameEn}
                                        onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                                        autoComplete="off"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Bangkok"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location-name-th" className="block text-xs font-bold text-gray-500 uppercase mb-2">Name (Thai)</label>
                                    <input
                                        id="location-name-th"
                                        name="nameTh"
                                        required
                                        type="text"
                                        value={formData.nameTh}
                                        onChange={e => setFormData({ ...formData, nameTh: e.target.value })}
                                        autoComplete="off"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="กรุงเทพมหานคร"
                                    />
                                </div>
                            </div>

                            <fieldset>
                                <legend className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</legend>
                                <div className="grid grid-cols-3 gap-2">
                                    {['airport', 'city', 'province'].map((type) => {
                                        const config = getTypeConfig(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type })}
                                                className={`py-3 rounded-xl text-sm font-semibold capitalize transition-all flex items-center justify-center gap-2 ${formData.type === type
                                                    ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-lg">{config.icon}</span>
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="location-lat" className="block text-xs font-bold text-gray-500 uppercase mb-2">Latitude</label>
                                    <input
                                        id="location-lat"
                                        name="latitude"
                                        required
                                        type="number"
                                        step="any"
                                        value={formData.lat}
                                        onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                        autoComplete="off"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                        placeholder="13.7563"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location-lng" className="block text-xs font-bold text-gray-500 uppercase mb-2">Longitude</label>
                                    <input
                                        id="location-lng"
                                        name="longitude"
                                        required
                                        type="number"
                                        step="any"
                                        value={formData.lng}
                                        onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                        autoComplete="off"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                        placeholder="100.5018"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Location'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
