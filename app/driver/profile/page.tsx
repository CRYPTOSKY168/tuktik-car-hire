'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';

interface DriverData {
    id: string;
    name: string;
    phone: string;
    email?: string;
    photo?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    status: 'available' | 'busy' | 'offline';
    totalTrips?: number;
    rating?: number;
    ratingCount?: number;
}

export default function DriverProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/driver/login');
                return;
            }

            setUser(currentUser);

            try {
                // Get user data
                const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
                const userData = userDoc.data();

                if (userData?.driverId) {
                    const driverDoc = await getDoc(doc(db!, 'drivers', userData.driverId));
                    if (driverDoc.exists()) {
                        const driverData = driverDoc.data();
                        // Priority: driver.photo > user.photoURL
                        const photoURL = driverData.photo || userData.photoURL || null;
                        setDriver({
                            id: driverDoc.id,
                            name: driverData.name,
                            phone: driverData.phone,
                            email: driverData.email || currentUser.email || '',
                            photo: photoURL,
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            vehicleColor: driverData.vehicleColor,
                            status: driverData.status || 'offline',
                            totalTrips: driverData.totalTrips || 0,
                            rating: driverData.rating || 5.0,
                            ratingCount: driverData.ratingCount || 0,
                        });
                        setLoading(false);
                        return;
                    }
                }

                // Fallback: Check by userId
                const driversQuery = query(
                    collection(db!, 'drivers'),
                    where('userId', '==', currentUser.uid)
                );
                const driversSnap = await getDocs(driversQuery);

                if (!driversSnap.empty) {
                    const driverDoc = driversSnap.docs[0];
                    const driverData = driverDoc.data();
                    // Priority: driver.photo > user.photoURL
                    const photoURL = driverData.photo || userData?.photoURL || null;
                    setDriver({
                        id: driverDoc.id,
                        name: driverData.name,
                        phone: driverData.phone,
                        email: driverData.email || currentUser.email || '',
                        photo: photoURL,
                        vehiclePlate: driverData.vehiclePlate,
                        vehicleModel: driverData.vehicleModel,
                        vehicleColor: driverData.vehicleColor,
                        status: driverData.status || 'offline',
                        totalTrips: driverData.totalTrips || 0,
                        rating: driverData.rating || 5.0,
                        ratingCount: driverData.ratingCount || 0,
                    });
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading driver:', err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
        }
        router.push('/driver/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">error</span>
                    <p className="text-gray-500">ไม่พบข้อมูลคนขับ</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center">
                {driver.photo ? (
                    <img
                        src={driver.photo}
                        alt={driver.name}
                        className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-white/30"
                    />
                ) : (
                    <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl">person</span>
                    </div>
                )}
                <h2 className="text-2xl font-bold mb-1">{driver.name}</h2>
                <p className="text-white/70">{driver.email || driver.phone}</p>

                {/* Rating */}
                {driver.rating && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="material-symbols-outlined text-yellow-400">star</span>
                        <span className="text-xl font-bold">{driver.rating.toFixed(1)}</span>
                        <span className="text-white/60">({driver.ratingCount || 0} รีวิว)</span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                    <span className="material-symbols-outlined text-3xl text-indigo-500 mb-2">local_taxi</span>
                    <p className="text-2xl font-bold text-gray-800">{driver.totalTrips || 0}</p>
                    <p className="text-sm text-gray-500">ทริปทั้งหมด</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                    <span className="material-symbols-outlined text-3xl text-yellow-500 mb-2">star</span>
                    <p className="text-2xl font-bold text-gray-800">{driver.rating?.toFixed(1) || '-'}</p>
                    <p className="text-sm text-gray-500">คะแนนเฉลี่ย</p>
                </div>
            </div>

            {/* Vehicle Info */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">directions_car</span>
                    ข้อมูลรถ
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">รุ่นรถ</span>
                        <span className="font-medium text-gray-800">{driver.vehicleModel || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">ทะเบียน</span>
                        <span className="font-medium text-gray-800">{driver.vehiclePlate || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-gray-500">สี</span>
                        <span className="font-medium text-gray-800">{driver.vehicleColor || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">contact_phone</span>
                    ข้อมูลติดต่อ
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">เบอร์โทร</span>
                        <span className="font-medium text-gray-800">{driver.phone || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-gray-500">อีเมล</span>
                        <span className="font-medium text-gray-800">{driver.email || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">help</span>
                        <span className="text-gray-700">ศูนย์ช่วยเหลือ</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">description</span>
                        <span className="text-gray-700">ข้อกำหนดและเงื่อนไข</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-50 text-red-600 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
                <span className="material-symbols-outlined">logout</span>
                ออกจากระบบ
            </button>

            {/* Version */}
            <p className="text-center text-gray-400 text-sm">TukTik Driver v1.0.0</p>
        </div>
    );
}
