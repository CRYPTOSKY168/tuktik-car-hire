'use client';

import { useEffect, useState, useRef } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { StorageService } from '@/lib/firebase/storage';
import { Driver, DriverStatus } from '@/lib/types';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function AdminDriversPage() {
    const { t, language } = useLanguage();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | DriverStatus | string>('all');
    const [saving, setSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [userPhotos, setUserPhotos] = useState<Record<string, string>>({}); // Map driverId -> userPhotoURL
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get driver photo with priority: driver.photo > user.photoURL > null
    const getDriverPhoto = (driver: Driver): string | null => {
        if (driver.photo) return driver.photo;
        if (userPhotos[driver.id]) return userPhotos[driver.id];
        return null;
    };

    // Status config with language support
    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string; dot: string }> = {
            [DriverStatus.AVAILABLE]: { label: t.admin.drivers.status.available, color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
            [DriverStatus.BUSY]: { label: t.admin.drivers.status.busy, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
            [DriverStatus.OFFLINE]: { label: t.admin.drivers.status.offline, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
        };
        return configs[status] || { label: status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    };

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        vehiclePlate: '',
        vehicleModel: '',
        vehicleColor: '',
        licenseNumber: '',
        status: DriverStatus.AVAILABLE as DriverStatus,
        notes: '',
        photo: ''
    });

    useEffect(() => {
        const unsubscribe = FirestoreService.subscribeToDrivers(async (data) => {
            setDrivers(data);
            setLoading(false);

            // Auto-sync: Fetch user photos for drivers with userId but no photo
            const driversNeedingPhoto = data.filter(d => d.userId && !d.photo);
            if (driversNeedingPhoto.length > 0) {
                const photos: Record<string, string> = {};
                for (const driver of driversNeedingPhoto) {
                    if (driver.userId) {
                        try {
                            const user = await FirestoreService.getUser(driver.userId);
                            if (user?.photoURL) {
                                photos[driver.id] = user.photoURL;
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }
                if (Object.keys(photos).length > 0) {
                    setUserPhotos(prev => ({ ...prev, ...photos }));
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            email: '',
            vehiclePlate: '',
            vehicleModel: '',
            vehicleColor: '',
            licenseNumber: '',
            status: DriverStatus.AVAILABLE,
            notes: '',
            photo: ''
        });
        setEditingDriver(null);
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const openModal = (driver?: Driver) => {
        if (driver) {
            setEditingDriver(driver);
            setFormData({
                name: driver.name || '',
                phone: driver.phone || '',
                email: driver.email || '',
                vehiclePlate: driver.vehiclePlate || '',
                vehicleModel: driver.vehicleModel || '',
                vehicleColor: driver.vehicleColor || '',
                licenseNumber: driver.licenseNumber || '',
                status: (driver.status as DriverStatus) || DriverStatus.AVAILABLE,
                notes: driver.notes || '',
                photo: driver.photo || ''
            });
            // Set photo preview (driver.photo or user.photoURL)
            const driverPhoto = driver.photo || userPhotos[driver.id];
            if (driverPhoto) {
                setPhotoPreview(driverPhoto);
            }
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('กรุณาเลือกไฟล์รูปภาพ');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('ไฟล์ใหญ่เกิน 5MB');
            return;
        }

        setPhotoFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;

        setSaving(true);
        try {
            let photoUrl = formData.photo;

            // Upload new photo if selected
            if (photoFile) {
                setUploadingPhoto(true);
                const driverId = editingDriver?.id || `new-${Date.now()}`;
                photoUrl = await StorageService.uploadProfileImage(photoFile, `driver-${driverId}`);
                setUploadingPhoto(false);
            }

            const driverData = { ...formData, photo: photoUrl };

            if (editingDriver) {
                await FirestoreService.updateDriver(editingDriver.id, driverData);
            } else {
                await FirestoreService.addDriver(driverData);
            }
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error("Error saving driver:", error);
            alert('Failed to save driver');
            setUploadingPhoto(false);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (driver: Driver) => {
        if (!confirm(`Are you sure you want to remove ${driver.name}? This will also revoke their driver access.`)) return;

        try {
            // Use API to properly delete driver and update user document
            const response = await fetch(`/api/admin/drivers?id=${driver.id}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }

            // Remove from local state immediately
            setDrivers(prev => prev.filter(d => d.id !== driver.id));
        } catch (error: any) {
            console.error("Error deleting driver:", error);
            alert('Failed to delete driver: ' + error.message);
        }
    };

    const handleStatusChange = async (driver: Driver, status: DriverStatus) => {
        try {
            await FirestoreService.updateDriverStatus(driver.id, status);
        } catch {
            // Error handling
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            driver.phone.includes(searchQuery) ||
            driver.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: drivers.length,
        available: drivers.filter(d => d.status === DriverStatus.AVAILABLE).length,
        busy: drivers.filter(d => d.status === DriverStatus.BUSY).length,
        offline: drivers.filter(d => d.status === DriverStatus.OFFLINE).length,
        totalTrips: drivers.reduce((sum, d) => sum + (d.totalTrips || 0), 0),
        totalEarnings: drivers.reduce((sum, d) => sum + (d.totalEarnings || 0), 0)
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-gray-500 font-medium">{t.admin.common.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t.admin.drivers.title}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t.admin.drivers.subtitle}</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-medium text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    {t.admin.drivers.addDriver}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">groups</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            <p className="text-xs text-gray-500">{t.admin.drivers.stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">check_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                            <p className="text-xs text-gray-500">{t.admin.drivers.stats.available}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600">local_shipping</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{stats.busy}</p>
                            <p className="text-xs text-gray-500">{t.admin.drivers.stats.onTrip}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-500">do_not_disturb_on</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-500">{stats.offline}</p>
                            <p className="text-xs text-gray-500">{t.admin.drivers.stats.offline}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">route</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.totalTrips.toLocaleString()}</p>
                            <p className="text-xs text-white/80">{language === 'th' ? 'เที่ยวทั้งหมด' : 'Total Trips'}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">฿{stats.totalEarnings.toLocaleString()}</p>
                            <p className="text-xs text-white/80">{language === 'th' ? 'รายได้รวม' : 'Total Earnings'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <label htmlFor="driver-search" className="sr-only">{t.admin.drivers.searchPlaceholder}</label>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            id="driver-search"
                            name="driverSearch"
                            type="text"
                            placeholder={t.admin.drivers.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        {(['all', DriverStatus.AVAILABLE, DriverStatus.BUSY, DriverStatus.OFFLINE] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    filterStatus === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {status === 'all' ? t.admin.drivers.status.all : getStatusConfig(status).label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Drivers Grid */}
            {filteredDrivers.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-gray-400">person_off</span>
                    </div>
                    <p className="text-gray-500 font-medium">{t.admin.drivers.noDrivers}</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {searchQuery || filterStatus !== 'all'
                            ? t.admin.drivers.adjustFilters
                            : t.admin.drivers.addFirstDriver}
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                        <button
                            onClick={() => openModal()}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            เพิ่มคนขับคนแรก
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDrivers.map((driver) => (
                        <div
                            key={driver.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                        >
                            {/* Driver Header */}
                            <div className="p-5">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        {getDriverPhoto(driver) ? (
                                            <img
                                                src={getDriverPhoto(driver)!}
                                                alt={driver.name}
                                                className="w-14 h-14 rounded-full object-cover shadow-md"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                                {driver.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusConfig(driver.status).dot}`}></div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-800 truncate">{driver.name}</h3>
                                                <p className="text-sm text-gray-500">{driver.phone}</p>
                                            </div>
                                            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusConfig(driver.status).color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusConfig(driver.status).dot}`}></span>
                                                {getStatusConfig(driver.status).label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Info */}
                                {(driver.vehiclePlate || driver.vehicleModel) && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="material-symbols-outlined text-gray-400 text-lg">directions_car</span>
                                            <div>
                                                {driver.vehicleModel && (
                                                    <span className="text-gray-700">{driver.vehicleModel}</span>
                                                )}
                                                {driver.vehiclePlate && (
                                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-medium">
                                                        {driver.vehiclePlate}
                                                    </span>
                                                )}
                                                {driver.vehicleColor && (
                                                    <span className="ml-2 text-gray-500">• {driver.vehicleColor}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                                    <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg">
                                        <span className="material-symbols-outlined text-blue-500 text-lg">route</span>
                                        <span className="font-semibold text-gray-800">{driver.totalTrips || 0}</span>
                                        <span className="text-xs text-gray-500">trips</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
                                        <span className="material-symbols-outlined text-green-500 text-lg">payments</span>
                                        <span className="font-semibold text-gray-800">฿{(driver.totalEarnings || 0).toLocaleString()}</span>
                                        <span className="text-xs text-gray-500">earned</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 bg-amber-50 rounded-lg">
                                        <span className="material-symbols-outlined text-amber-500 text-lg">star</span>
                                        <span className="font-semibold text-gray-800">{driver.rating?.toFixed(1) || '5.0'}</span>
                                        <span className="text-xs text-gray-500">rating</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                {/* Status Toggle */}
                                <div className="flex items-center gap-1">
                                    {([DriverStatus.AVAILABLE, DriverStatus.BUSY, DriverStatus.OFFLINE] as const).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(driver, status)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                driver.status === status
                                                    ? getStatusConfig(status).color || ''
                                                    : 'text-gray-400 hover:bg-gray-200'
                                            }`}
                                            title={getStatusConfig(status).label || status}
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {status === DriverStatus.AVAILABLE ? 'check_circle' : status === DriverStatus.BUSY ? 'schedule' : 'do_not_disturb_on'}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Edit/Delete */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openModal(driver)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(driver)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {editingDriver ? 'แก้ไขคนขับ' : 'เพิ่มคนขับใหม่'}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {editingDriver ? 'อัปเดตข้อมูลคนขับ' : 'กรอกข้อมูลคนขับด้านล่าง'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Photo Upload */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handlePhotoChange}
                                        accept="image/*"
                                        className="hidden"
                                        id="driver-photo"
                                        name="driverPhoto"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative group"
                                    >
                                        {photoPreview ? (
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                                        </div>
                                        {uploadingPhoto && (
                                            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </button>
                                    {photoPreview && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPhotoFile(null);
                                                setPhotoPreview(null);
                                                setFormData({ ...formData, photo: '' });
                                            }}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-center text-xs text-gray-500">คลิกเพื่ออัพโหลดรูปโปรไฟล์</p>

                            {/* Name & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="driver-name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="driver-name"
                                        name="driverName"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        autoComplete="name"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Driver name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="driver-phone" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="driver-phone"
                                        name="driverPhone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        autoComplete="tel"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="08X-XXX-XXXX"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email & License */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="driver-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        id="driver-email"
                                        name="driverEmail"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        autoComplete="email"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="driver@email.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="driver-license" className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                                    <input
                                        id="driver-license"
                                        name="licenseNumber"
                                        type="text"
                                        value={formData.licenseNumber}
                                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                        autoComplete="off"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="License number"
                                    />
                                </div>
                            </div>

                            {/* Vehicle Section */}
                            <fieldset className="pt-2">
                                <legend className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">directions_car</span>
                                    Vehicle Information
                                </legend>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="vehicle-plate" className="block text-xs text-gray-500 mb-1">Plate Number</label>
                                        <input
                                            id="vehicle-plate"
                                            name="vehiclePlate"
                                            type="text"
                                            value={formData.vehiclePlate}
                                            onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                                            autoComplete="off"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                                            placeholder="กข 1234"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="vehicle-model" className="block text-xs text-gray-500 mb-1">Model</label>
                                        <input
                                            id="vehicle-model"
                                            name="vehicleModel"
                                            type="text"
                                            value={formData.vehicleModel}
                                            onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                                            autoComplete="off"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            placeholder="Toyota Camry"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="vehicle-color" className="block text-xs text-gray-500 mb-1">Color</label>
                                        <input
                                            id="vehicle-color"
                                            name="vehicleColor"
                                            type="text"
                                            value={formData.vehicleColor}
                                            onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                                            autoComplete="off"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            placeholder="Black"
                                        />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <div className="flex gap-2">
                                    {([DriverStatus.AVAILABLE, DriverStatus.BUSY, DriverStatus.OFFLINE] as const).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status })}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                                formData.status === status
                                                    ? (getStatusConfig(status).color || '') + ' ring-2 ring-offset-1 ring-current'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${getStatusConfig(status).dot || ''}`}></span>
                                            {getStatusConfig(status).label || status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label htmlFor="driver-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    id="driver-notes"
                                    name="driverNotes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                    rows={3}
                                    placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับคนขับ..."
                                />
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !formData.name || !formData.phone}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">save</span>
                                        {editingDriver ? 'อัปเดตคนขับ' : 'เพิ่มคนขับ'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
