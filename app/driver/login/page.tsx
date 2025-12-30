'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';

export default function DriverLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState('');

    // Check if already logged in
    useEffect(() => {
        if (!auth) {
            setCheckingAuth(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is logged in, check if approved driver
                await checkDriverStatus(user);
            } else {
                setCheckingAuth(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const checkDriverStatus = async (user: User) => {
        try {
            // Get user data from Firestore
            const userDoc = await getDoc(doc(db!, 'users', user.uid));
            const userData = userDoc.data();

            if (!userData?.isApprovedDriver) {
                setError('บัญชีของคุณยังไม่ได้รับการอนุมัติเป็นคนขับ กรุณาติดต่อแอดมิน');
                setCheckingAuth(false);
                return;
            }

            // Check if driver has vehicle info
            const driversQuery = await getDoc(doc(db!, 'drivers', userData.driverId || 'none'));

            if (!driversQuery.exists()) {
                // Approved but no vehicle info, redirect to setup
                router.push('/driver/setup');
            } else {
                // Has complete profile, go to dashboard
                router.push('/driver');
            }
        } catch (err) {
            console.error('Error checking driver status:', err);
            setCheckingAuth(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }

        setLoading(true);
        setError('');

        if (!auth) {
            setError('Firebase not initialized');
            setLoading(false);
            return;
        }

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await checkDriverStatus(result.user);
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.code === 'auth/invalid-credential') {
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            } else if (err.code === 'auth/user-not-found') {
                setError('ไม่พบบัญชีผู้ใช้นี้');
            } else {
                setError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        if (!auth) {
            setError('Firebase not initialized');
            setLoading(false);
            return;
        }

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            // Sync user data including photoURL to Firestore
            if (db && result.user) {
                const userRef = doc(db, 'users', result.user.uid);
                await setDoc(userRef, {
                    email: result.user.email || null,
                    displayName: result.user.displayName || null,
                    photoURL: result.user.photoURL || null,
                    provider: 'google',
                    updatedAt: Timestamp.now()
                }, { merge: true });
            }

            await checkDriverStatus(result.user);
        } catch (err: any) {
            console.error('Google login error:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('ยกเลิกการเข้าสู่ระบบ');
            } else {
                setError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
            }
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-white rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-white font-medium">กำลังตรวจสอบ...</p>
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
                        <span className="material-symbols-outlined text-white text-4xl">local_taxi</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">TukTik Driver</h1>
                    <p className="text-white/60">Driver Portal</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">เข้าสู่ระบบคนขับ</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start gap-2">
                            <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                อีเมล
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                รหัสผ่าน
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="รหัสผ่าน"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">login</span>
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white text-gray-500">หรือ</span>
                        </div>
                    </div>

                    {/* Google Login */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className="w-5 h-5"
                        />
                        เข้าสู่ระบบด้วย Google
                    </button>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            ยังไม่ได้สมัครสมาชิก?
                        </p>
                        <Link href="/register" className="text-indigo-600 font-semibold text-sm hover:underline">
                            สมัครสมาชิกที่นี่
                        </Link>
                        <p className="text-xs text-gray-400 mt-2">
                            หลังสมัครแล้ว กรุณาติดต่อแอดมินเพื่อขออนุมัติเป็นคนขับ
                        </p>
                    </div>
                </div>

                {/* Back to Home */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-white/60 text-sm hover:text-white transition-colors">
                        กลับหน้าหลัก
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-4">
                    TukTik Transfer Services
                </p>
            </div>
        </div>
    );
}
