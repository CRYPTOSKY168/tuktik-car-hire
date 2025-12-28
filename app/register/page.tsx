'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { FirestoreService } from '@/lib/firebase/firestore';
import { countryCodes } from '@/lib/constants/countryCodes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function RegisterPage() {
    const { t } = useLanguage();
    const [activeMethod, setActiveMethod] = useState<'email' | 'phone'>('email');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userPhone, setUserPhone] = useState(''); // Phone for email registration
    const [countryCode, setCountryCode] = useState('+66');
    const [phone, setPhone] = useState('');
    const [phoneName, setPhoneName] = useState(''); // Name for phone registration
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Initialize Recaptcha
    const initRecaptcha = () => {
        if (auth && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => { },
                'expired-callback': () => { }
            });
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!auth) return;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update display name
            await updateProfile(userCredential.user, {
                displayName: name
            });

            // Save user to Firestore
            await FirestoreService.createUser(userCredential.user.uid, {
                email: email,
                displayName: name,
                phone: userPhone || undefined,
                provider: 'email'
            });

            router.push('/dashboard'); // Go to dashboard after register
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError(t.auth.errors.emailInUse);
            } else if (err.code === 'auth/weak-password') {
                setError(t.auth.errors.weakPassword);
            } else {
                setError(`${t.common.error}: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        initRecaptcha();

        if (!auth) return;

        // Combine country code and phone number (removing leading 0 if present)
        let cleanPhone = phone.trim();
        cleanPhone = cleanPhone.replace(/-/g, ''); // Remove hyphens

        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        const fullPhoneNumber = `${countryCode}${cleanPhone}`;

        try {
            const appVerifier = window.recaptchaVerifier;
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(result);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/operation-not-allowed') {
                setError('Phone Auth is disabled.');
            } else if (err.code === 'auth/quota-exceeded') {
                setError(t.auth.errors.quotaExceeded);
            } else if (err.code === 'auth/billing-not-enabled') {
                setError(t.auth.errors.billingNotEnabled);
            } else if (err.code === 'auth/too-many-requests') {
                setError(t.auth.errors.tooManyRequests);
            } else {
                setError(`${t.common.error} (${err.code}): ${err.message}`);
            }
            if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await confirmationResult.confirm(otp);

            // Format phone number
            let cleanPhone = phone.trim().replace(/-/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = cleanPhone.substring(1);
            }
            const fullPhoneNumber = `${countryCode}${cleanPhone}`;

            // Update display name if provided
            if (phoneName && result.user) {
                await updateProfile(result.user, { displayName: phoneName });
            }

            // Save user to Firestore
            await FirestoreService.createUser(result.user.uid, {
                displayName: phoneName || undefined,
                phone: fullPhoneNumber,
                provider: 'phone'
            });

            router.push('/dashboard'); // Login/Register successful
        } catch (err) {
            console.error(err);
            setError(t.auth.errors.invalidOtp);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();
        if (!auth) return;

        try {
            const result = await signInWithPopup(auth, provider);

            // Save user to Firestore
            await FirestoreService.createUser(result.user.uid, {
                email: result.user.email || undefined,
                displayName: result.user.displayName || undefined,
                photoURL: result.user.photoURL || undefined,
                provider: 'google'
            });

            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/operation-not-allowed') {
                setError('Google Sign-In is disabled in Firebase Console.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError(t.common.cancel);
            } else {
                setError(t.common.error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#111418] px-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t.auth.register}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{t.home.booking.title}</p>
                </div>

                <div id="recaptcha-container"></div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        {error}
                    </div>
                )}

                {/* Method Tabs */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg mb-6">
                    <button
                        onClick={() => setActiveMethod('email')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeMethod === 'email' ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t.auth.email}
                    </button>
                    <button
                        onClick={() => setActiveMethod('phone')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeMethod === 'phone' ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t.auth.phone}
                    </button>
                </div>

                {/* EMAIL FORM */}
                {activeMethod === 'email' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.payment.personalInfo}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.auth.email}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t.auth.phone}
                                <span className="text-slate-400 font-normal ml-1">(optional)</span>
                            </label>
                            <input
                                type="tel"
                                value={userPhone}
                                onChange={(e) => setUserPhone(e.target.value)}
                                className="w-full rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="08X-XXX-XXXX"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.auth.password}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? t.common.loading : t.auth.signUp}
                        </button>
                    </form>
                )}

                {/* PHONE FORM */}
                {activeMethod === 'phone' && (
                    <div className="space-y-4">
                        {!confirmationResult ? (
                            <form onSubmit={handlePhoneLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.payment.personalInfo}</label>
                                    <input
                                        type="text"
                                        value={phoneName}
                                        onChange={(e) => setPhoneName(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.auth.phone}</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="w-[120px] rounded-lg border-slate-300 px-2 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        >
                                            {countryCodes.map((c) => (
                                                <option key={c.code} value={c.dial_code}>
                                                    {c.code} ({c.dial_code})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="flex-1 rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            placeholder="81 234 5678"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">We'll send you a verification code</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? t.common.loading : t.auth.sendOtp}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.auth.enterOtp}</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 px-4 py-3 text-sm focus:border-brand-primary focus:ring-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white tracking-[0.5em] font-mono text-center text-xl"
                                        placeholder="123456"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? t.common.loading : t.auth.verifyRegister}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmationResult(null)}
                                    className="w-full text-slate-500 text-sm hover:underline"
                                >
                                    {t.auth.changeNumber}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">{t.auth.or}</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white font-bold py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-3"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Sign up with Google
                </button>

                <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t.auth.haveAccount}{' '}
                    <Link href="/login" className="text-brand-primary font-bold hover:underline">
                        {t.auth.signIn}
                    </Link>
                </div>
            </div>
        </main>
    );
}
