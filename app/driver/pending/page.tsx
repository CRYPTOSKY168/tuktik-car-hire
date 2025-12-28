'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

interface DriverData {
    setupStatus: 'pending_review' | 'approved' | 'rejected';
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
}

export default function DriverPendingPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            router.push('/driver/login');
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/driver/login');
                return;
            }

            setUser(currentUser);

            // Get user data
            const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
            const userData = userDoc.data();

            if (!userData?.isApprovedDriver) {
                router.push('/driver/login');
                return;
            }

            if (!userData?.driverId) {
                router.push('/driver/setup');
                return;
            }

            // Listen to driver document for real-time updates
            const driverUnsubscribe = onSnapshot(
                doc(db!, 'drivers', userData.driverId),
                (driverDoc) => {
                    if (driverDoc.exists()) {
                        const driverData = driverDoc.data() as DriverData;
                        setDriver(driverData);

                        // If approved, redirect to dashboard
                        if (driverData.setupStatus === 'approved') {
                            router.push('/driver');
                        }
                    }
                    setLoading(false);
                }
            );

            return () => driverUnsubscribe();
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-white rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-white font-medium">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-4xl">hourglass_top</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">รอการตรวจสอบ</h1>
                    <p className="text-white/60">ข้อมูลของคุณอยู่ระหว่างการพิจารณา</p>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {/* Pending Status */}
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 text-5xl">pending</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">กำลังตรวจสอบข้อมูล</h2>
                        <p className="text-gray-500 text-sm">
                            แอดมินกำลังตรวจสอบข้อมูลรถของคุณ<br />
                            กรุณารอสักครู่
                        </p>
                    </div>

                    {/* Vehicle Info Summary */}
                    {driver && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-500">directions_car</span>
                                ข้อมูลที่ส่งไป
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ทะเบียน</span>
                                    <span className="font-medium text-gray-800">{driver.vehiclePlate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">รุ่นรถ</span>
                                    <span className="font-medium text-gray-800">{driver.vehicleModel}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">สี</span>
                                    <span className="font-medium text-gray-800">{driver.vehicleColor}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-blue-600">info</span>
                            <div className="text-sm">
                                <p className="text-blue-800 font-medium">หน้านี้จะอัพเดทอัตโนมัติ</p>
                                <p className="text-blue-600 mt-1">
                                    เมื่อแอดมินอนุมัติแล้ว คุณจะถูก redirect ไปหน้า Dashboard โดยอัตโนมัติ
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Admin */}
                    <div className="text-center text-sm text-gray-500">
                        <p>มีคำถาม? ติดต่อแอดมิน</p>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full mt-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">logout</span>
                    ออกจากระบบ
                </button>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-6">
                    TukTik Transfer Services
                </p>
            </div>
        </div>
    );
}
