'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useAuthToken } from '@/lib/hooks/useAuthToken';
import { DriverStatus } from '@/lib/types';

interface DriverData {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  vehicleModel: string;
  status: DriverStatus | string;
  rating?: number;
  totalTrips?: number;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  vehicleName: string;
  totalCost: number;
  status: string;
  createdAt: any;
}

// Status flow
const statusFlow: Record<string, { label: string; labelEn: string; next: string; nextLabel: string; nextLabelEn: string }> = {
  driver_assigned: { label: 'รับงานแล้ว', labelEn: 'Job Accepted', next: 'driver_en_route', nextLabel: 'เริ่มเดินทาง', nextLabelEn: 'Start Trip' },
  driver_en_route: { label: 'กำลังไปรับ', labelEn: 'On the Way', next: 'in_progress', nextLabel: 'ถึงจุดรับแล้ว', nextLabelEn: 'Arrived' },
  in_progress: { label: 'กำลังเดินทาง', labelEn: 'In Progress', next: 'completed', nextLabel: 'ถึงปลายทาง', nextLabelEn: 'Complete' },
};

export default function DriverPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const { getAuthHeaders } = useAuthToken();

  // States
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [driverStatus, setDriverStatus] = useState<string>('available');
  const [currentJob, setCurrentJob] = useState<Booking | null>(null);
  const [pendingJobs, setPendingJobs] = useState<Booking[]>([]);
  const [todayStats, setTodayStats] = useState({ earnings: 0, trips: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);

  // For new job alert
  const previousBookingIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch { /* ignore */ }
  }, []);

  // Fetch driver data and bookings
  useEffect(() => {
    if (!auth || !db) {
      setIsLoading(false);
      return;
    }

    let unsubscribeBookings: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/driver/login');
        return;
      }

      try {
        // Get user data
        const userDoc = await getDoc(doc(db!, 'users', user.uid));
        const userData = userDoc.data();

        if (!userData?.isApprovedDriver) {
          router.push('/driver/pending');
          return;
        }

        let driverId: string | null = null;

        // Get driver ID from user or find by userId
        if (userData?.driverId) {
          driverId = userData.driverId;
        } else {
          const driversQuery = query(collection(db!, 'drivers'), where('userId', '==', user.uid));
          const driversSnap = await getDocs(driversQuery);
          if (!driversSnap.empty) {
            driverId = driversSnap.docs[0].id;
          }
        }

        if (!driverId) {
          router.push('/driver/setup');
          return;
        }

        // Get driver data
        const driverDoc = await getDoc(doc(db!, 'drivers', driverId));
        if (!driverDoc.exists()) {
          router.push('/driver/setup');
          return;
        }

        const driverData = driverDoc.data();
        setDriver({
          id: driverId,
          name: driverData.name || user.displayName || '',
          phone: driverData.phone || '',
          vehiclePlate: driverData.vehiclePlate || '',
          vehicleModel: driverData.vehicleModel || '',
          status: driverData.status || 'available',
          rating: driverData.rating || 4.9,
          totalTrips: driverData.totalTrips || 0,
        });
        setDriverStatus(driverData.status || 'available');

        // Subscribe to bookings
        const bookingsQuery = query(
          collection(db!, 'bookings'),
          where('driver.driverId', '==', driverId)
        );

        unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
          const allBookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Booking[];

          // Find current job (active booking)
          const activeStatuses = ['driver_assigned', 'driver_en_route', 'in_progress'];
          const activeJob = allBookings.find(b => activeStatuses.includes(b.status));
          setCurrentJob(activeJob || null);

          // Find pending jobs (driver_assigned only)
          const pending = allBookings.filter(b => b.status === 'driver_assigned' && b.id !== activeJob?.id);
          setPendingJobs(pending);

          // Calculate today's stats
          const today = new Date().toDateString();
          const todayBookings = allBookings.filter(b => {
            if (b.status !== 'completed') return false;
            const bookingDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return bookingDate.toDateString() === today;
          });

          setTodayStats({
            trips: todayBookings.length,
            earnings: todayBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0)
          });

          // Check for new jobs
          if (!isFirstLoad.current) {
            const newJobs = allBookings.filter(
              b => b.status === 'driver_assigned' && !previousBookingIds.current.has(b.id)
            );
            if (newJobs.length > 0) {
              playNotificationSound();
              if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }
            }
          }
          previousBookingIds.current = new Set(allBookings.map(b => b.id));
          isFirstLoad.current = false;
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading driver data:', error);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeBookings) unsubscribeBookings();
    };
  }, [router, playNotificationSound]);

  // Toggle online/offline
  const handleToggleOnline = async () => {
    if (!driver?.id || isTogglingOnline) return;

    const newStatus = driverStatus === 'available' ? 'offline' : 'available';

    // Check if driver has active job
    if (newStatus === 'offline' && currentJob) {
      alert(language === 'th' ? 'คุณมีงานอยู่ ต้องเสร็จงานก่อน' : 'You have an active job. Complete it first.');
      return;
    }

    setIsTogglingOnline(true);
    try {
      const response = await fetch('/api/driver/status', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ driverId: driver.id, status: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        setDriverStatus(newStatus);
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsTogglingOnline(false);
    }
  };

  // Update booking status
  const handleStatusUpdate = async () => {
    if (!currentJob || !driver?.id || updatingStatus) return;

    const flow = statusFlow[currentJob.status as keyof typeof statusFlow];
    if (!flow) return;

    setUpdatingStatus(currentJob.id);
    try {
      const response = await fetch('/api/driver/bookings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: 'updateStatus',
          bookingId: currentJob.id,
          driverId: driver.id,
          data: { status: flow.next }
        })
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error || 'Failed to update status');
      } else {
        // Optimistic update
        if (flow.next === 'completed') {
          setCurrentJob(null);
        } else {
          setCurrentJob({ ...currentJob, status: flow.next });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Accept job (for pending jobs)
  const handleAcceptJob = async (booking: Booking) => {
    // Jobs are already assigned to this driver, just update local state
    setPendingJobs(pendingJobs.filter(j => j.id !== booking.id));
    if (!currentJob) {
      setCurrentJob(booking);
    }
  };

  // Reject job
  const handleRejectJob = async (bookingId: string) => {
    if (!driver?.id) return;

    try {
      const response = await fetch('/api/driver/bookings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: 'rejectJob',
          bookingId,
          driverId: driver.id
        })
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error || 'Failed to reject job');
      }
    } catch (error) {
      console.error('Error rejecting job:', error);
    }
  };

  // Navigation
  const navigateTo = (path: string) => router.push(path);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-100">
        <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{language === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = driverStatus === 'available';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-100">
      <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">

        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
            <div className="flex items-center justify-between">
              {/* Driver Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {driver?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">{driver?.name || '-'}</h1>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {driver?.rating?.toFixed(1) || '4.9'}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">{driver?.vehiclePlate || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Online Toggle */}
              <button
                onClick={handleToggleOnline}
                disabled={isTogglingOnline}
                className={`px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 transition-all ${
                  isOnline
                    ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                    : 'bg-gray-200 text-gray-600'
                } ${isTogglingOnline ? 'opacity-50' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                {isOnline
                  ? (language === 'th' ? 'ออนไลน์' : 'Online')
                  : (language === 'th' ? 'ออฟไลน์' : 'Offline')
                }
              </button>
            </div>
          </div>
        </header>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 pb-8">

            {/* ----- Stats Cards ----- */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-green-200/50">
                <p className="text-green-100 text-xs font-medium">
                  {language === 'th' ? 'รายได้วันนี้' : "Today's Earnings"}
                </p>
                <p className="text-2xl font-bold mt-1">{formatPrice(todayStats.earnings)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200/50">
                <p className="text-blue-100 text-xs font-medium">
                  {language === 'th' ? 'เที่ยววันนี้' : "Today's Trips"}
                </p>
                <p className="text-2xl font-bold mt-1">{todayStats.trips}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-200/50">
                <p className="text-amber-100 text-xs font-medium">
                  {language === 'th' ? 'คะแนน' : 'Rating'}
                </p>
                <p className="text-2xl font-bold mt-1 flex items-center gap-1">
                  {driver?.rating?.toFixed(1) || '4.9'}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </p>
              </div>
            </div>

            {/* ----- Current Job ----- */}
            {currentJob && currentJob.status !== 'completed' && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  {language === 'th' ? 'งานปัจจุบัน' : 'Current Job'}
                </h2>
                <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-100/50 overflow-hidden">
                  {/* Status Banner */}
                  <div className={`px-4 py-2 flex items-center justify-between ${
                    currentJob.status === 'in_progress' ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    <span className="text-white font-semibold text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      {language === 'th'
                        ? statusFlow[currentJob.status as keyof typeof statusFlow]?.label
                        : statusFlow[currentJob.status as keyof typeof statusFlow]?.labelEn
                      }
                    </span>
                    <span className="text-white/80 text-xs">#{currentJob.id.slice(-6)}</span>
                  </div>

                  <div className="p-4">
                    {/* Customer Info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg">
                          {currentJob.firstName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {currentJob.firstName} {currentJob.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{currentJob.vehicleName}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${currentJob.phone}`}
                        className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 active:scale-95 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </a>
                    </div>

                    {/* Route */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                      <div className="flex">
                        <div className="flex flex-col items-center mr-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200" />
                          <div className="w-0.5 h-8 bg-gray-300 my-1" />
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-xs text-gray-400">
                              {language === 'th' ? 'จุดรับ' : 'Pickup'} • {currentJob.pickupTime}
                            </p>
                            <p className="font-semibold text-gray-900 text-sm">{currentJob.pickupLocation}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">{language === 'th' ? 'จุดส่ง' : 'Dropoff'}</p>
                            <p className="font-semibold text-gray-900 text-sm">{currentJob.dropoffLocation}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{language === 'th' ? 'ค่าโดยสาร' : 'Fare'}</p>
                        <p className="text-2xl font-bold text-gray-900">{formatPrice(currentJob.totalCost)}</p>
                      </div>
                      <button
                        onClick={handleStatusUpdate}
                        disabled={!!updatingStatus}
                        className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg active:scale-95 transition-all ${
                          currentJob.status === 'in_progress'
                            ? 'bg-green-500 shadow-green-200'
                            : 'bg-blue-500 shadow-blue-200'
                        } ${updatingStatus ? 'opacity-50' : ''}`}
                      >
                        {updatingStatus ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {language === 'th'
                              ? statusFlow[currentJob.status as keyof typeof statusFlow]?.nextLabel
                              : statusFlow[currentJob.status as keyof typeof statusFlow]?.nextLabelEn
                            }
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----- Completed Message ----- */}
            {currentJob?.status === 'completed' && (
              <div className="mb-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-center text-white shadow-lg">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {language === 'th' ? 'เสร็จสิ้น!' : 'Completed!'}
                  </h3>
                  <p className="text-green-100">
                    {language === 'th' ? 'คุณได้รับ' : 'You earned'} {formatPrice(currentJob.totalCost)}
                  </p>
                </div>
              </div>
            )}

            {/* ----- Pending Jobs ----- */}
            {pendingJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center justify-between">
                  <span>{language === 'th' ? 'งานที่รอรับ' : 'Pending Jobs'}</span>
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingJobs.length}</span>
                </h2>
                <div className="space-y-3">
                  {pendingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                    >
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                              {job.vehicleName}
                            </span>
                            <span className="text-xs text-gray-500">#{job.id.slice(-6)}</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">{formatPrice(job.totalCost)}</p>
                        </div>

                        {/* Route */}
                        <div className="flex mb-4">
                          <div className="flex flex-col items-center mr-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="w-0.5 h-6 bg-gray-200 my-0.5" />
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{job.pickupLocation}</p>
                              <p className="text-xs text-gray-500">{job.pickupTime}</p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{job.dropoffLocation}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectJob(job.id)}
                            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 active:scale-95 transition-all"
                          >
                            {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                          </button>
                          <button
                            onClick={() => handleAcceptJob(job)}
                            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-95 transition-all"
                          >
                            {language === 'th' ? 'รับงาน' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ----- No Jobs ----- */}
            {!currentJob && pendingJobs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {language === 'th' ? 'ไม่มีงานใหม่' : 'No New Jobs'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {language === 'th' ? 'รอสักครู่ งานใหม่กำลังมา' : 'Please wait, new jobs are coming'}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ===== BOTTOM NAVIGATION ===== */}
        <nav className="sticky bottom-0 bg-white border-t border-gray-200 px-6 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-center justify-around">
            {[
              { id: 'home', path: '/vehicles-test1-driver', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ), label: language === 'th' ? 'หน้าหลัก' : 'Home', active: true },
              { id: 'history', path: '/driver/history', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ), label: language === 'th' ? 'ประวัติ' : 'History', active: false },
              { id: 'earnings', path: '/driver', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ), label: language === 'th' ? 'รายได้' : 'Earnings', active: false },
              { id: 'profile', path: '/driver/profile', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ), label: language === 'th' ? 'โปรไฟล์' : 'Profile', active: false },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.path)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                  item.active
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  );
}
