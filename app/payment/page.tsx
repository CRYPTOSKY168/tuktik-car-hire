'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { StorageService } from '@/lib/firebase/storage';
import { StripeService } from '@/lib/firebase/stripe';
import { sendOTP, verifyOTP, initRecaptcha, resetRecaptcha } from '@/lib/firebase/phoneAuth';
import { QRCodeSVG } from 'qrcode.react';
import { generatePromptPayPayload } from '@/lib/utils/payment';

export default function PaymentPage() {
  const router = useRouter();
  const { bookingData, updateBooking, calculateTotal } = useBooking();
  const { language } = useLanguage();
  const { user, loading } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay' | 'cash' | null>(null);
  const [expandedSection, setExpandedSection] = useState<'info' | 'payment' | null>('info');

  // Form States
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    flightNumber: '',
    passengerCount: 1,
    luggageCount: 1,
    specialRequests: '',
  });

  // OTP States
  const [cashPhoneNumber, setCashPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Payment States
  const [processing, setProcessing] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [activeBookingData, setActiveBookingData] = useState<any>(null);

  // PromptPay States
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Validate access
  useEffect(() => {
    const validateAccess = async () => {
      if (loading) return;
      if (!user) {
        router.push('/login?redirect=/payment');
        return;
      }

      try {
        const { hasActive, activeBooking } = await FirestoreService.hasActiveBooking(user.uid);
        if (hasActive && activeBooking) {
          setHasActiveBooking(true);
          setActiveBookingData(activeBooking);

          // If awaiting_payment, populate bookingData from activeBooking
          if (activeBooking.status === 'awaiting_payment') {
            updateBooking({
              vehicle: activeBooking.vehicle as any || { name: activeBooking.vehicleName, price: activeBooking.vehiclePrice || 0, id: activeBooking.vehicleId, type: '', image: '', passengers: 0, luggage: 0, transmission: '', features: [] },
              pickupLocation: activeBooking.pickupLocation,
              dropoffLocation: activeBooking.dropoffLocation,
              pickupDate: activeBooking.pickupDate,
              pickupTime: activeBooking.pickupTime,
              firstName: activeBooking.firstName,
              lastName: activeBooking.lastName,
              email: activeBooking.email,
              phone: activeBooking.phone,
            });
          }

          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error('Error checking active booking:', error);
      }

      if (!bookingData.vehicle || !bookingData.pickupLocation || !bookingData.dropoffLocation || !bookingData.pickupDate) {
        router.push('/vehicles?error=incomplete_booking');
        return;
      }

      setIsValidating(false);
    };

    const timer = setTimeout(validateAccess, 100);
    return () => clearTimeout(timer);
  }, [bookingData, router, user, loading, updateBooking]);

  // Pre-fill form from auth
  useEffect(() => {
    if (user && !formData.firstName) {
      const names = user.displayName ? user.displayName.split(' ') : ['', ''];
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || bookingData.firstName || '',
        lastName: names.slice(1).join(' ') || bookingData.lastName || '',
        email: user.email || bookingData.email || '',
        phone: bookingData.phone || ''
      }));
    }
  }, [user, bookingData]);

  // Initialize reCAPTCHA for cash payment
  useEffect(() => {
    if (paymentMethod === 'cash' && !otpVerified) {
      const timer = setTimeout(() => {
        initRecaptcha('send-otp-button');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [paymentMethod, otpVerified]);

  useEffect(() => {
    return () => resetRecaptcha();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  // OTP Handlers
  const handleSendOtp = async () => {
    if (!cashPhoneNumber || cashPhoneNumber.length < 10) {
      setOtpError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
      return;
    }
    setOtpSending(true);
    setOtpError('');
    try {
      const result = await sendOTP(cashPhoneNumber);
      if (result.success) setOtpSent(true);
      else setOtpError(result.error || 'ไม่สามารถส่ง OTP ได้');
    } catch (error: any) {
      setOtpError(error.message || 'ไม่สามารถส่ง OTP ได้');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }
    setOtpVerifying(true);
    setOtpError('');
    try {
      const result = await verifyOTP(otpCode);
      if (result.success) {
        setOtpVerified(true);
        setFormData(prev => ({ ...prev, phone: cashPhoneNumber }));
      } else {
        setOtpError(result.error || 'รหัส OTP ไม่ถูกต้อง');
      }
    } catch (error: any) {
      setOtpError(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Stripe Payment
  const handleStripePayment = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('กรุณากรอกข้อมูลผู้จองให้ครบถ้วน');
      return;
    }
    if (!user || !bookingData.vehicle) return;

    setStripeLoading(true);
    setStripeError('');

    try {
      const updatedBookingData = {
        ...bookingData, ...formData,
        paymentMethod: 'card' as const,
      };
      updateBooking(updatedBookingData);

      const totalAmount = calculateTotal();

      // If continuing payment for existing awaiting_payment booking with real ID
      let bookingId: string;
      const isLocalBooking = activeBookingData?.id?.startsWith('local-');

      if (activeBookingData && activeBookingData.status === 'awaiting_payment' && !isLocalBooking) {
        // Use existing booking ID
        bookingId = activeBookingData.id;
      } else {
        // Create new booking
        bookingId = await FirestoreService.addBooking(updatedBookingData, totalAmount, user.uid);
      }

      // Check if booking was saved to Firestore (not localStorage fallback)
      if (bookingId.startsWith('local-')) {
        setStripeError('ไม่สามารถบันทึกข้อมูลการจองได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่');
        setStripeLoading(false);
        return;
      }

      const sessionId = await StripeService.createCheckoutSession(user.uid, {
        bookingId,
        vehicleName: bookingData.vehicle.name,
        pickupLocation: bookingData.pickupLocation,
        dropoffLocation: bookingData.dropoffLocation,
        pickupDate: bookingData.pickupDate,
        pickupTime: bookingData.pickupTime,
        tripType: bookingData.tripType,
        totalAmount,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
      });

      await StripeService.linkPaymentToBooking(bookingId, sessionId);

      const unsubscribe = StripeService.subscribeToCheckoutSession(
        user.uid, sessionId,
        (session, error) => {
          if (error) {
            setStripeError(error);
            setStripeLoading(false);
            unsubscribe();
            return;
          }
          if (session?.url) {
            window.location.href = session.url;
            unsubscribe();
          }
        }
      );

      setTimeout(() => {
        if (stripeLoading) {
          setStripeError('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่');
          setStripeLoading(false);
        }
      }, 30000);

    } catch (error: any) {
      setStripeError(error.message || 'ไม่สามารถเริ่มการชำระเงินได้');
      setStripeLoading(false);
    }
  };

  // PromptPay Check
  const handleCheckPayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setPaymentSuccess(true);
      setTimeout(() => handleSubmit(), 1500);
    }, 3000);
  };

  // Cash/PromptPay Submit
  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (paymentMethod === 'cash' && !otpVerified) {
      alert('กรุณายืนยันเบอร์โทรศัพท์ด้วย OTP');
      return;
    }
    if (!user) return;

    setProcessing(true);
    try {
      const updatedBookingData = {
        ...bookingData, ...formData,
        phone: paymentMethod === 'cash' ? cashPhoneNumber : formData.phone,
        paymentMethod: paymentMethod!,
        phoneVerified: paymentMethod === 'cash',
      };
      updateBooking(updatedBookingData);

      const total = calculateTotal();

      // If continuing payment for existing booking, update it instead of creating new
      // But if ID starts with 'local-', it's not a real Firestore document, so create new
      const isLocalBooking = activeBookingData?.id?.startsWith('local-');

      if (activeBookingData && activeBookingData.status === 'awaiting_payment' && !isLocalBooking) {
        // Update booking status to pending (payment completed)
        await FirestoreService.updateBookingStatus(activeBookingData.id, 'pending', 'Payment completed');
        await FirestoreService.updatePaymentStatus(activeBookingData.id, 'paid');
        router.push(`/confirmation?bookingId=${activeBookingData.id}`);
      } else {
        // Create new booking (either no active booking or local booking that needs to be saved)
        const bookingId = await FirestoreService.addBooking(updatedBookingData, total, user.uid);
        router.push(`/confirmation?bookingId=${bookingId}`);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('การจองไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setProcessing(false);
    }
  };

  const isFormComplete = formData.firstName && formData.lastName && formData.email && formData.phone;
  const total = calculateTotal();

  // Loading
  if (isValidating || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </main>
    );
  }

  // Active Booking Block - only block if NOT awaiting_payment
  // If awaiting_payment, let them continue to payment
  if (hasActiveBooking && activeBookingData && activeBookingData.status !== 'awaiting_payment') {
    // Status configuration
    const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string; step: number }> = {
      pending: { label: 'รอยืนยัน', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: 'schedule', step: 1 },
      confirmed: { label: 'ยืนยันแล้ว', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'check_circle', step: 2 },
      driver_assigned: { label: 'มอบหมายคนขับแล้ว', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: 'person_check', step: 3 },
      driver_en_route: { label: 'คนขับกำลังมา', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: 'directions_car', step: 4 },
      in_progress: { label: 'กำลังเดินทาง', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: 'moving', step: 5 },
    };

    const currentStatus = statusConfig[activeBookingData.status] || { label: activeBookingData.status, color: 'text-gray-600', bgColor: 'bg-gray-100', icon: 'info', step: 0 };
    const steps = [
      { key: 'pending', label: 'รอยืนยัน', icon: 'schedule' },
      { key: 'confirmed', label: 'ยืนยันแล้ว', icon: 'check_circle' },
      { key: 'driver_assigned', label: 'มอบหมายคนขับ', icon: 'person_check' },
      { key: 'driver_en_route', label: 'คนขับกำลังมา', icon: 'directions_car' },
      { key: 'in_progress', label: 'กำลังเดินทาง', icon: 'moving' },
    ];

    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">การจองของคุณ</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className={`${currentStatus.bgColor} px-5 py-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-white/80 flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-2xl ${currentStatus.color}`}>{currentStatus.icon}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-500">สถานะปัจจุบัน</p>
                  <p className={`text-lg font-bold ${currentStatus.color}`}>{currentStatus.label}</p>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const isCompleted = currentStatus.step > index + 1;
                  const isCurrent = currentStatus.step === index + 1;
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                        ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-sm">check</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">{step.icon}</span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {index < steps.length - 1 && (
                        <div className={`absolute h-0.5 w-full top-4 left-1/2 -z-10 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trip Details */}
            <div className="p-5 space-y-4">
              {/* Route */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-gray-400">จุดรับ</p>
                    <p className="font-medium text-gray-800 dark:text-white">{activeBookingData.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">จุดส่ง</p>
                    <p className="font-medium text-gray-800 dark:text-white">{activeBookingData.dropoffLocation}</p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-2 flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                  <span className="material-symbols-outlined text-blue-500 text-xl">calendar_today</span>
                  <div>
                    <p className="text-[10px] text-gray-400">วันที่</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                      {activeBookingData.pickupDate ? new Date(activeBookingData.pickupDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                  <span className="material-symbols-outlined text-purple-500 text-xl">schedule</span>
                  <div>
                    <p className="text-[10px] text-gray-400">เวลา</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{activeBookingData.pickupTime || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle */}
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                <span className="material-symbols-outlined text-amber-500 text-xl">directions_car</span>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400">ยานพาหนะ</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{activeBookingData.vehicleName || activeBookingData.vehicle?.name || '-'}</p>
                </div>
                <p className="text-lg font-bold text-blue-600">฿{(activeBookingData.totalCost || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Driver Card - Show if assigned */}
          {activeBookingData.driver && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                  {activeBookingData.driver.name?.charAt(0) || 'D'}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">คนขับของคุณ</p>
                  <p className="font-bold text-gray-800 dark:text-white">{activeBookingData.driver.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activeBookingData.driver.vehiclePlate && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                        {activeBookingData.driver.vehiclePlate}
                      </span>
                    )}
                    {activeBookingData.driver.vehicleModel && (
                      <span className="text-xs text-gray-500">{activeBookingData.driver.vehicleModel}</span>
                    )}
                  </div>
                </div>
                <a
                  href={`tel:${activeBookingData.driver.phone}`}
                  className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-emerald-600">call</span>
                </a>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-blue-500">info</span>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">มีการจองที่ยังไม่เสร็จสิ้น</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  คุณสามารถจองใหม่ได้หลังจากการจองนี้เสร็จสิ้นหรือถูกยกเลิก
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">visibility</span>
              ดูรายละเอียดเพิ่มเติม
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">home</span>
              กลับหน้าหลัก
            </button>
          </div>

          {/* Booking ID */}
          <p className="text-center text-xs text-gray-400">
            หมายเลขการจอง: #{activeBookingData.id?.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Compact Trip Summary Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back + Trip Info */}
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
              </button>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {bookingData.vehicle?.name} • {new Date(bookingData.pickupDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </p>
                <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                  {bookingData.pickupLocation} → {bookingData.dropoffLocation}
                </p>
              </div>
            </div>
            {/* Total */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500">ยอดรวม</p>
              <p className="text-xl font-bold text-blue-600">฿{total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Section 1: Customer Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'info' ? null : 'info')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isFormComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {isFormComplete ? (
                  <span className="material-symbols-outlined text-lg">check</span>
                ) : (
                  <span className="text-sm font-bold">1</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">ข้อมูลผู้จอง</p>
                {isFormComplete && expandedSection !== 'info' && (
                  <p className="text-xs text-gray-500">{formData.firstName} {formData.lastName} • {formData.phone}</p>
                )}
              </div>
            </div>
            <span className={`material-symbols-outlined text-gray-400 transition-transform ${expandedSection === 'info' ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {expandedSection === 'info' && (
            <div className="px-4 pb-4 space-y-4">
              {/* Card 1: Contact Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="material-symbols-outlined text-white">person</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">ข้อมูลติดต่อ</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">กรุณากรอกข้อมูลให้ครบถ้วน</p>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label htmlFor="firstName" className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-blue-500">badge</span>
                      ชื่อ <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all"
                      placeholder="ชื่อจริง"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-blue-500">badge</span>
                      นามสกุล <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all"
                      placeholder="นามสกุล"
                    />
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="phone" className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-green-500">call</span>
                      เบอร์โทร <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all"
                      placeholder="08X-XXX-XXXX"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-purple-500">mail</span>
                      อีเมล <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Trip Details */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/30">
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <span className="material-symbols-outlined text-white">flight</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">รายละเอียดการเดินทาง</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ข้อมูลเพิ่มเติมสำหรับการเดินทาง</p>
                  </div>
                </div>

                {/* Flight Number */}
                <div className="mb-4">
                  <label htmlFor="flightNumber" className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-amber-500">airplane_ticket</span>
                    เที่ยวบิน <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                  </label>
                  <input
                    type="text"
                    id="flightNumber"
                    name="flightNumber"
                    autoComplete="off"
                    value={formData.flightNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:text-white transition-all"
                    placeholder="เช่น TG123, FD3033"
                  />
                </div>

                {/* Passenger & Luggage Stepper */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Passenger Count Stepper */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-blue-500">groups</span>
                      ผู้โดยสาร
                    </label>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, passengerCount: Math.max(1, prev.passengerCount - 1) }))}
                        disabled={formData.passengerCount <= 1}
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">remove</span>
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">{formData.passengerCount}</span>
                        <span className="text-xs text-gray-400 ml-1">คน</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, passengerCount: Math.min(20, prev.passengerCount + 1) }))}
                        disabled={formData.passengerCount >= 20}
                        className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center text-white transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xl">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Luggage Count Stepper */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-orange-500">luggage</span>
                      กระเป๋า
                    </label>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, luggageCount: Math.max(0, prev.luggageCount - 1) }))}
                        disabled={formData.luggageCount <= 0}
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">remove</span>
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">{formData.luggageCount}</span>
                        <span className="text-xs text-gray-400 ml-1">ใบ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, luggageCount: Math.min(20, prev.luggageCount + 1) }))}
                        disabled={formData.luggageCount >= 20}
                        className="w-10 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 flex items-center justify-center text-white transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xl">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              {isFormComplete && (
                <button
                  onClick={() => setExpandedSection('payment')}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  ถัดไป: เลือกวิธีชำระเงิน
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Payment Method */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => isFormComplete && setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
            className={`w-full flex items-center justify-between p-4 text-left ${!isFormComplete ? 'opacity-50' : ''}`}
            disabled={!isFormComplete}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentMethod ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {paymentMethod ? (
                  <span className="material-symbols-outlined text-lg">check</span>
                ) : (
                  <span className="text-sm font-bold">2</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">วิธีชำระเงิน</p>
                {paymentMethod && expandedSection !== 'payment' && (
                  <p className="text-xs text-gray-500">
                    {paymentMethod === 'card' ? 'บัตรเครดิต/เดบิต' : paymentMethod === 'promptpay' ? 'PromptPay QR' : 'เงินสดปลายทาง'}
                  </p>
                )}
              </div>
            </div>
            <span className={`material-symbols-outlined text-gray-400 transition-transform ${expandedSection === 'payment' ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {expandedSection === 'payment' && isFormComplete && (
            <div className="px-4 pb-4 space-y-3">
              {/* Payment Method Cards */}
              <div className="grid grid-cols-1 gap-2">
                {/* Card Payment */}
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <span className="material-symbols-outlined">credit_card</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">บัตรเครดิต/เดบิต</p>
                    <p className="text-xs text-gray-500">Visa, Mastercard, JCB</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-8 h-5 bg-[#1a1f71] rounded text-[6px] text-white flex items-center justify-center font-bold">VISA</div>
                    <div className="w-8 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded"></div>
                  </div>
                </button>

                {/* PromptPay */}
                <button
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'promptpay' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'promptpay' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <span className="material-symbols-outlined">qr_code_2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">PromptPay QR</p>
                    <p className="text-xs text-gray-500">สแกนจ่ายผ่านแอปธนาคาร</p>
                  </div>
                </button>

                {/* Cash */}
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">เงินสดปลายทาง</p>
                    <p className="text-xs text-gray-500">ชำระเมื่อถึงจุดหมาย</p>
                  </div>
                </button>
              </div>

              {/* Payment Content */}
              {paymentMethod === 'card' && (
                <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-indigo-600">lock</span>
                    <div>
                      <p className="font-semibold text-indigo-800 dark:text-indigo-300">Secure by Stripe</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">ข้อมูลบัตรของคุณปลอดภัย</p>
                    </div>
                  </div>
                  {stripeError && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">
                      {stripeError}
                    </div>
                  )}
                  <button
                    onClick={handleStripePayment}
                    disabled={stripeLoading}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {stripeLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        กำลังเชื่อมต่อ...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">credit_card</span>
                        ชำระเงิน ฿{total.toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
              )}

              {paymentMethod === 'promptpay' && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                    <QRCodeSVG value={generatePromptPayPayload(total)} size={180} level="M" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-1">฿{total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mb-4">สแกน QR แล้วกดตรวจสอบ</p>
                  <button
                    onClick={handleCheckPayment}
                    disabled={isVerifying}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        กำลังตรวจสอบ...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">verified</span>
                        ตรวจสอบการชำระเงิน
                      </>
                    )}
                  </button>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="mt-4">
                  {!otpVerified ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
                        กรุณายืนยันเบอร์โทรศัพท์เพื่อให้เราติดต่อคุณได้
                      </p>
                      {!otpSent ? (
                        <div className="space-y-3">
                          <input
                            type="tel"
                            id="cashPhone"
                            name="cashPhone"
                            autoComplete="tel"
                            value={cashPhoneNumber}
                            onChange={(e) => setCashPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-lg font-mono outline-none"
                            placeholder="08X-XXX-XXXX"
                          />
                          {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                          <button
                            id="send-otp-button"
                            onClick={handleSendOtp}
                            disabled={otpSending || cashPhoneNumber.length < 10}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl"
                          >
                            {otpSending ? 'กำลังส่ง...' : 'ส่งรหัส OTP'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            id="otpCode"
                            name="otpCode"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-2xl font-mono tracking-widest outline-none"
                            placeholder="● ● ● ● ● ●"
                            maxLength={6}
                          />
                          {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                          <button
                            onClick={handleVerifyOtp}
                            disabled={otpVerifying || otpCode.length !== 6}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold rounded-xl"
                          >
                            {otpVerifying ? 'กำลังตรวจสอบ...' : 'ยืนยัน OTP'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-emerald-600 text-2xl">verified</span>
                        <div>
                          <p className="font-semibold text-emerald-800 dark:text-emerald-300">ยืนยันเบอร์โทรสำเร็จ</p>
                          <p className="text-xs text-emerald-600">{cashPhoneNumber}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={processing}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
                      >
                        {processing ? 'กำลังดำเนินการ...' : `ยืนยันการจอง (ชำระเงินสด ฿${total.toLocaleString()})`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trip Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={bookingData.vehicle?.image || ''}
              alt={bookingData.vehicle?.name}
              className="w-16 h-12 object-cover rounded-lg bg-gray-100"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
            <div>
              <p className="font-semibold text-gray-800 dark:text-white">{bookingData.vehicle?.name}</p>
              <p className="text-xs text-gray-500">{bookingData.vehicle?.passengers} ที่นั่ง • รวมคนขับ</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="material-symbols-outlined text-emerald-500 text-lg">trip_origin</span>
              <span>{bookingData.pickupLocation}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="material-symbols-outlined text-red-500 text-lg">location_on</span>
              <span>{bookingData.dropoffLocation}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="material-symbols-outlined text-blue-500 text-lg">event</span>
              <span>
                {new Date(bookingData.pickupDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} • {bookingData.pickupTime}
              </span>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 py-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-emerald-500">verified</span>
            คนขับมืออาชีพ
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-blue-500">security</span>
            ชำระเงินปลอดภัย
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-purple-500">support_agent</span>
            บริการ 24 ชม.
          </span>
        </div>
      </div>

      {/* Payment Success Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-500 text-4xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">ชำระเงินสำเร็จ!</h3>
            <p className="text-gray-500">กำลังพาไปหน้ายืนยัน...</p>
          </div>
        </div>
      )}

      <div id="recaptcha-container"></div>
    </main>
  );
}
