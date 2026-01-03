'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface UserData {
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
    photoURL?: string | null;
    createdAt?: any;
    rating?: number;
}

export default function Book2ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalTrips, setTotalTrips] = useState(0);
    const [memberSince, setMemberSince] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
    });
    const [saving, setSaving] = useState(false);

    // Auth check
    useEffect(() => {
        if (!auth) {
            router.replace('/login?redirect=/book2/profile');
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                router.replace('/login?redirect=/book2/profile');
                return;
            }
            setUser(firebaseUser);

            // Get user data from Firestore
            if (db) {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData({
                        displayName: data.displayName || firebaseUser.displayName,
                        email: data.email || firebaseUser.email,
                        phone: data.phone,
                        photoURL: data.photoURL || firebaseUser.photoURL,
                        createdAt: data.createdAt,
                        rating: data.rating,
                    });
                    setFormData({
                        displayName: data.displayName || firebaseUser.displayName || '',
                        phone: data.phone || '',
                    });

                    // Format member since date
                    if (data.createdAt) {
                        const date = data.createdAt.toDate?.() || new Date(data.createdAt);
                        setMemberSince(date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }));
                    }
                } else {
                    setUserData({
                        displayName: firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                    });
                    setFormData({
                        displayName: firebaseUser.displayName || '',
                        phone: '',
                    });
                    setMemberSince('ใหม่');
                }

                // Get total trips
                const bookingsQuery = query(
                    collection(db, 'bookings'),
                    where('userId', '==', firebaseUser.uid),
                    where('status', '==', 'completed')
                );
                const bookingsSnap = await getDocs(bookingsQuery);
                setTotalTrips(bookingsSnap.size);
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleSave = async () => {
        if (!user || !db) return;

        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: formData.displayName,
                phone: formData.phone,
                updatedAt: new Date(),
            });

            setUserData((prev) => ({
                ...prev,
                displayName: formData.displayName,
                phone: formData.phone,
            }));
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        if (confirm('ต้องการออกจากระบบหรือไม่?')) {
            await signOut(auth!);
            router.replace('/book2');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full relative min-h-screen flex flex-col bg-[#f5f8f7] dark:bg-[#0f2318] pb-24">
            {/* Top App Bar */}
            <header className="sticky top-0 z-10 bg-[#f5f8f7]/80 dark:bg-[#0f2318]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-transparent">
                <Link
                    href="/book2"
                    className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[#101814] dark:text-white">arrow_back</span>
                </Link>
                <h1 className="text-lg font-bold text-[#101814] dark:text-white">โปรไฟล์</h1>
                <div className="size-10"></div>
            </header>

            {/* Profile Header & Stats Container */}
            <div className="px-4 pt-2 pb-6">
                <div className="bg-white dark:bg-[#162e21] rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 relative overflow-hidden">
                    {/* Decorative background blob */}
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent opacity-50"></div>

                    {/* Avatar Section */}
                    <div className="relative z-10">
                        <div className="size-[88px] rounded-full p-1 bg-white dark:bg-[#162e21] ring-1 ring-[#dae7e0] dark:ring-[#2a4a38]">
                            {userData?.photoURL ? (
                                <img
                                    src={userData.photoURL}
                                    alt=""
                                    className="size-full rounded-full object-cover bg-gray-200"
                                />
                            ) : (
                                <div className="size-full rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-4xl">person</span>
                                </div>
                            )}
                        </div>
                        {/* Edit Button */}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] size-8 bg-white dark:bg-[#162e21] border border-[#dae7e0] dark:border-[#2a4a38] rounded-full flex items-center justify-center shadow-md text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                    </div>

                    {/* User Info */}
                    {!isEditing ? (
                        <>
                            <div className="flex flex-col items-center gap-1 z-10">
                                <h2 className="text-xl font-bold text-[#101814] dark:text-white">
                                    {userData?.displayName || 'ไม่ระบุชื่อ'}
                                </h2>
                                <p className="text-[#5e8d73] text-sm font-medium">
                                    {userData?.phone || userData?.email || '-'}
                                </p>
                                {/* Rating Badge */}
                                {userData?.rating && (
                                    <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-black/20 border border-[#dae7e0] dark:border-[#2a4a38] rounded-full shadow-sm">
                                        <span
                                            className="material-symbols-outlined text-secondary text-[18px]"
                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                        >
                                            star
                                        </span>
                                        <span className="text-sm font-bold text-[#101814] dark:text-white pt-0.5">
                                            {userData.rating.toFixed(1)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Divider */}
                            <div className="w-full h-px bg-[#dae7e0] dark:bg-[#2a4a38] my-2"></div>

                            {/* Stats Row */}
                            <div className="flex w-full justify-evenly items-center">
                                <div className="flex flex-col items-center gap-1 flex-1 border-r border-[#dae7e0] dark:border-[#2a4a38]">
                                    <span className="text-xs text-[#5e8d73] font-normal">Total Trips</span>
                                    <span className="text-lg font-bold text-[#101814] dark:text-white">{totalTrips}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-xs text-[#5e8d73] font-normal">Member Since</span>
                                    <span className="text-lg font-bold text-[#101814] dark:text-white">{memberSince || '-'}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Edit Form */
                        <div className="w-full space-y-4 mt-2 z-10">
                            <div>
                                <label className="block text-sm font-medium text-[#5e8d73] mb-1.5">
                                    ชื่อ-นามสกุล
                                </label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#f5f8f7] dark:bg-[#0f2318] border border-[#dae7e0] dark:border-[#2a4a38] rounded-xl text-[#101814] dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                    placeholder="กรอกชื่อ-นามสกุล"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#5e8d73] mb-1.5">
                                    เบอร์โทรศัพท์
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#f5f8f7] dark:bg-[#0f2318] border border-[#dae7e0] dark:border-[#2a4a38] rounded-xl text-[#101814] dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                    placeholder="กรอกเบอร์โทรศัพท์"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-[#5e8d73] rounded-xl font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu List */}
            {!isEditing && (
                <div className="px-4 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-[#5e8d73] uppercase tracking-wider px-2">Menu</h3>

                    <div className="bg-white dark:bg-[#162e21] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#dae7e0] dark:divide-[#2a4a38]">
                        {/* Saved Places */}
                        <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="flex items-center justify-center size-10 rounded-full bg-green-50 dark:bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-medium text-[#101814] dark:text-white">ที่อยู่ที่บันทึก</p>
                                <p className="text-xs text-[#5e8d73]">Saved Places</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">chevron_right</span>
                        </button>

                        {/* Payment Methods */}
                        <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="flex items-center justify-center size-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-medium text-[#101814] dark:text-white">วิธีการชำระเงิน</p>
                                <p className="text-xs text-[#5e8d73]">Payment Methods</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">chevron_right</span>
                        </button>

                        {/* Promotions */}
                        <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="flex items-center justify-center size-10 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-medium text-[#101814] dark:text-white">โปรโมชั่น</p>
                                <p className="text-xs text-[#5e8d73]">Promotions</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">chevron_right</span>
                        </button>

                        {/* Settings */}
                        <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="flex items-center justify-center size-10 rounded-full bg-gray-50 dark:bg-gray-500/10 text-gray-600 dark:text-gray-300 shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">settings</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-medium text-[#101814] dark:text-white">ตั้งค่า</p>
                                <p className="text-xs text-[#5e8d73]">Settings</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">chevron_right</span>
                        </button>

                        {/* Help */}
                        <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="flex items-center justify-center size-10 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 shrink-0 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">help</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-medium text-[#101814] dark:text-white">ช่วยเหลือ</p>
                                <p className="text-xs text-[#5e8d73]">Help</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500">chevron_right</span>
                        </button>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-4 mt-2 bg-white dark:bg-[#162e21] rounded-2xl shadow-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
                    >
                        <div className="flex items-center justify-center size-10 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 shrink-0 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-base font-medium text-red-500">ออกจากระบบ</p>
                            <p className="text-xs text-red-500/70">Log Out</p>
                        </div>
                    </button>

                    <div className="h-6"></div>
                    <p className="text-center text-xs text-[#5e8d73] opacity-60">Version 2.4.0 (Build 1024)</p>
                </div>
            )}
        </div>
    );
}
