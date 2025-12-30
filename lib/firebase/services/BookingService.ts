// ====================================
// TukTik Car Rental - Booking Service
// ====================================

import { db } from '../config';
import {
    collection,
    addDoc,
    getDoc,
    doc,
    Timestamp,
    getDocs,
    updateDoc,
    query,
    where,
    onSnapshot,
    arrayUnion
} from 'firebase/firestore';
import { BookingData } from '@/lib/contexts/BookingContext';
import { Booking, BookingStatus } from '@/lib/types';
import { COLLECTIONS, STORAGE_KEYS, ACTIVE_BOOKING_STATUSES } from '@/lib/constants';
import {
    createStatusChangeNotification,
    createNewBookingAdminNotification,
} from '../notifications';

const COLLECTION_NAME = COLLECTIONS.BOOKINGS;

export const BookingService = {
    /**
     * Adds a new booking to Firestore
     */
    async addBooking(bookingData: BookingData, totalCost: number, userId?: string, slipUrl?: string): Promise<string> {
        try {
            let initialStatus = BookingStatus.PENDING;
            if (bookingData.paymentMethod === 'card') {
                initialStatus = BookingStatus.AWAITING_PAYMENT;
            } else if ((bookingData.paymentMethod === 'promptpay' || bookingData.paymentMethod === 'bank_transfer') && slipUrl) {
                initialStatus = BookingStatus.CONFIRMED;
            }

            const dataToSave = {
                ...bookingData,
                totalCost,
                userId: userId || null,
                slipUrl: slipUrl || null,
                createdAt: Timestamp.now(),
                status: initialStatus,
                paymentStatus: 'pending',
                statusHistory: [{
                    status: initialStatus,
                    timestamp: Timestamp.now(),
                    note: 'Booking created'
                }]
            };

            if (!db) throw new Error("Firebase not initialized");

            const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);

            const customerName = bookingData.firstName
                ? `${bookingData.firstName} ${bookingData.lastName}`.trim()
                : 'ลูกค้า';
            const route = `${bookingData.pickupLocation || 'ต้นทาง'} → ${bookingData.dropoffLocation || 'ปลายทาง'}`;
            await createNewBookingAdminNotification(docRef.id, customerName, totalCost, route);

            return docRef.id;
        } catch (error: any) {
            // Fallback: Save to localStorage for demo/offline mode
            const mockId = 'local-' + Math.random().toString(36).substr(2, 9);
            let initialStatus = BookingStatus.PENDING;
            if (bookingData.paymentMethod === 'card') {
                initialStatus = BookingStatus.AWAITING_PAYMENT;
            } else if ((bookingData.paymentMethod === 'promptpay' || bookingData.paymentMethod === 'bank_transfer') && slipUrl) {
                initialStatus = BookingStatus.CONFIRMED;
            }
            const localData = {
                id: mockId,
                ...bookingData,
                totalCost,
                userId: userId || null,
                slipUrl: slipUrl || null,
                createdAt: { seconds: Math.floor(Date.now() / 1000) },
                status: initialStatus,
                paymentStatus: 'pending',
                isLocal: true
            };

            try {
                const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_BOOKINGS) || '[]');
                current.push(localData);
                localStorage.setItem(STORAGE_KEYS.LOCAL_BOOKINGS, JSON.stringify(current));
                return mockId;
            } catch {
                throw error;
            }
        }
    },

    async getUserBookings(userId: string): Promise<Booking[]> {
        let localBookings: any[] = [];
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_BOOKINGS);
            if (stored) {
                localBookings = JSON.parse(stored).filter((b: any) => b.userId === userId);
            }
        } catch { /* ignore */ }

        try {
            if (!db) return localBookings;
            const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            const serverBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
            return [...localBookings, ...serverBookings];
        } catch {
            return localBookings;
        }
    },

    subscribeToUserBookings(userId: string, callback: (bookings: Booking[]) => void): () => void {
        const allLocalBookings = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_BOOKINGS) || '[]')
            .filter((b: any) => b.userId === userId);

        if (!db) {
            callback(allLocalBookings);
            return () => { };
        }

        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));

        return onSnapshot(q, (snapshot) => {
            const serverBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];

            let localBookings = allLocalBookings;
            if (serverBookings.length > 0) {
                localBookings = allLocalBookings.filter((lb: any) => {
                    if (lb.status === BookingStatus.AWAITING_PAYMENT) return false;
                    const isDuplicate = serverBookings.some((sb: any) =>
                        sb.pickupLocation === lb.pickupLocation &&
                        sb.dropoffLocation === lb.dropoffLocation &&
                        sb.pickupDate === lb.pickupDate
                    );
                    return !isDuplicate;
                });

                if (localBookings.length < allLocalBookings.length) {
                    const allLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_BOOKINGS) || '[]');
                    const cleanedLocal = allLocal.filter((b: any) =>
                        b.userId !== userId || localBookings.some((lb: any) => lb.id === b.id)
                    );
                    localStorage.setItem(STORAGE_KEYS.LOCAL_BOOKINGS, JSON.stringify(cleanedLocal));
                }
            }

            callback([...localBookings, ...serverBookings]);
        }, () => {
            callback(allLocalBookings);
        });
    },

    async getBooking(id: string): Promise<Booking | null> {
        if (id.startsWith('local-')) {
            const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_BOOKINGS);
            if (stored) {
                const found = JSON.parse(stored).find((b: any) => b.id === id);
                if (found) return found;
            }
        }

        try {
            if (!db) return null;
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Booking;
            }
            return null;
        } catch {
            return null;
        }
    },

    async getBookings(): Promise<Booking[]> {
        try {
            if (!db) return [];
            const q = query(collection(db, COLLECTION_NAME));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
        } catch {
            return [];
        }
    },

    subscribeToAllBookings(callback: (bookings: Booking[]) => void): () => void {
        if (!db) return () => { };

        const q = query(collection(db!, COLLECTION_NAME));

        return onSnapshot(q, (snapshot) => {
            const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
            callback(bookings);
        }, () => { /* error handling */ });
    },

    async updateBookingStatus(id: string, status: string, note?: string): Promise<void> {
        if (!db) throw new Error('Database not initialized');
        try {
            const docRef = doc(db!, COLLECTION_NAME, id);
            const booking = await getDoc(docRef);

            if (!booking.exists()) {
                throw new Error(`Booking ${id} not found`);
            }

            const currentData = booking.data();

            const statusHistory = currentData?.statusHistory || [];
            statusHistory.push({
                status,
                timestamp: Timestamp.now(),
                note: note || null
            });

            await updateDoc(docRef, {
                status,
                statusHistory,
                updatedAt: Timestamp.now()
            });

            if (currentData?.userId) {
                await createStatusChangeNotification(
                    currentData.userId,
                    id,
                    status,
                    currentData.driverInfo
                );
            }
        } catch (error) {
            throw error;
        }
    },

    async updatePaymentStatus(id: string, paymentStatus: string, note?: string): Promise<void> {
        if (!db) return;
        try {
            const docRef = doc(db!, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                paymentStatus,
                paymentUpdatedAt: Timestamp.now(),
                paymentNote: note || null
            });
        } catch (error) {
            throw error;
        }
    },

    async assignDriver(id: string, driverInfo: {
        driverId?: string;
        name: string;
        phone: string;
        vehiclePlate?: string;
        vehicleModel?: string;
        vehicleColor?: string;
    }): Promise<void> {
        if (!db) return;
        try {
            const docRef = doc(db!, COLLECTION_NAME, id);
            const booking = await getDoc(docRef);
            const currentData = booking.data();

            // === VALIDATION 1: Check if driver already has an active job ===
            if (driverInfo.driverId) {
                const activeBookingsQuery = query(
                    collection(db!, COLLECTION_NAME),
                    where('driver.driverId', '==', driverInfo.driverId),
                    where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
                );
                const activeBookingsSnap = await getDocs(activeBookingsQuery);

                if (!activeBookingsSnap.empty) {
                    throw new Error('คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้');
                }

                // === VALIDATION 2: Check if driver is the booking owner ===
                const driverDocRef = doc(db!, 'drivers', driverInfo.driverId);
                const driverDocSnap = await getDoc(driverDocRef);
                const driverData = driverDocSnap.data();

                if (driverData?.userId && driverData.userId === currentData?.userId) {
                    throw new Error('คนขับไม่สามารถรับงานของตัวเองได้');
                }
            }

            const statusHistory = currentData?.statusHistory || [];
            statusHistory.push({
                status: BookingStatus.DRIVER_ASSIGNED,
                timestamp: Timestamp.now(),
                note: `คนขับ: ${driverInfo.name}`
            });

            await updateDoc(docRef, {
                status: BookingStatus.DRIVER_ASSIGNED,
                driver: driverInfo,
                statusHistory,
                updatedAt: Timestamp.now()
            });

            if (currentData?.userId) {
                await createStatusChangeNotification(
                    currentData.userId,
                    id,
                    BookingStatus.DRIVER_ASSIGNED,
                    {
                        name: driverInfo.name,
                        phone: driverInfo.phone,
                        vehiclePlate: driverInfo.vehiclePlate
                    }
                );
            }
        } catch (error) {
            throw error;
        }
    },

    async hasActiveBooking(userId: string): Promise<{ hasActive: boolean; activeBooking?: Booking }> {
        if (!db) return { hasActive: false };

        try {
            const q = query(
                collection(db!, COLLECTION_NAME),
                where('userId', '==', userId),
                where('status', 'in', ACTIVE_BOOKING_STATUSES)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const activeBooking = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Booking;
                return { hasActive: true, activeBooking };
            }

            return { hasActive: false };
        } catch {
            return { hasActive: false };
        }
    },

    // Driver updates booking status
    async driverUpdateBookingStatus(
        bookingId: string,
        driverId: string,
        newStatus: BookingStatus.DRIVER_EN_ROUTE | BookingStatus.IN_PROGRESS | BookingStatus.COMPLETED,
        note?: string,
        notificationService?: { addNotification: (userId: string, notification: any) => Promise<string> }
    ): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");

        const validTransitions: Record<string, string[]> = {
            [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_EN_ROUTE],
            [BookingStatus.DRIVER_EN_ROUTE]: [BookingStatus.IN_PROGRESS],
            [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED]
        };

        try {
            const bookingRef = doc(db!, COLLECTION_NAME, bookingId);
            const bookingSnap = await getDoc(bookingRef);

            if (!bookingSnap.exists()) {
                throw new Error("Booking not found");
            }

            const booking = bookingSnap.data();

            if (booking.driver?.driverId !== driverId) {
                throw new Error("This booking is not assigned to you");
            }

            const currentStatus = booking.status;
            if (!validTransitions[currentStatus]?.includes(newStatus)) {
                throw new Error(`Cannot change status from ${currentStatus} to ${newStatus}`);
            }

            const statusEntry = {
                status: newStatus,
                timestamp: Timestamp.now(),
                note: note || `Driver updated to ${newStatus}`,
                updatedBy: 'driver'
            };

            await updateDoc(bookingRef, {
                status: newStatus,
                statusHistory: arrayUnion(statusEntry),
                updatedAt: Timestamp.now()
            });

            // Notify customer if notification service is provided
            if (booking.userId && notificationService) {
                const statusMessages: Record<string, string> = {
                    [BookingStatus.DRIVER_EN_ROUTE]: 'คนขับกำลังเดินทางมารับคุณ',
                    [BookingStatus.IN_PROGRESS]: 'เริ่มเดินทางแล้ว',
                    [BookingStatus.COMPLETED]: 'เดินทางถึงปลายทางแล้ว ขอบคุณที่ใช้บริการ'
                };

                await notificationService.addNotification(booking.userId, {
                    type: 'booking',
                    title: 'อัปเดตสถานะ',
                    message: statusMessages[newStatus] || `สถานะเปลี่ยนเป็น ${newStatus}`,
                    data: { bookingId, status: newStatus }
                });
            }

        } catch (error) {
            throw error;
        }
    },

    // Get bookings assigned to a specific driver
    async getDriverBookings(driverId: string): Promise<Booking[]> {
        if (!db) return [];
        try {
            const q = query(
                collection(db!, COLLECTION_NAME),
                where('driver.driverId', '==', driverId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
        } catch {
            return [];
        }
    },

    // Subscribe to driver's assigned bookings (real-time)
    subscribeToDriverBookings(driverId: string, callback: (bookings: Booking[]) => void): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        const q = query(
            collection(db!, COLLECTION_NAME),
            where('driver.driverId', '==', driverId)
        );

        return onSnapshot(q, (snapshot) => {
            const bookings = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => {
                    const statusOrder: Record<string, number> = {
                        [BookingStatus.DRIVER_ASSIGNED]: 1,
                        [BookingStatus.DRIVER_EN_ROUTE]: 2,
                        [BookingStatus.IN_PROGRESS]: 3,
                        [BookingStatus.COMPLETED]: 4,
                        [BookingStatus.CANCELLED]: 5
                    };
                    const orderA = statusOrder[a.status] || 10;
                    const orderB = statusOrder[b.status] || 10;
                    if (orderA !== orderB) return orderA - orderB;
                    return (b.pickupDate || '').localeCompare(a.pickupDate || '');
                }) as Booking[];
            callback(bookings);
        }, () => {
            callback([]);
        });
    },

    // Get user booking stats
    async getUserBookingStats(userId: string): Promise<{ totalBookings: number; totalSpent: number; completedTrips: number }> {
        if (!db) return { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
        try {
            const q = query(collection(db!, COLLECTION_NAME), where('userId', '==', userId));
            const snapshot = await getDocs(q);

            let totalSpent = 0;
            let completedTrips = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.status !== BookingStatus.CANCELLED) {
                    totalSpent += Number(data.totalCost) || 0;
                }
                if (data.status === BookingStatus.COMPLETED) {
                    completedTrips++;
                }
            });

            return {
                totalBookings: snapshot.size,
                totalSpent,
                completedTrips
            };
        } catch {
            return { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
        }
    },

    /**
     * Subscribe to user bookings matched by userId, email, or phone
     * This is more accurate as it matches bookings the same way admin page does
     */
    subscribeToUserBookingsComprehensive(
        userId: string,
        userEmail: string | null,
        userPhone: string | null,
        callback: (bookings: Booking[]) => void
    ): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        // Subscribe to all bookings and filter client-side
        // This matches the admin customers page logic exactly
        return onSnapshot(
            query(collection(db!, COLLECTION_NAME)),
            (snapshot) => {
                const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];

                // Filter bookings that match this user by userId, email, or phone
                const normalizedEmail = userEmail?.toLowerCase();
                const normalizedPhone = userPhone?.replace(/[^0-9+]/g, '');

                const userBookings = allBookings.filter((booking: any) => {
                    // Match by userId
                    if (booking.userId === userId) return true;

                    // Match by email
                    if (normalizedEmail && booking.email?.toLowerCase() === normalizedEmail) return true;

                    // Match by phone
                    if (normalizedPhone && booking.phone?.replace(/[^0-9+]/g, '') === normalizedPhone) return true;

                    return false;
                });

                // Sort by createdAt descending
                userBookings.sort((a: any, b: any) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                callback(userBookings);
            },
            () => {
                callback([]);
            }
        );
    }
};
