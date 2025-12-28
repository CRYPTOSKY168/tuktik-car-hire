'use client';

import { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import Link from 'next/link';

export default function AdminVehiclesPage() {
    const { t } = useLanguage();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const data = await FirestoreService.getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error("Failed to fetch vehicles", error);
        } finally {
            setLoading(false);
        }
    };

    const migrateVehicles = async () => {
        if (!confirm("This will migrate all static vehicles to Firestore. Continue?")) return;

        const staticVehicles = [
            { id: 'mercedes-e', name: 'Mercedes-Benz E-Class', type: 'sedan', price: 3500, capacity: 3, luggage: 2, transmission: 'Auto', image: '/images/mercedes-e.jpg', features: ['Executive', 'Leather Seats'] },
            { id: 'alphard', name: 'Toyota Alphard', type: 'van', price: 6500, capacity: 6, luggage: 4, transmission: 'Auto', image: '/images/alphard.jpg', features: ['Luxury Van', 'Reclining Seats'] },
            { id: 'bmw5', name: 'BMW 5 Series', type: 'sedan', price: 4000, capacity: 3, luggage: 2, transmission: 'Auto', image: '/images/bmw5.jpg', features: ['Business', 'Dynamic'] },
            { id: 'tesla-s', name: 'Tesla Model S', type: 'sedan', price: 5000, capacity: 4, luggage: 2, transmission: 'EV', image: '/images/tesla-s.jpg', features: ['Electric', 'Silent'] },
            { id: 'mercedes-v', name: 'Mercedes V-Class', type: 'van', price: 7000, capacity: 7, luggage: 6, transmission: 'Auto', image: '/images/mercedes-v.jpg', features: ['Luxury Van', 'Conference'] },
            { id: 'audi-a6', name: 'Audi A6', type: 'sedan', price: 3800, capacity: 3, luggage: 2, transmission: 'Auto', image: '/images/audi-a6.jpg', features: ['Business', 'Tech'] },
            { id: 'lexus-es', name: 'Lexus ES', type: 'sedan', price: 3500, capacity: 3, luggage: 2, transmission: 'Auto', image: '/images/lexus-es.jpg', features: ['Premium', 'Quiet'] },
            { id: 'escalade', name: 'Cadillac Escalade', type: 'suv', price: 8000, capacity: 6, luggage: 5, transmission: 'Auto', image: '/images/cadillac-escalade.jpg', features: ['Luxury SUV', 'Spacious'] },
            { id: 'suburban', name: 'Chevrolet Suburban', type: 'suv', price: 7500, capacity: 7, luggage: 6, transmission: 'Auto', image: '/images/chevy-suburban.jpg', features: ['Large SUV', 'Rugged'] },
            { id: 'camry', name: 'Toyota Camry', type: 'sedan', price: 1500, capacity: 4, luggage: 2, transmission: 'Auto', image: '/images/camry.jpg', features: ['Economy', 'Reliable'] },
            { id: 'odyssey', name: 'Honda Odyssey', type: 'van', price: 2500, capacity: 7, luggage: 4, transmission: 'Auto', image: '/images/honda-odyssey.jpg', features: ['Family Van', 'Comfort'] },
            { id: 'transit', name: 'Ford Transit', type: 'van', price: 3000, capacity: 12, luggage: 10, transmission: 'Manual', image: '/images/ford-transit.jpg', features: ['Max Capacity', 'Group'] },
        ];

        setLoading(true);
        try {
            for (const v of staticVehicles) {
                const res = await fetch(v.image);
                const blob = await res.blob();
                const imageUrl = await import('@/lib/firebase/storage').then(m => m.StorageService.uploadVehicleImage(blob, v.id));
                await FirestoreService.addVehicle({
                    ...v,
                    image: imageUrl,
                    isActive: true
                });
            }
            alert("Migration Complete!");
            fetchVehicles();
        } catch (e) {
            console.error("Migration failed", e);
            alert("Migration failed. Check console.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const toggleStatus = async (vehicle: any) => {
        try {
            const newStatus = !vehicle.isActive;
            await FirestoreService.updateVehicle(vehicle.id, { isActive: newStatus });
            setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, isActive: newStatus } : v));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    const handleDelete = async (vehicle: any) => {
        if (!confirm(`Are you sure you want to delete "${vehicle.name}"?`)) return;
        try {
            await FirestoreService.deleteVehicle(vehicle.id);
            alert("Vehicle deleted successfully");
            fetchVehicles();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete vehicle.");
        }
    };

    // Filter vehicles
    const filteredVehicles = vehicles.filter(v => {
        const matchesType = filterType === 'all' || v.type === filterType;
        const matchesSearch = v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.type?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    // Stats
    const stats = {
        total: vehicles.length,
        active: vehicles.filter(v => v.isActive).length,
        inactive: vehicles.filter(v => !v.isActive).length,
        sedan: vehicles.filter(v => v.type === 'sedan').length,
        suv: vehicles.filter(v => v.type === 'suv').length,
        van: vehicles.filter(v => v.type === 'van').length,
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'sedan': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'directions_car' };
            case 'suv': return { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'directions_car' };
            case 'van': return { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'airport_shuttle' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'directions_car' };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-blue-600 font-semibold">Loading Vehicles...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t.admin.vehicles.name}</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your fleet, prices, and availability</p>
                </div>
                <div className="flex gap-2">
                    {vehicles.length === 0 && (
                        <button
                            onClick={migrateVehicles}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">database</span>
                            Initialize DB
                        </button>
                    )}
                    <Link
                        href="/admin/vehicles/new"
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        {t.admin.vehicles.add}
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg">garage</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Total</p>
                            <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <span className="material-symbols-outlined text-white text-lg">check_circle</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Active</p>
                            <p className="text-xl font-bold text-gray-800">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                            <span className="material-symbols-outlined text-white text-lg">cancel</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Inactive</p>
                            <p className="text-xl font-bold text-gray-800">{stats.inactive}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg">directions_car</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Sedan</p>
                            <p className="text-xl font-bold text-gray-800">{stats.sedan}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <span className="material-symbols-outlined text-white text-lg">directions_car</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">SUV</p>
                            <p className="text-xl font-bold text-gray-800">{stats.suv}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <span className="material-symbols-outlined text-white text-lg">airport_shuttle</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Van</p>
                            <p className="text-xl font-bold text-gray-800">{stats.van}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    {/* Type Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
                        {['all', 'sedan', 'suv', 'van'].map((type) => (
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
                        <label htmlFor="vehicle-search" className="sr-only">ค้นหายานพาหนะ</label>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input
                            id="vehicle-search"
                            name="vehicleSearch"
                            type="text"
                            placeholder="Search vehicles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            {filteredVehicles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                        <span className="material-symbols-outlined text-4xl">directions_car</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">No vehicles found</h3>
                    <p className="text-gray-500 mt-1">Add a vehicle to get started or adjust your filters.</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Vehicle</th>
                                        <th className="px-6 py-4 font-semibold">Type</th>
                                        <th className="px-6 py-4 font-semibold">Price/Day</th>
                                        <th className="px-6 py-4 font-semibold">Capacity</th>
                                        <th className="px-6 py-4 font-semibold">Features</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredVehicles.map((v) => {
                                        const typeConfig = getTypeConfig(v.type);
                                        return (
                                            <tr key={v.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                                            {v.image ? (
                                                                <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                    <span className="material-symbols-outlined text-xl">directions_car</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-800">{v.name}</div>
                                                            <div className="text-xs text-gray-400">{v.transmission}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ${typeConfig.bg} ${typeConfig.text}`}>
                                                        <span className="material-symbols-outlined text-xs">{typeConfig.icon}</span>
                                                        {v.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">฿{v.price?.toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3 text-gray-600">
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                            {v.capacity}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">luggage</span>
                                                            {v.luggage}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {v.features?.slice(0, 2).map((f: string, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleStatus(v)}
                                                        className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider transition-colors ${v.isActive
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                                                            }`}
                                                    >
                                                        {v.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            href={`/admin/vehicles/${v.id}`}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(v)}
                                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="lg:hidden grid grid-cols-1 gap-4">
                        {filteredVehicles.map((v) => {
                            const typeConfig = getTypeConfig(v.type);
                            return (
                                <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Image */}
                                    <div className="h-40 bg-gray-100 relative">
                                        {v.image ? (
                                            <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <span className="material-symbols-outlined text-5xl">directions_car</span>
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ${typeConfig.bg} ${typeConfig.text}`}>
                                                {v.type}
                                            </span>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <button
                                                onClick={() => toggleStatus(v)}
                                                className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ${v.isActive
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-red-500 text-white'
                                                    }`}
                                            >
                                                {v.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{v.name}</h3>
                                                <p className="text-xs text-gray-400">{v.transmission}</p>
                                            </div>
                                            <p className="text-lg font-bold text-blue-600">฿{v.price?.toLocaleString()}</p>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">person</span>
                                                {v.capacity} seats
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">luggage</span>
                                                {v.luggage} bags
                                            </span>
                                        </div>

                                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                                            <Link
                                                href={`/admin/vehicles/${v.id}`}
                                                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold text-center shadow-lg shadow-blue-500/30"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(v)}
                                                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
