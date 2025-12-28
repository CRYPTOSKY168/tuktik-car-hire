'use client';

import { useEffect, useState } from 'react';
import VehicleForm from '@/components/admin/VehicleForm';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useParams } from 'next/navigation';

export default function EditVehiclePage() {
    const { t } = useLanguage();
    const params = useParams();
    const [vehicle, setVehicle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicle = async () => {
            if (params?.id) {
                try {
                    const data = await FirestoreService.getVehicle(params.id as string);
                    setVehicle(data);
                } catch (error) {
                    console.error("Failed to fetch vehicle", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchVehicle();
    }, [params]);

    if (loading) return <div>{t.common.loading}</div>;
    if (!vehicle) return <div>Vehicle not found</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t.admin.vehicles.edit}</h1>
            <VehicleForm initialData={vehicle} isEdit={true} />
        </div>
    );
}
