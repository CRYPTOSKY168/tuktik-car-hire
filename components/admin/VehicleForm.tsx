'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FirestoreService } from '@/lib/firebase/firestore';
import { StorageService } from '@/lib/firebase/storage';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface VehicleFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function VehicleForm({ initialData, isEdit = false }: VehicleFormProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(initialData?.image || '');

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        price: initialData?.price || '',
        priceUSD: initialData?.priceUSD || '',
        type: initialData?.type || 'sedan',
        capacity: initialData?.capacity || 4,
        luggage: initialData?.luggage || 2,
        transmission: initialData?.transmission || 'Auto',
        image: initialData?.image || '',
        features: initialData?.features ? (Array.isArray(initialData.features) ? initialData.features.join(', ') : initialData.features) : '',
        description: initialData?.description || '',
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Upload Image (if selected)
            let imageUrl = formData.image;
            if (imageFile) {
                const tempId = isEdit ? initialData.id : `new-${Date.now()}`;
                imageUrl = await StorageService.uploadVehicleImage(imageFile, tempId);
            }

            // 2. Prepare Data
            const vehicleData = {
                ...formData,
                price: Number(formData.price),
                priceUSD: formData.priceUSD ? Number(formData.priceUSD) : Math.round(Number(formData.price) / 35),
                capacity: Number(formData.capacity),
                luggage: Number(formData.luggage),
                features: formData.features.split(',').map((f: string) => f.trim()).filter((f: string) => f),
                image: imageUrl,
                updatedAt: new Date()
            };

            if (isEdit && initialData?.id) {
                await FirestoreService.updateVehicle(initialData.id, vehicleData);
            } else {
                await FirestoreService.addVehicle({
                    ...vehicleData,
                    isActive: true,
                    createdAt: new Date()
                });
            }

            router.push('/admin/vehicles');
            router.refresh();
        } catch (error) {
            console.error("Failed to save vehicle", error);
            alert("Failed to save vehicle.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            {/* Image Upload */}
            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Vehicle Image</label>
                <div className="flex items-start gap-6">
                    <div className={`w-40 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 ${imagePreview ? 'border-brand-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center p-2">
                                <span className="material-symbols-outlined text-slate-400 text-3xl">add_photo_alternate</span>
                                <span className="block text-[10px] text-slate-400 mt-1">No Image</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-blue-600"
                        />
                        <p className="text-xs text-slate-400">Supported formats: JPG, PNG, WEBP. Max size: 2MB.</p>
                        {isEdit && !imageFile && (
                            <p className="text-xs text-brand-primary">Current image will be kept if no new image is uploaded.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.admin.vehicles.name}</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                        placeholder="e.g. Toyota Camry"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.admin.vehicles.type}</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                    >
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="van">Van</option>
                        <option value="luxury">Luxury</option>
                        <option value="minibus">MiniBus</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Transmission</label>
                    <select
                        value={formData.transmission}
                        onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                    >
                        <option value="Auto">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="EV">Electric (EV)</option>
                    </select>
                </div>

                {/* Price Row */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Price (THB/Day)</label>
                    <input
                        type="number"
                        required
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                        placeholder="2500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Price (USD/Day)</label>
                    <input
                        type="number"
                        min="0"
                        value={formData.priceUSD}
                        onChange={(e) => setFormData({ ...formData, priceUSD: e.target.value })}
                        placeholder="Auto-calculated"
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.admin.vehicles.capacity}</label>
                    <input
                        type="number"
                        required
                        min="1"
                        max="20"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                        placeholder="4"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Luggage (Bags)</label>
                    <input
                        type="number"
                        required
                        min="0"
                        max="20"
                        value={formData.luggage}
                        onChange={(e) => setFormData({ ...formData, luggage: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                        placeholder="2"
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.admin.vehicles.features}</label>
                    <textarea
                        rows={3}
                        value={formData.features}
                        onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                        className="w-full rounded-xl border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none border"
                        placeholder="Leather Seats, WiFi, GPS (Separate with comma)"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                    {t.common.cancel}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 font-bold text-white bg-brand-primary hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50"
                >
                    {loading ? t.common.loading : t.common.save}
                </button>
            </div>
        </form>
    );
}
