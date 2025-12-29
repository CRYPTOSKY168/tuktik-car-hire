'use client';

import { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { initialRoutes } from '@/lib/data/routes';

export default function AdminRoutesPage() {
    const { t, language } = useLanguage();
    const [routes, setRoutes] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRoute, setEditingRoute] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        id: '',
        originId: '',
        destinationId: '',
        origin: '',
        destination: '',
        priceSedan: '',
        priceSUV: '',
        priceVan: '',
        priceLuxury: '',
        priceMinibus: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [routesData, locationsData] = await Promise.all([
                FirestoreService.getRoutes(),
                FirestoreService.getLocations()
            ]);
            setRoutes(routesData);
            setLocations(locationsData.filter(l => l.isActive !== false).sort((a, b) => {
                const nameA = typeof a.name === 'object' ? a.name?.en : a.name;
                const nameB = typeof b.name === 'object' ? b.name?.en : b.name;
                return nameA?.localeCompare(nameB) || 0;
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSeed = async () => {
        if (!confirm("This will add sample route prices to your database. Continue?")) return;
        setLoading(true);
        try {
            await FirestoreService.seedRoutes(initialRoutes);
            await fetchData();
        } catch (error) {
            alert("Failed to seed data");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this route pricing?")) return;
        try {
            await FirestoreService.deleteRoute(id);
            fetchData();
        } catch (error) {
            console.error("Failed to delete route", error);
            alert("Failed to delete route. Make sure you are an admin.");
        }
    };

    const openModal = (route?: any) => {
        if (route) {
            setEditingRoute(route);
            setFormData({
                id: route.id,
                originId: route.originId || '',
                destinationId: route.destinationId || '',
                origin: route.origin,
                destination: route.destination,
                priceSedan: route.prices?.sedan || '',
                priceSUV: route.prices?.suv || '',
                priceVan: route.prices?.van || '',
                priceLuxury: route.prices?.luxury || '',
                priceMinibus: route.prices?.minibus || ''
            });
        } else {
            setEditingRoute(null);
            setFormData({
                id: '',
                originId: '',
                destinationId: '',
                origin: '',
                destination: '',
                priceSedan: '',
                priceSUV: '',
                priceVan: '',
                priceLuxury: '',
                priceMinibus: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const originLoc = locations.find(l => l.id === formData.originId);
        const destLoc = locations.find(l => l.id === formData.destinationId);

        const payload = {
            originId: formData.originId,
            destinationId: formData.destinationId,
            origin: originLoc?.name?.en || formData.originId,
            destination: destLoc?.name?.en || formData.destinationId,
            prices: {
                sedan: Number(formData.priceSedan) || 0,
                suv: Number(formData.priceSUV) || 0,
                van: Number(formData.priceVan) || 0,
                luxury: Number(formData.priceLuxury) || 0,
                minibus: Number(formData.priceMinibus) || 0
            },
            isActive: true
        };

        try {
            if (editingRoute) {
                await FirestoreService.updateRoute(editingRoute.id, payload);
            } else {
                await FirestoreService.addRoute(payload);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert("Failed to save route");
        }
        setLoading(false);
    };

    const getLocName = (id: string, fallback: string) => {
        const loc = locations.find(l => l.id === id);
        return loc ? loc.name.en : fallback;
    };

    // Filter routes
    const filteredRoutes = routes.filter(route => {
        const origin = getLocName(route.originId, route.origin).toLowerCase();
        const dest = getLocName(route.destinationId, route.destination).toLowerCase();
        const query = searchQuery.toLowerCase();
        return origin.includes(query) || dest.includes(query);
    });

    // Stats
    const stats = {
        total: routes.length,
        avgSedan: routes.length > 0 ? Math.round(routes.reduce((sum, r) => sum + (r.prices?.sedan || 0), 0) / routes.length) : 0,
        avgVan: routes.length > 0 ? Math.round(routes.reduce((sum, r) => sum + (r.prices?.van || 0), 0) / routes.length) : 0,
        avgLuxury: routes.length > 0 ? Math.round(routes.reduce((sum, r) => sum + (r.prices?.luxury || 0), 0) / routes.length) : 0,
    };

    if (loading && !showModal && routes.length === 0) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-blue-600 font-semibold">{t.admin.routesPage.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t.admin.routesPage.title}</h1>
                    <p className="text-gray-500 text-sm mt-1">{t.admin.routesPage.subtitle}</p>
                </div>
                <div className="flex gap-2">
                    {routes.length === 0 && (
                        <button
                            onClick={handleSeed}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">database</span>
                            {t.admin.routesPage.seedData}
                        </button>
                    )}
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
                    >
                        <span className="material-symbols-outlined text-lg">add_road</span>
                        {t.admin.routesPage.addRoute}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">route</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{t.admin.routesPage.stats.totalRoutes}</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">directions_car</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{t.admin.routesPage.stats.avgSedan}</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">฿{stats.avgSedan.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">airport_shuttle</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{t.admin.routesPage.stats.avgVan}</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">฿{stats.avgVan.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <span className="material-symbols-outlined text-white text-lg lg:text-xl">star</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">{t.admin.routesPage.stats.avgLuxury}</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-800">฿{stats.avgLuxury.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="relative">
                    <label htmlFor="route-search" className="sr-only">{t.admin.routesPage.searchPlaceholder}</label>
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input
                        id="route-search"
                        name="routeSearch"
                        type="text"
                        placeholder={t.admin.routesPage.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Content */}
            {filteredRoutes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                        <span className="material-symbols-outlined text-4xl">route</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{t.admin.routesPage.noRoutes}</h3>
                    <p className="text-gray-500 mt-1">{t.admin.routesPage.addToStart}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredRoutes.map((route) => (
                        <div key={route.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                            {/* Route Header with Gradient */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Route Visual */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-white shadow-md"></div>
                                            <div className="w-0.5 h-10 bg-white/40 my-1"></div>
                                            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-md"></div>
                                        </div>

                                        {/* Route Names */}
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <p className="text-[10px] text-blue-200 uppercase tracking-wider font-medium">{t.admin.routesPage.from}</p>
                                                <p className="text-white font-bold text-lg">{getLocName(route.originId, route.origin)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-blue-200 uppercase tracking-wider font-medium">{t.admin.routesPage.to}</p>
                                                <p className="text-white font-bold text-lg">{getLocName(route.destinationId, route.destination)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openModal(route)}
                                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(route.id)}
                                            className="p-2 bg-white/20 hover:bg-red-500 rounded-lg text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Prices Grid */}
                            <div className="p-4">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">{t.admin.routesPage.vehiclePrices}</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { key: 'sedan', label: t.admin.routesPage.sedan, icon: 'directions_car', color: 'blue' },
                                        { key: 'suv', label: t.admin.routesPage.suv, icon: 'directions_car', color: 'orange' },
                                        { key: 'van', label: t.admin.routesPage.van, icon: 'airport_shuttle', color: 'purple' },
                                        { key: 'luxury', label: t.admin.routesPage.luxury, icon: 'star', color: 'amber' },
                                        { key: 'minibus', label: t.admin.routesPage.minibus, icon: 'directions_bus', color: 'emerald' },
                                    ].map((item) => (
                                        <div key={item.key} className="bg-gray-50 rounded-xl p-3 text-center">
                                            <span className={`material-symbols-outlined text-${item.color}-500 text-lg mb-1 block`}>{item.icon}</span>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{item.label}</p>
                                            <p className="text-sm font-bold text-gray-800">฿{route.prices?.[item.key]?.toLocaleString() || 0}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 sticky top-0">
                            <h2 className="text-xl font-bold text-white">
                                {editingRoute ? t.admin.routesPage.modal.editTitle : t.admin.routesPage.modal.addTitle}
                            </h2>
                            <p className="text-blue-100 text-sm">
                                {editingRoute ? t.admin.routesPage.modal.editSubtitle : t.admin.routesPage.modal.addSubtitle}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Route Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="route-origin" className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.admin.routesPage.modal.origin}</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-lg">trip_origin</span>
                                        <select
                                            id="route-origin"
                                            name="originId"
                                            required
                                            value={formData.originId}
                                            onChange={e => setFormData({ ...formData, originId: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="">{t.admin.routesPage.modal.selectOrigin}</option>
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name?.en} ({loc.name?.th})
                                                </option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="route-destination" className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.admin.routesPage.modal.destination}</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">location_on</span>
                                        <select
                                            id="route-destination"
                                            name="destinationId"
                                            required
                                            value={formData.destinationId}
                                            onChange={e => setFormData({ ...formData, destinationId: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="">{t.admin.routesPage.modal.selectDestination}</option>
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name?.en} ({loc.name?.th})
                                                </option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100"></div>

                            {/* Vehicle Prices */}
                            <fieldset>
                                <legend className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600">payments</span>
                                    {t.admin.routesPage.modal.vehiclePrices}
                                </legend>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        { key: 'Sedan', icon: 'directions_car', color: 'blue' },
                                        { key: 'SUV', icon: 'directions_car', color: 'orange' },
                                        { key: 'Van', icon: 'airport_shuttle', color: 'purple' },
                                        { key: 'Luxury', icon: 'star', color: 'amber' },
                                        { key: 'Minibus', icon: 'directions_bus', color: 'emerald' },
                                    ].map((item) => (
                                        <div key={item.key} className="relative">
                                            <label htmlFor={`price-${item.key.toLowerCase()}`} className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <span className={`material-symbols-outlined text-sm text-${item.color}-500`}>{item.icon}</span>
                                                {item.key}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">฿</span>
                                                <input
                                                    id={`price-${item.key.toLowerCase()}`}
                                                    name={`price${item.key}`}
                                                    type="number"
                                                    placeholder="0"
                                                    // @ts-ignore
                                                    value={formData[`price${item.key}`]}
                                                    // @ts-ignore
                                                    onChange={e => setFormData({ ...formData, [`price${item.key}`]: e.target.value })}
                                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    {t.admin.routesPage.modal.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                                >
                                    {loading ? t.admin.routesPage.modal.saving : t.admin.routesPage.modal.save}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
