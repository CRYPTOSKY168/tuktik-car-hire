'use client';

import VehicleForm from '@/components/admin/VehicleForm';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import Link from 'next/link';

export default function AddVehiclePage() {
    const { t } = useLanguage();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/vehicles" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-slate-500">arrow_back</span>
                </Link>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t.admin.vehicles?.add || 'Add Vehicle'}</h1>
            </div>
            <VehicleForm />
        </div>
    );
}
