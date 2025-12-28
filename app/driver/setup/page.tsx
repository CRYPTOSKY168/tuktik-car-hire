'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { StorageService } from '@/lib/firebase/storage';

export default function DriverSetupPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingIdCard, setUploadingIdCard] = useState(false);
    const [uploadingLicense, setUploadingLicense] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');

    // Document uploads
    const [idCardUrl, setIdCardUrl] = useState('');
    const [driverLicenseUrl, setDriverLicenseUrl] = useState('');
    const [idCardPreview, setIdCardPreview] = useState('');
    const [licensePreview, setLicensePreview] = useState('');

    // Rejection state
    const [isRejected, setIsRejected] = useState(false);
    const [existingDriverId, setExistingDriverId] = useState<string | null>(null);

    const idCardInputRef = useRef<HTMLInputElement>(null);
    const licenseInputRef = useRef<HTMLInputElement>(null);

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

            // Check if user is approved driver
            const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
            const userData = userDoc.data();

            if (!userData?.isApprovedDriver) {
                router.push('/driver/login');
                return;
            }

            // Check if already has driver profile
            if (userData.driverId) {
                const driverDoc = await getDoc(doc(db!, 'drivers', userData.driverId));
                if (driverDoc.exists()) {
                    const driverData = driverDoc.data();

                    // If rejected, stay on page and allow re-submission
                    if (driverData.setupStatus === 'rejected') {
                        setIsRejected(true);
                        setExistingDriverId(userData.driverId);
                        // Pre-fill form with existing data
                        setVehiclePlate(driverData.vehiclePlate || '');
                        setVehicleModel(driverData.vehicleModel || '');
                        setVehicleColor(driverData.vehicleColor || '');
                        setLicenseNumber(driverData.licenseNumber || '');
                        // Don't pre-fill document URLs - require re-upload
                        setUser(currentUser);
                        setLoading(false);
                        return;
                    }

                    // If pending review, go to pending page
                    if (driverData.setupStatus === 'pending_review') {
                        router.push('/driver/pending');
                        return;
                    }

                    // If approved, go to dashboard
                    if (driverData.setupStatus === 'approved') {
                        router.push('/driver');
                        return;
                    }
                }
            }

            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setIdCardPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        setUploadingIdCard(true);
        try {
            const url = await StorageService.uploadDriverDocument(file, user.uid, 'id_card');
            setIdCardUrl(url);
        } catch (err) {
            console.error('Error uploading ID card:', err);
            setError('อัปโหลดบัตรประชาชนไม่สำเร็จ');
        } finally {
            setUploadingIdCard(false);
        }
    };

    const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setLicensePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        setUploadingLicense(true);
        try {
            const url = await StorageService.uploadDriverDocument(file, user.uid, 'driver_license');
            setDriverLicenseUrl(url);
        } catch (err) {
            console.error('Error uploading license:', err);
            setError('อัปโหลดใบขับขี่ไม่สำเร็จ');
        } finally {
            setUploadingLicense(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!vehiclePlate.trim() || !vehicleModel.trim() || !vehicleColor.trim()) {
            setError('กรุณากรอกข้อมูลรถให้ครบถ้วน');
            return;
        }

        if (!idCardUrl) {
            setError('กรุณาอัปโหลดรูปบัตรประชาชน');
            return;
        }

        if (!driverLicenseUrl) {
            setError('กรุณาอัปโหลดรูปใบขับขี่');
            return;
        }

        if (!user || !auth) return;

        setSubmitting(true);
        setError('');

        try {
            // Get current user's ID token
            const idToken = await user.getIdToken();

            // Call API to create driver profile
            const response = await fetch('/api/driver/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    vehiclePlate: vehiclePlate.trim(),
                    vehicleModel: vehicleModel.trim(),
                    vehicleColor: vehicleColor.trim(),
                    licenseNumber: licenseNumber.trim(),
                    idCardUrl,
                    driverLicenseUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create driver profile');
            }

            // Go to pending approval page
            router.push('/driver/pending');
        } catch (err: any) {
            console.error('Error creating driver profile:', err);
            setError(err.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
        } finally {
            setSubmitting(false);
        }
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-8 px-4">
            <div className="w-full max-w-md mx-auto">
                {/* Logo & Title */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-3 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl">directions_car</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">ตั้งค่าข้อมูลคนขับ</h1>
                    <p className="text-white/60 text-sm">กรุณากรอกข้อมูลและอัปโหลดเอกสาร</p>
                </div>

                {/* Setup Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-6">
                    {/* Rejection warning message */}
                    {isRejected ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-red-600 text-lg">error</span>
                                <div>
                                    <p className="text-red-800 font-medium text-sm">เอกสารของคุณถูกปฏิเสธ</p>
                                    <p className="text-red-600 text-xs mt-0.5">กรุณาอัปโหลดเอกสารใหม่อีกครั้ง</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Welcome message */
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                                <div>
                                    <p className="text-green-800 font-medium text-sm">คุณได้รับการอนุมัติเป็นคนขับแล้ว!</p>
                                    <p className="text-green-600 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบเพื่อรอการตรวจสอบ</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-5 text-sm flex items-start gap-2">
                            <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Vehicle Info Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500 text-lg">directions_car</span>
                                ข้อมูลรถ
                            </h3>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <span className="text-red-500">*</span> ทะเบียนรถ
                                </label>
                                <input
                                    type="text"
                                    value={vehiclePlate}
                                    onChange={(e) => setVehiclePlate(e.target.value)}
                                    placeholder="เช่น กข 1234"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all uppercase"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        <span className="text-red-500">*</span> รุ่นรถ/ยี่ห้อ
                                    </label>
                                    <input
                                        type="text"
                                        value={vehicleModel}
                                        onChange={(e) => setVehicleModel(e.target.value)}
                                        placeholder="Toyota Camry"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        <span className="text-red-500">*</span> สีรถ
                                    </label>
                                    <input
                                        type="text"
                                        value={vehicleColor}
                                        onChange={(e) => setVehicleColor(e.target.value)}
                                        placeholder="ขาว"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    เลขที่ใบขับขี่
                                </label>
                                <input
                                    type="text"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    placeholder="เลขที่ใบอนุญาตขับขี่"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Document Upload Section */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500 text-lg">folder</span>
                                อัปโหลดเอกสาร
                            </h3>

                            {/* ID Card Upload */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                    <span className="text-red-500">*</span> รูปบัตรประชาชน
                                </label>
                                <input
                                    type="file"
                                    ref={idCardInputRef}
                                    onChange={handleIdCardUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => idCardInputRef.current?.click()}
                                    disabled={uploadingIdCard}
                                    className={`w-full p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${
                                        idCardUrl
                                            ? 'border-green-300 bg-green-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
                                    }`}
                                >
                                    {uploadingIdCard ? (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <span className="text-sm">กำลังอัปโหลด...</span>
                                        </div>
                                    ) : idCardPreview ? (
                                        <div className="relative w-full">
                                            <img src={idCardPreview} alt="ID Card" className="w-full h-24 object-cover rounded-lg" />
                                            <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-sm">check</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-3xl text-gray-400">badge</span>
                                            <span className="text-sm text-gray-500">แตะเพื่ออัปโหลดบัตรประชาชน</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Driver License Upload */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-2">
                                    <span className="text-red-500">*</span> รูปใบขับขี่
                                </label>
                                <input
                                    type="file"
                                    ref={licenseInputRef}
                                    onChange={handleLicenseUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => licenseInputRef.current?.click()}
                                    disabled={uploadingLicense}
                                    className={`w-full p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${
                                        driverLicenseUrl
                                            ? 'border-green-300 bg-green-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
                                    }`}
                                >
                                    {uploadingLicense ? (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <span className="text-sm">กำลังอัปโหลด...</span>
                                        </div>
                                    ) : licensePreview ? (
                                        <div className="relative w-full">
                                            <img src={licensePreview} alt="Driver License" className="w-full h-24 object-cover rounded-lg" />
                                            <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-sm">check</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-3xl text-gray-400">id_card</span>
                                            <span className="text-sm text-gray-500">แตะเพื่ออัปโหลดใบขับขี่</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || uploadingIdCard || uploadingLicense}
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 mt-4"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    กำลังส่งข้อมูล...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">send</span>
                                    ส่งข้อมูลเพื่อตรวจสอบ
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-xs mt-6">
                    TukTik Transfer Services
                </p>
            </div>
        </div>
    );
}
