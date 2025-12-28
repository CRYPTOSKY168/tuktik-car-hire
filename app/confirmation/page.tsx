'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; step: number }> = {
  awaiting_payment: { label: 'รอชำระเงิน', color: 'text-amber-600', bg: 'bg-amber-500', icon: 'hourglass_empty', step: 0 },
  pending: { label: 'รอยืนยัน', color: 'text-amber-600', bg: 'bg-amber-500', icon: 'schedule', step: 1 },
  confirmed: { label: 'ยืนยันแล้ว', color: 'text-blue-600', bg: 'bg-blue-500', icon: 'check_circle', step: 2 },
  driver_assigned: { label: 'มอบหมายคนขับแล้ว', color: 'text-purple-600', bg: 'bg-purple-500', icon: 'person_check', step: 3 },
  driver_en_route: { label: 'คนขับกำลังมารับ', color: 'text-indigo-600', bg: 'bg-indigo-500', icon: 'directions_car', step: 4 },
  in_progress: { label: 'กำลังเดินทาง', color: 'text-cyan-600', bg: 'bg-cyan-500', icon: 'route', step: 5 },
  completed: { label: 'เสร็จสิ้น', color: 'text-emerald-600', bg: 'bg-emerald-500', icon: 'task_alt', step: 6 },
  cancelled: { label: 'ยกเลิกแล้ว', color: 'text-red-600', bg: 'bg-red-500', icon: 'cancel', step: -1 },
};

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { bookingData, resetBooking } = useBooking();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Real-time listener
  useEffect(() => {
    if (!bookingId) {
      if (bookingData.vehicle) setData(bookingData);
      setLoading(false);
      return;
    }

    if (!db) {
      FirestoreService.getBooking(bookingId).then(fetched => {
        if (fetched) setData(fetched);
        setLoading(false);
      }).catch(() => setLoading(false));
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db!, 'bookings', bookingId),
      (docSnap) => {
        if (docSnap.exists()) setData({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [bookingId, bookingData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/confirmation?bookingId=${bookingId}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'TukTik Booking', url }); }
      catch { navigator.clipboard.writeText(url); }
    } else {
      navigator.clipboard.writeText(url);
      alert('คัดลอกลิงก์แล้ว!');
    }
  };

  const handleCalendar = () => {
    if (!data) return;
    const start = new Date(`${data.pickupDate}T${data.pickupTime || '10:00'}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('TukTik: ' + data.pickupLocation + ' → ' + data.dropoffLocation)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(data.pickupLocation || '')}`, '_blank');
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    setCancelling(true);
    try {
      await FirestoreService.updateBookingStatus(bookingId, 'cancelled');
      setShowCancelModal(false);
    } catch { alert('ไม่สามารถยกเลิกได้'); }
    finally { setCancelling(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || !data.vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">search_off</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">ไม่พบการจอง</h3>
          <p className="text-gray-500 text-sm mb-4">การจองนี้ไม่มีอยู่หรือถูกลบไปแล้ว</p>
          <button onClick={() => router.push('/')} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl">
            กลับหน้าแรก
          </button>
        </div>
      </div>
    );
  }

  const status = data.status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const canCancel = ['pending', 'confirmed', 'awaiting_payment'].includes(status);
  const total = data.totalCost || data.vehicle?.price || 0;
  const bookingRef = bookingId?.slice(-8).toUpperCase() || 'N/A';

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Compact Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
              </button>
              <div>
                <p className="text-xs text-gray-500">หมายเลขการจอง</p>
                <button onClick={handleCopy} className="flex items-center gap-1 font-mono font-bold text-gray-800 dark:text-white">
                  #{bookingRef}
                  <span className="material-symbols-outlined text-sm text-gray-400">{copied ? 'check' : 'content_copy'}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleShare} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">share</span>
              </button>
              {canCancel && (
                <button onClick={() => setShowCancelModal(true)} className="p-2 hover:bg-red-50 rounded-full">
                  <span className="material-symbols-outlined text-red-500">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Status Card with Mini Timeline */}
        <div className={`${config.bg} rounded-2xl p-4 text-white`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">{config.icon}</span>
            </div>
            <div>
              <p className="text-white/70 text-xs">สถานะปัจจุบัน</p>
              <p className="text-xl font-bold">{config.label}</p>
            </div>
          </div>

          {/* Mini Timeline */}
          {status !== 'cancelled' && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6].map(step => (
                <div key={step} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/20">
                  <div className={`h-full ${step <= config.step ? 'bg-white' : ''}`}></div>
                </div>
              ))}
            </div>
          )}

          {/* ETA if driver is on the way */}
          {data.eta && (status === 'driver_en_route' || status === 'driver_assigned') && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <span className="material-symbols-outlined">schedule</span>
              <span className="text-sm">ถึงโดยประมาณ: <strong>{data.eta}</strong></span>
            </div>
          )}
        </div>

        {/* Trip Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4">
            {/* Route */}
            <div className="flex gap-3 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500 to-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-gray-400">รับ</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{data.pickupLocation}</p>
                  <p className="text-sm text-blue-600 font-medium">
                    {new Date(data.pickupDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })} • {data.pickupTime || '10:00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ส่ง</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{data.dropoffLocation}</p>
                </div>
              </div>
            </div>

            {/* Vehicle + Price */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {data.vehicle?.image && (
                  <img src={data.vehicle.image} alt="" className="w-14 h-10 object-cover rounded-lg" />
                )}
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{data.vehicle?.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{data.passengerCount || data.vehicle?.passengers} คน</span>
                    <span>•</span>
                    <span>{data.luggageCount || data.vehicle?.luggage} กระเป๋า</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">฿{total.toLocaleString()}</p>
                <p className={`text-xs font-medium ${data.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {data.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Card (if assigned) */}
        {data.driverName && (
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden">
                {data.driverPhoto ? (
                  <img src={data.driverPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  data.driverName?.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{data.driverName}</p>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  {data.vehiclePlate && <span>{data.vehiclePlate}</span>}
                  {data.driverRating && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-yellow-300 text-sm">star</span>
                      {data.driverRating}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${data.driverPhone}`} className="flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-xl font-semibold hover:bg-white/30">
                <span className="material-symbols-outlined">call</span>
                โทร
              </a>
              <button onClick={() => window.open(`https://line.me/R/ti/p/~${data.driverPhone}`, '_blank')} className="flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-xl font-semibold hover:bg-white/30">
                <span className="material-symbols-outlined">chat</span>
                แชท
              </button>
            </div>
          </div>
        )}

        {/* More Details (Collapsible) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-gray-800 dark:text-white">รายละเอียดเพิ่มเติม</span>
            <span className={`material-symbols-outlined text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {showDetails && (
            <div className="px-4 pb-4 space-y-3">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-xs text-gray-400">ชื่อ</p>
                  <p className="font-medium text-gray-800 dark:text-white">{data.firstName} {data.lastName}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-xs text-gray-400">เบอร์โทร</p>
                  <p className="font-medium text-gray-800 dark:text-white">{data.phone || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl col-span-2">
                  <p className="text-xs text-gray-400">อีเมล</p>
                  <p className="font-medium text-gray-800 dark:text-white">{data.email || '-'}</p>
                </div>
                {data.flightNumber && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl col-span-2">
                    <p className="text-xs text-gray-400">เที่ยวบิน</p>
                    <p className="font-medium text-gray-800 dark:text-white">{data.flightNumber}</p>
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-lg">
                      {data.paymentMethod === 'card' ? 'credit_card' : data.paymentMethod === 'promptpay' ? 'qr_code_2' : 'payments'}
                    </span>
                    <span className="text-sm">
                      {data.paymentMethod === 'card' ? 'บัตรเครดิต' : data.paymentMethod === 'promptpay' ? 'PromptPay' : 'เงินสด'}
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">฿{total.toLocaleString()}</span>
                </div>
              </div>

              {data.specialRequests && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <p className="text-xs text-amber-600 font-medium mb-1">หมายเหตุ</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{data.specialRequests}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { resetBooking(); router.push('/dashboard'); }}
            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <span className="material-symbols-outlined text-blue-600">dashboard</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">แดชบอร์ด</span>
          </button>
          <button
            onClick={handleCalendar}
            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <span className="material-symbols-outlined text-purple-600">calendar_add_on</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">เพิ่มปฏิทิน</span>
          </button>
          <a
            href="/contact"
            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <span className="material-symbols-outlined text-amber-600">support_agent</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">ช่วยเหลือ</span>
          </a>
        </div>

        {/* Trust */}
        <div className="flex items-center justify-center gap-4 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-emerald-500">verified</span>
            คนขับมืออาชีพ
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-blue-500">security</span>
            ปลอดภัย
          </span>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">ยกเลิกการจอง?</h3>
            <p className="text-sm text-gray-500 mb-4">คุณแน่ใจหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl">
                ไม่ใช่
              </button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl">
                {cancelling ? 'กำลังยกเลิก...' : 'ใช่, ยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
